import type { GameSessionContext } from '@district-cg/shared-types';

interface DeliveryOrder {
  id: string;
  targetX: number;
  targetY: number;
  customerName: string;
  address: string;
}

interface Obstacle {
  x: number;
  y: number;
  radius: number;
  type: 'pothole' | 'cone' | 'pigeon';
}

export class CourierGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private context: GameSessionContext;
  private animFrameId: number | null = null;
  private isRunning = false;

  // World & Bike Physics
  private worldWidth = 1600;
  private worldHeight = 1200;
  private bikeX = 800;
  private bikeY = 600;
  private bikeAngle = 0;
  private bikeSpeed = 0;
  private maxSpeed = 7.5;
  private acceleration = 0.28;
  private friction = 0.96;
  private turnSpeed = 0.055;

  // Controls
  private keys: Record<string, boolean> = {};

  // Gameplay State
  private timeLeft = 75; // seconds
  private deliveries = 0;
  private combo = 1;
  private comboMax = 1;
  private crashes = 0;
  private score = 0;
  private hasCargo = true;
  private activeOrder: DeliveryOrder;
  private kitchenLocation = { x: 800, y: 600, radius: 45 };
  private obstacles: Obstacle[] = [];
  private lastTickTime = performance.now();

  constructor(canvas: HTMLCanvasElement, context: GameSessionContext) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not obtain 2D canvas context');
    this.ctx = ctx;
    this.context = context;

    this.activeOrder = this.generateOrder();
    this.generateObstacles();
    this.setupInputs();
  }

  private generateOrder(): DeliveryOrder {
    const customers = [
      { name: 'Mrs. Higgins', address: 'Apartment 3B (Tenement Block)' },
      { name: 'Sal\'s Corner', address: 'Deli Backroom' },
      { name: 'Marcus (Welder)', address: 'Canal Workshop Lot 4' },
      { name: 'Elena', address: 'Mutual Aid Hub Office' },
      { name: 'Arthur', address: 'Brownstone Porch' },
    ];
    const cust = customers[Math.floor(Math.random() * customers.length)];
    const margin = 120;
    return {
      id: `order_${Date.now()}`,
      targetX: margin + Math.random() * (this.worldWidth - margin * 2),
      targetY: margin + Math.random() * (this.worldHeight - margin * 2),
      customerName: cust.name,
      address: cust.address,
    };
  }

  private generateObstacles(): void {
    this.obstacles = [];
    for (let i = 0; i < 30; i++) {
      this.obstacles.push({
        x: 100 + Math.random() * (this.worldWidth - 200),
        y: 100 + Math.random() * (this.worldHeight - 200),
        radius: 18,
        type: Math.random() > 0.6 ? 'pothole' : Math.random() > 0.5 ? 'cone' : 'pigeon',
      });
    }
  }

  private setupInputs(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    this.keys[e.key.toLowerCase()] = true;
    if (e.key.toLowerCase() === 'b') {
      this.ringBell();
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys[e.key.toLowerCase()] = false;
  };

  private ringBell(): void {
    this.context.host.playSFX('bell');
    // Scatter nearby pigeons
    this.obstacles.forEach(obs => {
      if (obs.type === 'pigeon') {
        const dx = obs.x - this.bikeX;
        const dy = obs.y - this.bikeY;
        if (Math.hypot(dx, dy) < 140) {
          obs.x += (Math.random() - 0.5) * 200;
          obs.y += (Math.random() - 0.5) * 200;
        }
      }
    });
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
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
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

    // Input Handling
    if (this.keys['arrowup'] || this.keys['w']) {
      this.bikeSpeed = Math.min(this.maxSpeed, this.bikeSpeed + this.acceleration);
    } else if (this.keys['arrowdown'] || this.keys['s']) {
      this.bikeSpeed = Math.max(-this.maxSpeed * 0.4, this.bikeSpeed - this.acceleration * 1.5);
    } else {
      this.bikeSpeed *= this.friction;
    }

    if (Math.abs(this.bikeSpeed) > 0.2) {
      const dir = this.bikeSpeed > 0 ? 1 : -1;
      if (this.keys['arrowleft'] || this.keys['a']) {
        this.bikeAngle -= this.turnSpeed * dir;
      }
      if (this.keys['arrowright'] || this.keys['d']) {
        this.bikeAngle += this.turnSpeed * dir;
      }
    }

    // Move Bike
    this.bikeX += Math.cos(this.bikeAngle) * this.bikeSpeed;
    this.bikeY += Math.sin(this.bikeAngle) * this.bikeSpeed;

    // Boundaries
    this.bikeX = Math.max(30, Math.min(this.worldWidth - 30, this.bikeX));
    this.bikeY = Math.max(30, Math.min(this.worldHeight - 30, this.bikeY));

    // Obstacle Collisions
    for (const obs of this.obstacles) {
      const dist = Math.hypot(this.bikeX - obs.x, this.bikeY - obs.y);
      if (dist < obs.radius + 14) {
        if (Math.abs(this.bikeSpeed) > 2.5) {
          this.crashes++;
          this.combo = 1;
          this.bikeSpeed *= -0.3; // Bounce back
          this.context.host.notify(`Pothole hit! Combo lost.`, 'warning');
        }
      }
    }

    // Delivery Check
    if (this.hasCargo) {
      const distToCustomer = Math.hypot(this.bikeX - this.activeOrder.targetX, this.bikeY - this.activeOrder.targetY);
      if (distToCustomer < 35) {
        // Successful drop-off!
        this.deliveries++;
        this.score += 100 * this.combo;
        this.combo++;
        this.comboMax = Math.max(this.comboMax, this.combo);
        this.timeLeft += 10; // Bonus time
        this.hasCargo = false;
        this.context.host.notify(`Soup delivered to ${this.activeOrder.customerName}! (+10s bonus)`, 'success');
      }
    } else {
      // Return to kitchen to pick up next batch
      const distToKitchen = Math.hypot(this.bikeX - this.kitchenLocation.x, this.bikeY - this.kitchenLocation.y);
      if (distToKitchen < this.kitchenLocation.radius) {
        this.hasCargo = true;
        this.activeOrder = this.generateOrder();
        this.context.host.notify(`Fresh hot soup loaded! Head to ${this.activeOrder.address}`, 'info');
      }
    }
  }

  private render(): void {
    const { ctx, canvas } = this;
    const cw = canvas.width;
    const ch = canvas.height;

    // Camera follow
    const camX = this.bikeX - cw / 2;
    const camY = this.bikeY - ch / 2;

    ctx.save();
    ctx.clearRect(0, 0, cw, ch);

    // Background cobblestone grid
    ctx.translate(-camX, -camY);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);

    // Street grid lines
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    for (let x = 0; x < this.worldWidth; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.worldHeight);
      ctx.stroke();
    }
    for (let y = 0; y < this.worldHeight; y += 80) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.worldWidth, y);
      ctx.stroke();
    }

    // Draw Kitchen Base
    ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
    ctx.beginPath();
    ctx.arc(this.kitchenLocation.x, this.kitchenLocation.y, this.kitchenLocation.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 14px system-ui';
    ctx.fillText('🍲 Sal\'s Kitchen (Soup Depot)', this.kitchenLocation.x - 90, this.kitchenLocation.y - 50);

    // Draw Destination / Customer Target
    if (this.hasCargo) {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.3)';
      ctx.beginPath();
      ctx.arc(this.activeOrder.targetX, this.activeOrder.targetY, 35, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 13px system-ui';
      ctx.fillText(`Drop-off: ${this.activeOrder.customerName}`, this.activeOrder.targetX - 70, this.activeOrder.targetY - 40);
    }

    // Draw Obstacles
    for (const obs of this.obstacles) {
      if (obs.type === 'pothole') {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
        ctx.fill();
      } else if (obs.type === 'cone') {
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.moveTo(obs.x, obs.y - obs.radius);
        ctx.lineTo(obs.x + obs.radius * 0.8, obs.y + obs.radius);
        ctx.lineTo(obs.x - obs.radius * 0.8, obs.y + obs.radius);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(obs.x, obs.y, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw Cargo Bike Player
    ctx.save();
    ctx.translate(this.bikeX, this.bikeY);
    ctx.rotate(this.bikeAngle);

    // Bike Frame
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-18, -6, 36, 12);

    // Wheels
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-22, -4, 8, 8);
    ctx.fillRect(14, -4, 8, 8);

    // Cargo Box (back)
    ctx.fillStyle = this.hasCargo ? '#f59e0b' : '#64748b';
    ctx.fillRect(-16, -9, 14, 18);

    ctx.restore();

    ctx.restore(); // Restore camera

    // HUD Elements (Screen space)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(16, 16, 280, 110);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(16, 16, 280, 110);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 15px system-ui';
    ctx.fillText(`⏱️ Time: ${Math.ceil(this.timeLeft)}s`, 28, 42);
    ctx.fillText(`🍲 Deliveries: ${this.deliveries} (Combo x${this.combo})`, 28, 68);
    ctx.fillText(`🏆 Score: ${this.score}`, 28, 94);
    ctx.fillText(`Status: ${this.hasCargo ? 'Delivering Soup' : 'Return to Kitchen'}`, 28, 116);

    // Navigation Compass Arrow
    const targetX = this.hasCargo ? this.activeOrder.targetX : this.kitchenLocation.x;
    const targetY = this.hasCargo ? this.activeOrder.targetY : this.kitchenLocation.y;
    const angleToTarget = Math.atan2(targetY - this.bikeY, targetX - this.bikeX);

    ctx.save();
    ctx.translate(cw - 50, 50);
    ctx.rotate(angleToTarget);

    ctx.fillStyle = this.hasCargo ? '#f59e0b' : '#10b981';
    ctx.beginPath();
    ctx.moveTo(25, 0);
    ctx.lineTo(-12, -12);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-12, 12);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private onGameOver(): void {
    const cashEarned = this.deliveries * 8;
    const trustEarned = this.deliveries >= 3 ? 5 + this.deliveries : this.deliveries;

    void this.context.host.grantRewards({
      cashDelta: cashEarned,
      trustDelta: trustEarned,
      energyDelta: -5,
    });

    this.context.host.notify(
      `Shift Over! Deliveries: ${this.deliveries} | Earned: $${cashEarned} & +${trustEarned} Trust!`,
      'success',
    );

    setTimeout(() => {
      this.context.host.closeMinigame({
        score: this.score,
        completed: this.deliveries >= 3,
      });
    }, 1800);
  }
}
