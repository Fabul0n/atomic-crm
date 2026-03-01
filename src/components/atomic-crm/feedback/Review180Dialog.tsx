import { useMutation } from "@tanstack/react-query";
import { useDataProvider, useNotify } from "ra-core";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

import type { CrmDataProvider } from "../providers/types";
import type { Identifier } from "ra-core";

type Props = {
  revieweeSalesId: Identifier;
  revieweeName: string;
  open: boolean;
  onClose: () => void;
};

export function Review180Dialog({
  revieweeSalesId,
  revieweeName,
  open,
  onClose,
}: Props) {
  const dataProvider = useDataProvider<CrmDataProvider>();
  const notify = useNotify();
  const [freeText, setFreeText] = useState("");
  const [goodPoints, setGoodPoints] = useState<string[]>([""]);
  const [badPoints, setBadPoints] = useState<string[]>([""]);

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      return dataProvider.createReview180({
        reviewee_sales_id: revieweeSalesId,
        reviewer_sales_id: 0 as Identifier,
        free_text: freeText,
        good_points: goodPoints.filter(Boolean),
        bad_points: badPoints.filter(Boolean),
      });
    },
    onSuccess: () => {
      notify("Отзыв 180° сохранён", { type: "success" });
      setFreeText("");
      setGoodPoints([""]);
      setBadPoints([""]);
      onClose();
    },
    onError: (e) => notify(e?.message || "Ошибка", { type: "error" }),
  });

  const addGood = () => setGoodPoints((p) => [...p, ""]);
  const addBad = () => setBadPoints((p) => [...p, ""]);
  const setGood = (i: number, v: string) =>
    setGoodPoints((p) => {
      const n = [...p];
      n[i] = v;
      return n;
    });
  const setBad = (i: number, v: string) =>
    setBadPoints((p) => {
      const n = [...p];
      n[i] = v;
      return n;
    });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Оставить отзыв 180° — {revieweeName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Общая характеристика (текст для ревью)</Label>
            <Textarea
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="Опишите коллегу и работу с ним..."
              rows={6}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Сильные стороны</Label>
            {goodPoints.map((v, i) => (
              <div key={i} className="flex gap-2 mt-1 mb-1">
                <Input
                  value={v}
                  onChange={(e) => setGood(i, e.target.value)}
                  placeholder="Пункт"
                />
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addGood}>
              + Добавить
            </Button>
          </div>
          <div>
            <Label>Зоны роста</Label>
            {badPoints.map((v, i) => (
              <div key={i} className="flex gap-2 mt-1 mb-1">
                <Input
                  value={v}
                  onChange={(e) => setBad(i, e.target.value)}
                  placeholder="Пункт"
                />
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addBad}>
              + Добавить
            </Button>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button onClick={() => mutate()} disabled={isPending}>
              {isPending ? "Сохранение…" : "Отправить отзыв"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
