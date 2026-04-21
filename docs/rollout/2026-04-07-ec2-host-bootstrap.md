# 새 EC2 배포 호스트 부트스트랩 기준

중앙 배포 레이어의 EC2 경로는 기존 호스트에 맞추는 방식이 아니라, 새 EC2를 표준 호스트로 준비하는 방향을 기본값으로 삼는다.

## 목표

- GitHub Actions는 호스트를 고정 인스턴스 ID가 아니라 EC2 태그로 찾는다.
- 배포 호스트는 `clever-msa-platform` 모노레포를 checkout 한 뒤, 지정된 compose service만 `up -d --build` 한다.
- SSM으로만 배포 가능해야 하므로, EC2는 반드시 SSM managed instance 상태여야 한다.

## 필수 태그

- `CleverProject=clever-msa`
- `CleverEnvironment=dev|stage|prod`
- `CleverRole=app-host`

현재 중앙 배포 카탈로그는 아래 셀렉터를 사용한다.

```text
tag:CleverProject=clever-msa,tag:CleverEnvironment={environment},tag:CleverRole=app-host,instance-state-name=running
```

## 필수 인프라 조건

- OS: Amazon Linux 2023
- IAM Instance Profile:
  - `AmazonSSMManagedInstanceCore`
  - ECR pull이 필요하면 ECR read 정책 추가
- 네트워크:
  - GitHub source pull 또는 내부 소스 pull이 가능해야 함
  - outbound package install 허용
- 디스크:
  - Docker build cache와 이미지 레이어를 감안해 40GB 이상 권장

## 부트스트랩 스크립트

실행 스크립트:

- [bootstrap-ec2-amazon-linux-2023.sh](../../scripts/deploy/bootstrap-ec2-amazon-linux-2023.sh)

기본 동작:

- `git`, `docker`, `jq`, `awscli` 설치
- Docker 활성화
- `/srv/clever/clever-msa-platform` 작업 디렉토리 생성
- `REPO_URL`이 주어지면 모노레포 clone

## 권장 user-data 예시

```bash
#!/bin/bash
set -euo pipefail
export REPO_URL="git@github.com:<ORG>/<REPO>.git"
export REPO_DIR="/srv/clever/clever-msa-platform"
cat >/tmp/bootstrap.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
dnf update -y
dnf install -y git docker docker-compose-plugin jq awscli
systemctl enable docker
systemctl start docker
usermod -aG docker ec2-user || true
mkdir -p /srv/clever
chown -R ec2-user:ec2-user /srv/clever
if [[ -n "${REPO_URL:-}" && ! -d "${REPO_DIR}/.git" ]]; then
  sudo -u ec2-user git clone "$REPO_URL" "$REPO_DIR"
fi
EOF
bash /tmp/bootstrap.sh
```

## 운영 주의점

- private repo면 EC2 host에 read-only deploy key 또는 machine user credential이 필요하다.
- private repo 환경에서는 `raw.githubusercontent.com` 직접 다운로드보다 inline user-data 또는 S3 배포가 안전하다.
- host 내부에서 `git checkout --detach <sha>`가 가능해야 GitHub Actions의 SHA 기반 배포가 동작한다.
- compose 파일 경로는 현재 `development/integration-local-stack/docker-compose.account-driver-settlement.yml` 기준이다.
