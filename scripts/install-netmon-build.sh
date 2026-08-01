#!/bin/sh

set -eu

source_dir=/home/silence/.local/share/metacubexd-netmon-1.255.2-netmon.1
target_dir=/etc/mihomo/ui
backup_dir=/home/silence/.local/share/metacubexd-ui-backup-20260801

if [ "$(id -u)" -ne 0 ]; then
  echo "请使用 sudo 运行此脚本。" >&2
  exit 1
fi

test -f "$source_dir/index.html"
test -f "$source_dir/config.js"
test -d "$target_dir"
test -f "$backup_dir/index.html"

rsync -a --delete "$source_dir/" "$target_dir/"
chown -R root:root "$target_dir"

echo "MetaCubeXD 网络监控版已安装。"
echo "打开：http://192.168.10.123:9090/ui/#/netmon"
echo "备份：$backup_dir"
