//! IPC command handlers for the Perforce (P4) plugin.

use hf_plugin_api::{PluginContext, PluginError};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::process::Command;

const WORKSPACES_TABLE: &str = "plugin_dev_haloforge_p4_workspaces";

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

#[cfg(target_os = "windows")]
fn hide_console(command: &mut Command) {
    use std::os::windows::process::CommandExt;
    command.creation_flags(CREATE_NO_WINDOW);
}

#[cfg(not(target_os = "windows"))]
fn hide_console(_command: &mut Command) {}

// ─── Workspace credentials bundled for convenience ───────────────────────────

struct WsCreds {
    port: String,
    user: String,
    client: String,
    password: String,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn sql_escape(v: &str) -> String {
    v.replace('\'', "''")
}

fn row_to_json(row: HashMap<String, Value>) -> Value {
    Value::Object(row.into_iter().collect())
}

fn req_str<'a>(args: &'a Value, key: &str) -> Result<&'a str, PluginError> {
    args[key]
        .as_str()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .ok_or_else(|| PluginError::Custom(format!("missing required field: {key}")))
}

fn opt_str<'a>(args: &'a Value, key: &str) -> Option<&'a str> {
    args[key].as_str().map(str::trim).filter(|s| !s.is_empty())
}

// Run p4 with credentials injected via environment variables.
// Using env vars keeps credentials out of the process argument list.
fn run_p4(creds: &WsCreds, args: &[&str]) -> Result<String, PluginError> {
    let mut cmd = Command::new("p4");
    hide_console(&mut cmd);

    cmd.env("P4PORT", &creds.port)
        .env("P4USER", &creds.user)
        .env("P4CLIENT", &creds.client);

    if !creds.password.is_empty() {
        cmd.env("P4PASSWD", &creds.password);
    }

    // Suppress P4CONFIG lookup to avoid ambient environment interference
    cmd.env("P4CONFIG", "");

    cmd.args(args);

    let out = cmd.output().map_err(|e| {
        PluginError::Process(format!(
            "p4 command not found or failed to start. Is the Perforce client installed and in PATH? ({e})"
        ))
    })?;

    let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
    let output = join_command_output(&stdout, &stderr);

    if out.status.success() {
        Ok(output)
    } else {
        Err(PluginError::Process(format_p4_error(&output)))
    }
}

fn join_command_output(stdout: &str, stderr: &str) -> String {
    match (stdout.trim(), stderr.trim()) {
        ("", "") => String::new(),
        (stdout, "") => stdout.to_string(),
        ("", stderr) => stderr.to_string(),
        (stdout, stderr) => format!("{stdout}\n{stderr}"),
    }
}

// Produce a human-friendly message for common P4 errors.
fn format_p4_error(raw: &str) -> String {
    if raw.contains("Perforce password") && raw.contains("invalid or unset") {
        return "Authentication failed: incorrect password or expired login ticket.".into();
    }
    if raw.contains("Connect to server failed") || raw.contains("check $P4PORT") {
        return format!(
            "Cannot connect to Perforce server. Verify the P4PORT address and network access. ({})",
            raw
        );
    }
    if raw.contains("Client") && raw.contains("unknown") {
        return format!(
            "Client workspace not found on server. Check the P4CLIENT name matches an existing workspace. ({})",
            raw
        );
    }
    if raw.contains("You don't have permission") || raw.contains("Perforce protection") {
        return format!("Permission denied by server protection table. ({raw})");
    }
    raw.to_string()
}

// Fetch workspace credentials from DB by workspace_id.
fn load_creds(workspace_id: &str, ctx: &dyn PluginContext) -> Result<WsCreds, PluginError> {
    let eid = sql_escape(workspace_id);
    let rows = ctx.db().query(
        &format!("SELECT * FROM {WORKSPACES_TABLE} WHERE id = '{eid}'"),
        &[],
    )?;
    let row = rows
        .into_iter()
        .next()
        .ok_or_else(|| PluginError::NotFound(format!("workspace not found: {workspace_id}")))?;

    Ok(WsCreds {
        port: row
            .get("port")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_string(),
        user: row
            .get("p4user")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_string(),
        client: row
            .get("client")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_string(),
        password: row
            .get("password")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_string(),
    })
}

