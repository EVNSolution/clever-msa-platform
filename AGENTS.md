# AGENTS.md

## Must Know

- This directory is the active platform root for CLEVER MSA work.
- Treat `docs/` as the source of truth for architecture, boundaries, mappings, contracts, and rollout decisions.
- Treat `development/` as a set of independent implementation repos exposed from the root as linked child repos. Do not treat this root as a shared runtime codebase.
- Start from [WORKSPACE.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/WORKSPACE.md) and [repo-map.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/repo-map.md) before moving files or changing repo boundaries.

## Repo Selection Rules

- If the task is architecture, migration, mapping, contract, or rollout work, update `docs/` first.
- If the task is local compose, seed orchestration, env templates, or smoke scripts, work in `development/integration-local-stack/`.
- If the task is gateway routing or edge entry behavior, work in `development/edge-api-gateway/`.
- If the task is operator UI or admin UI behavior, work in the matching `front-*` repo only.
- If the task is backend behavior, work in the matching `service-*` repo only.

## Linked Child Repo Rules

- If a freshly cloned root workspace is missing child repo contents, run `git submodule update --init --recursive`.
- After pulling root changes that move child repo pointers, run `git submodule update --init --recursive` again.
- Do not reintroduce root-tracked implementation snapshots for active `development/*` repos.
- New `development/*` repos must be registered from the root as linked child repos immediately.

## Boundary Rules

- Do not import one service repo directly from another service repo.
- Do not introduce shared base packages across service repos unless an approved design changes that rule.
- Do not place compose, env, seed-runner, or cross-repo glue inside service repos.
- Do not treat read-model services as masters. `*-operations-view` repos are read services, not sources of truth.
- Archive is document-only. Do not move runtime code into `docs/archive/`.

## Current Domain Notes

- `service-vehicle-registry` currently owns `vehicle_master + vehicle_operator_access` together.
- `service-settlement-operations-view` temporarily holds the current placeholder settlement runtime.
- `service-settlement-registry` is an active runtime repo for settlement policy, version, and assignment registry only.
- `service-delivery-record` is an active runtime repo for delivery source records and daily input snapshots only.
- `service-terminal-registry` and `service-telemetry-hub` are active runtime repos and must stay within their approved boundary specs.

## Legacy Workspace

- `../MSA-Server/` is a legacy/reference workspace, not the active implementation root.
- Use it only for historical context, old notes, or migration cross-checks.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **clever-msa-platform** (8060 symbols, 17127 relationships, 244 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## When Debugging

1. `gitnexus_query({query: "<error or symptom>"})` — find execution flows related to the issue
2. `gitnexus_context({name: "<suspect function>"})` — see all callers, callees, and process participation
3. `READ gitnexus://repo/clever-msa-platform/process/{processName}` — trace the full execution flow step by step
4. For regressions: `gitnexus_detect_changes({scope: "compare", base_ref: "main"})` — see what your branch changed

## When Refactoring

- **Renaming**: MUST use `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` first. Review the preview — graph edits are safe, text_search edits need manual review. Then run with `dry_run: false`.
- **Extracting/Splitting**: MUST run `gitnexus_context({name: "target"})` to see all incoming/outgoing refs, then `gitnexus_impact({target: "target", direction: "upstream"})` to find all external callers before moving code.
- After any refactor: run `gitnexus_detect_changes({scope: "all"})` to verify only expected files changed.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Tools Quick Reference

| Tool | When to use | Command |
|------|-------------|---------|
| `query` | Find code by concept | `gitnexus_query({query: "auth validation"})` |
| `context` | 360-degree view of one symbol | `gitnexus_context({name: "validateUser"})` |
| `impact` | Blast radius before editing | `gitnexus_impact({target: "X", direction: "upstream"})` |
| `detect_changes` | Pre-commit scope check | `gitnexus_detect_changes({scope: "staged"})` |
| `rename` | Safe multi-file rename | `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` |
| `cypher` | Custom graph queries | `gitnexus_cypher({query: "MATCH ..."})` |

## Impact Risk Levels

| Depth | Meaning | Action |
|-------|---------|--------|
| d=1 | WILL BREAK — direct callers/importers | MUST update these |
| d=2 | LIKELY AFFECTED — indirect deps | Should test |
| d=3 | MAY NEED TESTING — transitive | Test if critical path |

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/clever-msa-platform/context` | Codebase overview, check index freshness |
| `gitnexus://repo/clever-msa-platform/clusters` | All functional areas |
| `gitnexus://repo/clever-msa-platform/processes` | All execution flows |
| `gitnexus://repo/clever-msa-platform/process/{name}` | Step-by-step execution trace |

## Self-Check Before Finishing

Before completing any code modification task, verify:
1. `gitnexus_impact` was run for all modified symbols
2. No HIGH/CRITICAL risk warnings were ignored
3. `gitnexus_detect_changes()` confirms changes match expected scope
4. All d=1 (WILL BREAK) dependents were updated

## Keeping the Index Fresh

After committing code changes, the GitNexus index becomes stale. Re-run analyze to update it:

```bash
npx gitnexus analyze
```

If the index previously included embeddings, preserve them by adding `--embeddings`:

```bash
npx gitnexus analyze --embeddings
```

To check whether embeddings exist, inspect `.gitnexus/meta.json` — the `stats.embeddings` field shows the count (0 means no embeddings). **Running analyze without `--embeddings` will delete any previously generated embeddings.**

> Claude Code users: A PostToolUse hook handles this automatically after `git commit` and `git merge`.

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
