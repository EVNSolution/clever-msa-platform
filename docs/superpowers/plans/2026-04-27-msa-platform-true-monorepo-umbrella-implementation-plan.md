# MSA Platform True Monorepo Umbrella Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert `clever-msa-platform` from a submodule umbrella into the single root-tracked monorepo umbrella for active CLEVER MSA platform work.

**Architecture:** The root repository owns docs and all active `development/*` source directories. Service boundaries remain enforced by docs, tests, API contracts, and import rules rather than by separate Git repositories.

**Tech Stack:** Git, shell verification scripts, existing `docs/` governance, existing runtime slices under `development/`.

---

### Task 1: Add Monorepo Umbrella Verification

**Files:**
- Create: `scripts/verify/verify-monorepo-umbrella.sh`

- [x] **Step 1: Write the failing verification script**

```bash
#!/usr/bin/env bash
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
cd "$root"

failures=0

if [ -e ".gitmodules" ]; then
  echo "FAIL: .gitmodules still exists"
  failures=$((failures + 1))
fi

gitlinks="$(git ls-files -s development 2>/dev/null | awk '$1 == "160000" { print $4 }')"
if [ -n "$gitlinks" ]; then
  echo "FAIL: development contains gitlink entries:"
  printf '%s\n' "$gitlinks"
  failures=$((failures + 1))
fi

nested_git_markers="$(find development -mindepth 2 -maxdepth 2 -name .git -print 2>/dev/null | sort || true)"
if [ -n "$nested_git_markers" ]; then
  echo "FAIL: development contains nested git markers:"
  printf '%s\n' "$nested_git_markers"
  failures=$((failures + 1))
fi

local_submodule_config="$(git config --local --get-regexp '^submodule\.' 2>/dev/null || true)"
if [ -n "$local_submodule_config" ]; then
  echo "FAIL: local git config still has submodule entries"
  printf '%s\n' "$local_submodule_config" | sed 's/ .*//'
  failures=$((failures + 1))
fi

if [ "$failures" -ne 0 ]; then
  exit 1
fi

echo "PASS: monorepo umbrella has no submodule wiring"
```

- [x] **Step 2: Run the verifier before migration**

Run: `scripts/verify/verify-monorepo-umbrella.sh`

Expected: FAIL showing `.gitmodules`, gitlinks, nested `.git` markers, and local `submodule.*` config.

### Task 2: Freeze The New Governance

**Files:**
- Create: `docs/decisions/specs/2026-04-27-msa-platform-true-monorepo-umbrella-design.md`
- Modify: `WORKSPACE.md`
- Modify: `repo-map.md`
- Modify: `docs/mappings/repo-responsibility-matrix.md`
- Modify: `docs/mappings/current-runtime-inventory.md`

- [x] **Step 1: Add the approved design**

Record the decision that `clever-msa-platform` is now the single root Git source of truth and active `development/*` directories are ordinary root-owned source directories.

- [x] **Step 2: Update workspace docs**

Replace linked child repo and submodule update guidance with true monorepo clone/pull guidance.

- [x] **Step 3: Keep service boundary rules intact**

Keep the no cross-service imports, no shared base package, and docs-first boundary rules.

### Task 3: Preserve The Child Repo Manifest

**Files:**
- Create: `docs/mappings/monorepo-submodule-removal-manifest.tsv`

- [x] **Step 1: Generate manifest**

Run:

```bash
{
  printf 'path\tremote\tbranch\thead\tdirty\n'
  for path in development/*; do
    if git -C "$path" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
      remote="$(git -C "$path" remote get-url origin 2>/dev/null || true)"
      branch="$(git -C "$path" branch --show-current 2>/dev/null || true)"
      head="$(git -C "$path" rev-parse HEAD 2>/dev/null || true)"
      dirty="clean"
      if [ -n "$(git -C "$path" status --short 2>/dev/null)" ]; then
        dirty="dirty"
      fi
      printf '%s\t%s\t%s\t%s\t%s\n' "$path" "$remote" "$branch" "$head" "$dirty"
    fi
  done
} > docs/mappings/monorepo-submodule-removal-manifest.tsv
```

Expected: one row for every nested Git working tree under `development/*`.

