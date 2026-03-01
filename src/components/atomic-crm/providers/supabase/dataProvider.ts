import { supabaseDataProvider } from "ra-supabase-core";
import {
  withLifecycleCallbacks,
  type DataProvider,
  type GetListParams,
  type Identifier,
  type ResourceCallbacks,
} from "ra-core";
import type {
  ContactNote,
  Deal,
  DealNote,
  RAFile,
  Review180,
  Review360AnswerItem,
  Sale,
  SalesFormData,
  SignUpData,
  SprintParticipant,
  TaskFeedbackContext,
  TeamMember,
} from "../../types";
import type { ConfigurationContextValue } from "../../root/ConfigurationContext";
import { getActivityLog } from "../commons/activity";
import { getIsInitialized } from "./authProvider";
import { supabase } from "./supabase";

if (import.meta.env.VITE_SUPABASE_URL === undefined) {
  throw new Error("Please set the VITE_SUPABASE_URL environment variable");
}
if (import.meta.env.VITE_SB_PUBLISHABLE_KEY === undefined) {
  throw new Error(
    "Please set the VITE_SB_PUBLISHABLE_KEY environment variable",
  );
}

const baseDataProvider = supabaseDataProvider({
  instanceUrl: import.meta.env.VITE_SUPABASE_URL,
  apiKey: import.meta.env.VITE_SB_PUBLISHABLE_KEY,
  supabaseClient: supabase,
  sortOrder: "asc,desc.nullslast" as any,
});

const processCompanyLogo = async (params: any) => {
  const logo = params.data.logo;

  if (logo?.rawFile instanceof File) {
    await uploadToBucket(logo);
  }

  return {
    ...params,
    data: {
      ...params.data,
      logo,
    },
  };
};

