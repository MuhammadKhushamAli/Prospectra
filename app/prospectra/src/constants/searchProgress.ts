export const searchProgressSources = ["apollo", "tavily"] as const;
export type SearchProgressSource = (typeof searchProgressSources)[number];
