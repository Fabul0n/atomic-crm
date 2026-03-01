import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useDataProvider,
  useListContext,
  useNotify,
  useRecordContext,
  useTranslate,
} from "ra-core";
import { Link } from "react-router";
import { CreateButton } from "@/components/admin/create-button";
import { DataTable } from "@/components/admin/data-table";
import { EditButton } from "@/components/admin/edit-button";
import { List } from "@/components/admin/list";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import type { CrmDataProvider } from "../providers/types";
import type { Review360Campaign } from "../types";
import { TopToolbar } from "../layout/TopToolbar";

const ListActions = () => {
  const t = useTranslate();
  return (
    <TopToolbar>
      <CreateButton label="Создать кампанию 360°" />
    </TopToolbar>
  );
};

const PublishButton = () => {
  const record = useRecordContext<Review360Campaign>();
  const dataProvider = useDataProvider<CrmDataProvider>();
  const notify = useNotify();
  const queryClient = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: () => dataProvider.publishReview360Campaign(record!.id),
    onSuccess: () => {
      notify("Кампания опубликована, назначения созданы", { type: "success" });
      queryClient.invalidateQueries({ queryKey: ["review_360_campaigns"] });
    },
    onError: (e) => notify(e?.message ?? "Ошибка", { type: "error" }),
  });
  if (!record || record.status !== "draft") return null;
  return (
    <Button size="sm" onClick={() => mutate()} disabled={isPending}>
      {isPending ? "Публикация…" : "Опубликовать"}
    </Button>
  );
};

const MyFeedbackLink = () => {
  const record = useRecordContext<Review360Campaign>();
  if (!record || record.status !== "published") return null;
  return (
    <Link to={`/review_360/${record.id}/my-feedback`}>
      <Button variant="ghost" size="sm">Мои отзывы</Button>
    </Link>
  );
};

const ResultsLink = () => {
  const record = useRecordContext<Review360Campaign>();
  if (!record || record.status !== "published") return null;
  return (
    <Link to={`/review_360/${record.id}/results`}>
      <Button variant="ghost" size="sm">Результаты</Button>
    </Link>
  );
};

const StatusBadge = () => {
  const record = useRecordContext<Review360Campaign>();
  if (!record) return null;
  return (
    <Badge variant={record.status === "published" ? "default" : "secondary"}>
      {record.status === "published" ? "Опубликована" : "Черновик"}
    </Badge>
  );
};

const ListLayout = () => {
  const { data, isPending } = useListContext();
  if (isPending) return null;
  return (
    <DataTable>
      <DataTable.Col source="name" label="Название" />
      <DataTable.Col source="year" label="Год" />
      <DataTable.Col label="Статус">
        <StatusBadge />
      </DataTable.Col>
      <DataTable.Col label={false}>
        <div className="flex gap-2 items-center">
          <MyFeedbackLink />
          <ResultsLink />
          <PublishButton />
          <EditButton />
        </div>
      </DataTable.Col>
    </DataTable>
  );
};

export function Review360CampaignsList() {
  const t = useTranslate();
  return (
    <List
      title="Кампании 360°"
      actions={<ListActions />}
      sort={{ field: "year", order: "DESC" }}
    >
      <ListLayout />
    </List>
  );
}
