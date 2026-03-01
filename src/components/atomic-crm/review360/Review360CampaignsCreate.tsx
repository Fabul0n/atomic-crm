import { Create } from "@/components/admin/create";
import { SimpleForm } from "@/components/admin/simple-form";
import { NumberInput } from "@/components/admin/number-input";
import { TextInput } from "@/components/admin/text-input";

export function Review360CampaignsCreate() {
  return (
    <Create>
      <SimpleForm
        defaultValues={{ status: "draft", year: new Date().getFullYear() }}
      >
        <h2 className="text-lg font-semibold mb-4">Новая кампания 360°</h2>
        <TextInput source="name" label="Название" required />
        <NumberInput source="year" label="Год" min={2020} max={2030} />
      </SimpleForm>
    </Create>
  );
}