// Parse `p4 info` output into a structured JSON object.
fn parse_p4_info(raw: &str) -> Value {
    let mut map: HashMap<&str, &str> = HashMap::new();
    for line in raw.lines() {
        if let Some((key, val)) = line.split_once(": ") {
            map.insert(key.trim(), val.trim());
        }
    }
    json!({
        "user":           map.get("User name").copied().unwrap_or(""),
        "client":         map.get("Client name").copied().unwrap_or(""),
        "client_root":    map.get("Client root").copied().unwrap_or(""),
        "server_address": map.get("Server address").copied().unwrap_or(""),
        "server_version": map.get("Server version").copied().unwrap_or(""),
        "client_host":    map.get("Client host").copied().unwrap_or(""),
        "connected":      true,
    })
}

// Parse a single `p4 opened` line into structured JSON.
// Format: `//depot/path/file.ext#REV - ACTION CHANGE change (TYPE)`
fn parse_opened_line(line: &str) -> Option<Value> {
    // Split on " - " to separate "depot_path#rev" from "action change (type)"
    let (path_rev, rest) = line.split_once(" - ")?;
    let (depot_path, rev_str) = path_rev.rsplit_once('#')?;
    let rev: i64 = rev_str.trim().parse().unwrap_or(0);

    let parts: Vec<&str> = rest.splitn(4, ' ').collect();
    let action = parts.first().copied().unwrap_or("").to_string();
    let change = parts.get(1).copied().unwrap_or("default").to_string();

    // Extract type from trailing "(TYPE)" or "(TYPE+x)"
    let file_type = rest
        .rfind('(')
        .and_then(|i| rest[i + 1..].find(')').map(|j| &rest[i + 1..i + 1 + j]))
        .unwrap_or("")
        .to_string();

    Some(json!({
        "depot_path": depot_path,
        "rev":        rev,
        "action":     action,
        "change":     change,
        "file_type":  file_type,
    }))
}

// Parse a `p4 changes` output line.
// Format: `Change NUMBER on DATE by USER@CLIENT 'DESCRIPTION'`
// Pending changelists add `*pending*` before the description.
fn parse_changes_line(line: &str) -> Option<Value> {
    let line = line.trim();
    if !line.starts_with("Change ") {
        return None;
    }
    let parts: Vec<&str> = line.splitn(8, ' ').collect();
    // parts: ["Change", NUMBER, "on", DATE, "by", USER@CLIENT, optional_*status*, "'DESC"]
    if parts.len() < 7 {
        return None;
    }
    let number = parts[1];
    let date = parts[3];
    let user_client = parts[5];
    let (user, client) = user_client.split_once('@').unwrap_or((user_client, ""));

    // Description is the last token after '*pending*' marker (if present)
    let rest = parts[6..].join(" ");
    let (status, desc_raw) = if rest.starts_with("*pending*") {
        ("pending", rest["*pending*".len()..].trim())
    } else {
        ("submitted", rest.as_str())
    };

    let description = desc_raw
        .trim_start_matches('\'')
        .trim_end_matches('\'')
        .to_string();

    Some(json!({
        "number":      number,
        "date":        date,
        "user":        user,
        "client":      client,
        "description": description,
        "status":      status,
    }))
}

#[derive(Default)]
struct ParsedChange {
    number: String,
    date: String,
    user: String,
    client: String,
    description: String,
    status: String,
}

fn change_to_json(change: ParsedChange) -> Value {
    json!({
        "number":      change.number,
        "date":        change.date,
        "user":        change.user,
        "client":      change.client,
        "description": change.description.trim().to_string(),
        "status":      change.status,
    })
}

