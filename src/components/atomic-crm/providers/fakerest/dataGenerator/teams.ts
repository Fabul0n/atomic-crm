import type { Team } from "../../../types";
import type { Db } from "./types";

export const generateTeams = (db: Db): Team[] => {
  const memberPool = db.sales.map((sale) => sale.id);
  if (memberPool.length === 0) {
    return [];
  }

  return [
    {
      id: 1,
      name: "Frontend Team",
      description: "Builds and supports the UI features.",
      member_ids: memberPool.slice(0, Math.min(3, memberPool.length)),
      sales_id: 0,
      created_at: new Date().toISOString(),
    },
    {
      id: 2,
      name: "Platform Team",
      description: "Handles shared infrastructure and integrations.",
      member_ids: memberPool.slice(2, Math.min(5, memberPool.length)),
      sales_id: 0,
      created_at: new Date().toISOString(),
    },
  ];
};
