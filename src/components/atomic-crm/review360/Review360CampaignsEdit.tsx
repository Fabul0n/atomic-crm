import { Edit } from "@/components/admin/edit";
import { SimpleForm } from "@/components/admin/simple-form";
import { NumberInput } from "@/components/admin/number-input";
import { TextInput } from "@/components/admin/text-input";

export function Review360CampaignsEdit() {
  return (
    <Edit>
      <SimpleForm>
        <TextInput source="name" label="Название" required />
        <NumberInput source="year" label="Год" min={2020} max={2030} />
      </SimpleForm>
    </Edit>
  );
}
