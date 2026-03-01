import { useQuery } from "@tanstack/react-query";
import {
  useDataProvider,
  useRecordContext,
  useRedirect,
  useTranslate,
} from "ra-core";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EditButton } from "@/components/admin/edit-button";

import type { CrmDataProvider } from "../providers/types";
import type { Review180, Sale } from "../types";
import { Review180Dialog } from "../feedback/Review180Dialog";

export function SalesShow() {
  const record = useRecordContext<Sale>();
  const redirect = useRedirect();
  const translate = useTranslate();
  const dataProvider = useDataProvider<CrmDataProvider>();
  const [review180Open, setReview180Open] = useState(false);

  const { data: reviews, isPending } = useQuery({
    queryKey: ["reviews180", record?.id],
    queryFn: () => dataProvider.getReviews180ForReviewee(record!.id),
    enabled: !!record?.id,
  });

  if (!record) return null;

  const name = `${record.first_name} ${record.last_name}`;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{name}</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setReview180Open(true)}>
              Оставить отзыв 180°
            </Button>
            <EditButton />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{record.email}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Отзывы 180°</CardTitle>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <Review180List reviews={reviews ?? []} />
          )}
        </CardContent>
      </Card>

      <Review180Dialog
        revieweeSalesId={record.id}
        revieweeName={name}
        open={review180Open}
        onClose={() => setReview180Open(false)}
      />
    </div>
  );
}

function Review180List({ reviews }: { reviews: Review180[] }) {
  if (!reviews.length) {
    return <p className="text-sm text-muted-foreground">Пока нет отзывов 180°.</p>;
  }
  return (
    <ul className="space-y-4">
      {reviews.map((r) => (
        <li key={r.id} className="border-b pb-4 last:border-0">
          <p className="text-sm whitespace-pre-wrap">{r.free_text}</p>
          {r.good_points?.length > 0 && (
            <p className="text-sm mt-2">
              <strong>Сильные стороны:</strong> {r.good_points.join(", ")}
            </p>
          )}
          {r.bad_points?.length > 0 && (
            <p className="text-sm mt-1">
              <strong>Зоны роста:</strong> {r.bad_points.join(", ")}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
