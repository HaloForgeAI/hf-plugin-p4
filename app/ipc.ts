import { invoke } from "@tauri-apps/api/core";

export function p4Invoke<T>(cmd: string, args: Record<string, unknown> = {}): Promise<T> {
  return invoke<T>("plugin_invoke", {
    args: { wire_name: `plugin_dev_haloforge_p4_${cmd}`, args },
  });
}

export const LAST_WS_KEY = "hf-plugin-p4:lastWorkspaceId";
