//! Workflow step execution for the Perforce (P4) plugin.

use hf_plugin_api::{PluginContext, PluginError};
use serde_json::{json, Value};
use std::process::Command;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

#[cfg(target_os = "windows")]
fn hide_console(command: &mut Command) {
    use std::os::windows::process::CommandExt;
    command.creation_flags(CREATE_NO_WINDOW);
}

#[cfg(not(target_os = "windows"))]
fn hide_console(_command: &mut Command) {}

const WORKSPACES_TABLE: &str = "plugin_dev_haloforge_p4_workspaces";

struct WsCreds {
    port:     String,
    user:     String,
    client:   String,
    password: String,
}

fn sql_escape(v: &str) -> String {
    v.replace('\'', "''")
}

fn load_creds(workspace_id: &str, ctx: &dyn PluginContext) -> Result<WsCreds, PluginError> {
    let rows = ctx.db().query(
        &format!(
            "SELECT * FROM {WORKSPACES_TABLE} WHERE id='{}'",
            sql_escape(workspace_id)
        ),
        &[],
    )?;
    let row = rows.into_iter().next().ok_or_else(|| {
        PluginError::NotFound(format!("workspace not found: {workspace_id}"))
    })?;
    Ok(WsCreds {
        port:     row.get("port").and_then(Value::as_str).unwrap_or("").to_string(),
        user:     row.get("p4user").and_then(Value::as_str).unwrap_or("").to_string(),
        client:   row.get("client").and_then(Value::as_str).unwrap_or("").to_string(),
        password: row.get("password").and_then(Value::as_str).unwrap_or("").to_string(),
    })
}

fn run_p4(creds: &WsCreds, args: &[&str]) -> Result<String, PluginError> {
    let mut cmd = Command::new("p4");
    hide_console(&mut cmd);
    cmd.env("P4PORT",   &creds.port)
       .env("P4USER",   &creds.user)
       .env("P4CLIENT", &creds.client)
       .env("P4CONFIG", "");
    if !creds.password.is_empty() {
        cmd.env("P4PASSWD", &creds.password);
    }
    cmd.args(args);

    let out = cmd.output().map_err(|e| {
        PluginError::Process(format!("p4 not found: {e}"))
    })?;

    if out.status.success() {
        Ok(String::from_utf8_lossy(&out.stdout).trim().to_string())
    } else {
        let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
        Err(PluginError::Process(stderr))
    }
}

fn require(config: &Value, key: &str) -> Result<String, PluginError> {
    config[key]
        .as_str()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(str::to_string)
        .ok_or_else(|| PluginError::Custom(format!("missing required config field: {key}")))
}

// ─── step: p4_sync ───────────────────────────────────────────────────────────

fn step_p4_sync(config: Value, ctx: &dyn PluginContext) -> Result<Value, PluginError> {
    let workspace_id = require(&config, "workspace_id")?;
    let creds = load_creds(&workspace_id, ctx)?;

    let path       = config["path"].as_str().unwrap_or("").trim().to_string();
    let changelist = config["changelist"].as_str().unwrap_or("").trim().to_string();
    let force      = config["force"].as_bool().unwrap_or(false);

    let mut args = vec!["sync"];
    if force { args.push("-f"); }

    let filespec = match (path.is_empty(), changelist.is_empty()) {
        (false, false) => format!("{}@{}", path, changelist),
        (false, true)  => path.clone(),
        (true,  false) => format!("//...@{}", changelist),
        (true,  true)  => String::new(),
    };

    let filespec_ref: String;
    if !filespec.is_empty() {
        filespec_ref = filespec;
        args.push(&filespec_ref);
    }

    let output = run_p4(&creds, &args)?;
    Ok(json!({ "success": true, "output": output }))
}

// ─── step: p4_submit ─────────────────────────────────────────────────────────

fn step_p4_submit(config: Value, ctx: &dyn PluginContext) -> Result<Value, PluginError> {
    let workspace_id = require(&config, "workspace_id")?;
    let description  = require(&config, "description")?;
    let creds = load_creds(&workspace_id, ctx)?;
    let reopen = config["reopen"].as_bool().unwrap_or(false);

    let mut args = vec!["submit", "-d", &description];
    if reopen { args.push("-r"); }

    let output = run_p4(&creds, &args)?;
    let change_number = output
        .lines()
        .find(|l| l.contains("submitted"))
        .and_then(|l| l.split_whitespace().nth(1))
        .and_then(|n| n.parse::<u64>().ok());

    Ok(json!({
        "success":       true,
        "output":        output,
        "change_number": change_number,
    }))
}

// ─── step: p4_revert_unchanged ───────────────────────────────────────────────

fn step_p4_revert_unchanged(config: Value, ctx: &dyn PluginContext) -> Result<Value, PluginError> {
    let workspace_id = require(&config, "workspace_id")?;
    let creds = load_creds(&workspace_id, ctx)?;

    let output = run_p4(&creds, &["revert", "-a", "//..."])?;
    Ok(json!({ "success": true, "output": output }))
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

pub fn execute(
    step_type: &str,
    config: Value,
    ctx: &dyn PluginContext,
) -> Result<Value, PluginError> {
    match step_type {
        "p4_sync"              => step_p4_sync(config, ctx),
        "p4_submit"            => step_p4_submit(config, ctx),
        "p4_revert_unchanged"  => step_p4_revert_unchanged(config, ctx),
        other => Err(PluginError::Unsupported(format!(
            "unknown p4 workflow step type: {other}"
        ))),
    }
}
