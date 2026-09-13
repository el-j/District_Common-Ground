export interface NPCDefinition {
  id: string;
  name: string;
  token: string;
  position: { x: number; y: number };
  proximity: number;
  dialogueKey: string;
}

export class NPCEntity {
  private active = false;
  private _gossipLine: string | null = null;

  constructor(
    private readonly definition: NPCDefinition,
    private readonly onChange: (id: string, active: boolean) => void,
  ) {}

  setGossip(line: string): void {
    this._gossipLine = line;
  }

  get gossipLine(): string | null {
    return this._gossipLine;
  }

  update(playerX: number, playerY: number): void {
    const dx = playerX - this.definition.position.x;
    const dy = playerY - this.definition.position.y;
    const distance = Math.hypot(dx, dy);
    const nextActive = distance <= this.definition.proximity;

    if (nextActive !== this.active) {
      this.active = nextActive;
      this.onChange(this.definition.id, this.active);
    }
  }

  get id(): string {
    return this.definition.id;
  }

  get isActive(): boolean {
    return this.active;
  }

  get position(): { x: number; y: number } {
    return this.definition.position;
  }

  get dialogueKey(): string {
    return this.definition.dialogueKey;
  }

  get name(): string {
    return this.definition.name;
  }
}
