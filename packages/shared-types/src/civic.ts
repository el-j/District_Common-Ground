export interface CivicAction {
  id: string;
  title: string;
  organizer: string;
  startTime: string;
  locationSummary: string;
  sourceUrl: string;
  regionCode: string;
  /** One of the game's own fictional events — never shown as a real listing. */
  inFiction?: boolean;
}

export type LocalChapterType = 'tool_library' | 'community_fridge' | 'land_trust';

export interface LocalChapter {
  id: string;
  name: string;
  type: LocalChapterType;
  distanceKm: number;
  address: string;
  websiteUrl: string;
  /** One of the game's own fictional places — never shown as a real listing. */
  inFiction?: boolean;
}
