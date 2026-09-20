// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LocalChapter, CivicAction } from '@district-cg/shared-types';

vi.mock('../world/InputManager', () => ({
  inputManager: { setLocked: vi.fn() },
}));
vi.mock('../core/audio/SoundSynth', () => ({ playUIClick: vi.fn(), playSolidarityChime: vi.fn() }));

const { getLocalChapters, getCivicTicker } = vi.hoisted(() => ({
  getLocalChapters: vi.fn(),
  getCivicTicker: vi.fn(),
}));
vi.mock('../api/endpoints/civic', () => ({ getLocalChapters, getCivicTicker }));

const { buildSimplePdf, downloadPdf } = vi.hoisted(() => ({
  buildSimplePdf: vi.fn((_paragraphs: string[]) => new Blob()),
  downloadPdf: vi.fn(),
}));
vi.mock('../core/util/PdfGenerator', () => ({ buildSimplePdf, downloadPdf }));

import { CivicDirectoryModal } from './CivicDirectoryModal';
import { useGameStore, INITIAL_STATE } from '../core/state/useGameStore';
import { playSolidarityChime } from '../core/audio/SoundSynth';

function flush() {
  return Promise.resolve().then(() => Promise.resolve());
}

const CHAPTERS: LocalChapter[] = [
  { id: 'c1', name: 'Riverside Tool Share', type: 'tool_library', distanceKm: 1.2, address: '12 Canal St', websiteUrl: 'https://example.org/c1' },
  { id: 'c2', name: 'Corner Fridge Collective', type: 'community_fridge', distanceKm: 3.4, address: '5 Market Rd', websiteUrl: 'https://example.org/c2' },
];
const ACTIONS: CivicAction[] = [
  { id: 'a1', title: 'Tool Drive', organizer: 'Riverside Tool Share', startTime: '2026-09-25', locationSummary: 'Canal St', sourceUrl: 'https://example.org/a1', regionCode: 'GENERIC' },
];

describe('CivicDirectoryModal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    useGameStore.setState({ ...INITIAL_STATE });
  });

  it('shows a loading message, then the fetched chapters', async () => {
    getLocalChapters.mockResolvedValueOnce(CHAPTERS);
    getCivicTicker.mockResolvedValueOnce(ACTIONS);
    const root = document.createElement('div');
    document.body.appendChild(root);
    new CivicDirectoryModal(root);

    expect(root.querySelector('.civic-directory-status')!.textContent).toMatch(/Loading/i);
    await flush();

    expect(root.querySelectorAll('.civic-chapter-row')).toHaveLength(2);
    expect(getLocalChapters).toHaveBeenCalledWith('GENERIC');
  });

  it('shows a friendly error when the directory fetch fails', async () => {
    getLocalChapters.mockRejectedValueOnce(new Error('down'));
    getCivicTicker.mockRejectedValueOnce(new Error('down'));
    const root = document.createElement('div');
    document.body.appendChild(root);
    new CivicDirectoryModal(root);
    await flush();

    expect(root.querySelector('.civic-directory-status')!.textContent).toMatch(/Could not load/i);
    expect(root.querySelectorAll('.civic-chapter-row')).toHaveLength(0);
  });

  it('filters chapters by name/address/type as the search input changes', async () => {
    getLocalChapters.mockResolvedValueOnce(CHAPTERS);
    getCivicTicker.mockResolvedValueOnce(ACTIONS);
    const root = document.createElement('div');
    document.body.appendChild(root);
    new CivicDirectoryModal(root);
    await flush();

    const input = root.querySelector<HTMLInputElement>('.civic-search-input')!;
    input.value = 'fridge';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    const rows = root.querySelectorAll('.civic-chapter-row');
    expect(rows).toHaveLength(1);
    expect(rows[0]!.textContent).toContain('Corner Fridge Collective');
  });

  it('shows a no-match message for a query that matches nothing', async () => {
    getLocalChapters.mockResolvedValueOnce(CHAPTERS);
    getCivicTicker.mockResolvedValueOnce(ACTIONS);
    const root = document.createElement('div');
    document.body.appendChild(root);
    new CivicDirectoryModal(root);
    await flush();

    const input = root.querySelector<HTMLInputElement>('.civic-search-input')!;
    input.value = 'nonexistent-zzz';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(root.querySelectorAll('.civic-chapter-row')).toHaveLength(0);
    expect(root.querySelector('.civic-directory-status')!.textContent).toMatch(/No chapters match/i);
  });

  it('downloads the starter kit PDF with chapters and actions baked in', async () => {
    getLocalChapters.mockResolvedValueOnce(CHAPTERS);
    getCivicTicker.mockResolvedValueOnce(ACTIONS);
    const root = document.createElement('div');
    document.body.appendChild(root);
    new CivicDirectoryModal(root);
    await flush();

    root.querySelector<HTMLButtonElement>('.civic-starter-kit-btn')!.click();

    expect(playSolidarityChime).toHaveBeenCalledTimes(1);
    expect(buildSimplePdf).toHaveBeenCalledTimes(1);
    const paragraphs = buildSimplePdf.mock.calls[0]![0] as string[];
    expect(paragraphs.some(p => p.includes('Riverside Tool Share'))).toBe(true);
    expect(paragraphs.some(p => p.includes('Tool Drive'))).toBe(true);
    expect(downloadPdf).toHaveBeenCalledWith('found-a-commons-starter-kit.pdf', expect.any(Blob));
  });
});
