import type { Review360Campaign } from "../types";
import { Review360CampaignsCreate } from "./Review360CampaignsCreate";
import { Review360CampaignsEdit } from "./Review360CampaignsEdit";
import { Review360CampaignsList } from "./Review360CampaignsList";

export default {
  list: Review360CampaignsList,
  create: Review360CampaignsCreate,
  edit: Review360CampaignsEdit,
  recordRepresentation: (record: Review360Campaign) =>
    `${record.name} (${record.year})`,
};
