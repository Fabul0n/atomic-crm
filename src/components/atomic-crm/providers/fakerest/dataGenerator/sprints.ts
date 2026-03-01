import type { Sprint } from "../../../types";
import type { Db } from "./types";

export const generateSprints = (db: Db): Sprint[] => {
  const today = new Date();
  const inTwoWeeks = new Date(today);
  inTwoWeeks.setDate(today.getDate() + 14);

  const fallbackMemberIds = db.sales.map((sale) => sale.id).slice(0, 2);
  const assignedTeamIds = db.teams.map((team) => team.id).slice(0, 1);

  return [
    {
      id: 1,
      name: "Sprint 1",
      goal: "Deliver the first planning tools for engineering workflows.",
      status: "active",
      start_date: today.toISOString().slice(0, 10),
      end_date: inTwoWeeks.toISOString().slice(0, 10),
      team_ids: assignedTeamIds,
      member_ids: fallbackMemberIds,
      sales_id: 0,
      created_at: new Date().toISOString(),
    },
  ];
};
