import { DistrictGrid } from '../builder/DistrictGrid';

export class DistrictBuilderModal {
  private el: HTMLElement;
  private grid: DistrictGrid;

  constructor(root: HTMLElement, onClose?: () => void) {
    this.el = document.createElement('div');
    this.el.className = 'district-builder-modal-backdrop';

    const card = document.createElement('div');
    card.className = 'district-builder-card';

    // Header
    const header = document.createElement('div');
    header.className = 'district-builder-header';

    const titleGroup = document.createElement('div');
    const title = document.createElement('h2');
    title.textContent = '🏗️ Living District Builder';
    title.className = 'district-builder-title';

    const subtitle = document.createElement('div');
    subtitle.textContent = 'Upgrade neighborhood parcels, build collective commons, and harvest daily supplies.';
    subtitle.className = 'district-builder-subtitle';

    titleGroup.appendChild(title);
    titleGroup.appendChild(subtitle);

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.title = 'Back to Streets [Esc]';
    closeBtn.className = 'district-builder-close';
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
