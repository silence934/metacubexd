#!/bin/sh

set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
source_dir=$(dirname "$script_dir")
target=192.168.10.123:/home/silence/.local/src/metacubexd-netmon-dev/

rsync -az --delete \
  --exclude='.git/' \
  --exclude='node_modules/' \
  --exclude='.output/' \
  --exclude='.nuxt/' \
  "$source_dir/" "silence@$target"

echo "开发源码已同步：http://192.168.10.123:3000/"
