import { useGetList, useTranslate } from "ra-core";
import { matchPath, useLocation, Link } from "react-router";
import type { ReactNode } from "react";
import { CreateButton } from "@/components/admin/create-button";
import { Progress } from "@/components/ui/progress";

import useAppBarHeight from "../misc/useAppBarHeight";
import type { Contact } from "../types";
import { DealCreate } from "./DealCreate";

export const DealEmpty = ({ children }: { children?: ReactNode }) => {
  const location = useLocation();
  const matchCreate = matchPath("/deals/create", location.pathname);
  const appbarHeight = useAppBarHeight();
  const translate = useTranslate();

  // get Contact data
  const { data: contacts, isPending: contactsLoading } = useGetList<Contact>(
    "contacts",
    {
      pagination: { page: 1, perPage: 1 },
    },
  );

  if (contactsLoading) return <Progress value={50} />;

  return (
    <div
      className="flex flex-col justify-center items-center gap-12"
      style={{
        height: `calc(100dvh - ${appbarHeight}px)`,
      }}
    >
      <img src="./img/empty.svg" alt={translate("crm.no_deals")} />
      {contacts && contacts.length > 0 ? (
        <>
          <div className="flex flex-col items-center gap-0">
            <h3 className="text-lg font-bold">{translate("crm.no_deals")}</h3>
            <p className="text-sm text-center text-muted-foreground mb-4">
              {translate("crm.no_deals_hint")}
            </p>
          </div>
          <div className="flex space-x-8">
            <CreateButton label={translate("crm.create_deal")} />
          </div>
          <DealCreate open={!!matchCreate} />
          {children}
        </>
      ) : (
        <div className="flex flex-col items-center gap-0">
          <h3 className="text-lg font-bold">{translate("crm.no_deals")}</h3>
          <p className="text-sm text-center text-muted-foreground mb-4">
            {translate("crm.no_contacts")}.
            <br />
            <Link to="/contacts/create" className="hover:underline">
              {translate("crm.add_first_contact_link")}
            </Link>{" "}
            {translate("crm.add_first_contact_before_deal")}
          </p>
        </div>
      )}
    </div>
  );
};
