import type { GameSessionContext } from '@district-cg/shared-types';

interface PressureToken {
  id: number;
  lane: number;
  x: number; // 0 (building) .. 1 (spawn edge), in normalized lane-length units
  speed: number;
  weaken: number; // 0..1, how close to being defeated
}

interface Shield {
  active: boolean;
  cooldownReady: boolean;
  pulseT: number;
}

interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number;
}

interface Toast {
  x: number; y: number; text: string; color: string; life: number; maxLife: number;
}

const LANE_COUNT = 3;
const SHIELD_COST = 40; // out of 100 solidarity meter
const SHIELD_REGEN_PER_SEC = 14;
const SHIELD_LIFETIME = 5; // seconds a placed shield stays active
const WEAKEN_RATE = 0.9; // per second while a token sits inside an active shield
const SESSION_LENGTH = 90;
const START_LIVES = 5;

export class SolidarityLineGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private context: GameSessionContext;
  private animFrameId: number | null = null;
  private isRunning = false;
  private lastTickTime = performance.now();

  private timeLeft = SESSION_LENGTH;
  private lives = START_LIVES;
  private solidarity = 100;
  private score = 0;
  private defeated = 0;
  private breached = 0;

  private wave = 1;
  private spawnTimer = 0;
  private nextTokenId = 0;
  private tokens: PressureToken[] = [];
  private shields: Shield[] = [
    { active: false, cooldownReady: true, pulseT: 0 },
    { active: false, cooldownReady: true, pulseT: 0 },
    { active: false, cooldownReady: true, pulseT: 0 },
  ];
  private shieldRemaining: number[] = [0, 0, 0];

  private particles: Particle[] = [];
  private toasts: Toast[] = [];
  private laneSlotRects: { x: number; y: number; r: number; lane: number }[] = [];
  private shakeT = 0;

  constructor(canvas: HTMLCanvasElement, context: GameSessionContext) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not obtain 2D canvas context');
    this.ctx = ctx;
    this.context = context;

    this.canvas.addEventListener('pointerdown', this.onPointerDown);
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (!this.isRunning) return;
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const hit = this.laneSlotRects.find(s => Math.hypot(x - s.x, y - s.y) <= s.r);
    if (!hit) return;
    this.placeShield(hit.lane);
  };

  private placeShield(lane: number): void {
    const shield = this.shields[lane];
    if (shield.active || this.solidarity < SHIELD_COST) {
      if (this.solidarity < SHIELD_COST) this.pushToast('Not enough solidarity yet...', '#fbbf24', lane);
      return;
    }
    this.solidarity -= SHIELD_COST;
    shield.active = true;
    shield.pulseT = 0;
    this.shieldRemaining[lane] = SHIELD_LIFETIME;
    this.context.host.playSFX('shield_up');
    this.pushToast('Mutual aid on the line!', '#5eead4', lane);
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

    if (this.timeLeft > 0 && this.lives > 0) {
      this.animFrameId = requestAnimationFrame(this.loop);
    } else {
      this.onGameOver();
    }
  };

  private spawnRateForWave(): number {
    return Math.max(0.7, 2.4 - this.wave * 0.18);
  }

  private tokenSpeedForWave(): number {
    return 0.09 + this.wave * 0.01;
  }

  private update(dt: number): void {
    this.timeLeft = Math.max(0, this.timeLeft - dt);
    this.wave = 1 + Math.floor((SESSION_LENGTH - this.timeLeft) / 15);

    this.solidarity = Math.min(100, this.solidarity + SHIELD_REGEN_PER_SEC * dt);

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = this.spawnRateForWave();
      const lane = Math.floor(Math.random() * LANE_COUNT);
      this.tokens.push({ id: this.nextTokenId++, lane, x: 1, speed: this.tokenSpeedForWave(), weaken: 0 });
    }

    for (let i = 0; i < LANE_COUNT; i++) {
      if (this.shieldRemaining[i] > 0) {
        this.shieldRemaining[i] -= dt;
        this.shields[i].pulseT += dt;
        if (this.shieldRemaining[i] <= 0) {
          this.shields[i].active = false;
          this.shieldRemaining[i] = 0;
        }
      }
    }

    const slotX = 0.42; // normalized position of the shield slot along the lane
    for (const token of this.tokens) {
      const shield = this.shields[token.lane];
      const nearSlot = shield.active && Math.abs(token.x - slotX) < 0.09;
      if (nearSlot) {
        token.weaken += WEAKEN_RATE * dt;
        token.x -= token.speed * 0.15 * dt; // slowed while being weakened
      } else {
        token.x -= token.speed * dt;
      }
      if (token.weaken >= 1) {
        this.defeated++;
        this.score += 60 + this.wave * 5;
        this.spawnBurst(token, '#5eead4');
        this.context.host.playSFX('token_defeated');
      }
    }

    for (const token of this.tokens) {
      if (token.x <= 0 && token.weaken < 1) {
        this.lives--;
        this.breached++;
        this.shakeT = 0.35;
        this.spawnBurst(token, '#f87171');
        this.context.host.playSFX('breach_alarm');
        this.pushToast('Displacement pressure got through!', '#f87171', token.lane);
      }
    }
    this.tokens = this.tokens.filter(t => t.weaken < 1 && t.x > 0);

    for (const p of this.particles) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
    }
    this.particles = this.particles.filter(p => p.life > 0);
    for (const t of this.toasts) t.life -= dt;
    this.toasts = this.toasts.filter(t => t.life > 0);
    if (this.shakeT > 0) this.shakeT = Math.max(0, this.shakeT - dt);
  }

  private spawnBurst(token: PressureToken, color: string): void {
    const layout = this.laneLayout();
    const lane = layout[token.lane];
    if (!lane) return;
    const cx = lane.x0 + token.x * (lane.x1 - lane.x0);
    const cy = lane.y;
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 80;
      this.particles.push({
        x: cx, y: cy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.3, maxLife: 0.8, color, size: 3 + Math.random() * 2,
      });
    }
  }

  private pushToast(text: string, color: string, lane: number): void {
    const layout = this.laneLayout();
    const l = layout[lane];
    if (!l) return;
    this.toasts.push({ x: l.x0 + 60, y: l.y - 20, text, color, life: 1.1, maxLife: 1.1 });
  }

  private laneLayout(): { x0: number; x1: number; y: number; h: number }[] {
    const cw = this.canvas.width, ch = this.canvas.height;
    const top = 130, bottom = ch - 40;
    const laneH = (bottom - top) / LANE_COUNT;
    const x0 = 90, x1 = cw - 40;
    return Array.from({ length: LANE_COUNT }, (_, i) => ({
      x0, x1, y: top + laneH * i + laneH / 2, h: laneH,
    }));
  }

  private render(): void {
    const { ctx, canvas } = this;
    const cw = canvas.width, ch = canvas.height;
    const shakeX = this.shakeT > 0 ? (Math.random() - 0.5) * 10 : 0;

    ctx.save();
    ctx.translate(shakeX, 0);

    const bg = ctx.createLinearGradient(0, 0, 0, ch);
    bg.addColorStop(0, '#0c1f1a');
    bg.addColorStop(1, '#081310');
    ctx.fillStyle = bg;
    ctx.fillRect(-20, 0, cw + 40, ch);

    this.renderLanes();
    this.renderBuilding();
    this.renderTokens();
    this.renderParticles();
    this.renderToasts();
    this.renderHud();

    ctx.restore();
  }

  private renderLanes(): void {
    const { ctx } = this;
    const layout = this.laneLayout();
    layout.forEach((lane, i) => {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.015)';
      ctx.fillRect(lane.x0 - 30, lane.y - lane.h / 2, lane.x1 - lane.x0 + 30, lane.h);

      const slotX = lane.x0 + 0.42 * (lane.x1 - lane.x0);
      const shield = this.shields[i];
      this.laneSlotRects[i] = { x: slotX, y: lane.y, r: 26, lane: i };

      ctx.beginPath();
      ctx.arc(slotX, lane.y, 22, 0, Math.PI * 2);
      ctx.fillStyle = shield.active ? 'rgba(94,234,212,0.18)' : 'rgba(255,255,255,0.06)';
      ctx.fill();
      ctx.strokeStyle = shield.active ? '#5eead4' : 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (shield.active) {
        const pulse = 22 + Math.sin(shield.pulseT * 6) * 4;
        ctx.beginPath();
        ctx.arc(slotX, lane.y, pulse, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(94,234,212,0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.font = '20px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#e2fbf4';
      ctx.fillText(shield.active ? '🤝' : '➕', slotX, lane.y + 1);
    });
  }

  private renderBuilding(): void {
    const { ctx } = this;
    const layout = this.laneLayout();
    const midY = (layout[0].y + layout[LANE_COUNT - 1].y) / 2;
    ctx.font = '38px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🏛️', 55, midY);

    let heartsX = 20;
    for (let i = 0; i < START_LIVES; i++) {
      ctx.font = '13px system-ui';
      ctx.fillStyle = i < this.lives ? '#f87171' : 'rgba(255,255,255,0.2)';
      ctx.fillText('♥', heartsX, midY + 34);
      heartsX += 14;
    }
  }

  private renderTokens(): void {
    const { ctx } = this;
    const layout = this.laneLayout();
    for (const token of this.tokens) {
      const lane = layout[token.lane];
      if (!lane) continue;
      const cx = lane.x0 + token.x * (lane.x1 - lane.x0);
      const cy = lane.y;

      if (token.weaken > 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(cx - 16, cy - 26, 32, 5);
        ctx.fillStyle = '#5eead4';
        ctx.fillRect(cx - 16, cy - 26, 32 * token.weaken, 5);
      }

      ctx.font = '24px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('📄', cx, cy);
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

  private renderToasts(): void {
    const { ctx } = this;
    for (const t of this.toasts) {
      ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
      ctx.fillStyle = t.color;
      ctx.font = 'bold 13px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  private renderHud(): void {
    const { ctx, canvas } = this;
    ctx.fillStyle = 'rgba(8, 20, 17, 0.88)';
    ctx.fillRect(16, 16, canvas.width - 32, 92);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.strokeRect(16, 16, canvas.width - 32, 92);

    ctx.fillStyle = '#a7f3d0';
    ctx.font = 'bold 15px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('🛡️ Solidarity Line', 28, 40);
    ctx.font = '13px system-ui';
    ctx.fillStyle = '#e2fbf4';
    ctx.fillText(`Wave ${this.wave}  ·  Defeated ${this.defeated}  ·  Breached ${this.breached}`, 28, 62);
    ctx.fillText(`Score ${this.score}`, 28, 82);

    ctx.textAlign = 'right';
    ctx.font = 'bold 15px system-ui';
    ctx.fillStyle = this.timeLeft < 15 ? '#f87171' : '#e2fbf4';
    ctx.fillText(`⏱️ ${Math.ceil(this.timeLeft)}s`, canvas.width - 28, 40);

    // Solidarity meter
    const barW = 160, barX = canvas.width - 28 - barW;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(barX, 58, barW, 10);
    ctx.fillStyle = this.solidarity >= SHIELD_COST ? '#5eead4' : '#f59e0b';
    ctx.fillRect(barX, 58, barW * (this.solidarity / 100), 10);
    ctx.font = '11px system-ui';
    ctx.fillStyle = '#e2fbf4';
    ctx.textAlign = 'right';
    ctx.fillText('Solidarity', canvas.width - 28, 82);
  }

  private onGameOver(): void {
    const completed = this.lives > 0;
    const cashEarned = this.defeated * 5 + (completed ? 25 : 0);
    const resilienceEarned = Math.min(15, this.defeated);

    void this.context.host.grantRewards({
      cashDelta: cashEarned,
      resilienceDelta: resilienceEarned,
      energyDelta: -5,
    });

    this.context.host.notify(
      completed
        ? `The line held! ${this.defeated} pressure waves turned back — +$${cashEarned} & +${resilienceEarned} Resilience!`
        : `The line broke, but ${this.defeated} were still turned back — +$${cashEarned} & +${resilienceEarned} Resilience.`,
      'success',
    );

    setTimeout(() => {
      this.context.host.closeMinigame({ score: this.score, completed });
    }, 1800);
  }
}
