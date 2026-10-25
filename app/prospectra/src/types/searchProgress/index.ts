import { searchProgressSources, type SearchProgressSource } from "../../constants/searchProgress";

export interface SearchProgress {
  id: string;
  user_id: string;
  org_id: string;
  last_page_fetched: number;
  last_fetched_at?: string | null;
  source: SearchProgressSource;
  created_at: string;
}

export interface SearchProgressSkill {
  search_progress_id: string;
  skill_id: string;
  created_at?: string;
}

export interface SearchProgressIndustry {
  search_progress_id: string;
  industry_id: string;
  created_at?: string;
}

export { searchProgressSources };
export type { SearchProgressSource };
