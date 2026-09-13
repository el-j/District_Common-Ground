import { DistrictGrid } from '../builder/DistrictGrid';

export class DistrictBuilderModal {
  private el: HTMLElement;
  private grid: DistrictGrid;

  constructor(root: HTMLElement, onClose?: () => void) {
    this.el = document.createElement('div');
    this.el.className = 'modal-backdrop district-builder-modal-backdrop';
    this.el.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 9500;
      background: rgba(15, 23, 42, 0.88);
      backdrop-filter: blur(10px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      overflow-y: auto;
    `;

    const card = document.createElement('div');
    card.className = 'district-builder-card';
    card.style.cssText = `
      background: #1e293b;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 16px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      width: 100%;
      max-width: 960px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      color: #f8fafc;
      animation: fadeInScale 0.25s ease-out;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    `;

    const titleGroup = document.createElement('div');
    const title = document.createElement('h2');
    title.textContent = '🏗️ Living District Builder';
    title.style.cssText = `margin: 0; font-size: 1.4rem; font-weight: 700; color: #10b981;`;

    const subtitle = document.createElement('div');
    subtitle.textContent = 'Upgrade neighborhood parcels, build collective commons, and harvest daily supplies.';
    subtitle.style.cssText = `font-size: 0.85rem; color: #94a3b8; margin-top: 4px;`;

    titleGroup.appendChild(title);
    titleGroup.appendChild(subtitle);

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.title = 'Back to Streets [Esc]';
    closeBtn.style.cssText = `
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #fff;
      font-size: 1.5rem;
      width: 38px;
      height: 38px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    `;
    closeBtn.onclick = () => this.close(onClose);

    header.appendChild(titleGroup);
    header.appendChild(closeBtn);
    card.appendChild(header);

    // Grid Container
    const gridContainer = document.createElement('div');
    gridContainer.className = 'district-grid-mount-point';
    card.appendChild(gridContainer);

    this.grid = new DistrictGrid(gridContainer, {
      onHarvest: (_parcel, resource, amount) => {
        console.info(`Harvested ${amount} ${resource}`);
      },
    });
    this.grid.render();

    this.el.appendChild(card);
    root.appendChild(this.el);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.removeEventListener('keydown', onKeyDown);
        this.close(onClose);
      }
    };
    window.addEventListener('keydown', onKeyDown);
  }

  private close(onClose?: () => void): void {
    if (this.el.parentElement) {
      this.el.parentElement.removeChild(this.el);
    }
    onClose?.();
  }
}
