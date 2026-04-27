#!/bin/sh
set -eu

profile="${GATEWAY_PROFILE:-full}"
template_dir="/etc/nginx/templates"

case "$profile" in
  full)
    cp "$template_dir/nginx.full.conf" /etc/nginx/nginx.conf
    ;;
  partial)
    python3 "$template_dir/render_gateway_config.py" \
      --profile partial \
      --route-groups "${GATEWAY_ROUTE_GROUPS:-}" \
      --template-dir "$template_dir" \
      > /etc/nginx/nginx.conf
    ;;
  bootstrap-proof)
    cp "$template_dir/nginx.bootstrap-proof.conf" /etc/nginx/nginx.conf
    ;;
  *)
    echo "unsupported GATEWAY_PROFILE: $profile" >&2
    exit 1
    ;;
esac

exec nginx -g 'daemon off;'
