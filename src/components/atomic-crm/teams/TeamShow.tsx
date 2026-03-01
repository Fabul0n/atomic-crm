import { useQuery } from "@tanstack/react-query";
import { EditButton, Show } from "@/components/admin";
import { useTranslate } from "ra-core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useShowContext, useDataProvider } from "ra-core";

import type { CrmDataProvider } from "../providers/types";
import type { Team, TeamMember } from "../types";

const TeamMembersTable = () => {
  const { record } = useShowContext<Team>();
  const dataProvider = useDataProvider<CrmDataProvider>();
  const translate = useTranslate();
  const { data: members, isPending, error } = useQuery({
    queryKey: ["teamMembers", record?.id],
    queryFn: () => dataProvider.getTeamMembers(record!.id),
    enabled: !!record?.id,
  });

  if (!record) return null;
  if (isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{translate("crm.members")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }
  if (error || !members?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{translate("crm.members")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            {members?.length === 0
              ? translate("crm.no_members")
              : translate("crm.failed_to_load_members")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{translate("crm.members")} ({members.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{translate("crm.name")}</TableHead>
              <TableHead>Email</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m: TeamMember) => (
              <TableRow key={m.id}>
                <TableCell>
                  {m.first_name} {m.last_name}
                </TableCell>
                <TableCell>{m.email}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

const TeamDetails = () => {
  const { record } = useShowContext<Team>();
  const translate = useTranslate();
  if (!record) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{translate("crm.details")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div>
          <span className="text-muted-foreground text-sm">{translate("crm.name")}</span>
          <p className="font-medium">{record.name}</p>
        </div>
        <div>
          <span className="text-muted-foreground text-sm">{translate("crm.description")}</span>
          {record.description ? (
            <p className="text-sm whitespace-pre-wrap">{record.description}</p>
          ) : (
            <p className="text-muted-foreground text-sm">—</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const TeamShow = () => (
  <Show actions={<EditButton />}>
    <div className="flex flex-col gap-4">
      <TeamDetails />
      <TeamMembersTable />
    </div>
  </Show>
);
