import type { GameSessionContext } from '@district-cg/shared-types';

interface Ingredient {
  emoji: string;
  name: string;
  color: string;
}

const PANTRY: Ingredient[] = [
  { emoji: '🥕', name: 'Carrot', color: '#f97316' },
  { emoji: '🧄', name: 'Garlic', color: '#f5f0e8' },
  { emoji: '🫘', name: 'Beans', color: '#92400e' },
  { emoji: '🍅', name: 'Tomato', color: '#ef4444' },
  { emoji: '🧂', name: 'Salt', color: '#e5e7eb' },
  { emoji: '🌿', name: 'Herbs', color: '#22c55e' },
  { emoji: '🍞', name: 'Bread', color: '#d97706' },
  { emoji: '🥔', name: 'Potato', color: '#ca8a04' },
];

const RECIPE_NAMES: Record<number, string[]> = {
  2: ['Quick Broth', 'Garlic Toast', 'Simple Salad'],
  3: ['Lentil Soup', "Grandma's Chili", 'Root Vegetable Stew'],
  4: ['Community Feast Pot', "Sal's Sunday Stew", 'Big Batch Kitchen Special'],
};

interface Order {
  name: string;
  recipe: Ingredient[];
  progress: number;
  timeLeft: number;
  maxTime: number;
}

interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number;
}

interface Toast {
  x: number; y: number; text: string; color: string; life: number; maxLife: number;
}

