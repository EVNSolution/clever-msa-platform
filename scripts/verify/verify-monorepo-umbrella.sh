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