const dataProviderWithCustomMethods = {
  ...baseDataProvider,
  async getList(resource: string, params: GetListParams) {
    if (resource === "companies") {
      return baseDataProvider.getList("companies_summary", params);
    }
    if (resource === "contacts") {
      return baseDataProvider.getList("contacts_summary", params);
    }

    return baseDataProvider.getList(resource, params);
  },
  async getOne(resource: string, params: any) {
    if (resource === "companies") {
      return baseDataProvider.getOne("companies_summary", params);
    }
    if (resource === "contacts") {
      return baseDataProvider.getOne("contacts_summary", params);
    }

    return baseDataProvider.getOne(resource, params);
  },

  async signUp({ email, password, first_name, last_name }: SignUpData) {
    const response = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name,
          last_name,
        },
      },
    });

    if (!response.data?.user || response.error) {
      console.error("signUp.error", response.error);
      throw new Error(response?.error?.message || "Failed to create account");
    }

    // Update the is initialized cache
    getIsInitialized._is_initialized_cache = true;

    return {
      id: response.data.user.id,
      email,
      password,
    };
  },
  async salesCreate(body: SalesFormData) {
    const { data, error } = await supabase.functions.invoke<{ data: Sale }>(
      "users",
      {
        method: "POST",
        body,
      },
    );

    if (!data || error) {
      console.error("salesCreate.error", error);
      const errorDetails = await (async () => {
        try {
          return (await error?.context?.json()) ?? {};
        } catch {
          return {};
        }
      })();
      throw new Error(errorDetails?.message || "Failed to create the user");
    }

    return data.data;
  },
  async salesUpdate(
    id: Identifier,
    data: Partial<Omit<SalesFormData, "password">>,
  ) {
    const { email, first_name, last_name, administrator, avatar, disabled } =
      data;

    const { data: updatedData, error } = await supabase.functions.invoke<{
      data: Sale;
    }>("users", {
      method: "PATCH",
      body: {
        sales_id: id,
        email,
        first_name,
        last_name,
        administrator,
        disabled,
        avatar,
      },
    });

    if (!updatedData || error) {
      console.error("salesCreate.error", error);
      throw new Error("Failed to update account manager");
    }

    return updatedData.data;
  },
  async updatePassword(id: Identifier) {
    const { data: passwordUpdated, error } =
      await supabase.functions.invoke<boolean>("update_password", {
        method: "PATCH",
        body: {
          sales_id: id,
        },
      });

    if (!passwordUpdated || error) {
      console.error("update_password.error", error);
      throw new Error("Failed to update password");
    }

    return passwordUpdated;
  },
  async unarchiveDeal(deal: Deal) {
    // get all deals where stage is the same as the deal to unarchive
    const { data: deals } = await baseDataProvider.getList<Deal>("deals", {
      filter: { stage: deal.stage },
      pagination: { page: 1, perPage: 1000 },
      sort: { field: "index", order: "ASC" },
    });

    // set index for each deal starting from 1, if the deal to unarchive is found, set its index to the last one
    const updatedDeals = deals.map((d, index) => ({
      ...d,
      index: d.id === deal.id ? 0 : index + 1,
      archived_at: d.id === deal.id ? null : d.archived_at,
    }));

    return await Promise.all(
      updatedDeals.map((updatedDeal) =>
        baseDataProvider.update("deals", {
          id: updatedDeal.id,
          data: updatedDeal,
          previousData: deals.find((d) => d.id === updatedDeal.id),
        }),
      ),
    );
  },
  async getActivityLog(companyId?: Identifier) {
    return getActivityLog(baseDataProvider, companyId);
  },
  async isInitialized() {
    return getIsInitialized();
  },
  async mergeContacts(sourceId: Identifier, targetId: Identifier) {
    const { data, error } = await supabase.functions.invoke("merge_contacts", {
      method: "POST",
      body: { loserId: sourceId, winnerId: targetId },
    });

    if (error) {
      console.error("merge_contacts.error", error);
      throw new Error("Failed to merge contacts");
    }

    return data;
  },
  async getConfiguration(): Promise<ConfigurationContextValue> {
    const { data } = await baseDataProvider.getOne("configuration", { id: 1 });
    return (data?.config as ConfigurationContextValue) ?? {};
  },
  async updateConfiguration(
    config: ConfigurationContextValue,
  ): Promise<ConfigurationContextValue> {
    const { data } = await baseDataProvider.update("configuration", {
      id: 1,
      data: { config },
      previousData: { id: 1 },
    });
    return data.config as ConfigurationContextValue;
  },
  async getTeamMembers(teamId: Identifier): Promise<TeamMember[]> {
    const { data, error } = await supabase
      .from("team_members")
      .select("*")
      .eq("team_id", teamId)
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });

    if (error) {
      console.error("getTeamMembers.error", error);
      throw new Error("Failed to load team members");
    }

    return (data ?? []) as TeamMember[];
  },
  async getSprintParticipants(
    sprintId: Identifier,
  ): Promise<SprintParticipant[]> {
    const { data, error } = await supabase
      .from("sprint_participants")
      .select("*")
      .eq("sprint_id", sprintId)
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });

    if (error) {
      console.error("getSprintParticipants.error", error);
      throw new Error("Failed to load sprint participants");
    }

    return (data ?? []) as SprintParticipant[];
  },
  async getTaskFeedbackContext(taskId: Identifier): Promise<TaskFeedbackContext | null> {
    const { data: task } = await supabase
      .from("tasks")
      .select("id, text, due_date, type, contact_id, sales_id")
      .eq("id", taskId)
      .single();
    if (!task) return null;
    const revieweeId = task.sales_id;
    const [contactRes, revieweeRes] = await Promise.all([
      task.contact_id
        ? supabase.from("contacts_summary").select("id, first_name, last_name").eq("id", task.contact_id).single()
        : { data: null },
      revieweeId
        ? supabase.from("sales").select("id, first_name, last_name, email").eq("id", revieweeId).single()
        : { data: null },
    ]);
    return {
      task: { id: task.id, text: task.text ?? "", due_date: task.due_date ?? "", type: task.type ?? "" },
      reviewee: revieweeRes.data
        ? { id: revieweeRes.data.id, first_name: revieweeRes.data.first_name ?? "", last_name: revieweeRes.data.last_name ?? "", email: revieweeRes.data.email ?? "" }
        : { id: revieweeId!, first_name: "", last_name: "", email: "" },
      sprint: null,
      contact: contactRes.data
        ? { id: contactRes.data.id, first_name: contactRes.data.first_name ?? "", last_name: contactRes.data.last_name ?? "" }
        : null,
    };
  },
  async submitTaskFeedback(params: {
    task_id: Identifier;
    reviewee_sales_id: Identifier;
    content: string;
    sprint_id?: Identifier | null;
  }) {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) throw new Error("Not authenticated");
    const salesRow = await supabase.from("sales").select("id").eq("user_id", user.user.id).single();
    const reviewer_sales_id = salesRow.data?.id;
    if (!reviewer_sales_id) throw new Error("Sales record not found");
    const { error } = await supabase.from("task_feedbacks").insert({
      task_id: params.task_id,
      reviewer_sales_id,
      reviewee_sales_id: params.reviewee_sales_id,
      content: params.content,
      sprint_id: params.sprint_id ?? null,
    });
    if (error) {
      console.error("submitTaskFeedback.error", error);
      throw new Error("Failed to submit feedback");
    }
    return { ok: true };
  },
  async createReview180(data: Omit<Review180, "id" | "created_at">) {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) throw new Error("Not authenticated");
    const salesRow = await supabase.from("sales").select("id").eq("user_id", user.user.id).single();
    const reviewer_sales_id = salesRow.data?.id ?? data.reviewer_sales_id;
    const { data: row, error } = await supabase
      .from("reviews_180")
      .insert({
        reviewee_sales_id: data.reviewee_sales_id,
        reviewer_sales_id,
        free_text: data.free_text,
        good_points: data.good_points ?? [],
        bad_points: data.bad_points ?? [],
      })
      .select("id")
      .single();
    if (error) {
      console.error("createReview180.error", error);
      throw new Error("Failed to create review");
    }
    return row;
  },
  async getReviews180ForReviewee(salesId: Identifier) {
    const { data, error } = await supabase
      .from("reviews_180")
      .select("*")
      .eq("reviewee_sales_id", salesId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("getReviews180ForReviewee.error", error);
      throw new Error("Failed to load reviews");
    }
    return (data ?? []) as Review180[];
  },
  async publishReview360Campaign(campaignId: Identifier) {
    const { error: updateErr } = await supabase
      .from("review_360_campaigns")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", campaignId);
    if (updateErr) throw new Error("Failed to publish campaign");
    const { error: rpcErr } = await supabase.rpc("review_360_create_assignments", { p_campaign_id: campaignId });
    if (rpcErr) {
      console.error("review_360_create_assignments.error", rpcErr);
      throw new Error("Failed to create assignments");
    }
    return { ok: true };
  },
  async getMy360Assignments(campaignId: Identifier) {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) return { data: [], total: 0 };
    const salesRow = await supabase.from("sales").select("id").eq("user_id", user.user.id).single();
    const reviewerId = salesRow.data?.id;
    if (!reviewerId) return { data: [], total: 0 };
    const { data, error } = await supabase
      .from("review_360_assignments")
      .select("*, reviewee:sales!reviewee_sales_id(id, first_name, last_name, email)")
      .eq("campaign_id", campaignId)
      .eq("reviewer_sales_id", reviewerId)
      .order("reviewee_sales_id");
    if (error) {
      console.error("getMy360Assignments.error", error);
      throw new Error("Failed to load assignments");
    }
    return { data: data ?? [], total: (data ?? []).length };
  },
  async submitReview360Answer(assignmentId: Identifier, answers: Review360AnswerItem[]) {
    const { data: assignment } = await supabase
      .from("review_360_assignments")
      .select("reviewee_sales_id")
      .eq("id", assignmentId)
      .single();
    if (!assignment) throw new Error("Assignment not found");
    const { error: insErr } = await supabase.from("review_360_answers").upsert(
      { assignment_id: assignmentId, reviewee_sales_id: assignment.reviewee_sales_id, answers },
      { onConflict: "assignment_id" },
    );
    if (insErr) throw new Error("Failed to save answers");
    await supabase
      .from("review_360_assignments")
      .update({ status: "submitted" })
      .eq("id", assignmentId);
    return { ok: true };
  },
  async getReview360ResultsForReviewee(campaignId: Identifier, revieweeSalesId: Identifier) {
    const { data, error } = await supabase
      .from("review_360_assignments")
      .select("id, reviewer_sales_id, status, review_360_answers(answers, submitted_at)")
      .eq("campaign_id", campaignId)
      .eq("reviewee_sales_id", revieweeSalesId);
    if (error) {
      console.error("getReview360ResultsForReviewee.error", error);
      throw new Error("Failed to load results");
    }
    return (data ?? []) as Array<{
      id: number;
      reviewer_sales_id: number;
      status: string;
      review_360_answers: { answers: Review360AnswerItem[]; submitted_at: string }[] | null;
    }>;
  },
} satisfies DataProvider;

