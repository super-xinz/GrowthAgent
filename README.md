# ThreadPilot / GrowthAgent

本地优先、单用户自托管的小红书需求发现与克制触达工具。它根据产品公开资料建立带证据的 Product Brain，发现真实需求，并在高匹配、低风险和严格频控条件下生成简短回复。

> 当前版本只面向本机或可信内网的单用户部署。API 没有多用户认证，请勿把 3000、8000、18060 端口直接暴露到公网。

## 下载与启动

### Windows 用户

从 [GitHub Releases](https://github.com/super-xinz/ThreadPilot/releases) 下载 `ThreadPilot-Windows-x64.exe`。安装并启动 Docker Desktop 后，双击 EXE：

1. 首次运行自动生成本地密钥和数据库密码；
2. 下载并启动所需容器；
3. 等待服务健康后打开 `http://localhost:3000/dashboard`。

再次双击会更新并启动服务。命令行运行 `ThreadPilot-Windows-x64.exe --stop` 可停止服务。

### macOS / Linux / 开发者

需要 Git、Docker Desktop（或 Docker Engine + Compose v2）。

```bash
git clone https://github.com/super-xinz/ThreadPilot.git
cd ThreadPilot
cp .env.example .env
```

将 `.env` 中的 `SECRET_KEY`、`ENCRYPTION_KEY` 和 `POSTGRES_PASSWORD` 换成独立随机值，然后启动：

```bash
make dev
```

访问：

- 工作台：<http://localhost:3000/dashboard>
- 设置：<http://localhost:3000/account>
- API 文档：<http://localhost:8000/docs>

## 模型 API Key

无需把模型密钥写进源码或前端环境变量。启动后进入“设置 → 模型服务”，填写：

- OpenAI 兼容 API 地址；
- 模型名称；
- API Key；
- 可选的思考模式。

API Key 通过本机 API 发送到后端，使用 `ENCRYPTION_KEY` 加密后存入数据库。读取设置时只返回“已配置”和末四位提示，明文不会返回浏览器，也不会进入 Next.js 构建产物。

## 安全边界

- Docker 端口只绑定到 `127.0.0.1`；PostgreSQL 和 Redis 不映射到宿主机。
- 小红书 Cookie 保存在本地 Docker volume 或 `.xiaohongshu-data/`，已被 Git 忽略。
- 默认使用 Mock 模型；未配置在线模型时不会意外产生模型费用。
- 发布、搜索和回复带有分数阈值、风险阈值、冷却、日上限与全局停止开关。
- 不重试外部写操作，避免平台已接收但响应丢失时产生重复评论。

完整说明见 [安全政策](SECURITY.md) 与 [运行手册](docs/runbook.md)。

## 第三方服务

小红书浏览器自动化由外部项目 [`xpzouying/xiaohongshu-mcp`](https://github.com/xpzouying/xiaohongshu-mcp) 的 Docker 镜像提供。其源码不再内嵌或重新授权为本项目代码；请在使用前自行检查上游条款和平台规则。详见 [第三方声明](THIRD_PARTY_NOTICES.md)。

上游镜像当前以 `linux/amd64` 运行；Apple Silicon 上由 Docker Desktop 兼容执行，首次启动和浏览器操作可能稍慢。

## 开发与验证

```bash
make test
make lint
make typecheck
make build
```

目录：

```text
apps/api          FastAPI、数据库迁移、自动化与模型提供器
apps/web          Next.js 本地控制台
cmd               GitHub Release 桌面启动器
infra/docker      开发与发布镜像
docs              架构、政策、部署和运行手册
tests             后端与安全工作流测试
.github           CI、Release、Issue 与依赖更新配置
```

## 发布

推送 `v*` 标签后，GitHub Actions 会：

1. 构建并推送 API/Web 多架构镜像到 GHCR；
2. 交叉编译 Windows EXE、macOS 和 Linux 启动器；
3. 创建 GitHub Release 并附加可直接下载的文件。

首次发布前，请在 GitHub 中确认 Actions 拥有写入 Packages/Release 的权限，并将新建的 GHCR 容器包可见性设为 Public。当前启动器不带商业代码签名；Windows SmartScreen 可能在首次运行时提示来源未知，正式商业发布建议接入代码签名证书。

## 贡献与许可

提交前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。本项目自有代码使用 [Apache License 2.0](LICENSE)；第三方项目不自动继承本项目许可证。

请仅使用你有权运营的账号，并遵守平台规则、当地法律与适用的隐私义务。本项目不提供规避风控、批量骚扰或隐藏推广关系的能力。
