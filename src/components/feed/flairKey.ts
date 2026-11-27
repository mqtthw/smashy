// The phrase for each thread flair (the labels in lib/postConstants.ts stay English).
import type { MessageKey } from "@/lib/i18n/core";
import type { Flair } from "@/lib/postConstants";

const KEYS: Record<Flair, MessageKey> = {
  discussion: "feed.flair.discussion",
  question: "feed.flair.question",
  help: "feed.flair.help",
  newplayer: "feed.flair.newplayer",
  analysis: "feed.flair.analysis",
  news: "feed.flair.news",
  meme: "feed.flair.meme",
  art: "feed.flair.art",
  smash6: "feed.flair.smash6",
};

export const flairKey = (f: Flair): MessageKey => KEYS[f];
