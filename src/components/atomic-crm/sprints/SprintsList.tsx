import { useListContext, useRecordContext, useTranslate } from "ra-core";
import { CreateButton } from "@/components/admin/create-button";
import { DataTable } from "@/components/admin/data-table";
import { List } from "@/components/admin/list";
import { ShowButton } from "@/components/admin/show-button";
import { Card, CardContent } from "@/components/ui/card";

import { TopToolbar } from "../layout/TopToolbar";

const SprintsListActions = () => {
  const translate = useTranslate();
  return (
    <TopToolbar>
      <CreateButton label={translate("crm.new_sprint")} />
    </TopToolbar>
  );
};

const ArrayCountField = ({ source }: { source: "team_ids" | "member_ids" }) => {
  const record = useRecordContext<{ team_ids?: unknown[]; member_ids?: unknown[] }>();
  if (!record) return null;
  return <span>{record[source]?.length ?? 0}</span>;
};

const SprintsEmpty = () => {
  const translate = useTranslate();
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
        <p className="text-muted-foreground text-center">
          {translate("crm.no_sprints_hint")}
        </p>
        <CreateButton label={translate("crm.new_sprint")} />
      </CardContent>
    </Card>
  );
};

const SprintsListLayout = () => {
  const { data, isPending } = useListContext();
  if (isPending) return null;
  if (!data?.length) return <SprintsEmpty />;
  return (
    <DataTable>
      <DataTable.Col source="name" />
      <DataTable.Col source="status" />
      <DataTable.Col source="start_date" />
      <DataTable.Col source="end_date" />
      <DataTable.Col label="Teams">
        <ArrayCountField source="team_ids" />
      </DataTable.Col>
      <DataTable.Col label="Direct members">
        <ArrayCountField source="member_ids" />
      </DataTable.Col>
      <DataTable.Col label={false}>
        <ShowButton />
      </DataTable.Col>
    </DataTable>
  );
};

export const SprintsList = () => {
  const translate = useTranslate();
  return (
    <List
      title={translate("crm.nav.sprints")}
      actions={<SprintsListActions />}
      sort={{ field: "start_date", order: "DESC" }}
    >
      <SprintsListLayout />
    </List>
  );
};