fn parse_changes_output(raw: &str, fallback_status: &str) -> Vec<Value> {
    let mut items = Vec::new();
    let mut current: Option<ParsedChange> = None;

    for line in raw.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("Change ") {
            if let Some(change) = current.take() {
                items.push(change_to_json(change));
            }

            let parts: Vec<&str> = trimmed.splitn(7, ' ').collect();
            if parts.len() < 6 {
                current = None;
                continue;
            }

            let user_client = parts[5];
            let (user, client) = user_client.split_once('@').unwrap_or((user_client, ""));
            let rest = parts.get(6).copied().unwrap_or("");
            let status = if rest.contains("*pending*") {
                "pending"
            } else {
                fallback_status
            };
            let desc = rest
                .replace("*pending*", "")
                .trim()
                .trim_start_matches('\'')
                .trim_end_matches('\'')
                .to_string();

            current = Some(ParsedChange {
                number: parts[1].to_string(),
                date: parts[3].to_string(),
                user: user.to_string(),
                client: client.to_string(),
                description: desc,
                status: status.to_string(),
            });
        } else if let Some(change) = current.as_mut() {
            let desc_line = trimmed.trim_start_matches('\'').trim_end_matches('\'');
            if !desc_line.is_empty() {
                if !change.description.is_empty() {
                    change.description.push('\n');
                }
                change.description.push_str(desc_line);
            }
        }
    }

    if let Some(change) = current.take() {
        items.push(change_to_json(change));
    }

    if items.is_empty() {
        raw.lines().filter_map(parse_changes_line).collect()
    } else {
        items
    }
}

// ─── Workspace CRUD ───────────────────────────────────────────────────────────

pub fn p4_saved_workspaces(_args: Value, ctx: &dyn PluginContext) -> Result<Value, PluginError> {
    let mut rows = ctx
        .db()
        .query(&format!("SELECT * FROM {WORKSPACES_TABLE}"), &[])?;

    rows.sort_by(|a, b| {
        let a_ts = a.get("added_at").and_then(Value::as_str).unwrap_or("");
        let b_ts = b.get("added_at").and_then(Value::as_str).unwrap_or("");
        b_ts.cmp(a_ts)
    });

    // Convert rows to JSON objects, stripping the password field
    let workspaces: Vec<Value> = rows
        .into_iter()
        .map(|mut row| {
            row.remove("password");
            row_to_json(row)
        })
        .collect();

    Ok(json!({ "workspaces": workspaces }))
}

pub fn p4_upsert_workspace(args: Value, ctx: &dyn PluginContext) -> Result<Value, PluginError> {
    let port = req_str(&args, "port")?;
    let user = req_str(&args, "user")?;
    let client = req_str(&args, "client")?;
    let alias = opt_str(&args, "alias").unwrap_or(client);
    let password = args["password"].as_str().unwrap_or("");
    let id = opt_str(&args, "id")
        .map(str::to_owned)
        .unwrap_or_else(|| uuid_v4());

    let eq = sql_escape;
    let update_sql = format!(
        "UPDATE {WORKSPACES_TABLE} SET \
         alias='{a}', port='{p}', p4user='{u}', client='{c}', password='{pw}' \
         WHERE id='{id}'",
        a = eq(alias),
        p = eq(port),
        u = eq(user),
        c = eq(client),
        pw = eq(password),
        id = eq(&id),
    );
    let updated = ctx.db().execute(&update_sql, &[])?;

    if updated == 0 {
        let insert_sql = format!(
            "INSERT INTO {WORKSPACES_TABLE} \
             (id, alias, port, p4user, client, password, added_at) VALUES \
             ('{id}', '{a}', '{p}', '{u}', '{c}', '{pw}', CURRENT_TIMESTAMP)",
            id = eq(&id),
            a = eq(alias),
            p = eq(port),
            u = eq(user),
            c = eq(client),
            pw = eq(password),
        );
        ctx.db().execute(&insert_sql, &[])?;
    }

    Ok(json!({
        "workspace": {
            "id":     id,
            "alias":  alias,
            "port":   port,
            "p4user": user,
            "client": client,
        }
    }))
}

pub fn p4_remove_workspace(args: Value, ctx: &dyn PluginContext) -> Result<Value, PluginError> {
    let id = req_str(&args, "id")?;
    ctx.db().execute(
        &format!(
            "DELETE FROM {WORKSPACES_TABLE} WHERE id='{}'",
            sql_escape(id)
        ),
        &[],
    )?;
    Ok(json!({ "success": true }))
}

// ─── Connection & info ────────────────────────────────────────────────────────

