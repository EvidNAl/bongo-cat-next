import { ALLOWED_APPS, ALLOWED_COMMANDS } from "@my-pet/shared-config";

export const TOOL_REGISTRY = {
  open_app: {
    title: "打开软件",
    supportedValues: ALLOWED_APPS
  },
  open_url: {
    title: "打开网址"
  },
  run_command: {
    title: "执行白名单命令",
    supportedValues: ALLOWED_COMMANDS
  },
  file_search: {
    title: "文件搜索"
  }
} as const;
