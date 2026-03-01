import { useGetIdentity, useRecordContext, useTranslate } from "ra-core";

import type { Sale } from "../types";

export const SaleName = ({ sale }: { sale?: Sale }) => {
  const { identity, isPending } = useGetIdentity();
  const saleFromContext = useRecordContext<Sale>();
  const translate = useTranslate();
  const finalSale = sale || saleFromContext;
  if (isPending || !finalSale) return null;
  return finalSale.id === identity?.id
    ? translate("crm.you")
    : `${finalSale.first_name} ${finalSale.last_name}`;
};
