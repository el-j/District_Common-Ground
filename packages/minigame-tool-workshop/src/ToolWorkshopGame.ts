import type { GameSessionContext } from '@district-cg/shared-types';

type BinId = 'mechanical' | 'electrical' | 'bike' | 'scrap';

interface Bin {
  id: BinId;
  label: string;
  emoji: string;
  color: string;
}

const BINS: Bin[] = [
  { id: 'mechanical', label: 'Mechanical', emoji: '🔧', color: '#94a3b8' },
  { id: 'electrical', label: 'Electrical', emoji: '🔌', color: '#facc15' },
  { id: 'bike', label: 'Bike', emoji: '🚲', color: '#38bdf8' },
  { id: 'scrap', label: 'Scrap', emoji: '🗑️', color: '#f87171' },
];

const PART_ICON: Record<Exclude<BinId, 'scrap'>, string> = {
  mechanical: '⚙️',
  electrical: '🔋',
  bike: '⛓️',
};

interface Part {
  id: number;
  category: Exclude<BinId, 'scrap'>;
  broken: boolean;
  x: number;
  resolved: boolean;
}

interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number;
}

interface Toast {
  x: number; y: number; text: string; color: string; life: number; maxLife: number;
}

const SESSION_LENGTH = 80;
const ZONE_MARGIN = 0.42; // pickup zone is the middle band of the belt, [0.42, 0.58] of its width

