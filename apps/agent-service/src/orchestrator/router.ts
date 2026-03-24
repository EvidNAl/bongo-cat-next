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

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getProjectName(projectPath: string) {
  const normalized = projectPath.replace(/\\/g, "/").replace(/\/+$/, "");
  const segments = normalized.split("/").filter(Boolean);

  return segments.at(-1) ?? projectPath;
}

function findFavoriteProjectPath(message: string, favoriteProjectPaths: string[]) {
  const normalized = message.trim().toLowerCase();

  return (
    favoriteProjectPaths
      .map((projectPath) => ({
        projectPath,
        projectName: getProjectName(projectPath)
      }))
      .filter(
        ({ projectPath, projectName }) =>
          normalized.includes(projectPath.toLowerCase()) || normalized.includes(projectName.toLowerCase())
      )
      .sort((left, right) => right.projectPath.length - left.projectPath.length)[0]?.projectPath ?? null
  );
}

function stripFavoriteProjectHint(message: string, favoriteProjectPath: string | null) {
  if (!favoriteProjectPath) {
    return message;
  }

  const projectName = getProjectName(favoriteProjectPath);

  return message
    .replace(new RegExp(escapeRegex(favoriteProjectPath), "gi"), " ")
    .replace(new RegExp(escapeRegex(projectName), "gi"), " ");
}

export function routeMessage(message: string, favoriteProjectPaths: string[] = []): RouteDecision {
  const normalized = message.trim().toLowerCase();
  const foundUrl = findUrl(message);
  const quotedKeyword = findQuotedKeyword(message);
  const favoriteProjectPath = findFavoriteProjectPath(message, favoriteProjectPaths);

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

  const localSearchIntent =
    /(搜索|查找|search|find)/i.test(message) &&
    (/(文件|目录|项目|仓库|工作区|workspace|repo|代码|脚本|readme|package\.json|tsconfig|file)/i.test(message) ||
      Boolean(quotedKeyword) ||
      Boolean(favoriteProjectPath));

  if (localSearchIntent) {
    const cleanedKeyword = stripFavoriteProjectHint(message, favoriteProjectPath)
      .replace(/搜索|查找|search|find|文件|目录|项目|仓库|工作区|workspace|repo|代码|脚本|file|在|里|中的|一下|帮我|请/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    return {
      kind: "file_search",
      baseDir: favoriteProjectPath ?? WORKSPACE_ALIAS,
      keyword: quotedKeyword ?? (cleanedKeyword || "todo")
    };
  }

  return { kind: "chat" };
}
