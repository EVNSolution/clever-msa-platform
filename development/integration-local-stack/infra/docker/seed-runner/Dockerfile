FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /workspace

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY clever-msa-platform/development/service-account-access/requirements.txt /tmp/account-auth-requirements.txt
COPY clever-msa-platform/development/service-driver-profile/requirements.txt /tmp/driver-profile-requirements.txt
COPY clever-msa-platform/development/service-organization-registry/requirements.txt /tmp/organization-master-requirements.txt
COPY clever-msa-platform/development/service-settlement-operations-view/requirements.txt /tmp/settlement-requirements.txt
COPY clever-msa-platform/development/service-terminal-registry/requirements.txt /tmp/terminal-registry-requirements.txt
COPY clever-msa-platform/development/service-telemetry-hub/requirements.txt /tmp/telemetry-hub-requirements.txt
COPY clever-msa-platform/development/service-dispatch-registry/requirements.txt /tmp/dispatch-registry-requirements.txt

RUN pip install --no-cache-dir \
    -r /tmp/account-auth-requirements.txt \
    -r /tmp/driver-profile-requirements.txt \
    -r /tmp/organization-master-requirements.txt \
    -r /tmp/settlement-requirements.txt \
    -r /tmp/dispatch-registry-requirements.txt \
    -r /tmp/terminal-registry-requirements.txt \
    -r /tmp/telemetry-hub-requirements.txt

COPY MSA-Server/services /workspace/services
COPY clever-msa-platform/development/service-account-access /workspace/services/account-auth
COPY clever-msa-platform/development/service-driver-profile /workspace/services/driver-profile
COPY clever-msa-platform/development/service-organization-registry /workspace/services/organization-master
COPY clever-msa-platform/development/service-vehicle-registry /workspace/services/vehicle-asset
COPY clever-msa-platform/development/service-dispatch-registry /workspace/services/dispatch-registry
COPY clever-msa-platform/development/service-terminal-registry /workspace/services/terminal-registry
COPY clever-msa-platform/development/service-telemetry-hub /workspace/services/telemetry-hub
COPY clever-msa-platform/development/service-vehicle-assignment /workspace/services/driver-vehicle-assignment
COPY clever-msa-platform/development/service-settlement-operations-view /workspace/services/settlement
COPY clever-msa-platform/development/integration-local-stack/infra/env /workspace/infra/env
COPY clever-msa-platform/development/integration-local-stack/infra/docker/seed-runner/run-seed.sh /workspace/infra/docker/seed-runner/run-seed.sh

RUN chmod +x /workspace/infra/docker/seed-runner/run-seed.sh \
    && ln -s /workspace/infra/docker/seed-runner/run-seed.sh /usr/local/bin/run-seed.sh

ENTRYPOINT ["/usr/local/bin/run-seed.sh"]
