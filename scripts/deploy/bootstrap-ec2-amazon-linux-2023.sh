#!/usr/bin/env bash
set -euo pipefail

# Bootstrap a fresh Amazon Linux 2023 EC2 host for central deploy.
# Expected to run from EC2 user-data or once via SSM.

REPO_DIR="${REPO_DIR:-/srv/clever/clever-msa-platform}"
REPO_URL="${REPO_URL:-}"
DEPLOY_USER="${DEPLOY_USER:-ec2-user}"

dnf update -y
dnf install -y git docker docker-compose-plugin jq awscli

systemctl enable docker
systemctl start docker

usermod -aG docker "${DEPLOY_USER}" || true

mkdir -p "$(dirname "$REPO_DIR")"
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "$(dirname "$REPO_DIR")"

if [[ -n "$REPO_URL" && ! -d "${REPO_DIR}/.git" ]]; then
  sudo -u "${DEPLOY_USER}" git clone "$REPO_URL" "$REPO_DIR"
fi

if [[ -d "$REPO_DIR/.git" ]]; then
  sudo -u "${DEPLOY_USER}" git -C "$REPO_DIR" fetch --all --tags || true
fi

cat >/etc/profile.d/clever-central-deploy.sh <<EOF
export REPO_DIR="${REPO_DIR}"
EOF

echo "bootstrap complete: repo_dir=${REPO_DIR}"
