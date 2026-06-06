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
npx @haloforge/plugin-pack@0.2.13 check .
npx @haloforge/plugin-pack@0.2.13 pack . --release --out dist/plugin-release
```

GitHub release packaging uses `.github/workflows/plugin-release.yml` and the public `/plugin-pack` npm package. Set `HF_ADMIN_TOKEN` to submit generated catalog metadata to the production plugin catalog.

The frontend now routes plugin backend commands through `invokePlugin()` from `@haloforge/plugin-sdk`, so the panel no longer hard-codes private `plugin_invoke` wire names.
