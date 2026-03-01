import { required } from "ra-core";
import { AutocompleteArrayInput } from "@/components/admin/autocomplete-array-input";
import { ReferenceArrayInput } from "@/components/admin/reference-array-input";
import { TextInput } from "@/components/admin/text-input";

import type { Sale } from "../types";

const saleOptionText = (record?: Sale) =>
  record ? `${record.first_name} ${record.last_name}` : "";

export const TeamInputs = () => {
  return (
    <div className="flex flex-col gap-4">
      <TextInput source="name" validate={required()} helperText={false} />
      <TextInput source="description" multiline rows={4} helperText={false} />
      <ReferenceArrayInput source="member_ids" reference="sales">
        <AutocompleteArrayInput
          label="Members"
          optionText={saleOptionText}
          helperText={false}
        />
      </ReferenceArrayInput>
    </div>
  );
};
