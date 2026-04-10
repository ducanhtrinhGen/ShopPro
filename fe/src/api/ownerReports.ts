import { apiRequest } from "./client";
import type { OwnerOverview } from "../types";

export function getOwnerOverview() {
  return apiRequest<OwnerOverview>("/api/owner/reports/overview");
}
