// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { playRadioStatic, getRadioAnalyser } = vi.hoisted(() => ({
  playRadioStatic: vi.fn(),
  getRadioAnalyser: vi.fn(() => null),
}));
vi.mock('../core/audio/SoundSynth', () => ({ playRadioStatic, getRadioAnalyser }));

import { RadioWidget } from './RadioWidget';

describe('RadioWidget', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts hidden and with no headline ticker until shown', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const widget = new RadioWidget(root);

    expect(root.querySelector<HTMLElement>('.radio-widget')!.hidden).toBe(true);
    void widget;
  });

  it('show() reveals the widget on the first frequency', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const widget = new RadioWidget(root);

    widget.show();

    const el = root.querySelector<HTMLElement>('.radio-widget')!;
    expect(el.hidden).toBe(false);
    expect(el.querySelector('.radio-freq')!.textContent).toBe('88.3 FM');
    expect(el.querySelector('.radio-name')!.textContent).toBe('Radio Free Commons');
  });

  it('hide() hides the widget again', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const widget = new RadioWidget(root);
    widget.show();

    widget.hide();

    expect(root.querySelector<HTMLElement>('.radio-widget')!.hidden).toBe(true);
  });

  it('closes via the × button', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const widget = new RadioWidget(root);
    widget.show();

    root.querySelector<HTMLButtonElement>('.radio-close')!.click();

    expect(root.querySelector<HTMLElement>('.radio-widget')!.hidden).toBe(true);
  });

  it('closes on Escape only while visible', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const widget = new RadioWidget(root);
    widget.show();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(root.querySelector<HTMLElement>('.radio-widget')!.hidden).toBe(true);
  });

  it('tuning forward plays static immediately, then advances to the next frequency after the tune delay', () => {
    vi.useFakeTimers();
    const root = document.createElement('div');
    document.body.appendChild(root);
    const widget = new RadioWidget(root);
    widget.show();

    root.querySelector<HTMLButtonElement>('.radio-next')!.click();
    expect(playRadioStatic).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(300);

    expect(root.querySelector('.radio-freq')!.textContent).toBe('94.7 FM');
    expect(root.querySelector('.radio-name')!.textContent).toBe('The Solidarity Hour');
  });

  it('tuning backward from the first frequency wraps to the last one', () => {
    vi.useFakeTimers();
    const root = document.createElement('div');
    document.body.appendChild(root);
    const widget = new RadioWidget(root);
    widget.show();

    root.querySelector<HTMLButtonElement>('.radio-prev')!.click();
    vi.advanceTimersByTime(300);

    expect(root.querySelector('.radio-freq')!.textContent).toBe('103.1 FM');
  });

  it('shows headline ticker content from the injected getHeadlines callback', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const widget = new RadioWidget(root, () => ['Tool Drive tomorrow', 'Fridge Restock today']);

    widget.show();

    const wrap = root.querySelector<HTMLElement>('.radio-ticker')!;
    expect(wrap.hidden).toBe(false);
    expect(wrap.querySelector('.radio-ticker-track')!.textContent).toBe('Tool Drive tomorrow   •   Fridge Restock today');
  });

  it('hides the ticker row when there are no headlines', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const widget = new RadioWidget(root, () => []);

    widget.show();

    expect(root.querySelector<HTMLElement>('.radio-ticker')!.hidden).toBe(true);
  });
});
