import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDataProvider, useNotify, useParams } from "ra-core";
import { useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

import type { CrmDataProvider } from "../providers/types";
import type { Review360AnswerItem } from "../types";
import { REVIEW_360_QUESTIONS } from "./constants";

type Assignment = {
  id: number;
  reviewee_sales_id: number;
  status: string;
  reviewee?: { id: number; first_name: string; last_name: string; email?: string };
};

export function My360FeedbackPage() {
  const { campaignId } = useParams<"campaignId">();
  const dataProvider = useDataProvider<CrmDataProvider>();
  const notify = useNotify();
  const queryClient = useQueryClient();
  const [answersByAssignment, setAnswersByAssignment] = useState<Record<number, Review360AnswerItem[]>>({});

  const { data: campaign, isPending: campaignLoading } = useQuery({
    queryKey: ["review_360_campaign", campaignId],
    queryFn: () => dataProvider.getOne("review_360_campaigns", { id: Number(campaignId) }),
    enabled: !!campaignId,
  });

  const { data: assignmentsData, isPending: assignmentsLoading } = useQuery({
    queryKey: ["my360Assignments", campaignId],
    queryFn: () => dataProvider.getMy360Assignments(Number(campaignId)),
    enabled: !!campaignId,
  });

  const { mutate: submitAnswer, isPending: submitting } = useMutation({
    mutationFn: ({ assignmentId, answers }: { assignmentId: number; answers: Review360AnswerItem[] }) =>
      dataProvider.submitReview360Answer(assignmentId, answers),
    onSuccess: () => {
      notify("Отзыв сохранён", { type: "success" });
      queryClient.invalidateQueries({ queryKey: ["my360Assignments", campaignId] });
    },
    onError: (e) => notify(e?.message ?? "Ошибка", { type: "error" }),
  });

  const assignments = (assignmentsData?.data ?? []) as Assignment[];
  const pending = assignments.filter((a) => a.status === "pending");

  if (!campaignId) return <div className="p-4">Нет кампании</div>;
  if (campaignLoading || assignmentsLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-4">
        <Link to="/review_360_campaigns">
          <Button variant="ghost">← Кампании 360°</Button>
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Мои отзывы 360° — {campaign?.data?.name ?? ""}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Заполните краткий отзыв по каждому из назначенных коллег (не более 3–4 человек).
          </p>
        </CardHeader>
      </Card>

      {pending.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Нет назначений для заполнения или все отзывы уже отправлены.
          </CardContent>
        </Card>
      )}

      {pending.map((assignment) => {
        const revieweeName = assignment.reviewee
          ? `${assignment.reviewee.first_name} ${assignment.reviewee.last_name}`
          : `Сотрудник #${assignment.reviewee_sales_id}`;
        const answers = answersByAssignment[assignment.id] ?? REVIEW_360_QUESTIONS.map((q) => ({ question_id: q.id, value: "" }));
        const setAnswer = (index: number, value: string) => {
          setAnswersByAssignment((prev) => {
            const next = [...(prev[assignment.id] ?? answers)];
            next[index] = { ...next[index], value };
            return { ...prev, [assignment.id]: next };
          });
        };
        const canSubmit = answers.every((a) => a.value.trim().length > 0);

        return (
          <Card key={assignment.id}>
            <CardHeader>
              <CardTitle className="text-base">Отзыв на: {revieweeName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {REVIEW_360_QUESTIONS.map((q, i) => (
                <div key={q.id}>
                  <Label>{q.label}</Label>
                  <Textarea
                    value={answers[i]?.value ?? ""}
                    onChange={(e) => setAnswer(i, e.target.value)}
                    rows={3}
                    className="mt-1"
                  />
                </div>
              ))}
              <Button
                onClick={() => submitAnswer({ assignmentId: assignment.id, answers })}
                disabled={!canSubmit || submitting}
              >
                {submitting ? "Сохранение…" : "Отправить отзыв"}
              </Button>
            </CardContent>
          </Card>
        );
      })}

      {assignments.filter((a) => a.status === "submitted").length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Уже отправлено</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground">
              {assignments
                .filter((a) => a.status === "submitted")
                .map((a) => (
                  <li key={a.id}>
                    {a.reviewee ? `${a.reviewee.first_name} ${a.reviewee.last_name}` : a.reviewee_sales_id} — отправлено
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