export class ToolWorkshopGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private context: GameSessionContext;
  private animFrameId: number | null = null;
  private isRunning = false;
  private lastTickTime = performance.now();

  private timeLeft = SESSION_LENGTH;
  private sorted = 0;
  private mistakes = 0;
  private combo = 1;
  private comboMax = 1;
  private score = 0;
  private beltOffset = 0;

  private nextPartId = 0;
  private spawnTimer = 0;
  private parts: Part[] = [];
  private shakeT = 0;

  private particles: Particle[] = [];
  private toasts: Toast[] = [];
  private binRects: { x: number; y: number; w: number; h: number; bin: Bin }[] = [];

  constructor(canvas: HTMLCanvasElement, context: GameSessionContext) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not obtain 2D canvas context');
    this.ctx = ctx;
    this.context = context;

    this.canvas.addEventListener('pointerdown', this.onPointerDown);
  }

  private beltSpeed(): number {
    return 0.16 + Math.min(0.14, this.sorted * 0.006);
  }

  private spawnInterval(): number {
    return Math.max(1.1, 2.4 - this.sorted * 0.04);
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (!this.isRunning) return;
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const hit = this.binRects.find(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
    if (!hit) return;
    this.handleBinClick(hit.bin.id);
  };

  private beltRange(): { x0: number; x1: number } {
    return { x0: 60, x1: this.canvas.width - 60 };
  }

  private handleBinClick(binId: BinId): void {
    const { x0, x1 } = this.beltRange();
    const zoneX0 = x0 + (x1 - x0) * ZONE_MARGIN;
    const zoneX1 = x0 + (x1 - x0) * (1 - ZONE_MARGIN);

    const target = this.parts.find(p => !p.resolved && p.x >= zoneX0 && p.x <= zoneX1);
    if (!target) {
      this.registerMistake();
      return;
    }

    const correctBin: BinId = target.broken ? 'scrap' : target.category;
    if (binId === correctBin) {
      target.resolved = true;
      this.parts = this.parts.filter(p => p.id !== target.id);
      this.sorted++;
      this.combo++;
      this.comboMax = Math.max(this.comboMax, this.combo);
      const gained = 20 * this.combo;
      this.score += gained;
      this.context.host.playSFX('clank_sort');
      this.spawnBurst(target.x, this.beltY(), BINS.find(b => b.id === correctBin)?.color ?? '#94a3b8');
      this.pushToast(`+${gained}`, '#facc15', target.x);
    } else {
      this.registerMistake();
    }
  }

  private registerMistake(): void {
    this.mistakes++;
    this.combo = 1;
    this.shakeT = 0.25;
    this.context.host.playSFX('buzzer');
    this.pushToast('Wrong bin!', '#f87171', this.canvas.width / 2);
  }

  private beltY(): number {
    return this.canvas.height / 2 + 10;
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

    if (this.timeLeft > 0) {
      this.animFrameId = requestAnimationFrame(this.loop);
    } else {
      this.onGameOver();
    }
  };

  private update(dt: number): void {
    this.timeLeft = Math.max(0, this.timeLeft - dt);
    this.beltOffset = (this.beltOffset + dt * 120) % 40;

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = this.spawnInterval();
      const categories: Exclude<BinId, 'scrap'>[] = ['mechanical', 'electrical', 'bike'];
      const category = categories[Math.floor(Math.random() * categories.length)];
      const broken = Math.random() < 0.22;
      const { x0 } = this.beltRange();
      this.parts.push({ id: this.nextPartId++, category, broken, x: x0 - 20, resolved: false });
    }

    const speed = this.beltSpeed() * this.canvas.width;
    const { x1 } = this.beltRange();
    for (const part of this.parts) {
      part.x += speed * dt;
    }
    for (const part of this.parts) {
      if (part.x > x1 + 20) {
        this.mistakes++;
        this.combo = 1;
        this.pushToast('Missed!', '#fbbf24', x1);
      }
    }
    this.parts = this.parts.filter(p => p.x <= x1 + 20);

    if (this.shakeT > 0) this.shakeT = Math.max(0, this.shakeT - dt);

    for (const p of this.particles) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; p.life -= dt;
    }
    this.particles = this.particles.filter(p => p.life > 0);
    for (const t of this.toasts) { t.y -= 25 * dt; t.life -= dt; }
    this.toasts = this.toasts.filter(t => t.life > 0);
  }

  private spawnBurst(x: number, y: number, color: string): void {
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 90;
      this.particles.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 40,
        life: 0.5 + Math.random() * 0.3, maxLife: 0.8, color, size: 3 + Math.random() * 2,
      });
    }
  }

  private pushToast(text: string, color: string, x: number): void {
    this.toasts.push({ x, y: this.beltY() - 30, text, color, life: 0.9, maxLife: 0.9 });
  }

  private render(): void {
    const { ctx, canvas } = this;
    const cw = canvas.width, ch = canvas.height;
    const shakeX = this.shakeT > 0 ? (Math.random() - 0.5) * 8 : 0;

    ctx.save();
    ctx.translate(shakeX, 0);

    const bg = ctx.createLinearGradient(0, 0, 0, ch);
    bg.addColorStop(0, '#232323');
    bg.addColorStop(1, '#141414');
    ctx.fillStyle = bg;
    ctx.fillRect(-20, 0, cw + 40, ch);

    this.renderBelt();
    this.renderParts();
    this.renderBins();
    this.renderParticles();
    this.renderToasts();
    this.renderHud();

    ctx.restore();
  }

  private renderBelt(): void {
    const { ctx, canvas } = this;
    const { x0, x1 } = this.beltRange();
    const y = this.beltY();
    const beltH = 46;

    ctx.fillStyle = '#3f3f3f';
    ctx.fillRect(x0 - 20, y - beltH / 2, x1 - x0 + 40, beltH);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 3;
    ctx.strokeRect(x0 - 20, y - beltH / 2, x1 - x0 + 40, beltH);

    // Scrolling hazard chevrons
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0 - 20, y - beltH / 2, x1 - x0 + 40, beltH);
    ctx.clip();
    ctx.fillStyle = 'rgba(250,204,21,0.25)';
    for (let sx = x0 - 40 + this.beltOffset; sx < x1 + 40; sx += 40) {
      ctx.beginPath();
      ctx.moveTo(sx, y - beltH / 2);
      ctx.lineTo(sx + 16, y - beltH / 2);
      ctx.lineTo(sx + 16 - beltH, y + beltH / 2);
      ctx.lineTo(sx - beltH, y + beltH / 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Pickup zone marker
    const zoneX0 = x0 + (x1 - x0) * ZONE_MARGIN;
    const zoneX1 = x0 + (x1 - x0) * (1 - ZONE_MARGIN);
    ctx.strokeStyle = 'rgba(94,234,212,0.8)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.strokeRect(zoneX0, y - beltH / 2 - 6, zoneX1 - zoneX0, beltH + 12);
    ctx.setLineDash([]);

    ctx.fillStyle = canvas.width < 500 ? 'transparent' : 'rgba(226,251,244,0.7)';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Pickup Zone', (zoneX0 + zoneX1) / 2, y - beltH / 2 - 12);
  }

  private renderParts(): void {
    const { ctx } = this;
    const y = this.beltY();
    for (const part of this.parts) {
      if (part.resolved) continue;
      ctx.save();
      if (part.broken) {
        ctx.shadowColor = '#f87171';
        ctx.shadowBlur = 10;
      }
      ctx.font = '28px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(PART_ICON[part.category], part.x, y);
      if (part.broken) {
        ctx.font = '16px system-ui';
        ctx.fillText('❗', part.x + 14, y - 14);
      }
      ctx.restore();
    }
  }

  private renderBins(): void {
    const { ctx, canvas } = this;
    this.binRects = [];
    const gap = 12;
    const binW = Math.min(110, (canvas.width - 32 - gap * (BINS.length - 1)) / BINS.length);
    const binH = 64;
    const totalW = binW * BINS.length + gap * (BINS.length - 1);
    const originX = (canvas.width - totalW) / 2;
    const y = canvas.height - binH - 20;

    BINS.forEach((bin, idx) => {
      const x = originX + idx * (binW + gap);
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.beginPath();
      ctx.roundRect(x, y, binW, binH, 10);
      ctx.fill();
      ctx.strokeStyle = bin.color;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = '26px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(bin.emoji, x + binW / 2, y + binH / 2 - 8);
      ctx.font = '11px system-ui';
      ctx.fillStyle = '#f1f5f9';
      ctx.fillText(bin.label, x + binW / 2, y + binH - 10);

      this.binRects.push({ x, y, w: binW, h: binH, bin });
    });
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

  private renderToasts(): void {
    const { ctx } = this;
    for (const t of this.toasts) {
      ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
      ctx.fillStyle = t.color;
      ctx.font = 'bold 14px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  private renderHud(): void {
    const { ctx, canvas } = this;
    ctx.fillStyle = 'rgba(10, 10, 10, 0.85)';
    ctx.fillRect(16, 16, canvas.width - 32, 88);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.strokeRect(16, 16, canvas.width - 32, 88);

    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 15px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('🛠️ Tool Library Workshop', 28, 40);
    ctx.font = '13px system-ui';
    ctx.fillStyle = '#f1f5f9';
    ctx.fillText(`Sorted ${this.sorted}  ·  Mistakes ${this.mistakes}  ·  Combo x${this.combo}`, 28, 62);
    ctx.fillText(`Score ${this.score}`, 28, 82);

    ctx.textAlign = 'right';
    ctx.font = 'bold 16px system-ui';
    ctx.fillStyle = this.timeLeft < 15 ? '#f87171' : '#f1f5f9';
    ctx.fillText(`⏱️ ${Math.ceil(this.timeLeft)}s`, canvas.width - 28, 44);
  }

  private onGameOver(): void {
    const cashEarned = this.sorted * 5;
    const trustEarned = Math.min(18, this.comboMax * 2);

    void this.context.host.grantRewards({
      cashDelta: cashEarned,
      trustDelta: trustEarned,
      energyDelta: -5,
    });

    this.context.host.notify(
      `Shift's done! ${this.sorted} parts sorted, best combo x${this.comboMax} — +$${cashEarned} & +${trustEarned} Trust!`,
      'success',
    );

    setTimeout(() => {
      this.context.host.closeMinigame({ score: this.score, completed: this.sorted >= 8 });
    }, 1800);
  }
}
