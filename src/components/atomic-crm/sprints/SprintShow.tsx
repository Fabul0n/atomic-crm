import { useQuery } from "@tanstack/react-query";
import { EditButton, Show } from "@/components/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslate } from "ra-core";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useShowContext, useDataProvider } from "ra-core";

import type { CrmDataProvider } from "../providers/types";
import type { Sprint, SprintParticipant } from "../types";

const SprintFeedbackEmbed = () => {
  const translate = useTranslate();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{translate("crm.feedback", { _: "Оценка участников" })}</CardTitle>
      </CardHeader>
      <CardContent>
        <iframe
          src="https://kudos-crate.lovable.app/embed/cta-button?label=%D0%9F%D0%B5%D1%80%D0%B5%D0%B9%D1%82%D0%B8%20%D0%B2%20%D0%9C%D0%98%D0%A0%D0%A3&target=%2F&theme=light&size=m&style=primary&newTab=true"
          width="100%"
          height="120"
          style={{ border: "none", borderRadius: 12, maxWidth: 400 }}
          loading="lazy"
          allow="clipboard-write"
        />
      </CardContent>
    </Card>
  );
};

const SprintParticipantsTable = () => {
  const { record } = useShowContext<Sprint>();
  const dataProvider = useDataProvider<CrmDataProvider>();
  const translate = useTranslate();
  const { data: participants, isPending, error } = useQuery({
    queryKey: ["sprintParticipants", record?.id],
    queryFn: () => dataProvider.getSprintParticipants(record!.id),
    enabled: !!record?.id,
  });

  if (!record) return null;
  if (isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{translate("crm.participants")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }
  if (error || !participants?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{translate("crm.participants")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            {participants?.length === 0
              ? translate("crm.no_participants")
              : translate("crm.failed_to_load_participants")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{translate("crm.participants")} ({participants.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{translate("crm.name")}</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>{translate("crm.source")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {participants.map((p: SprintParticipant) => (
              <TableRow key={p.id}>
                <TableCell>
                  {p.first_name} {p.last_name}
                </TableCell>
                <TableCell>{p.email}</TableCell>
                <TableCell>
                  {p.source_type === "direct" ? (
                    <Badge variant="secondary">{translate("crm.direct")}</Badge>
                  ) : (
                    <Badge variant="outline">
                      {translate("crm.team")}: {p.source_team_name ?? p.source_team_id}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

const SprintDetails = () => {
  const { record } = useShowContext<Sprint>();
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
          <span className="text-muted-foreground text-sm">{translate("crm.goal")}</span>
          {record.goal ? (
            <p className="text-sm whitespace-pre-wrap">{record.goal}</p>
          ) : (
            <p className="text-muted-foreground text-sm">—</p>
          )}
        </div>
        <div>
          <span className="text-muted-foreground text-sm">{translate("crm.status")}</span>
          <p className="font-medium">{translate(`crm.${record.status}`)}</p>
        </div>
        <div className="flex gap-4">
          <div>
            <span className="text-muted-foreground text-sm">{translate("crm.start_date")}</span>
            <p className="font-medium">{record.start_date}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-sm">{translate("crm.end_date")}</span>
            <p className="font-medium">{record.end_date}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const SprintShow = () => (
  <Show actions={<EditButton />}>
    <div className="flex flex-col gap-4">
      <SprintDetails />
      <SprintParticipantsTable />
      <SprintFeedbackEmbed />
    </div>
  </Show>
);
