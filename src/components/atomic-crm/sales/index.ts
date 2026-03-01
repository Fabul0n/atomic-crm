import type { Sale } from "../types";
import { SalesCreate } from "./SalesCreate";
import { SalesEdit } from "./SalesEdit";
import { SalesList } from "./SalesList";
import { SalesShow } from "./SalesShow";

export default {
  list: SalesList,
  create: SalesCreate,
  edit: SalesEdit,
  show: SalesShow,
  recordRepresentation: (record: Sale) =>
    `${record.first_name} ${record.last_name}`,
};
