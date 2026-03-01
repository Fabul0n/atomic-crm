import { useQuery } from "@tanstack/react-query";
import { EditButton, Show } from "@/components/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const SprintParticipantsTable = () => {
  const { record } = useShowContext<Sprint>();
  const dataProvider = useDataProvider<CrmDataProvider>();
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
          <CardTitle>Participants</CardTitle>
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
          <CardTitle>Participants</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            {participants?.length === 0
              ? "No participants in this sprint."
              : "Failed to load participants."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Participants ({participants.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Source</TableHead>
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
                    <Badge variant="secondary">Direct</Badge>
                  ) : (
                    <Badge variant="outline">
                      Team: {p.source_team_name ?? p.source_team_id}
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
  if (!record) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Details</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div>
          <span className="text-muted-foreground text-sm">Name</span>
          <p className="font-medium">{record.name}</p>
        </div>
        <div>
          <span className="text-muted-foreground text-sm">Goal</span>
          {record.goal ? (
            <p className="text-sm whitespace-pre-wrap">{record.goal}</p>
          ) : (
            <p className="text-muted-foreground text-sm">—</p>
          )}
        </div>
        <div>
          <span className="text-muted-foreground text-sm">Status</span>
          <p className="font-medium capitalize">{record.status}</p>
        </div>
        <div className="flex gap-4">
          <div>
            <span className="text-muted-foreground text-sm">Start date</span>
            <p className="font-medium">{record.start_date}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-sm">End date</span>
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
    </div>
  </Show>
);
