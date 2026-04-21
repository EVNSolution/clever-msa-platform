# 2026-04-09 Tracked Snapshot To Linked Child Repo Conversion Checklist

## Purpose

This checklist standardizes one repo conversion from `tracked_snapshot` to `linked_child_repo` in the root `clever-msa-platform` workspace.

Use it for each repo selected from:

- `docs/superpowers/plans/2026-04-09-development-linked-child-repos-inventory.md`

## Preconditions

1. The target repo already has its own independent git remote.
2. The target repo path is currently visible from the root as a tracked snapshot.
3. The repo has been assigned to a migration batch.
4. No unrelated root cleanup is bundled into the same commit.

## Required Inputs

For each conversion, record:

1. target repo path
2. target remote URL
3. child repo commit to expose from root
4. migration batch name

## Conversion Steps

### 1. Confirm child repo identity

1. Confirm the child repo path exists under `development/`.
2. Confirm `git -C <path> remote get-url origin`.
3. Confirm `git -C <path> rev-parse --short HEAD`.

Expected result:

- the target repo has a valid independent remote and a known commit

### 2. Confirm current root representation

1. Confirm the repo appears in root inventory as `tracked_snapshot`.
2. Confirm the repo is not already represented as a linked child repo entry.

Expected result:

- the conversion is necessary and not duplicative

### 3. Remove root-tracked snapshot representation

1. Remove the root-tracked files for the target repo path from the root index.
2. Do not delete the child repo working tree itself.
3. Keep the child repo contents intact on disk.

Expected result:

- the root index no longer treats the repo as root-owned snapshot code

### 4. Register linked child repo representation

1. Add the repo back to the root as a linked child repo entry.
2. Ensure `.gitmodules` is updated if needed.
3. Ensure the root path now points to the intended child repo commit.

Expected result:

- the repo is visible from root as a linked child repo

### 5. Verify root visibility and local usability

1. Check `git status --short` at the root.
2. Check `git ls-files --stage <path>` and confirm mode `160000`.
3. Check `.gitmodules` for the correct path and URL.
4. Confirm the root worktree still behaves as expected after the conversion.

Expected result:

- the root sees the repo as a linked child repo and the workspace is still usable

### 6. Document the conversion

1. Update the inventory row for that repo from `tracked_snapshot` to `linked_child_repo`.
2. Update the root-visible commit in the inventory.
3. If batch notes exist, record that the repo has been converted.

Expected result:

- the inventory remains trustworthy after every repo migration

### 7. Commit and push

Use a repo-specific root commit, for example:

```bash
git commit -m "chore: link <repo-name> from umbrella workspace"
```

Expected result:

- the representation change is isolated and easy to audit or revert

## Do Not

1. Do not bundle multiple unrelated repos into one conversion unless the batch explicitly requires it.
2. Do not change child repo runtime code during the representation migration.
3. Do not mix workspace governance edits with child repo implementation edits.
4. Do not hide the repo from root GitHub visibility as a shortcut.

## Recommended First Execution

Use this checklist on one repo from batch 1 before attempting any broader batch conversion.
