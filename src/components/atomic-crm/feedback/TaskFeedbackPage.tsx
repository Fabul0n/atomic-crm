import { useMutation, useQuery } from "@tanstack/react-query";
import { useDataProvider, useNotify, useParams } from "ra-core";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

import type { CrmDataProvider } from "../providers/types";

export const TaskFeedbackPage = () => {
  const { taskId } = useParams<"taskId">();
  const dataProvider = useDataProvider<CrmDataProvider>();
  const notify = useNotify();
  const [content, setContent] = useState("");

  const { data: context, isPending, error } = useQuery({
    queryKey: ["taskFeedbackContext", taskId],
    queryFn: () => dataProvider.getTaskFeedbackContext(Number(taskId)),
    enabled: !!taskId,
  });

  const { mutate: submit, isPending: isSubmitting } = useMutation({
    mutationFn: async () => {
      if (!context || !taskId) throw new Error("No context");
      return dataProvider.submitTaskFeedback({
        task_id: Number(taskId),
        reviewee_sales_id: context.reviewee.id,
        content,
        sprint_id: context.sprint?.id ?? null,
      });
    },
    onSuccess: () => {
      notify("Отзыв отправлен", { type: "success" });
      setContent("");
    },
    onError: (e) => notify(e.message || "Ошибка отправки", { type: "error" }),
  });

  if (!taskId) return <div className="p-4">Не указана задача</div>;
  if (isPending) return <Skeleton className="h-48 w-full" />;
  if (error || !context) return <div className="p-4">Задача не найдена или ошибка загрузки</div>;

  const embedUrl = typeof window !== "undefined" ? `${window.location.origin}/feedback/task/${taskId}` : "";

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Оставить отзыв по задаче</CardTitle>
          <p className="text-sm text-muted-foreground">
            Задача: {context.task.text?.slice(0, 100)}{context.task.text?.length > 100 ? "…" : ""}
          </p>
          <p className="text-sm text-muted-foreground">
            Коллега: {context.reviewee.first_name} {context.reviewee.last_name}
          </p>
          {context.sprint && (
            <p className="text-sm text-muted-foreground">Спринт: {context.sprint.name}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="content">Текст отзыва (до 2000 символов)</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 2000))}
              placeholder="Опишите работу коллеги по этой задаче..."
              rows={6}
              className="mt-1"
            />
          </div>
          <Button onClick={() => submit()} disabled={!content.trim() || isSubmitting}>
            {isSubmitting ? "Отправка…" : "Отправить отзыв"}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Код для интеграции в любую CRM</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-2">Ссылка (вставьте в кнопку «Оставить отзыв»):</p>
          <code className="block p-2 bg-muted rounded text-xs break-all">{embedUrl}</code>
        </CardContent>
      </Card>
    </div>
  );
};
