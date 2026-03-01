import {
  withLifecycleCallbacks,
  type CreateParams,
  type DataProvider,
  type Identifier,
  type ResourceCallbacks,
  type UpdateParams,
} from "ra-core";
import fakeRestDataProvider from "ra-data-fakerest";

import type {
  Company,
  Contact,
  ContactNote,
  Deal,
  DealNote,
  Review180,
  Review360AnswerItem,
  Sale,
  SalesFormData,
  SignUpData,
  SprintParticipant,
  TaskFeedbackContext,
  Team,
  TeamMember,
  Task,
} from "../../types";
import type { ConfigurationContextValue } from "../../root/ConfigurationContext";
import { getActivityLog } from "../commons/activity";
import { getCompanyAvatar } from "../commons/getCompanyAvatar";
import { getContactAvatar } from "../commons/getContactAvatar";
import { mergeContacts } from "../commons/mergeContacts";
import type { CrmDataProvider } from "../types";
import { authProvider, USER_STORAGE_KEY } from "./authProvider";
import generateData from "./dataGenerator";
import { withSupabaseFilterAdapter } from "./internal/supabaseAdapter";

const baseDataProvider = fakeRestDataProvider(generateData(), true, 300);

const TASK_MARKED_AS_DONE = "TASK_MARKED_AS_DONE";
const TASK_MARKED_AS_UNDONE = "TASK_MARKED_AS_UNDONE";
const TASK_DONE_NOT_CHANGED = "TASK_DONE_NOT_CHANGED";
let taskUpdateType = TASK_DONE_NOT_CHANGED;

const processCompanyLogo = async (params: any) => {
  let logo = params.data.logo;

  if (typeof logo !== "object" || logo === null || !logo.src) {
    logo = await getCompanyAvatar(params.data);
  } else if (logo.rawFile instanceof File) {
    const base64Logo = await convertFileToBase64(logo);
    logo = { src: base64Logo, title: logo.title };
  }

  return {
    ...params,
    data: {
      ...params.data,
      logo,
    },
  };
};

async function processContactAvatar(
  params: UpdateParams<Contact>,
): Promise<UpdateParams<Contact>>;

async function processContactAvatar(
  params: CreateParams<Contact>,
): Promise<CreateParams<Contact>>;

async function processContactAvatar(
  params: CreateParams<Contact> | UpdateParams<Contact>,
): Promise<CreateParams<Contact> | UpdateParams<Contact>> {
  const { data } = params;
  if (data.avatar?.src || !data.email_jsonb || !data.email_jsonb.length) {
    return params;
  }
  const avatarUrl = await getContactAvatar(data);

  // Clone the data and modify the clone
  const newData = { ...data, avatar: { src: avatarUrl || undefined } };

  return { ...params, data: newData };
}

async function fetchAndUpdateCompanyData(
  params: UpdateParams<Contact>,
  dataProvider: DataProvider,
): Promise<UpdateParams<Contact>>;

async function fetchAndUpdateCompanyData(
  params: CreateParams<Contact>,
  dataProvider: DataProvider,
): Promise<CreateParams<Contact>>;

async function fetchAndUpdateCompanyData(
  params: CreateParams<Contact> | UpdateParams<Contact>,
  dataProvider: DataProvider,
): Promise<CreateParams<Contact> | UpdateParams<Contact>> {
  const { data } = params;
  const newData = { ...data };

  if (!newData.company_id) {
    return params;
  }

  const { data: company } = await dataProvider.getOne("companies", {
    id: newData.company_id,
  });

  if (!company) {
    return params;
  }

  newData.company_name = company.name;
  return { ...params, data: newData };
}

/** URL resource "users" maps to API/store "sales" so the app shows /users in the address bar. */
const getApiResource = (resource: string) =>
  resource === "users" ? "sales" : resource;

