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
