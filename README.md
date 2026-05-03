# hf-plugin-p4 — Perforce Integration

A HaloForge plugin that brings Perforce workspace management directly into DevKit.

## Features

- Saved workspace configurations with server-specific connection fields
- Pending and submitted changelist browsing
- Sync by workspace, path, or changelist
- Submit, revert, shelve, and unshelve flows
- Workflow step registration for `p4_sync`, `p4_submit`, and `p4_revert_unchanged`

## Structure

```text
hf-plugin-p4/
├── backend/       # Rust backend plugin crate
├── app/           # React panel UI
├── manifest.json  # HaloForge plugin manifest
└── LICENSE
```

## Status

This repository currently hosts the plugin source extracted from the main HaloForge workspace. Packaging and release artifacts are produced through HaloForge's plugin tooling.

## Packaging

This repository builds independently from the main HaloForge app. The backend uses the published
`haloforge-plugin-api` crate, and the frontend uses `@haloforge/plugin-sdk`.

Local package check:

```bash
cargo run --manifest-path ../HaloForge/tools/hf-pack/Cargo.toml -- check .
cargo run --manifest-path ../HaloForge/tools/hf-pack/Cargo.toml -- pack . --release --out dist/plugin-release
```

GitHub release packaging uses `.github/workflows/plugin-release.yml`. If the HaloForge tooling
repository is private, set `HALOFORGE_TOOLS_TOKEN` with read access to `HaloForgeAI/HaloForge`.
Set `HF_ADMIN_TOKEN` to submit generated catalog metadata to the production plugin catalog.
