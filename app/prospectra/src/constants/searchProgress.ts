export const searchProgressSources = ["searxng", "apollo", "tavily"] as const;
export type SearchProgressSource = (typeof searchProgressSources)[number];
