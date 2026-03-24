import { ALLOWED_APPS, ALLOWED_COMMANDS, WORKSPACE_ALIAS } from "@my-pet/shared-config";

export type RouteDecision =
  | { kind: "open_url"; url: string }
  | { kind: "open_app"; appName: string }
  | { kind: "run_command"; commandId: string; args: string[] }
  | { kind: "file_search"; baseDir: string; keyword: string }
  | { kind: "chat" };

function findUrl(message: string) {
  const matched = message.match(/(https?:\/\/[^\s]+|www\.[^\s]+)/i);
  return matched?.[1] ?? null;
}

function findQuotedKeyword(message: string) {
  const matched = message.match(/["“](.+?)["”]/);
  return matched?.[1] ?? null;
}

export function routeMessage(message: string): RouteDecision {
  const normalized = message.trim().toLowerCase();
  const foundUrl = findUrl(message);

  if (foundUrl && /(打开|open|网址|网站|网页|浏览)/i.test(message)) {
    return {
      kind: "open_url",
      url: foundUrl
    };
  }

  if (/(打开|启动|launch|open).*(软件|应用|app|程序|浏览器|记事本|code|vscode)/i.test(message)) {
    const foundApp = ALLOWED_APPS.find((app) => app.aliases.some((alias) => normalized.includes(alias)));
    if (foundApp) {
      return {
        kind: "open_app",
        appName: foundApp.id
      };
    }
  }

  if (/(git status|日期|时间|whoami|列出|list workspace|工作区文件)/i.test(message)) {
    const matchedById = ALLOWED_COMMANDS.find((command) => normalized.includes(command.id));
    const matchedByLabel = ALLOWED_COMMANDS.find((command) => normalized.includes(command.label.toLowerCase()));
    const fallbackCommand =
      normalized.includes("git status")
        ? ALLOWED_COMMANDS.find((command) => command.id === "git_status")
        : normalized.includes("whoami")
          ? ALLOWED_COMMANDS.find((command) => command.id === "whoami")
          : normalized.includes("日期") || normalized.includes("时间")
            ? ALLOWED_COMMANDS.find((command) => command.id === "show_date")
            : ALLOWED_COMMANDS.find((command) => command.id === "list_workspace");

    const foundCommand = matchedById ?? matchedByLabel ?? fallbackCommand;

    if (foundCommand) {
      return {
        kind: "run_command",
        commandId: foundCommand.id,
        args: []
      };
    }
  }

  if (/(搜索|查找|search|find).*(文件|目录|项目|file)/i.test(message)) {
    const extractedKeyword = findQuotedKeyword(message);
    const cleanedKeyword = message.replace(/搜索|查找|search|find|文件|目录|项目|file/gi, "").trim();

    return {
      kind: "file_search",
      baseDir: WORKSPACE_ALIAS,
      keyword: extractedKeyword ?? (cleanedKeyword || "todo")
    };
  }

  return { kind: "chat" };
}
