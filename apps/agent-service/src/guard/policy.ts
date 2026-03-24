import type { PermissionSettings, PlannedToolCall } from "@my-pet/shared-types";

export function validatePlanAgainstPermissions(plan: PlannedToolCall, permissions: PermissionSettings) {
  switch (plan.tool) {
    case "open_app":
      return permissions.allowedApps.includes(plan.payload.appName);
    case "run_command":
      return permissions.allowedCommands.includes(plan.payload.commandId);
    case "file_search":
      return permissions.allowedDirectories.includes(plan.payload.baseDir);
    case "open_url":
      return true;
  }
}
