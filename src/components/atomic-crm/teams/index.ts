import type { Team } from "../types";
import { TeamShow } from "./TeamShow";
import { TeamsCreate } from "./TeamsCreate";
import { TeamsEdit } from "./TeamsEdit";
import { TeamsList } from "./TeamsList";

export default {
  list: TeamsList,
  show: TeamShow,
  create: TeamsCreate,
  edit: TeamsEdit,
  recordRepresentation: (record: Team) => record.name,
};
