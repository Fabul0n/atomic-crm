import { useListContext, useRecordContext, useTranslate } from "ra-core";
import { CreateButton } from "@/components/admin/create-button";
import { DataTable } from "@/components/admin/data-table";
import { List } from "@/components/admin/list";
import { ShowButton } from "@/components/admin/show-button";
import { Card, CardContent } from "@/components/ui/card";

import { TopToolbar } from "../layout/TopToolbar";

const TeamsListActions = () => {
  const translate = useTranslate();
  return (
    <TopToolbar>
      <CreateButton label={translate("crm.new_team")} />
    </TopToolbar>
  );
};

const MembersCountField = () => {
  const record = useRecordContext<{ member_ids?: unknown[] }>();
  if (!record) return null;
  return <span>{record.member_ids?.length ?? 0}</span>;
};

const TeamsEmpty = () => {
  const translate = useTranslate();
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
        <p className="text-muted-foreground text-center">
          {translate("crm.no_teams_hint")}
        </p>
        <CreateButton label={translate("crm.new_team")} />
      </CardContent>
    </Card>
  );
};

const TeamsListLayout = () => {
  const { data, isPending } = useListContext();
  if (isPending) return null;
  if (!data?.length) return <TeamsEmpty />;
  return (
    <DataTable>
      <DataTable.Col source="name" />
      <DataTable.Col source="description" />
      <DataTable.Col label="Members">
        <MembersCountField />
      </DataTable.Col>
      <DataTable.Col label={false}>
        <ShowButton />
      </DataTable.Col>
    </DataTable>
  );
};

export const TeamsList = () => {
  const translate = useTranslate();
  return (
    <List
      title={translate("crm.nav.teams")}
      actions={<TeamsListActions />}
      sort={{ field: "name", order: "ASC" }}
    >
      <TeamsListLayout />
    </List>
  );
};
