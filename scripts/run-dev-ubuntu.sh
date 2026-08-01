#!/bin/sh

set -eu

source_dir=/home/silence/.local/src/metacubexd-netmon-dev
node_dir=/home/silence/.local/opt/node-v24.18.1-linux-x64
runtime_dir=/tmp/metacubexd-dev-$(id -u)

export PATH="/home/silence/.local/bin:$node_dir/bin:/usr/local/bin:/usr/bin:/bin"
export NUXT_PUBLIC_DEFAULT_BACKEND_URL=http://192.168.10.123:9090
export NUXT_TELEMETRY_DISABLED=1

mkdir -p "$runtime_dir"
exec 9>"$runtime_dir/runner.lock"
flock -n 9 || exit 0

cd "$source_dir"
while true; do
  pnpm exec nuxt dev --host 0.0.0.0 --port 3000 || true
  sleep 3
done