export class KitchenRushGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private context: GameSessionContext;
  private animFrameId: number | null = null;
  private isRunning = false;
  private lastTickTime = performance.now();

  private timeLeft = 75;
  private served = 0;
  private missed = 0;
  private combo = 1;
  private comboMax = 1;
  private score = 0;
  private ordersCompleted = 0;

  private activeOrder: Order;
  private shakeT = 0;
  private serveFlashT = 0;

  private particles: Particle[] = [];
  private toasts: Toast[] = [];
  private pantryButtonRects: { x: number; y: number; w: number; h: number; ingredient: Ingredient }[] = [];

  constructor(canvas: HTMLCanvasElement, context: GameSessionContext) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not obtain 2D canvas context');
    this.ctx = ctx;
    this.context = context;

    this.activeOrder = this.generateOrder();
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
  }

  private recipeLengthForTier(): number {
    if (this.ordersCompleted < 3) return 2;
    if (this.ordersCompleted < 7) return 3;
    return 4;
  }

  private generateOrder(): Order {
    const length = this.recipeLengthForTier();
    const names = RECIPE_NAMES[length] ?? RECIPE_NAMES[2];
    const name = names[Math.floor(Math.random() * names.length)];
    const shuffled = [...PANTRY].sort(() => Math.random() - 0.5);
    const recipe = shuffled.slice(0, length);
    const maxTime = 8 + length * 4;
    return { name, recipe, progress: 0, timeLeft: maxTime, maxTime };
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (!this.isRunning) return;
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const hit = this.pantryButtonRects.find(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
    if (!hit) return;
    this.handleIngredientClick(hit.ingredient);
  };

  private handleIngredientClick(ingredient: Ingredient): void {
    const expected = this.activeOrder.recipe[this.activeOrder.progress];
    if (expected && expected.emoji === ingredient.emoji) {
      this.activeOrder.progress++;
      this.context.host.playSFX('chop');
      this.spawnSparkle(ingredient.color);
      if (this.activeOrder.progress >= this.activeOrder.recipe.length) {
        this.serveOrder();
      }
    } else {
      this.combo = 1;
      this.shakeT = 0.3;
      this.context.host.playSFX('sizzle_fail');
      this.pushToast('Wrong ingredient!', '#f87171');
    }
  }

  private serveOrder(): void {
    this.served++;
    this.ordersCompleted++;
    this.combo++;
    this.comboMax = Math.max(this.comboMax, this.combo);
    const gained = 30 * this.activeOrder.recipe.length * this.combo / 2;
    this.score += Math.round(gained);
    this.timeLeft = Math.min(this.timeLeft + 4, 999);
    this.serveFlashT = 0.5;
    this.context.host.playSFX('serve_ding');
    this.pushToast(`${this.activeOrder.name} served! +${Math.round(gained)}`, '#4ade80');
    this.context.host.notify(`${this.activeOrder.name} served, Combo x${this.combo}!`, 'success');
    this.activeOrder = this.generateOrder();
  }

  private missOrder(): void {
    this.missed++;
    this.combo = 1;
    this.pushToast(`${this.activeOrder.name} sent away hungry...`, '#fbbf24');
    this.context.host.notify(`${this.activeOrder.name} timed out — try to keep up!`, 'warning');
    this.activeOrder = this.generateOrder();
  }

  private spawnSparkle(color: string): void {
    const cx = this.canvas.width / 2;
    const cy = 230;
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 70;
      this.particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 30,
        life: 0.5 + Math.random() * 0.3, maxLife: 0.8, color, size: 3 + Math.random() * 2,
      });
    }
  }

  private pushToast(text: string, color: string): void {
    this.toasts.push({ x: this.canvas.width / 2, y: 180, text, color, life: 1.1, maxLife: 1.1 });
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
    this.activeOrder.timeLeft -= dt;
    if (this.activeOrder.timeLeft <= 0) this.missOrder();

    if (this.shakeT > 0) this.shakeT = Math.max(0, this.shakeT - dt);
    if (this.serveFlashT > 0) this.serveFlashT = Math.max(0, this.serveFlashT - dt);

    for (const p of this.particles) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; p.life -= dt;
    }
    this.particles = this.particles.filter(p => p.life > 0);

    for (const t of this.toasts) t.life -= dt;
    this.toasts = this.toasts.filter(t => t.life > 0);
  }

  private render(): void {
    const { ctx, canvas } = this;
    const cw = canvas.width, ch = canvas.height;
    const shakeX = this.shakeT > 0 ? (Math.random() - 0.5) * 8 : 0;

    ctx.save();
    ctx.translate(shakeX, 0);

    const bg = ctx.createLinearGradient(0, 0, 0, ch);
    bg.addColorStop(0, this.serveFlashT > 0 ? '#3f2a12' : '#2b1c10');
    bg.addColorStop(1, '#1a1108');
    ctx.fillStyle = bg;
    ctx.fillRect(-20, 0, cw + 40, ch);

    this.renderStove();
    this.renderOrderCard();
    this.renderPantry();
    this.renderParticles();
    this.renderToasts();
    this.renderHud();

    ctx.restore();
  }

  private renderStove(): void {
    const { ctx, canvas } = this;
    const cx = canvas.width / 2;
    ctx.save();
    ctx.globalAlpha = 0.5 + Math.sin(performance.now() / 200) * 0.15;
    ctx.font = '42px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('🔥', cx - 90, 260);
    ctx.fillText('🔥', cx + 90, 260);
    ctx.restore();
  }

  private renderOrderCard(): void {
    const { ctx, canvas } = this;
    const cx = canvas.width / 2;
    const cardW = Math.min(420, canvas.width - 48);
    const cardX = cx - cardW / 2;
    const cardY = 130;
    const cardH = 130;

    ctx.fillStyle = 'rgba(255,250,240,0.96)';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 14);
    ctx.fill();
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#3b2412';
    ctx.font = 'bold 18px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(this.activeOrder.name, cx, cardY + 26);

    // Recipe sequence with progress highlight
    const iconSize = 34;
    const gap = 12;
    const totalW = this.activeOrder.recipe.length * iconSize + (this.activeOrder.recipe.length - 1) * gap;
    let ix = cx - totalW / 2;
    this.activeOrder.recipe.forEach((ing, idx) => {
      const done = idx < this.activeOrder.progress;
      const isNext = idx === this.activeOrder.progress;
      ctx.save();
      if (isNext) {
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 14;
      }
      ctx.globalAlpha = done ? 0.35 : 1;
      ctx.font = `${iconSize}px system-ui`;
      ctx.textAlign = 'left';
      ctx.fillText(ing.emoji, ix, cardY + 74);
      ctx.restore();
      if (isNext) {
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.strokeRect(ix - 4, cardY + 74 - iconSize + 2, iconSize + 8, iconSize + 6);
      }
      ix += iconSize + gap;
    });

    // Timer bar
    const pct = Math.max(0, this.activeOrder.timeLeft / this.activeOrder.maxTime);
    const barY = cardY + cardH - 16;
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(cardX + 20, barY, cardW - 40, 8);
    ctx.fillStyle = pct < 0.3 ? '#ef4444' : '#22c55e';
    ctx.fillRect(cardX + 20, barY, (cardW - 40) * pct, 8);
  }

  private renderPantry(): void {
    const { ctx, canvas } = this;
    this.pantryButtonRects = [];
    const cols = 4;
    const rows = Math.ceil(PANTRY.length / cols);
    const btnSize = Math.min(76, (canvas.width - 64) / cols - 10);
    const gap = 12;
    const totalW = cols * btnSize + (cols - 1) * gap;
    const originX = (canvas.width - totalW) / 2;
    const originY = canvas.height - rows * (btnSize + gap) - 24;

    PANTRY.forEach((ing, idx) => {
      const col = idx % cols, row = Math.floor(idx / cols);
      const x = originX + col * (btnSize + gap);
      const y = originY + row * (btnSize + gap);

      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.roundRect(x, y, btnSize, btnSize, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = `${btnSize * 0.5}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ing.emoji, x + btnSize / 2, y + btnSize / 2);

      this.pantryButtonRects.push({ x, y, w: btnSize, h: btnSize, ingredient: ing });
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
    this.toasts.forEach((t, idx) => {
      ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
      ctx.fillStyle = t.color;
      ctx.font = 'bold 15px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(t.text, t.x, t.y - idx * 20);
    });
    ctx.globalAlpha = 1;
  }

  private renderHud(): void {
    const { ctx, canvas } = this;
    ctx.fillStyle = 'rgba(15, 12, 8, 0.85)';
    ctx.fillRect(16, 16, canvas.width - 32, 88);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.strokeRect(16, 16, canvas.width - 32, 88);

    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 15px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('🍲 Community Kitchen Rush', 28, 40);
    ctx.font = '13px system-ui';
    ctx.fillStyle = '#f5ecd8';
    ctx.fillText(`Served ${this.served}  ·  Missed ${this.missed}  ·  Combo x${this.combo}`, 28, 62);
    ctx.fillText(`Score ${this.score}`, 28, 82);

    ctx.textAlign = 'right';
    ctx.font = 'bold 16px system-ui';
    ctx.fillStyle = this.timeLeft < 15 ? '#f87171' : '#f5ecd8';
    ctx.fillText(`⏱️ ${Math.ceil(this.timeLeft)}s`, canvas.width - 28, 44);
  }

  private onGameOver(): void {
    const cashEarned = this.served * 7;
    const trustEarned = Math.min(20, this.comboMax * 2);

    void this.context.host.grantRewards({
      cashDelta: cashEarned,
      trustDelta: trustEarned,
      energyDelta: -5,
    });

    this.context.host.notify(
      `Shift over! Served ${this.served} orders, best combo x${this.comboMax} — +$${cashEarned} & +${trustEarned} Trust!`,
      'success',
    );

    setTimeout(() => {
      this.context.host.closeMinigame({ score: this.score, completed: this.served >= 5 });
    }, 1800);
  }
}