const dataProviderWithCustomMethod: CrmDataProvider = {
  ...baseDataProvider,
  getList: (resource, params) =>
    baseDataProvider.getList(getApiResource(resource), params),
  getOne: (resource, params) =>
    baseDataProvider.getOne(getApiResource(resource), params),
  getMany: (resource, params) =>
    baseDataProvider.getMany(getApiResource(resource), params),
  getManyReference: (resource, params) =>
    baseDataProvider.getManyReference(getApiResource(resource), params),
  create: (resource, params) =>
    baseDataProvider.create(getApiResource(resource), params),
  update: (resource, params) =>
    baseDataProvider.update(getApiResource(resource), params),
  updateMany: (resource, params) =>
    baseDataProvider.updateMany(getApiResource(resource), params),
  delete: (resource, params) =>
    baseDataProvider.delete(getApiResource(resource), params),
  deleteMany: (resource, params) =>
    baseDataProvider.deleteMany(getApiResource(resource), params),
  unarchiveDeal: async (deal: Deal) => {
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
        dataProvider.update("deals", {
          id: updatedDeal.id,
          data: updatedDeal,
          previousData: deals.find((d) => d.id === updatedDeal.id),
        }),
      ),
    );
  },
  // We simulate a remote endpoint that is in charge of returning activity log
  getActivityLog: async (companyId?: Identifier) => {
    return getActivityLog(dataProvider, companyId);
  },
  signUp: async ({
    email,
    password,
    first_name,
    last_name,
  }: SignUpData): Promise<{ id: string; email: string; password: string }> => {
    const user = await baseDataProvider.create("sales", {
      data: {
        email,
        first_name,
        last_name,
      },
    });

    return {
      ...user.data,
      password,
    };
  },
  salesCreate: async ({ ...data }: SalesFormData): Promise<Sale> => {
    const response = await dataProvider.create("sales", {
      data: {
        ...data,
        password: "new_password",
      },
    });

    return response.data;
  },
  salesUpdate: async (
    id: Identifier,
    data: Partial<Omit<SalesFormData, "password">>,
  ): Promise<Sale> => {
    const { data: previousData } = await dataProvider.getOne<Sale>("sales", {
      id,
    });

    if (!previousData) {
      throw new Error("User not found");
    }

    const { data: sale } = await dataProvider.update<Sale>("sales", {
      id,
      data,
      previousData,
    });
    return { ...sale, user_id: sale.id.toString() };
  },
  isInitialized: async (): Promise<boolean> => {
    const sales = await dataProvider.getList<Sale>("sales", {
      filter: {},
      pagination: { page: 1, perPage: 1 },
      sort: { field: "id", order: "ASC" },
    });
    if (sales.data.length === 0) {
      return false;
    }
    return true;
  },
  updatePassword: async (id: Identifier): Promise<true> => {
    const currentUser = await authProvider.getIdentity?.();
    if (!currentUser) {
      throw new Error("User not found");
    }
    const { data: previousData } = await dataProvider.getOne<Sale>("sales", {
      id: currentUser.id,
    });

    if (!previousData) {
      throw new Error("User not found");
    }

    await dataProvider.update("sales", {
      id,
      data: {
        password: "demo_newPassword",
      },
      previousData,
    });

    return true;
  },
  mergeContacts: async (sourceId: Identifier, targetId: Identifier) => {
    return mergeContacts(sourceId, targetId, baseDataProvider);
  },
  getConfiguration: async (): Promise<ConfigurationContextValue> => {
    const { data } = await baseDataProvider.getOne("configuration", { id: 1 });
    return (data?.config as ConfigurationContextValue) ?? {};
  },
  updateConfiguration: async (
    config: ConfigurationContextValue,
  ): Promise<ConfigurationContextValue> => {
    const { data: prev } = await baseDataProvider.getOne("configuration", {
      id: 1,
    });
    await baseDataProvider.update("configuration", {
      id: 1,
      data: { config },
      previousData: prev,
    });
    return config;
  },
  getTeamMembers: async (teamId: Identifier): Promise<TeamMember[]> => {
    const { data: team } = await dataProvider.getOne<Team>("teams", {
      id: teamId,
    });
    const memberIds = team?.member_ids ?? [];
    if (memberIds.length === 0) {
      return [];
    }

    const salesMembers = await Promise.all(
      memberIds.map(async (salesId) => {
        const { data } = await dataProvider.getOne<Sale>("sales", { id: salesId });
        return data;
      }),
    );

    return salesMembers.map((sale) => ({
      id: `${teamId}-${sale.id}`,
      team_id: teamId,
      sales_id: sale.id,
      first_name: sale.first_name,
      last_name: sale.last_name,
      email: sale.email,
      avatar: sale.avatar,
      administrator: sale.administrator,
      disabled: sale.disabled ?? false,
    }));
  },
  getSprintParticipants: async (
    sprintId: Identifier,
  ): Promise<SprintParticipant[]> => {
    const { data: sprint } = await dataProvider.getOne<{
      id: Identifier;
      member_ids?: Identifier[];
      team_ids?: Identifier[];
    }>("sprints", { id: sprintId });

    const directMemberIds = sprint?.member_ids ?? [];
    const teamIds = sprint?.team_ids ?? [];
    const participantsBySalesId = new Map<Identifier, SprintParticipant>();

    for (const salesId of directMemberIds) {
      const { data: sale } = await dataProvider.getOne<Sale>("sales", { id: salesId });
      participantsBySalesId.set(sale.id, {
        id: `${sprintId}-${sale.id}`,
        sprint_id: sprintId,
        sales_id: sale.id,
        first_name: sale.first_name,
        last_name: sale.last_name,
        email: sale.email,
        avatar: sale.avatar,
        administrator: sale.administrator,
        disabled: sale.disabled ?? false,
        source_type: "direct",
        source_team_id: null,
        source_team_name: null,
      });
    }

    for (const teamId of teamIds) {
      const [{ data: team }, teamMembers] = await Promise.all([
        dataProvider.getOne<Team>("teams", { id: teamId }),
        dataProvider.getTeamMembers(teamId),
      ]);

      for (const member of teamMembers) {
        if (participantsBySalesId.has(member.sales_id)) {
          continue;
        }
        participantsBySalesId.set(member.sales_id, {
          id: `${sprintId}-${member.sales_id}`,
          sprint_id: sprintId,
          sales_id: member.sales_id,
          first_name: member.first_name,
          last_name: member.last_name,
          email: member.email,
          avatar: member.avatar,
          administrator: member.administrator,
          disabled: member.disabled,
          source_type: "team",
          source_team_id: teamId,
          source_team_name: team?.name ?? null,
        });
      }
    }

    return Array.from(participantsBySalesId.values()).sort((a, b) =>
      `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`),
    );
  },
  getTaskFeedbackContext: async (taskId: Identifier): Promise<TaskFeedbackContext | null> => {
    const { data: task } = await dataProvider.getOne<Task & { contact_id?: Identifier; sales_id?: Identifier }>("tasks", { id: taskId });
    if (!task) return null;
    const revieweeId = task.sales_id;
    const [contact, reviewee] = await Promise.all([
      task.contact_id ? dataProvider.getOne<Contact>("contacts_summary", { id: task.contact_id }).then((r) => r.data) : null,
      revieweeId ? dataProvider.getOne<Sale>("sales", { id: revieweeId }).then((r) => r.data) : null,
    ]);
    return {
      task: { id: task.id, text: task.text ?? "", due_date: task.due_date ?? "", type: task.type ?? "" },
      reviewee: reviewee
        ? { id: reviewee.id, first_name: reviewee.first_name ?? "", last_name: reviewee.last_name ?? "", email: reviewee.email ?? "" }
        : { id: revieweeId!, first_name: "", last_name: "", email: "" },
      sprint: null,
      contact: contact ? { id: contact.id, first_name: contact.first_name ?? "", last_name: contact.last_name ?? "" } : null,
    };
  },
  submitTaskFeedback: async (params: { task_id: Identifier; reviewee_sales_id: Identifier; content: string; sprint_id?: Identifier | null }) => {
    const identity = await authProvider.getIdentity?.();
    const reviewerId = identity?.id as Identifier;
    if (!reviewerId) throw new Error("Not authenticated");
    await dataProvider.create("task_feedbacks", {
      data: {
        task_id: params.task_id,
        reviewer_sales_id: reviewerId,
        reviewee_sales_id: params.reviewee_sales_id,
        content: params.content,
        sprint_id: params.sprint_id ?? null,
      },
    });
    return { ok: true };
  },
  createReview180: async (data: Omit<Review180, "id" | "created_at">) => {
    const identity = await authProvider.getIdentity?.();
    const reviewerId = (identity?.id ?? data.reviewer_sales_id) as Identifier;
    const res = await dataProvider.create("reviews_180", {
      data: {
        reviewee_sales_id: data.reviewee_sales_id,
        reviewer_sales_id: reviewerId,
        free_text: data.free_text,
        good_points: data.good_points ?? [],
        bad_points: data.bad_points ?? [],
      },
    });
    return { id: res.data.id };
  },
  getReviews180ForReviewee: async (salesId: Identifier) => {
    const { data } = await dataProvider.getList<Review180>("reviews_180", {
      filter: { reviewee_sales_id: salesId },
      sort: { field: "created_at", order: "DESC" },
      pagination: { page: 1, perPage: 100 },
    });
    return data ?? [];
  },
  publishReview360Campaign: async (campaignId: Identifier) => {
    const { data: campaign } = await dataProvider.getOne("review_360_campaigns", { id: campaignId });
    await dataProvider.update("review_360_campaigns", {
      id: campaignId,
      data: { ...campaign, status: "published", published_at: new Date().toISOString() },
      previousData: campaign,
    });
    const { data: salesList } = await dataProvider.getList<Sale>("sales", { filter: {}, pagination: { page: 1, perPage: 500 }, sort: { field: "id", order: "ASC" } });
    const ids = (salesList ?? []).map((s) => s.id).filter(Boolean);
    for (const revieweeId of ids) {
      const others = ids.filter((id) => id !== revieweeId);
      const shuffled = others.slice().sort(() => Math.random() - 0.5);
      const reviewers = shuffled.slice(0, Math.min(3, shuffled.length));
      for (const reviewerId of reviewers) {
        await dataProvider.create("review_360_assignments", {
          data: { campaign_id: campaignId, reviewer_sales_id: reviewerId, reviewee_sales_id: revieweeId, status: "pending" },
        });
      }
    }
    return { ok: true };
  },
  getMy360Assignments: async (campaignId: Identifier) => {
    const identity = await authProvider.getIdentity?.();
    if (!identity?.id) return { data: [], total: 0 };
    const { data } = await dataProvider.getList("review_360_assignments", {
      filter: { campaign_id: campaignId, reviewer_sales_id: identity.id },
      pagination: { page: 1, perPage: 100 },
      sort: { field: "reviewee_sales_id", order: "ASC" },
    });
    const list = (data ?? []) as Array<{ id: number; reviewee_sales_id: number; reviewer_sales_id: number; status: string }>;
    const withReviewee = await Promise.all(
      list.map(async (a) => {
        const { data: rev } = await dataProvider.getOne<Sale>("sales", { id: a.reviewee_sales_id });
        return { ...a, reviewee: rev };
      }),
    );
    return { data: withReviewee, total: withReviewee.length };
  },
  submitReview360Answer: async (assignmentId: Identifier, answers: Review360AnswerItem[]) => {
    const { data: assignment } = await dataProvider.getOne<{ reviewee_sales_id: Identifier }>("review_360_assignments", { id: assignmentId });
    if (!assignment) throw new Error("Assignment not found");
    const existing = await dataProvider.getList("review_360_answers", { filter: { assignment_id: assignmentId }, pagination: { page: 1, perPage: 1 } });
    const payload = { assignment_id: assignmentId, reviewee_sales_id: assignment.reviewee_sales_id, answers, submitted_at: new Date().toISOString() };
    if (existing.data?.length) {
      await dataProvider.update("review_360_answers", { id: existing.data[0].id, data: payload, previousData: existing.data[0] });
    } else {
      await dataProvider.create("review_360_answers", { data: payload });
    }
    await dataProvider.update("review_360_assignments", {
      id: assignmentId,
      data: { status: "submitted" },
      previousData: await dataProvider.getOne("review_360_assignments", { id: assignmentId }).then((r) => r.data),
    });
    return { ok: true };
  },
  getReview360ResultsForReviewee: async (campaignId: Identifier, revieweeSalesId: Identifier) => {
    const { data: assignments } = await dataProvider.getList("review_360_assignments", {
      filter: { campaign_id: campaignId, reviewee_sales_id: revieweeSalesId },
      pagination: { page: 1, perPage: 100 },
    });
    const withAnswers = await Promise.all(
      (assignments ?? []).map(async (a: { id: number; reviewer_sales_id: number; status: string }) => {
        const ans = await dataProvider.getList("review_360_answers", { filter: { assignment_id: a.id }, pagination: { page: 1, perPage: 1 } });
        return { ...a, review_360_answers: ans.data ?? [] };
      }),
    );
    return withAnswers as Array<{ id: number; reviewer_sales_id: number; status: string; review_360_answers: { answers: Review360AnswerItem[]; submitted_at: string }[] }>;
  },
};

