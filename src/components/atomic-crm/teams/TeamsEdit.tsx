import { Edit } from "@/components/admin/edit";
import { SimpleForm } from "@/components/admin/simple-form";

import { TeamInputs } from "./TeamInputs";

export const TeamsEdit = () => (
  <Edit>
    <SimpleForm>
      <TeamInputs />
    </SimpleForm>
  </Edit>
);