pub fn p4_test_connection(args: Value, ctx: &dyn PluginContext) -> Result<Value, PluginError> {
    let workspace_id = req_str(&args, "workspace_id")?;
    let creds = load_creds(workspace_id, ctx)?;

    let raw = run_p4(&creds, &["info"])?;
    let info = parse_p4_info(&raw);

    // Cache the workspace root back into DB
    if let Some(root) = info["client_root"].as_str().filter(|s| !s.is_empty()) {
        let _ = ctx.db().execute(
            &format!(
                "UPDATE {WORKSPACES_TABLE} SET root='{}' WHERE id='{}'",
                sql_escape(root),
                sql_escape(workspace_id),
            ),
            &[],
        );
    }

    Ok(json!({ "info": info }))
}

pub fn p4_test_config(args: Value, _ctx: &dyn PluginContext) -> Result<Value, PluginError> {
    let creds = WsCreds {
        port: req_str(&args, "port")?.to_string(),
        user: req_str(&args, "user")?.to_string(),
        client: req_str(&args, "client")?.to_string(),
        password: args["password"].as_str().unwrap_or("").to_string(),
    };

    let raw = run_p4(&creds, &["info"])?;
    Ok(json!({ "info": parse_p4_info(&raw) }))
}

// ─── Opened files ─────────────────────────────────────────────────────────────

pub fn p4_opened(args: Value, ctx: &dyn PluginContext) -> Result<Value, PluginError> {
    let workspace_id = req_str(&args, "workspace_id")?;
    let creds = load_creds(workspace_id, ctx)?;

    let raw = match run_p4(&creds, &["opened"]) {
        Ok(raw) => raw,
        Err(PluginError::Process(message))
            if message.contains("not opened") || message.contains("no file(s) opened") =>
        {
            String::new()
        }
        Err(error) => return Err(error),
    };

    let files: Vec<Value> = raw
        .lines()
        .filter(|l| !l.is_empty())
        .filter_map(parse_opened_line)
        .collect();

    Ok(json!({ "files": files }))
}

// ─── Changelists ──────────────────────────────────────────────────────────────

pub fn p4_pending_changes(args: Value, ctx: &dyn PluginContext) -> Result<Value, PluginError> {
    let workspace_id = req_str(&args, "workspace_id")?;
    let creds = load_creds(workspace_id, ctx)?;

    // -c keeps the list focused on the selected client workspace.
    let raw = run_p4(
        &creds,
        &["changes", "-s", "pending", "-c", &creds.client, "-l"],
    )?;

    let changelists = parse_changes_output(&raw, "pending");

    Ok(json!({ "changelists": changelists }))
}

pub fn p4_submitted_changes(args: Value, ctx: &dyn PluginContext) -> Result<Value, PluginError> {
    let workspace_id = req_str(&args, "workspace_id")?;
    let creds = load_creds(workspace_id, ctx)?;
    let limit = args["limit"].as_u64().unwrap_or(50);

    let limit_str = limit.to_string();
    let raw = run_p4(
        &creds,
        &[
            "changes",
            "-s",
            "submitted",
            "-c",
            &creds.client,
            "-m",
            &limit_str,
            "-l",
        ],
    )?;

    let changelists = parse_changes_output(&raw, "submitted");

    Ok(json!({ "changelists": changelists }))
}

// ─── Sync ─────────────────────────────────────────────────────────────────────

pub fn p4_sync(args: Value, ctx: &dyn PluginContext) -> Result<Value, PluginError> {
    let workspace_id = req_str(&args, "workspace_id")?;
    let creds = load_creds(workspace_id, ctx)?;
    let path = opt_str(&args, "path");
    let changelist = opt_str(&args, "changelist");
    let force = args["force"].as_bool().unwrap_or(false);

    let mut p4_args = vec!["sync"];
    if force {
        p4_args.push("-f");
    }

    // Build the filespec: "PATH" or "PATH@CL" or "@CL" or nothing (full sync)
    let filespec = match (path, changelist) {
        (Some(p), Some(cl)) => format!("{}@{}", p, cl),
        (Some(p), None) => p.to_string(),
        (None, Some(cl)) => format!("//...@{}", cl),
        (None, None) => String::new(),
    };

    let filespec_ref: &str;
    if !filespec.is_empty() {
        filespec_ref = &filespec;
        p4_args.push(filespec_ref);
    }

    let output = run_p4(&creds, &p4_args)?;
    Ok(json!({ "success": true, "output": output }))
}

