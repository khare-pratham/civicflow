export type Category = "Roads" | "Lighting" | "Waste" | "Parks" | "Footpaths" | "Other";
export type Priority = "Low" | "Normal" | "High" | "Urgent";
export type IssueStatus = "Submitted" | "Under review" | "Assigned" | "In progress" | "Resolved" | "Closed";

export interface Issue {
  id: number;
  title: string;
  description: string;
  category: Category;
  location: string;
  priority: Priority;
  status: IssueStatus;
  assigned_team: string | null;
  created_at: string;
  updated_at: string;
}

export interface IssueCreate {
  title: string;
  description: string;
  category: Category;
  location: string;
  priority: Priority;
}
