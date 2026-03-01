import { Edit } from "@/components/admin/edit";
import { SimpleForm } from "@/components/admin/simple-form";

import { SprintInputs } from "./SprintInputs";

export const SprintsEdit = () => (
  <Edit>
    <SimpleForm>
      <SprintInputs />
    </SimpleForm>
  </Edit>
);
