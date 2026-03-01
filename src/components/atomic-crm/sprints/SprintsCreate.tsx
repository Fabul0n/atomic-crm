import { Create } from "@/components/admin/create";
import { SimpleForm } from "@/components/admin/simple-form";

import { SprintInputs } from "./SprintInputs";

export const SprintsCreate = () => (
  <Create>
    <SimpleForm defaultValues={{ status: "planned", team_ids: [], member_ids: [] }}>
      <SprintInputs />
    </SimpleForm>
  </Create>
);