export type CrmDataProvider = typeof dataProviderWithCustomMethods;

const processConfigLogo = async (logo: any): Promise<string> => {
  if (typeof logo === "string") return logo;
  if (logo?.rawFile instanceof File) {
    await uploadToBucket(logo);
    return logo.src;
  }
  return logo?.src ?? "";
};

const lifeCycleCallbacks: ResourceCallbacks[] = [
  {
    resource: "configuration",
    beforeUpdate: async (params) => {
      const config = params.data.config;
      if (config) {
        config.lightModeLogo = await processConfigLogo(config.lightModeLogo);
        config.darkModeLogo = await processConfigLogo(config.darkModeLogo);
      }
      return params;
    },
  },
  {
    resource: "contact_notes",
    beforeSave: async (data: ContactNote, _, __) => {
      if (data.attachments) {
        data.attachments = await Promise.all(
          data.attachments.map((fi) => uploadToBucket(fi)),
        );
      }
      return data;
    },
  },
  {
    resource: "deal_notes",
    beforeSave: async (data: DealNote, _, __) => {
      if (data.attachments) {
        data.attachments = await Promise.all(
          data.attachments.map((fi) => uploadToBucket(fi)),
        );
      }
      return data;
    },
  },
  {
    resource: "sales",
    beforeSave: async (data: Sale, _, __) => {
      if (data.avatar) {
        await uploadToBucket(data.avatar);
      }
      return data;
    },
  },
  {
    resource: "contacts",
    beforeGetList: async (params) => {
      return applyFullTextSearch([
        "first_name",
        "last_name",
        "company_name",
        "title",
        "email",
        "phone",
        "background",
      ])(params);
    },
  },
  {
    resource: "companies",
    beforeGetList: async (params) => {
      return applyFullTextSearch([
        "name",
        "phone_number",
        "website",
        "zipcode",
        "city",
        "state_abbr",
      ])(params);
    },
    beforeCreate: async (params) => {
      const createParams = await processCompanyLogo(params);

      return {
        ...createParams,
        data: {
          created_at: new Date().toISOString(),
          ...createParams.data,
        },
      };
    },
    beforeUpdate: async (params) => {
      return await processCompanyLogo(params);
    },
  },
  {
    resource: "contacts_summary",
    beforeGetList: async (params) => {
      return applyFullTextSearch(["first_name", "last_name"])(params);
    },
  },
  {
    resource: "deals",
    beforeGetList: async (params) => {
      return applyFullTextSearch(["name", "category", "description"])(params);
    },
  },
];