// ─── Revert ───────────────────────────────────────────────────────────────────

pub fn p4_revert(args: Value, ctx: &dyn PluginContext) -> Result<Value, PluginError> {
    let workspace_id = req_str(&args, "workspace_id")?;
    let creds = load_creds(workspace_id, ctx)?;

    let files: Vec<String> = args["files"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(str::to_string))
                .collect()
        })
        .unwrap_or_default();

    let mut p4_args: Vec<&str> = vec!["revert"];

    let file_refs: Vec<String>;
    if files.is_empty() {
        // Revert everything
        p4_args.push("//...");
    } else {
        file_refs = files.clone();
        for f in &file_refs {
            p4_args.push(f.as_str());
        }
    }

    let output = run_p4(&creds, &p4_args)?;
    Ok(json!({ "success": true, "output": output }))
}

pub fn p4_revert_unchanged(args: Value, ctx: &dyn PluginContext) -> Result<Value, PluginError> {
    let workspace_id = req_str(&args, "workspace_id")?;
    let creds = load_creds(workspace_id, ctx)?;

    // -a: revert only files that have not changed
    let output = run_p4(&creds, &["revert", "-a", "//..."])?;
    Ok(json!({ "success": true, "output": output }))
}

// ─── Submit ───────────────────────────────────────────────────────────────────

pub fn p4_submit(args: Value, ctx: &dyn PluginContext) -> Result<Value, PluginError> {
    let workspace_id = req_str(&args, "workspace_id")?;
    let description = req_str(&args, "description")?;
    let creds = load_creds(workspace_id, ctx)?;
    let reopen = args["reopen"].as_bool().unwrap_or(false);

    // Build a submit spec via -d flag (description) against the default changelist
    let mut p4_args = vec!["submit", "-d", description];
    if reopen {
        p4_args.push("-r");
    }

    let output = run_p4(&creds, &p4_args)?;

    // Try to parse the change number from output: "Change XXXX submitted."
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

// ─── Shelve / unshelve ────────────────────────────────────────────────────────

pub fn p4_shelve(args: Value, ctx: &dyn PluginContext) -> Result<Value, PluginError> {
    let workspace_id = req_str(&args, "workspace_id")?;
    let creds = load_creds(workspace_id, ctx)?;
    let changelist = opt_str(&args, "changelist");

    let mut p4_args = vec!["shelve"];
    let cl_str: String;
    if let Some(cl) = changelist {
        p4_args.push("-c");
        cl_str = cl.to_string();
        p4_args.push(&cl_str);
    }
    // Shelve all files in the changelist (-i reads from stdin; easier to use -c form)

    let output = run_p4(&creds, &p4_args)?;
    Ok(json!({ "success": true, "output": output }))
}

pub fn p4_unshelve(args: Value, ctx: &dyn PluginContext) -> Result<Value, PluginError> {
    let workspace_id = req_str(&args, "workspace_id")?;
    let source_cl = req_str(&args, "source_changelist")?;
    let creds = load_creds(workspace_id, ctx)?;
    let target_cl = opt_str(&args, "target_changelist");

    let mut p4_args = vec!["unshelve", "-s", source_cl];
    let target_str: String;
    if let Some(tc) = target_cl {
        p4_args.push("-c");
        target_str = tc.to_string();
        p4_args.push(&target_str);
    }

    let output = run_p4(&creds, &p4_args)?;
    Ok(json!({ "success": true, "output": output }))
}

// ─── Diff ─────────────────────────────────────────────────────────────────────

pub fn p4_diff(args: Value, ctx: &dyn PluginContext) -> Result<Value, PluginError> {
    let workspace_id = req_str(&args, "workspace_id")?;
    let creds = load_creds(workspace_id, ctx)?;
    let files: Vec<String> = args["files"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .filter_map(Value::as_str)
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(ToOwned::to_owned)
                .collect()
        })
        .unwrap_or_default();

    // -du: unified diff format
    let raw = if files.is_empty() {
        run_p4(&creds, &["diff", "-du"])?
    } else {
        let mut p4_args: Vec<&str> = vec!["diff", "-du"];
        for file in &files {
            p4_args.push(file.as_str());
        }
        run_p4(&creds, &p4_args)?
    };
    Ok(json!({ "output": raw }))
}

