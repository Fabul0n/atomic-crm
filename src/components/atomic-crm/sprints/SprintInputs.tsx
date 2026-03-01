import { required } from "ra-core";
import { AutocompleteArrayInput } from "@/components/admin/autocomplete-array-input";
import { DateInput } from "@/components/admin/date-input";
import { ReferenceArrayInput } from "@/components/admin/reference-array-input";
import { SelectInput } from "@/components/admin/select-input";
import { TextInput } from "@/components/admin/text-input";

import type { Sale, Team } from "../types";

const sprintStatuses = [
  { id: "planned", name: "Planned" },
  { id: "active", name: "Active" },
  { id: "completed", name: "Completed" },
];

const saleOptionText = (record?: Sale) =>
  record ? `${record.first_name} ${record.last_name}` : "";

const teamOptionText = (record?: Team) => (record ? record.name : "");

export const SprintInputs = () => {
  return (
    <div className="flex flex-col gap-4">
      <TextInput source="name" validate={required()} helperText={false} />
      <TextInput source="goal" multiline rows={4} helperText={false} />
      <SelectInput
        source="status"
        choices={sprintStatuses}
        defaultValue="planned"
        validate={required()}
        helperText={false}
      />
      <DateInput source="start_date" validate={required()} helperText={false} />
      <DateInput source="end_date" validate={required()} helperText={false} />
      <ReferenceArrayInput source="team_ids" reference="teams">
        <AutocompleteArrayInput
          label="Assigned teams"
          optionText={teamOptionText}
          helperText={false}
        />
      </ReferenceArrayInput>
      <ReferenceArrayInput source="member_ids" reference="sales">
        <AutocompleteArrayInput
          label="Direct participants"
          optionText={saleOptionText}
          helperText={false}
        />
      </ReferenceArrayInput>
    </div>
  );
};
