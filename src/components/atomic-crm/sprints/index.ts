import type { Sprint } from "../types";
import { SprintShow } from "./SprintShow";
import { SprintsCreate } from "./SprintsCreate";
import { SprintsEdit } from "./SprintsEdit";
import { SprintsList } from "./SprintsList";

export default {
  list: SprintsList,
  show: SprintShow,
  create: SprintsCreate,
  edit: SprintsEdit,
  recordRepresentation: (record: Sprint) => record.name,
};
