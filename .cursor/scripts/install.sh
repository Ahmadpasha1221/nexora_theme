#!/usr/bin/env bash
set -euo pipefail

export PATH="/home/ubuntu/.local/bin:${PATH}"
BENCH_DIR="/home/ubuntu/frappe-bench"
SITE_NAME="test_site"
WORKSPACE="/workspace"

if ! command -v bench >/dev/null 2>&1; then
	pip install --user --break-system-packages frappe-bench
fi

if [ ! -d "${BENCH_DIR}/apps/frappe" ]; then
	bench init \
		--skip-redis-config-generation \
		--skip-assets \
		--python "$(command -v python3)" \
		--frappe-branch version-15 \
		"${BENCH_DIR}"
fi

python3 - <<'PY'
import json
from pathlib import Path

config_path = Path("/home/ubuntu/frappe-bench/sites/common_site_config.json")
config = json.loads(config_path.read_text())
for key in ("redis_cache", "redis_queue", "redis_socketio"):
	config[key] = "redis://127.0.0.1:6379"
config_path.write_text(json.dumps(config, indent=1) + "\n")
PY

cd "${BENCH_DIR}"

if [ ! -d "${BENCH_DIR}/apps/nexora_theme" ]; then
	bench get-app nexora_theme "${WORKSPACE}"
else
	ln -sfn "${WORKSPACE}" "${BENCH_DIR}/apps/nexora_theme"
fi

bench setup requirements --dev

if [ ! -d "${BENCH_DIR}/sites/${SITE_NAME}" ]; then
	bench new-site "${SITE_NAME}" \
		--db-root-password root \
		--admin-password admin \
		--mariadb-user-host-login-scope='%' \
		--no-mariadb-socket
	bench --site "${SITE_NAME}" install-app nexora_theme
else
	bench --site "${SITE_NAME}" install-app nexora_theme || true
fi

bench --site "${SITE_NAME}" set-config host_name "${SITE_NAME}"
bench --site "${SITE_NAME}" add-to-hosts

bench build

pip install --user --break-system-packages pre-commit ruff
cd "${WORKSPACE}"
pre-commit install-hooks