pub fn p4_describe(args: Value, ctx: &dyn PluginContext) -> Result<Value, PluginError> {
    let workspace_id = req_str(&args, "workspace_id")?;
    let changelist = req_str(&args, "changelist")?;
    let creds = load_creds(workspace_id, ctx)?;
    let shelved = args["shelved"].as_bool().unwrap_or(false);

    let raw = if shelved {
        run_p4(&creds, &["describe", "-S", "-s", changelist])?
    } else {
        run_p4(&creds, &["describe", "-s", changelist])?
    };

    Ok(json!({ "output": raw }))
}

// ─── Bookmarks ────────────────────────────────────────────────────────────────

const BOOKMARKS_TABLE: &str = "plugin_dev_haloforge_p4_bookmarks";

pub fn p4_saved_bookmarks(args: Value, ctx: &dyn PluginContext) -> Result<Value, PluginError> {
    let workspace_id = req_str(&args, "workspace_id")?;
    let rows = ctx.db().query(
        &format!(
            "SELECT * FROM {BOOKMARKS_TABLE} WHERE workspace_id='{}' ORDER BY created_at DESC",
            sql_escape(workspace_id)
        ),
        &[],
    )?;
    Ok(json!({ "bookmarks": rows.into_iter().map(row_to_json).collect::<Vec<_>>() }))
}

pub fn p4_upsert_bookmark(args: Value, ctx: &dyn PluginContext) -> Result<Value, PluginError> {
    let workspace_id = req_str(&args, "workspace_id")?;
    let name = req_str(&args, "name")?;
    let depot_path = req_str(&args, "depot_path")?;
    let changelist = args["changelist"].as_str().unwrap_or("");
    let force = if args["force"].as_bool().unwrap_or(false) {
        1
    } else {
        0
    };
    let description = args["description"].as_str().unwrap_or("");
    let id = opt_str(&args, "id")
        .map(str::to_owned)
        .unwrap_or_else(uuid_v4);

    let eq = sql_escape;
    let update_sql = format!(
        "UPDATE {BOOKMARKS_TABLE} SET name='{n}', depot_path='{dp}', \
         changelist='{cl}', force={f}, description='{d}' WHERE id='{id}'",
        n = eq(name),
        dp = eq(depot_path),
        cl = eq(changelist),
        f = force,
        d = eq(description),
        id = eq(&id),
    );
    let updated = ctx.db().execute(&update_sql, &[])?;

    if updated == 0 {
        let insert_sql = format!(
            "INSERT INTO {BOOKMARKS_TABLE} \
             (id, workspace_id, name, depot_path, changelist, force, description, created_at) \
             VALUES ('{id}', '{ws}', '{n}', '{dp}', '{cl}', {f}, '{d}', CURRENT_TIMESTAMP)",
            id = eq(&id),
            ws = eq(workspace_id),
            n = eq(name),
            dp = eq(depot_path),
            cl = eq(changelist),
            f = force,
            d = eq(description),
        );
        ctx.db().execute(&insert_sql, &[])?;
    }

    Ok(json!({ "bookmark": { "id": id, "name": name, "depot_path": depot_path } }))
}

pub fn p4_remove_bookmark(args: Value, ctx: &dyn PluginContext) -> Result<Value, PluginError> {
    let id = req_str(&args, "id")?;
    ctx.db().execute(
        &format!(
            "DELETE FROM {BOOKMARKS_TABLE} WHERE id='{}'",
            sql_escape(id)
        ),
        &[],
    )?;
    Ok(json!({ "success": true }))
}

// ─── UUID helper ──────────────────────────────────────────────────────────────

fn uuid_v4() -> String {
    // Simple UUID v4 generation without an external crate
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .subsec_nanos();
    format!(
        "{:08x}-{:04x}-4{:03x}-{:04x}-{:012x}",
        nanos,
        (nanos >> 16) & 0xFFFF,
        (nanos >> 4) & 0xFFF,
        0x8000 | ((nanos >> 2) & 0x3FFF),
        nanos as u64 * 0x1000003D1,
    )
}