async function updateCompany(
  companyId: Identifier,
  updateFn: (company: Company) => Partial<Company>,
) {
  const { data: company } = await dataProvider.getOne<Company>("companies", {
    id: companyId,
  });

  return await dataProvider.update("companies", {
    id: companyId,
    data: {
      ...updateFn(company),
    },
    previousData: company,
  });
}

const processConfigLogo = async (logo: any): Promise<string> => {
  if (typeof logo === "string") return logo;
  if (logo?.rawFile instanceof File) {
    return (await convertFileToBase64(logo)) as string;
  }
  return logo?.src ?? "";
};

const preserveAttachmentMimeType = <
  NoteType extends { attachments?: Array<{ rawFile?: File; type?: string }> },
>(
  note: NoteType,
): NoteType => ({
  ...note,
  attachments: (note.attachments ?? []).map((attachment) => ({
    ...attachment,
    type: attachment.type ?? attachment.rawFile?.type,
  })),
});

export const dataProvider = withLifecycleCallbacks(
  withSupabaseFilterAdapter(dataProviderWithCustomMethod),
  [
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
      resource: "sales",
      beforeCreate: async (params) => {
        const { data } = params;
        if (data.administrator == null) data.administrator = false;
        return params;
      },
      afterSave: async (data) => {
        const currentUser = await authProvider.getIdentity?.();
        if (currentUser?.id === data.id) {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data));
        }
        return data;
      },
      beforeDelete: async (params) => {
        if (params.meta?.identity?.id == null) {
          throw new Error("Identity MUST be set in meta");
        }

        const newSaleId = params.meta.identity.id as Identifier;

        const [companies, contacts, contactNotes, deals] = await Promise.all([
          dataProvider.getList("companies", {
            filter: { sales_id: params.id },
            pagination: {
              page: 1,
              perPage: 10_000,
            },
            sort: { field: "id", order: "ASC" },
          }),
          dataProvider.getList("contacts", {
            filter: { sales_id: params.id },
            pagination: {
              page: 1,
              perPage: 10_000,
            },
            sort: { field: "id", order: "ASC" },
          }),
          dataProvider.getList("contact_notes", {
            filter: { sales_id: params.id },
            pagination: {
              page: 1,
              perPage: 10_000,
            },
            sort: { field: "id", order: "ASC" },
          }),
          dataProvider.getList("deals", {
            filter: { sales_id: params.id },
            pagination: {
              page: 1,
              perPage: 10_000,
            },
            sort: { field: "id", order: "ASC" },
          }),
        ]);

        await Promise.all([
          dataProvider.updateMany("companies", {
            ids: companies.data.map((company) => company.id),
            data: {
              sales_id: newSaleId,
            },
          }),
          dataProvider.updateMany("contacts", {
            ids: contacts.data.map((company) => company.id),
            data: {
              sales_id: newSaleId,
            },
          }),
          dataProvider.updateMany("contact_notes", {
            ids: contactNotes.data.map((company) => company.id),
            data: {
              sales_id: newSaleId,
            },
          }),
          dataProvider.updateMany("deals", {
            ids: deals.data.map((company) => company.id),
            data: {
              sales_id: newSaleId,
            },
          }),
        ]);

        return params;
      },
    } satisfies ResourceCallbacks<Sale>,
    {
      resource: "users",
      beforeCreate: async (params) => {
        const { data } = params;
        if (data.administrator == null) data.administrator = false;
        return params;
      },
      afterSave: async (data) => {
        const currentUser = await authProvider.getIdentity?.();
        if (currentUser?.id === data.id) {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data));
        }
        return data;
      },
      beforeDelete: async (params) => {
        if (params.meta?.identity?.id == null) {
          throw new Error("Identity MUST be set in meta");
        }
        const newSaleId = params.meta.identity.id as Identifier;
        const [companies, contacts, contactNotes, deals] = await Promise.all([
          dataProvider.getList("companies", { filter: { sales_id: params.id }, pagination: { page: 1, perPage: 10_000 }, sort: { field: "id", order: "ASC" } }),
          dataProvider.getList("contacts", { filter: { sales_id: params.id }, pagination: { page: 1, perPage: 10_000 }, sort: { field: "id", order: "ASC" } }),
          dataProvider.getList("contact_notes", { filter: { sales_id: params.id }, pagination: { page: 1, perPage: 10_000 }, sort: { field: "id", order: "ASC" } }),
          dataProvider.getList("deals", { filter: { sales_id: params.id }, pagination: { page: 1, perPage: 10_000 }, sort: { field: "id", order: "ASC" } }),
        ]);
        await Promise.all([
          dataProvider.updateMany("companies", { ids: companies.data.map((c) => c.id), data: { sales_id: newSaleId } }),
          dataProvider.updateMany("contacts", { ids: contacts.data.map((c) => c.id), data: { sales_id: newSaleId } }),
          dataProvider.updateMany("contact_notes", { ids: contactNotes.data.map((c) => c.id), data: { sales_id: newSaleId } }),
          dataProvider.updateMany("deals", { ids: deals.data.map((d) => d.id), data: { sales_id: newSaleId } }),
        ]);
        return params;
      },
    } satisfies ResourceCallbacks<Sale>,
    {
      resource: "contacts",
      beforeCreate: async (createParams, dataProvider) => {
        const params = {
          ...createParams,
          data: {
            ...createParams.data,
            first_seen:
              createParams.data.first_seen ?? new Date().toISOString(),
            last_seen: createParams.data.last_seen ?? new Date().toISOString(),
          },
        };
        const newParams = await processContactAvatar(params);
        return fetchAndUpdateCompanyData(newParams, dataProvider);
      },
      afterCreate: async (result) => {
        if (result.data.company_id != null) {
          await updateCompany(result.data.company_id, (company) => ({
            nb_contacts: (company.nb_contacts ?? 0) + 1,
          }));
        }

        return result;
      },
      beforeUpdate: async (params) => {
        const newParams = await processContactAvatar(params);
        return fetchAndUpdateCompanyData(newParams, dataProvider);
      },
      afterDelete: async (result) => {
        if (result.data.company_id != null) {
          await updateCompany(result.data.company_id, (company) => ({
            nb_contacts: (company.nb_contacts ?? 1) - 1,
          }));
        }

        return result;
      },
    } satisfies ResourceCallbacks<Contact>,
    {
      resource: "tasks",
      afterCreate: async (result, dataProvider) => {
        // update the task count in the related contact
        const { contact_id } = result.data;
        const { data: contact } = await dataProvider.getOne("contacts", {
          id: contact_id,
        });
        await dataProvider.update("contacts", {
          id: contact_id,
          data: {
            nb_tasks: (contact.nb_tasks ?? 0) + 1,
          },
          previousData: contact,
        });
        return result;
      },
      beforeUpdate: async (params) => {
        const { data, previousData } = params;
        if (previousData.done_date !== data.done_date) {
          taskUpdateType = data.done_date
            ? TASK_MARKED_AS_DONE
            : TASK_MARKED_AS_UNDONE;
        } else {
          taskUpdateType = TASK_DONE_NOT_CHANGED;
        }
        return params;
      },
      afterUpdate: async (result, dataProvider) => {
        // update the contact: if the task is done, decrement the nb tasks, otherwise increment it
        const { contact_id } = result.data;
        const { data: contact } = await dataProvider.getOne("contacts", {
          id: contact_id,
        });
        if (taskUpdateType !== TASK_DONE_NOT_CHANGED) {
          await dataProvider.update("contacts", {
            id: contact_id,
            data: {
              nb_tasks:
                taskUpdateType === TASK_MARKED_AS_DONE
                  ? (contact.nb_tasks ?? 0) - 1
                  : (contact.nb_tasks ?? 0) + 1,
            },
            previousData: contact,
          });
        }
        return result;
      },
      afterDelete: async (result, dataProvider) => {
        // update the task count in the related contact
        const { contact_id } = result.data;
        const { data: contact } = await dataProvider.getOne("contacts", {
          id: contact_id,
        });
        await dataProvider.update("contacts", {
          id: contact_id,
          data: {
            nb_tasks: (contact.nb_tasks ?? 0) - 1,
          },
          previousData: contact,
        });
        return result;
      },
    } satisfies ResourceCallbacks<Task>,
    {
      resource: "companies",
      beforeCreate: async (params) => {
        const createParams = await processCompanyLogo(params);

        return {
          ...createParams,
          data: {
            ...createParams.data,
            created_at: new Date().toISOString(),
          },
        };
      },
      beforeUpdate: async (params) => {
        return await processCompanyLogo(params);
      },
      afterUpdate: async (result, dataProvider) => {
        // get all contacts of the company and for each contact, update the company_name
        const { id, name } = result.data;
        const { data: contacts } = await dataProvider.getList("contacts", {
          filter: { company_id: id },
          pagination: { page: 1, perPage: 1000 },
          sort: { field: "id", order: "ASC" },
        });

        const contactIds = contacts.map((contact) => contact.id);
        await dataProvider.updateMany("contacts", {
          ids: contactIds,
          data: { company_name: name },
        });
        return result;
      },
    } satisfies ResourceCallbacks<Company>,
    {
      resource: "deals",
      beforeCreate: async (params) => {
        return {
          ...params,
          data: {
            ...params.data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        };
      },
      afterCreate: async (result) => {
        await updateCompany(result.data.company_id, (company) => ({
          nb_deals: (company.nb_deals ?? 0) + 1,
        }));

        return result;
      },
      beforeUpdate: async (params) => {
        return {
          ...params,
          data: {
            ...params.data,
            updated_at: new Date().toISOString(),
          },
        };
      },
      afterDelete: async (result) => {
        await updateCompany(result.data.company_id, (company) => ({
          nb_deals: (company.nb_deals ?? 1) - 1,
        }));

        return result;
      },
    } satisfies ResourceCallbacks<Deal>,
    {
      resource: "contact_notes",
      beforeSave: async (params) => preserveAttachmentMimeType(params),
    } satisfies ResourceCallbacks<ContactNote>,
    {
      resource: "deal_notes",
      beforeSave: async (params) => preserveAttachmentMimeType(params),
    } satisfies ResourceCallbacks<DealNote>,
  ],
) as CrmDataProvider;

/**
 * Convert a `File` object returned by the upload input into a base 64 string.
 * That's not the most optimized way to store images in production, but it's
 * enough to illustrate the idea of dataprovider decoration.
 */
const convertFileToBase64 = (file: { rawFile: Blob }): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    // We know result is a string as we used readAsDataURL
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file.rawFile);
  });
