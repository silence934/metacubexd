#!/bin/sh

set -eu

source_dir=${1:-/home/silence/.local/share/metacubexd-feature-config-editor}
target_dir=/etc/mihomo/ui
stamp=$(date +%Y%m%d-%H%M%S)
backup_dir=/home/silence/.local/share/metacubexd-ui-backup-$stamp

if [ "$(id -u)" -ne 0 ]; then
  echo "请使用 sudo 运行此脚本。" >&2
  exit 1
fi

test -f "$source_dir/index.html"
test -f "$source_dir/config.js"
test -d "$target_dir"
test -f "$target_dir/index.html"

mkdir -p "$backup_dir"
rsync -a "$target_dir/" "$backup_dir/"
rsync -a --delete "$source_dir/" "$target_dir/"
chown -R root:root "$target_dir"

echo "MetaCubeXD 配置编辑与网络监控版已安装。"
echo "打开：http://192.168.10.123:9090/ui/"
echo "备份：$backup_dir"
