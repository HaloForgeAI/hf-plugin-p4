use hf_plugin_api::{
    HaloForgePlugin, IpcRegistrar, LogLevel, PluginContext, PluginError,
    PluginMetadata, WorkflowStepTypeDefinition, PLUGIN_ABI_VERSION,
};
use serde_json::Value;

mod commands;
mod workflow_steps;

pub struct P4Plugin;

impl P4Plugin {
    pub fn new() -> Self {
        Self
    }
}

impl Default for P4Plugin {
    fn default() -> Self {
        Self::new()
    }
}

impl HaloForgePlugin for P4Plugin {
    fn metadata(&self) -> PluginMetadata {
        PluginMetadata {
            id: "dev.haloforge.p4".into(),
            name: "Perforce Integration".into(),
            version: "1.0.2".into(),
            description: "Perforce workspace management inside DevKit.".into(),
            author: "HaloForge Team".into(),
            abi_version: PLUGIN_ABI_VERSION,
        }
    }

    fn on_load(
        &mut self,
        ctx: &dyn PluginContext,
        ipc: &mut dyn IpcRegistrar,
    ) -> Result<(), PluginError> {
        ctx.db().create_table(
            "workspaces",
            r#"
            id        TEXT PRIMARY KEY,
            alias     TEXT NOT NULL,
            port      TEXT NOT NULL,
            p4user    TEXT NOT NULL,
            client    TEXT NOT NULL,
            password  TEXT NOT NULL DEFAULT '',
            root      TEXT,
            added_at  TEXT NOT NULL
            "#,
        )?;

        ctx.db().create_table(
            "bookmarks",
            r#"
            id           TEXT PRIMARY KEY,
            workspace_id TEXT NOT NULL,
            name         TEXT NOT NULL,
            depot_path   TEXT NOT NULL,
            changelist   TEXT NOT NULL DEFAULT '',
            force        INTEGER NOT NULL DEFAULT 0,
            description  TEXT NOT NULL DEFAULT '',
            created_at   TEXT NOT NULL
            "#,
        )?;

        // ── Register IPC commands ──────────────────────────────────────────
        ipc.register("p4_saved_workspaces",  Box::new(commands::p4_saved_workspaces))?;
        ipc.register("p4_upsert_workspace",  Box::new(commands::p4_upsert_workspace))?;
        ipc.register("p4_remove_workspace",  Box::new(commands::p4_remove_workspace))?;
        ipc.register("p4_test_connection",   Box::new(commands::p4_test_connection))?;
        ipc.register("p4_opened",            Box::new(commands::p4_opened))?;
        ipc.register("p4_pending_changes",   Box::new(commands::p4_pending_changes))?;
        ipc.register("p4_submitted_changes", Box::new(commands::p4_submitted_changes))?;
        ipc.register("p4_sync",              Box::new(commands::p4_sync))?;
        ipc.register("p4_revert",            Box::new(commands::p4_revert))?;
        ipc.register("p4_revert_unchanged",  Box::new(commands::p4_revert_unchanged))?;
        ipc.register("p4_submit",            Box::new(commands::p4_submit))?;
        ipc.register("p4_shelve",            Box::new(commands::p4_shelve))?;
        ipc.register("p4_unshelve",          Box::new(commands::p4_unshelve))?;
        ipc.register("p4_diff",              Box::new(commands::p4_diff))?;
        ipc.register("p4_saved_bookmarks",   Box::new(commands::p4_saved_bookmarks))?;
        ipc.register("p4_upsert_bookmark",   Box::new(commands::p4_upsert_bookmark))?;
        ipc.register("p4_remove_bookmark",   Box::new(commands::p4_remove_bookmark))?;

        // ── Register workflow step types ───────────────────────────────────
        ipc.register_workflow_step_type(WorkflowStepTypeDefinition {
            type_id: "p4_sync".into(),
            display_name: "P4: Sync Workspace".into(),
            description: "Sync a Perforce workspace to latest (or a specific path / changelist).".into(),
            icon: "RefreshCw".into(),
            category: "Source Control".into(),
            config_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "workspace_id": {
                        "type": "string",
                        "title": "Workspace ID",
                        "description": "ID of the saved Perforce workspace configuration"
                    },
                    "path": {
                        "type": "string",
                        "title": "Depot path (optional)",
                        "description": "Specific depot path to sync, e.g. //depot/main/... (empty = full workspace sync)",
                        "default": ""
                    },
                    "changelist": {
                        "type": "string",
                        "title": "Sync to changelist (optional)",
                        "description": "Sync to a specific changelist number (e.g. @12345). Empty = latest.",
                        "default": ""
                    },
                    "force": {
                        "type": "boolean",
                        "title": "Force sync (-f)",
                        "description": "Re-sync files even if they are at the correct revision",
                        "default": false
                    }
                },
                "required": ["workspace_id"]
            }),
        })?;

        ipc.register_workflow_step_type(WorkflowStepTypeDefinition {
            type_id: "p4_submit".into(),
            display_name: "P4: Submit Changelist".into(),
            description: "Submit the default changelist (all opened files) with a description.".into(),
            icon: "Upload".into(),
            category: "Source Control".into(),
            config_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "workspace_id": {
                        "type": "string",
                        "title": "Workspace ID"
                    },
                    "description": {
                        "type": "string",
                        "title": "Changelist description",
                        "description": "Commit message for the submitted changelist (supports {{VARIABLE}} substitution)"
                    },
                    "reopen": {
                        "type": "boolean",
                        "title": "Reopen files after submit (-r)",
                        "default": false
                    }
                },
                "required": ["workspace_id", "description"]
            }),
        })?;

        ipc.register_workflow_step_type(WorkflowStepTypeDefinition {
            type_id: "p4_revert_unchanged".into(),
            display_name: "P4: Revert Unchanged Files".into(),
            description: "Revert files that have not actually been modified (p4 revert -a).".into(),
            icon: "Undo2".into(),
            category: "Source Control".into(),
            config_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "workspace_id": {
                        "type": "string",
                        "title": "Workspace ID"
                    }
                },
                "required": ["workspace_id"]
            }),
        })?;

        ctx.log(LogLevel::Info, "Perforce Integration plugin loaded");
        Ok(())
    }

    fn on_unload(&mut self) -> Result<(), PluginError> {
        Ok(())
    }

    fn execute_workflow_step(
        &mut self,
        step_type: &str,
        config: Value,
        ctx: &dyn PluginContext,
    ) -> Result<Value, PluginError> {
        workflow_steps::execute(step_type, config, ctx)
    }
}

hf_plugin_api::declare_plugin!(P4Plugin, P4Plugin::new);
