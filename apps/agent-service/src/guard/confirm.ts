import type { PermissionSettings, PlannedToolCall } from "@my-pet/shared-types";

export function requiresConfirmation(plan: PlannedToolCall, permissions: PermissionSettings) {
  return permissions.dangerousActionConfirmation && (plan.requiresConfirmation || plan.risk !== "low");
}
