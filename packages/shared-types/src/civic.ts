export interface CivicAction {
  id: string;
  title: string;
  organizer: string;
  startTime: string;
  locationSummary: string;
  sourceUrl: string;
  regionCode: string;
}

export type LocalChapterType = 'tool_library' | 'community_fridge' | 'land_trust';

export interface LocalChapter {
  id: string;
  name: string;
  type: LocalChapterType;
  distanceKm: number;
  address: string;
  websiteUrl: string;
}
