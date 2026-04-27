FROM nginx:1.27-alpine

RUN apk add --no-cache python3

COPY nginx.conf /etc/nginx/templates/nginx.full.conf
COPY nginx.bootstrap-proof.conf /etc/nginx/templates/nginx.bootstrap-proof.conf
COPY nginx.partial.base.start.conf /etc/nginx/templates/nginx.partial.base.start.conf
COPY nginx.partial.base.end.conf /etc/nginx/templates/nginx.partial.base.end.conf
COPY nginx.routes.*.conf /etc/nginx/templates/
COPY render_gateway_config.py /etc/nginx/templates/render_gateway_config.py
COPY docker-entrypoint.sh /docker-entrypoint.sh
COPY public-api-docs/ /opt/edge/public-api-docs/

RUN test -f /opt/edge/public-api-docs/openapi.yaml && \
    test -f /opt/edge/public-api-docs/revision.json && \
    test -f /opt/edge/public-api-docs/service-export-manifest.json

RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
