import type { GameSessionContext } from '@district-cg/shared-types';

type CardState = 'down' | 'flipping-up' | 'up' | 'flipping-down' | 'matched';

interface Card {
  id: number;
  symbol: string;
  pairId: number;
  col: number;
  row: number;
  state: CardState;
  flipT: number; // 0..1 progress through the current flip animation
  matchGlow: number; // 0..1, decays after a match for a soft glow pulse
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

// Two rounds of increasing difficulty, matching the escalating-challenge
// pattern used elsewhere in this game's content (M23's day-rotation, M25's
// trade escrow) rather than a single flat board.
const ROUND_SYMBOLS = [
  ['📜', '⚖️', '🔑', '🏠', '🛡️', '💡', '📋', '✊'],           // Round 1: 8 pairs (4×4)
  ['📜', '⚖️', '🔑', '🏠', '🛡️', '💡', '📋', '✊', '🧾', '📚'], // Round 2: 10 pairs (4×5)
];

export class TenantMatchGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private context: GameSessionContext;
  private animFrameId: number | null = null;
  private isRunning = false;
  private lastTickTime = performance.now();

  private round = 0;
  private cards: Card[] = [];
  private cols = 4;
  private rows = 4;
  private revealed: Card[] = [];
  private resolveTimer = 0; // when > 0, waiting to resolve a mismatched pair