export const dataProvider = withLifecycleCallbacks(
  dataProviderWithCustomMethods,
  lifeCycleCallbacks,
) as CrmDataProvider;

const applyFullTextSearch = (columns: string[]) => (params: GetListParams) => {
  if (!params.filter?.q) {
    return params;
  }
  const { q, ...filter } = params.filter;
  return {
    ...params,
    filter: {
      ...filter,
      "@or": columns.reduce((acc, column) => {
        if (column === "email")
          return {
            ...acc,
            [`email_fts@ilike`]: q,
          };
        if (column === "phone")
          return {
            ...acc,
            [`phone_fts@ilike`]: q,
          };
        else
          return {
            ...acc,
            [`${column}@ilike`]: q,
          };
      }, {}),
    },
  };
};

const uploadToBucket = async (fi: RAFile) => {
  if (!fi.src.startsWith("blob:") && !fi.src.startsWith("data:")) {
    // Sign URL check if path exists in the bucket
    if (fi.path) {
      const { error } = await supabase.storage
        .from("attachments")
        .createSignedUrl(fi.path, 60);

      if (!error) {
        return fi;
      }
    }
  }

  const dataContent = fi.src
    ? await fetch(fi.src)
        .then((res) => {
          if (res.status !== 200) {
            return null;
          }
          return res.blob();
        })
        .catch(() => null)
    : fi.rawFile;

  if (dataContent == null) {
    // We weren't able to download the file from its src (e.g. user must be signed in on another website to access it)
    // or the file has no content (not probable)
    // In that case, just return it as is: when trying to download it, users should be redirected to the other website
    // and see they need to be signed in. It will then be their responsibility to upload the file back to the note.
    return fi;
  }

  const file = fi.rawFile;
  const fileParts = file.name.split(".");
  const fileExt = fileParts.length > 1 ? `.${file.name.split(".").pop()}` : "";
  const fileName = `${Math.random()}${fileExt}`;
  const filePath = `${fileName}`;
  const { error: uploadError } = await supabase.storage
    .from("attachments")
    .upload(filePath, dataContent);

  if (uploadError) {
    console.error("uploadError", uploadError);
    throw new Error("Failed to upload attachment");
  }

  const { data } = supabase.storage.from("attachments").getPublicUrl(filePath);

  fi.path = filePath;
  fi.src = data.publicUrl;

  // save MIME type
  const mimeType = file.type;
  fi.type = mimeType;

  return fi;
};
