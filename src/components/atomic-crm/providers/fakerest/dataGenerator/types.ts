import type {
  Company,
  Contact,
  ContactNote,
  Deal,
  DealNote,
  Review180,
  Review360Answer,
  Review360Assignment,
  Review360Campaign,
  Sale,
  Sprint,
  Tag,
  Task,
  TaskFeedback,
  Team,
} from "../../../types";
import type { ConfigurationContextValue } from "../../../root/ConfigurationContext";

export interface Db {
  companies: Required<Company>[];
  contacts: Required<Contact>[];
  contact_notes: ContactNote[];
  deals: Deal[];
  deal_notes: DealNote[];
  sales: Sale[];
  teams: Team[];
  sprints: Sprint[];
  tags: Tag[];
  tasks: Task[];
  task_feedbacks: TaskFeedback[];
  reviews_180: Review180[];
  review_360_campaigns: Review360Campaign[];
  review_360_assignments: Review360Assignment[];
  review_360_answers: Review360Answer[];
  configuration: Array<{ id: number; config: ConfigurationContextValue }>;
}
