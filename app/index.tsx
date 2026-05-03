import { definePlugin, registerPlugin } from "@haloforge/plugin-sdk";
import { P4Panel } from "./P4Panel";

registerPlugin("dev.haloforge.p4", definePlugin({ panel: P4Panel }));