### Task 4: Remove Submodule Wiring And Import Files

**Files:**
- Delete: `.gitmodules`
- Modify: root Git index
- Modify: `development/*`

- [x] **Step 1: Capture tracked child files before detaching nested Git**

Run:

```bash
mkdir -p .local
rm -f .local/monorepo-import-files.nul
for path in development/*; do
  if git -C "$path" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git -C "$path" ls-files -z | while IFS= read -r -d '' file; do
      printf '%s/%s\0' "$path" "$file" >> .local/monorepo-import-files.nul
    done
  fi
done
```

- [x] **Step 2: Remove submodule index entries**

Run:

```bash
git ls-files -s development | awk '$1 == "160000" { print $4 }' > .local/monorepo-gitlinks.txt
if [ -s .local/monorepo-gitlinks.txt ]; then
  git rm --cached -f --pathspec-from-file=.local/monorepo-gitlinks.txt
fi
```

- [x] **Step 3: Detach nested Git markers**

Run:

```bash
mkdir -p .local/monorepo-git-metadata-backup
for marker in development/*/.git; do
  [ -e "$marker" ] || continue
  safe_name="$(printf '%s' "${marker%/.git}" | sed 's#[/.]#_#g')"
  if [ -d "$marker" ]; then
    mv "$marker" ".local/monorepo-git-metadata-backup/${safe_name}.git"
  else
    cp "$marker" ".local/monorepo-git-metadata-backup/${safe_name}.gitfile"
    rm "$marker"
  fi
done
```

- [x] **Step 4: Clear local root submodule config**

Run:

```bash
git config --local --get-regexp '^submodule\..*\.url$' 2>/dev/null \
  | sed 's/^submodule\.//; s/\.url .*//' \
  | while IFS= read -r name; do
      git config --local --remove-section "submodule.$name" 2>/dev/null || true
    done
```

- [x] **Step 5: Add imported child files to root index**

Run:

```bash
git add --pathspec-from-file=.local/monorepo-import-files.nul --pathspec-file-nul
```

### Task 5: Verify Monorepo State

**Files:**
- Read: `scripts/verify/verify-monorepo-umbrella.sh`

- [x] **Step 1: Run verifier**

Run: `scripts/verify/verify-monorepo-umbrella.sh`

Expected: `PASS: monorepo umbrella has no submodule wiring`

- [x] **Step 2: Inspect Git state**

Run: `git status --short --branch`

Expected: `.gitmodules` deleted, `development/*` files added as normal files, no `160000` gitlinks remaining.

### Task 6: Restore Root-Level Image Build Entry

**Files:**
- Create: `.github/workflows/build-development-images.yml`
- Create: `scripts/github/resolve-image-build-matrix.py`
- Create: `scripts/github/tests/test_resolve_image_build_matrix.py`
- Modify: `development/edge-api-gateway/scripts/prepare_public_openapi_sources.py`
- Modify: `development/edge-api-gateway/tests/test_public_openapi_build.py`
- Modify: `docs/rollout/current-deployment-source-of-truth.md`

- [x] **Step 1: Write matrix resolver tests**

Run: `python3 -m unittest scripts/github/tests/test_resolve_image_build_matrix.py`

Expected: initial failure before `scripts/github/resolve-image-build-matrix.py` exists, then pass after implementation.

- [x] **Step 2: Implement root image build matrix resolver**

The resolver discovers `development/*/Dockerfile`, maps slice names to ECR repositories, and gives special `kind` values for `edge-api-gateway` and `front-web-console`.

- [x] **Step 3: Fix edge public OpenAPI source lookup for monorepo layout**

Run: `python3 -m unittest development/edge-api-gateway/tests/test_public_openapi_build.py -k monorepo`

Expected: pass after `prepare_public_openapi_sources.py` checks `GITHUB_WORKSPACE/development/<repo>` before cloning standalone repos.

- [x] **Step 4: Add root image build workflow**

The root workflow builds changed Dockerfile-backed `development/*` slices on `main` push and supports manual slice dispatch.

- [x] **Step 5: Update deployment source document**

`docs/rollout/current-deployment-source-of-truth.md` now describes root `build-development-images` as the image artifact entrypoint.
