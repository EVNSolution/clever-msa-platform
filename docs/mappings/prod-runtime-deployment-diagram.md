# Prod Runtime Deployment Diagram

이 문서는 현재 `ev-dashboard` 운영 배포 구조를 요약한 정본 다이어그램이다.

- 상단: `AWS`
- 중단: `GitHub`
- 하단: `로컬`
- 선 위 텍스트는 두지 않고, 박스와 배치만으로 흐름을 읽는다.

```mermaid
%%{init: {
  "theme": "base",
  "themeVariables": {
    "background": "#f7f5ef",
    "primaryColor": "#fffdf8",
    "primaryTextColor": "#1f1f1f",
    "primaryBorderColor": "#cfc8b8",
    "lineColor": "#8f8778",
    "secondaryColor": "#e7edc6",
    "tertiaryColor": "#f7f5ef",
    "fontFamily": "Pretendard, Apple SD Gothic Neo, sans-serif"
  }
}}%%
flowchart BT

  subgraph TOP["AWS"]
    direction TB

    ECR["ECR"]
    HOST["EVDash-msa"]
    DISK["EBS /data"]

    ECR --> HOST
    HOST --- DISK
  end

  subgraph MID["GitHub"]
    direction LR

    BUILD["이미지 생성"]
    RELEASE["runtime-prod-release<br/>배포 실행"]
    PLATFORM["runtime-prod-platform<br/>런타임 기준"]

    BUILD --> ECR
    PLATFORM --> RELEASE
    RELEASE --> HOST
  end

  subgraph BOTTOM["로컬"]
    direction LR

    FE["front-web-console"]
    EDGE["edge-api-gateway"]
    SERVICES["service-*"]

    FE --> BUILD
    EDGE --> BUILD
    SERVICES --> BUILD
  end

  classDef accent fill:#dfe8a4,stroke:#8b9560,color:#1f1f1f;
  classDef paper fill:#fffdf8,stroke:#cfc8b8,color:#1f1f1f;

  class RELEASE,PLATFORM accent;
  class FE,EDGE,SERVICES,BUILD,ECR,HOST,DISK paper;
```

## Reading Guide

1. 로컬 구현 repo에서 이미지를 만든다.
2. GitHub가 이미지를 `ECR`로 올린다.
3. `runtime-prod-platform`이 런타임 기준과 inventory를 소유한다.
4. `runtime-prod-release`가 그 기준을 읽고 `EVDash-msa`로 배포를 실행한다.
5. 운영 데이터는 `EBS /data`에 붙어 있다.
