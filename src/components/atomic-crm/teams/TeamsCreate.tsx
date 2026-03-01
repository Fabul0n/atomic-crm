import { Create } from "@/components/admin/create";
import { SimpleForm } from "@/components/admin/simple-form";

import { TeamInputs } from "./TeamInputs";

export const TeamsCreate = () => (
  <Create>
    <SimpleForm defaultValues={{ member_ids: [] }}>
      <TeamInputs />
    </SimpleForm>
  </Create>
);
