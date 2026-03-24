import type { PlannedToolCall, RiskLevel } from "@my-pet/shared-types";

export function getToolRisk(plan: PlannedToolCall): RiskLevel {
  return plan.risk;
}
