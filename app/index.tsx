import { definePlugin, registerPlugin } from "@haloforge/plugin-sdk";
import { P4Panel } from "./P4Panel";
import "./theme.css";

registerPlugin("dev.haloforge.p4", definePlugin({ panel: P4Panel }));
