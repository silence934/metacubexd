# 家庭网络监控集成维护说明

## 版本与分支

- 上游仓库：`https://github.com/MetaCubeX/metacubexd.git`
- 当前上游基线：`v1.255.2`（`a2874b0`）
- 本地维护分支：`codex/netmon-integration`
- 自定义版本：`1.255.2-netmon.1`

自定义代码只保留在独立分支中，不直接改动上游标签。服务器上的生产构建也保留独立备份，方便升级和回滚。

## 集成结构

- `components/Sidebar.vue`：桌面侧边栏入口。
- `components/MobileBottomNav.vue`：移动端二级菜单入口。
- `pages/netmon.vue`：网络监控页面及加载、刷新、故障状态。
- `i18n/locales/*.json`：中、英、俄文案。
- `scripts/install-netmon-build.sh`：当前版本的服务器安装脚本。

MetaCubeXD 是静态前端，采集服务继续由 Ubuntu 上的 `netmon.py` 提供。页面通过同一台 Ubuntu 的 `8088` 端口嵌入看板，因此不会把采集逻辑和 Mihomo 控制逻辑耦合在一起。

## 本地构建与验证

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm typecheck
corepack pnpm test:unit
corepack pnpm generate:mihomo
```

生产文件输出到 `.output/public/`。Mihomo 从 `/ui/` 子目录提供页面，因此必须使用 `generate:mihomo` 生成相对资源路径；普通 `generate` 会让浏览器错误请求根目录 `/_nuxt/`。

## 当前部署位置

- 待安装构建：`/home/silence/.local/share/metacubexd-netmon-1.255.2-netmon.1`
- 安装脚本：`/home/silence/.local/bin/install-metacubexd-netmon`
- Mihomo UI：`/etc/mihomo/ui`
- 原 UI 备份：`/home/silence/.local/share/metacubexd-ui-backup-20260801`

## Ubuntu临时开发模式

- 开发源码镜像：`/home/silence/.local/src/metacubexd-netmon-dev`
- 开发地址：`http://192.168.10.123:3000/`
- 启动脚本：`/home/silence/.local/bin/run-metacubexd-dev`
- 日志：`/home/silence/.local/share/metacubexd-dev/dev.log`

本地Git仓库仍是唯一源码来源。修改完成后用 `rsync` 将源码同步到Ubuntu镜像，Nuxt会热更新，无需执行生产构建或改写 `/etc/mihomo/ui`。开发服务不替代9090上的生产页面，也不配置开机启动。

安装：

```bash
sudo /home/silence/.local/bin/install-metacubexd-netmon
```

回滚：

```bash
sudo rsync -a --delete /home/silence/.local/share/metacubexd-ui-backup-20260801/ /etc/mihomo/ui/
sudo chown -R root:root /etc/mihomo/ui
```

## 跟随上游升级

先获取上游标签，再把本分支的集成提交重放到新版本：

```bash
git fetch origin --tags
git checkout codex/netmon-integration
git rebase --onto v新版本 v1.255.2
```

处理可能出现的导航组件或翻译文件冲突后，更新 `package.json` 的自定义版本、安装脚本中的构建目录和本说明，再完整执行类型检查、单元测试和生产构建。部署新版本前，应为 `/etc/mihomo/ui` 创建新的带日期备份。

## 注意事项

- 保留服务器现有的 `config.js`，避免丢失 MetaCubeXD 默认后端设置。
- 网络监控服务的 CSP 当前只允许 `http://192.168.10.123:9090` 嵌入；Ubuntu 地址或 UI 端口变化时需要同步调整。
- 发布后若仍显示旧 UI，应强制刷新或清理该站点的 Service Worker 缓存。