  private timeLeft = 90;
  private pairsFound = 0;
  private totalPairs = 0;
  private combo = 1;
  private comboMax = 1;
  private mistakes = 0;
  private score = 0;

  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];

  constructor(canvas: HTMLCanvasElement, context: GameSessionContext) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not obtain 2D canvas context');
    this.ctx = ctx;
    this.context = context;

    this.setupBoard(0);
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
  }

  private setupBoard(round: number): void {
    this.round = round;
    const symbols = ROUND_SYMBOLS[round] ?? ROUND_SYMBOLS[ROUND_SYMBOLS.length - 1];
    this.cols = round === 0 ? 4 : 4;
    this.rows = round === 0 ? 4 : 5;
    this.totalPairs = symbols.length;
    this.pairsFound = 0;
    this.revealed = [];
    this.resolveTimer = 0;

    const deck: { symbol: string; pairId: number }[] = [];
    symbols.forEach((symbol, pairId) => {
      deck.push({ symbol, pairId }, { symbol, pairId });
    });
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    this.cards = deck.map((d, idx) => ({
      id: idx,
      symbol: d.symbol,
      pairId: d.pairId,
      col: idx % this.cols,
      row: Math.floor(idx / this.cols),
      state: 'down',
      flipT: 0,
      matchGlow: 0,
    }));
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (!this.isRunning || this.resolveTimer > 0) return;
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const layout = this.boardLayout();
    const col = Math.floor((x - layout.originX) / layout.cellSize);
    const row = Math.floor((y - layout.originY) / layout.cellSize);
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return;

    const card = this.cards.find(c => c.col === col && c.row === row);
    if (!card || card.state !== 'down') return;
    if (this.revealed.length >= 2) return;

    card.state = 'flipping-up';
    card.flipT = 0;
    this.context.host.playSFX('card_flip');
    this.revealed.push(card);

    if (this.revealed.length === 2) {
      const [a, b] = this.revealed;
      if (a.pairId === b.pairId) {
        this.resolveTimer = 0.35; // brief pause so the flip finishes before locking
      } else {
        this.resolveTimer = 0.9; // longer pause so the player can read both cards
      }
    }
  };

  private boardLayout(): { originX: number; originY: number; cellSize: number; gap: number } {
    const cw = this.canvas.width;
    const ch = this.canvas.height - 120; // leave room for the HUD strip
    const gap = 10;
    const cellSize = Math.min(
      (cw - gap * (this.cols + 1)) / this.cols,
      (ch - gap * (this.rows + 1)) / this.rows,
    );
    const boardW = cellSize * this.cols + gap * (this.cols + 1);
    const boardH = cellSize * this.rows + gap * (this.rows + 1);
    return {
      originX: (cw - boardW) / 2 + gap,
      originY: 120 + (ch - boardH) / 2 + gap,
      cellSize,
      gap,
    };
  }

  start(): void {
    this.isRunning = true;
    this.lastTickTime = performance.now();
    this.loop();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
  }

  private loop = (): void => {
    if (!this.isRunning) return;
    const now = performance.now();
    const dt = Math.min((now - this.lastTickTime) / 1000, 0.1);
    this.lastTickTime = now;

    this.update(dt);
    this.render();

    if (this.timeLeft > 0 && this.round < ROUND_SYMBOLS.length) {
      this.animFrameId = requestAnimationFrame(this.loop);
    } else {
      this.onGameOver();
    }
  };

  private update(dt: number): void {
    this.timeLeft = Math.max(0, this.timeLeft - dt);
    if (this.timeLeft <= 0) return;

    const flipSpeed = 6; // full flip in ~1/6s
    for (const card of this.cards) {
      if (card.state === 'flipping-up') {
        card.flipT = Math.min(1, card.flipT + dt * flipSpeed);
        if (card.flipT >= 1) card.state = 'up';
      } else if (card.state === 'flipping-down') {
        card.flipT = Math.min(1, card.flipT + dt * flipSpeed);
        if (card.flipT >= 1) { card.state = 'down'; card.flipT = 0; }
      }
      if (card.matchGlow > 0) card.matchGlow = Math.max(0, card.matchGlow - dt * 0.6);
    }

    if (this.resolveTimer > 0) {
      this.resolveTimer -= dt;
      if (this.resolveTimer <= 0) {
        this.resolveMatch();
      }
    }

    // Particles
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 220 * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter(p => p.life > 0);

    for (const t of this.floatingTexts) {
      t.y -= 30 * dt;
      t.life -= dt;
    }
    this.floatingTexts = this.floatingTexts.filter(t => t.life > 0);
  }

  private resolveMatch(): void {
    const [a, b] = this.revealed;
    if (!a || !b) { this.revealed = []; return; }

    if (a.pairId === b.pairId) {
      a.state = 'matched'; b.state = 'matched';
      a.matchGlow = 1; b.matchGlow = 1;
      this.pairsFound++;
      this.combo++;
      this.comboMax = Math.max(this.comboMax, this.combo);
      const gained = 40 * this.combo;
      this.score += gained;
      this.timeLeft += 3; // small bonus time keeps momentum going
      this.context.host.playSFX('match_chime');
      this.spawnBurst(a.col, a.row);
      this.spawnBurst(b.col, b.row);
      this.pushFloatingText(a.col, a.row, `+${gained}`, '#facc15');

      if (this.pairsFound >= this.totalPairs) {
        if (this.round + 1 < ROUND_SYMBOLS.length) {
          this.timeLeft += 8; // carry-over bonus for clearing a round early
          this.context.host.notify('Round complete! A tougher board awaits.', 'success');
          this.setupBoard(this.round + 1);
        } else {
          this.context.host.notify('Every case matched. Outstanding work.', 'success');
        }
      }
    } else {
      a.state = 'flipping-down'; a.flipT = 0;
      b.state = 'flipping-down'; b.flipT = 0;
      this.mistakes++;
      this.combo = 1;
      this.pushFloatingText(a.col, a.row, 'No match', '#f87171');
    }
    this.revealed = [];
  }

  private spawnBurst(col: number, row: number): void {
    const layout = this.boardLayout();
    const cx = layout.originX + col * (layout.cellSize + layout.gap) + layout.cellSize / 2;
    const cy = layout.originY + row * (layout.cellSize + layout.gap) + layout.cellSize / 2;
    const colors = ['#facc15', '#fbbf24', '#fde68a', '#f59e0b'];
    for (let i = 0; i < 14; i++) {
      const angle = (Math.PI * 2 * i) / 14 + Math.random() * 0.3;
      const speed = 60 + Math.random() * 90;
      this.particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        life: 0.6 + Math.random() * 0.3,
        maxLife: 0.9,
        color: colors[i % colors.length],
        size: 3 + Math.random() * 2,
      });
    }
  }

  private pushFloatingText(col: number, row: number, text: string, color: string): void {
    const layout = this.boardLayout();
    const cx = layout.originX + col * (layout.cellSize + layout.gap) + layout.cellSize / 2;
    const cy = layout.originY + row * (layout.cellSize + layout.gap);
    this.floatingTexts.push({ x: cx, y: cy, text, color, life: 0.9, maxLife: 0.9 });
  }

  private render(): void {
    const { ctx, canvas } = this;
    const cw = canvas.width, ch = canvas.height;

    // Parchment backdrop with a soft vignette
    const bgGrad = ctx.createLinearGradient(0, 0, 0, ch);
    bgGrad.addColorStop(0, '#3b2f22');
    bgGrad.addColorStop(1, '#241a10');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, cw, ch);

    this.renderBoard();
    this.renderParticles();
    this.renderFloatingTexts();
    this.renderHud();
  }

  private renderBoard(): void {
    const { ctx } = this;
    const layout = this.boardLayout();

    for (const card of this.cards) {
      const x = layout.originX + card.col * (layout.cellSize + layout.gap);
      const y = layout.originY + card.row * (layout.cellSize + layout.gap);
      const size = layout.cellSize;
      const cx = x + size / 2, cy = y + size / 2;

      // Flip progress: 0..0.5 shows the current face shrinking to a sliver,
      // 0.5..1 shows the new face growing back out — the classic fake-3D
      // card-flip trick done with a pure horizontal scale.
      let showFace: 'back' | 'front';
      let scaleX: number;
      if (card.state === 'flipping-up') {
        showFace = card.flipT < 0.5 ? 'back' : 'front';
        scaleX = Math.abs(Math.cos(card.flipT * Math.PI));
      } else if (card.state === 'flipping-down') {
        showFace = card.flipT < 0.5 ? 'front' : 'back';
        scaleX = Math.abs(Math.cos(card.flipT * Math.PI));
      } else {
        showFace = (card.state === 'up' || card.state === 'matched') ? 'front' : 'back';
        scaleX = 1;
      }

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(Math.max(0.05, scaleX), 1);

      const radius = 8;
      ctx.beginPath();
      ctx.roundRect(-size / 2, -size / 2, size, size, radius);

      if (showFace === 'back') {
        const g = ctx.createLinearGradient(-size / 2, -size / 2, size / 2, size / 2);
        g.addColorStop(0, '#1e3a5f');
        g.addColorStop(1, '#0f2440');
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = `${size * 0.4}px system-ui`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚖️', 0, 2);
      } else {
        const glow = card.matchGlow;
        ctx.fillStyle = card.state === 'matched' ? '#fef3c7' : '#f5ecd8';
        ctx.fill();
        ctx.strokeStyle = card.state === 'matched' ? '#f59e0b' : '#8a7654';
        ctx.lineWidth = card.state === 'matched' ? 3 : 2;
        ctx.stroke();
        if (glow > 0) {
          ctx.save();
          ctx.globalAlpha = glow * 0.6;
          ctx.shadowColor = '#facc15';
          ctx.shadowBlur = 24;
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 4;
          ctx.stroke();
          ctx.restore();
        }
        ctx.fillStyle = '#1c1408';
        ctx.font = `${size * 0.48}px system-ui`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(card.symbol, 0, 2);
      }
      ctx.restore();
    }
  }

  private renderParticles(): void {
    const { ctx } = this;
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private renderFloatingTexts(): void {
    const { ctx } = this;
    for (const t of this.floatingTexts) {
      ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
      ctx.fillStyle = t.color;
      ctx.font = 'bold 16px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  private renderHud(): void {
    const { ctx, canvas } = this;
    ctx.fillStyle = 'rgba(15, 12, 8, 0.85)';
    ctx.fillRect(16, 16, canvas.width - 32, 88);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.strokeRect(16, 16, canvas.width - 32, 88);

    ctx.fillStyle = '#f5ecd8';
    ctx.font = 'bold 15px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('📜 Tenant Rights Match', 28, 40);
    ctx.font = '13px system-ui';
    ctx.fillText(`Round ${this.round + 1}/${ROUND_SYMBOLS.length}  ·  Pairs ${this.pairsFound}/${this.totalPairs}`, 28, 62);
    ctx.fillText(`Combo x${this.combo}  ·  Score ${this.score}`, 28, 82);

    ctx.textAlign = 'right';
    ctx.font = 'bold 16px system-ui';
    ctx.fillStyle = this.timeLeft < 15 ? '#f87171' : '#f5ecd8';
    ctx.fillText(`⏱️ ${Math.ceil(this.timeLeft)}s`, canvas.width - 28, 40);
    ctx.font = '13px system-ui';
    ctx.fillStyle = '#f5ecd8';
    ctx.fillText(`Misses ${this.mistakes}`, canvas.width - 28, 62);
  }

  private onGameOver(): void {
    const completed = this.round + 1 >= ROUND_SYMBOLS.length && this.pairsFound >= this.totalPairs;
    const cashEarned = this.pairsFound * 6 + (completed ? 30 : 0);
    const trustEarned = Math.min(20, this.comboMax * 2);

    void this.context.host.grantRewards({
      cashDelta: cashEarned,
      trustDelta: trustEarned,
      energyDelta: -5,
    });

    this.context.host.notify(
      completed
        ? `Case closed! ${this.pairsFound} pairs matched, best combo x${this.comboMax} — +$${cashEarned} & +${trustEarned} Trust!`
        : `Time's up. ${this.pairsFound} pairs matched — +$${cashEarned} & +${trustEarned} Trust.`,
      'success',
    );

    setTimeout(() => {
      this.context.host.closeMinigame({ score: this.score, completed });
    }, 1800);
  }
}
