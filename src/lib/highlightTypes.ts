// Highlight types (shared by server and browser).
export const HIGHLIGHT_TYPES = {
  combo_video: "Combo video",
  guide: "Guide",
  matchup: "Matchup",
  tech: "Tech",
  frame_data: "Frame data",
  vod: "Set VOD",
  other: "Other",
} as const;
export type HighlightType = keyof typeof HIGHLIGHT_TYPES;
export const GUIDE_MAX_LENGTH = 20000;
