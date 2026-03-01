import { useMutation } from "@tanstack/react-query";
import {
  useDataProvider,
  useNotify,
  useRedirect,
  useTranslate,
} from "ra-core";
import type { SubmitHandler } from "react-hook-form";
import { SimpleForm } from "@/components/admin/simple-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { CrmDataProvider } from "../providers/types";
import type { SalesFormData } from "../types";
import { SalesInputs } from "./SalesInputs";

type CreateFormData = SalesFormData & { confirm_password?: string };

function validateCreateUser(values: CreateFormData) {
  const errors: Partial<Record<keyof CreateFormData, string>> = {};
  if (values.password !== values.confirm_password) {
    errors.confirm_password = "ra-supabase.validation.password_mismatch";
    errors.password = "ra-supabase.validation.password_mismatch";
  }
  return errors;
}

export function SalesCreate() {
  const dataProvider = useDataProvider<CrmDataProvider>();
  const notify = useNotify();
  const redirect = useRedirect();
  const translate = useTranslate();

  const { mutate } = useMutation({
    mutationKey: ["signup"],
    mutationFn: async (data: SalesFormData) => {
      return dataProvider.salesCreate(data);
    },
    onSuccess: () => {
      notify(translate("crm.user_created"));
      redirect("/users");
    },
    onError: (error) => {
      notify(error.message || translate("crm.error_creating_user"), {
        type: "error",
      });
    },
  });
  const onSubmit: SubmitHandler<CreateFormData> = async (data) => {
    const { confirm_password: _confirm, ...rest } = data;
    mutate(rest);
  };

  return (
    <div className="max-w-lg w-full mx-auto mt-8">
      <Card>
        <CardHeader>
          <CardTitle>{translate("crm.new_user")}</CardTitle>
        </CardHeader>
        <CardContent>
          <SimpleForm
            onSubmit={onSubmit as SubmitHandler<any>}
            validate={validateCreateUser}
          >
            <SalesInputs />
          </SimpleForm>
        </CardContent>
      </Card>
    </div>
  );
}
