export interface GitLabLabel {
  id: number;
  name: string;
  color: string;
  text_color: string;
  description: string | null;
}

export interface GitLabUser {
  id: number;
  name: string;
  username: string;
  avatar_url: string;
  web_url: string;
}

export interface GitLabEpic {
  id: number;
  iid: number;
  group_id: number;
  title: string;
  description: string | null;
  state: "opened" | "closed";
  labels: string[];
  author: GitLabUser;
  assignees?: GitLabUser[];
  start_date: string | null;
  end_date: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  web_url: string;
  references: { short: string; relative: string; full: string };
  upvotes: number;
  downvotes: number;
  color: string | null;
}

export interface BoardColumn {
  id: string;
  label: string;
  color: string;
  epics: GitLabEpic[];
}
