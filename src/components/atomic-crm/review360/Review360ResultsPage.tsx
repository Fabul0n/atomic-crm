import { useQuery } from "@tanstack/react-query";
import { useDataProvider, useParams } from "ra-core";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { REVIEW_360_QUESTIONS } from "./constants";

import type { CrmDataProvider } from "../providers/types";
import type { Review360AnswerItem } from "../types";

type ResultRow = {
  id: number;
  reviewer_sales_id: number;
  status: string;
  review_360_answers: { answers: Review360AnswerItem[]; submitted_at: string }[] | null;
};

export function Review360ResultsPage() {
  const { campaignId } = useParams<"campaignId">();
  const [selectedRevieweeId, setSelectedRevieweeId] = useState<number | null>(null);
  const dataProvider = useDataProvider<CrmDataProvider>();

  const { data: campaign, isPending: campaignLoading } = useQuery({
    queryKey: ["review_360_campaign", campaignId],
    queryFn: () => dataProvider.getOne("review_360_campaigns", { id: Number(campaignId) }),
    enabled: !!campaignId,
  });

  const { data: assignmentsList, isPending: assignmentsLoading } = useQuery({
    queryKey: ["review_360_assignments", campaignId],
    queryFn: () =>
      dataProvider.getList("review_360_assignments", {
        filter: { campaign_id: campaignId },
        pagination: { page: 1, perPage: 1000 },
        sort: { field: "reviewee_sales_id", order: "ASC" },
      }),
    enabled: !!campaignId,
  });

  const revieweeIds = Array.from(
    new Set(
      (assignmentsList?.data ?? []).map((a: { reviewee_sales_id: number }) => a.reviewee_sales_id),
    ),
  ) as number[];

  const { data: salesMap } = useQuery({
    queryKey: ["sales", revieweeIds],
    queryFn: async () => {
      const map: Record<number, { first_name: string; last_name: string }> = {};
      for (const id of revieweeIds) {
        const r = await dataProvider.getOne("sales", { id });
        map[id] = { first_name: r.data.first_name, last_name: r.data.last_name };
      }
      return map;
    },
    enabled: revieweeIds.length > 0,
  });

  const { data: results, isPending: resultsLoading } = useQuery({
    queryKey: ["review360Results", campaignId, selectedRevieweeId],
    queryFn: () =>
      dataProvider.getReview360ResultsForReviewee(Number(campaignId), selectedRevieweeId!),
    enabled: !!campaignId && selectedRevieweeId != null,
  });

  if (!campaignId) return <div className="p-4">Нет кампании</div>;
  if (campaignLoading || assignmentsLoading) return <Skeleton className="h-48 w-full" />;

  useEffect(() => {
    if (revieweeIds.length > 0)
      setSelectedRevieweeId((prev) => (prev === null ? revieweeIds[0] : prev));
  }, [revieweeIds]);

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-4">
        <Link to="/review_360_campaigns">
          <Button variant="ghost">← Кампании 360°</Button>
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Результаты 360° — {campaign?.data?.name ?? ""}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Только менеджер видит ответы. Сотрудники свои отзывы не видят.
          </p>
        </CardHeader>
      </Card>

      {revieweeIds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Сотрудник</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {revieweeIds.map((id) => {
                const s = salesMap?.[id];
                const name = s ? `${s.first_name} ${s.last_name}` : `#${id}`;
                return (
                  <Button
                    key={id}
                    variant={selectedRevieweeId === id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedRevieweeId(id)}
                  >
                    {name}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedRevieweeId && (
        <ResultsBlock
          results={(results ?? []) as ResultRow[]}
          questions={REVIEW_360_QUESTIONS}
          isLoading={resultsLoading}
          salesMap={salesMap ?? {}}
        />
      )}
    </div>
  );
}

function ResultsBlock({
  results,
  questions,
  isLoading,
  salesMap,
}: {
  results: ResultRow[];
  questions: readonly { id: string; label: string }[];
  isLoading: boolean;
  salesMap: Record<number, { first_name: string; last_name: string }>;
}) {
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!results.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          По этому сотруднику пока нет заполненных отзывов.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ответы по сотруднику</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {results.map((row) => {
          const reviewerName = salesMap[row.reviewer_sales_id]
            ? `${salesMap[row.reviewer_sales_id].first_name} ${salesMap[row.reviewer_sales_id].last_name}`
            : `Сотрудник #${row.reviewer_sales_id}`;
          const answerBlock = row.review_360_answers?.[0];
          const answers = (answerBlock?.answers ?? []) as Review360AnswerItem[];
          return (
            <div key={row.id} className="border rounded p-4 space-y-2">
              <p className="font-medium text-sm text-muted-foreground">От: {reviewerName}</p>
              {questions.map((q) => {
                const a = answers.find((x) => x.question_id === q.id);
                return (
                  <div key={q.id}>
                    <p className="text-sm font-medium">{q.label}</p>
                    <p className="text-sm whitespace-pre-wrap">{a?.value ?? "—"}</p>
                  </div>
                );
              })}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
