import { invokePlugin } from "@haloforge/plugin-sdk";

export function p4Invoke<T>(cmd: string, args: Record<string, unknown> = {}): Promise<T> {
  return invokePlugin<T>(cmd, args);
}

export const LAST_WS_KEY = "hf-plugin-p4:lastWorkspaceId";
