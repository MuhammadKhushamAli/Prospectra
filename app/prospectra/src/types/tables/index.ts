import type { TABLES } from "../../constants/tables";

export type TableKey = keyof typeof TABLES;
export type TableName = (typeof TABLES)[TableKey];

export interface DatabaseTables {
  organizations: TableName;
  organization_members: TableName;
  user_profiles: TableName;
  skills: TableName;
  user_skills: TableName;
  domain_verifications: TableName;
  companies: TableName;
  emails: TableName;
  search_progress: TableName;
}
