# ThreadPilot

ThreadPilot 是一个面向小红书公开讨论的产品机会发现与人工确认评论工具。它读取产品网站或 GitHub 公开资料构建 Product Brain，搜索相关小红书笔记与公开评论，生成有依据的中文草稿，并在每次真实评论或回复前要求人工二次确认。

ThreadPilot 不发布笔记，不自动点赞或收藏，不批量评论，也没有自动发布模式。

## 已实现能力

- 中文产品管理：创建、切换、拖拽排序、回收站恢复，软删除内容 7 天后永久清理；
- Product Brain：抓取公开网站/GitHub，保存来源证据、能力边界、目标用户和检索词；
- 小红书扫码登录：Cookie 只保存在本地 `.xiaohongshu-data/`，不会写入数据库或日志；
- 真实公开内容搜索：保存笔记 ID、评论 ID 和详情访问令牌，过滤非笔记占位项并抑制重复结果；
- 笔记与评论机会：读取公开正文及评论，区分笔记评论和评论回复目标；
- 中文草稿：禁止链接、虚假官方身份和未经确认的开发者身份；
- 人工确认：确认令牌绑定目标、草稿哈希和当前小红书账号，10 分钟有效且只能使用一次；
- 评论安全：每日产品上限、全局停止开关、写操作不自动重试；
- 数据库迁移：API 启动时自动执行 Alembic，当前迁移版本为 `0005`。

## 技术栈

- Next.js 15、React 19、TypeScript；
- FastAPI、SQLAlchemy Async、Alembic；
- PostgreSQL 16、Redis、Celery；
- Docker Compose；
- OpenAI-compatible LLM；
- 本地 `xiaohongshu-mcp` 服务与 CloakBrowser。

## 快速启动

需要 macOS Apple Silicon 和 Docker Desktop。

```bash
git clone https://github.com/super-xinz/ThreadPilot.git
cd ThreadPilot
cp .env.example .env
```

在 `.env` 中配置大模型：

```dotenv
LLM_PROVIDER=openai
LLM_API_KEY=你的密钥
LLM_BASE_URL=https://api.openai.com/v1
LLM_STRONG_MODEL=接口实际支持的模型名
```

启动全部服务：

```bash
make dev
```

首次构建小红书 MCP 时会下载约 200MB 的浏览器运行文件。完成后访问：

- 控制台：http://localhost:3000/dashboard
- 小红书账号：http://localhost:3000/account
- API 文档：http://localhost:8000/docs
- MCP 健康检查：http://localhost:18060/health

停止服务：

```bash
make down
```

## 第一次使用

1. 打开 `/account`，使用小红书 App 扫码登录；
2. 在 `/products/new` 添加产品网站或 GitHub 地址；
3. 检查 Product Brain 的来源证据、目标用户和能力边界；
4. 在产品概览输入关键词，点击“搜索小红书机会”；
5. 在机会页查看公开笔记和评论，点击“生成草稿”；
6. 编辑草稿，点击“检查并确认”；
7. 在弹窗中核对目标与完整文案；
8. 只有点击“确认并发布评论”才会向小红书执行一次评论或回复。

任何草稿变化都会使已有确认失效。切换小红书账号、令牌过期、重复使用令牌、达到每日上限或开启全局停止开关时，执行端点都会拒绝发布。

## 页面

- `/dashboard`：产品总览、排序和回收站；
- `/account`：扫码登录、账号状态和重新登录；
- `/products/new`：创建产品并分析公开资料；
- `/products/{id}`：Product Brain、搜索入口和产品设置；
- `/products/{id}/opportunities`：笔记/评论机会、草稿编辑和最终确认；
- `/products/{id}/conversations`：已执行互动的后续状态；
- `/products/{id}/safety`：账号状态、安全边界和操作记录。

## 核心 API

```text
GET    /v1/xiaohongshu/status
GET    /v1/xiaohongshu/login/qrcode
GET    /v1/xiaohongshu/account
DELETE /v1/xiaohongshu/login

POST   /v1/products
PUT    /v1/products/order
DELETE /v1/products/{id}
POST   /v1/products/{id}/restore
DELETE /v1/products/{id}/permanent

POST   /v1/products/{id}/xiaohongshu/search
GET    /v1/products/{id}/opportunities
POST   /v1/xiaohongshu/opportunities/{id}/draft
POST   /v1/xiaohongshu/opportunities/{id}/confirm
POST   /v1/xiaohongshu/opportunities/{id}/execute
```

`execute` 是唯一会产生小红书外部写操作的端点。它必须收到由 `confirm` 返回的一次性令牌和完全一致的草稿正文。

## 测试

```bash
make test
make lint
make typecheck
make build
```

验证范围包括 Product Brain、产品生命周期、MCP 客户端、真实响应规范化、搜索去重、笔记/评论机会、草稿质量、目标/账号/草稿绑定、一次性确认、过期与每日上限、前端导航及生产构建。

## 数据与安全

- `.env`、`.xiaohongshu-data/`、数据库卷和 Celery 状态文件不会进入 Git；
- 不读取浏览器 Cookie 文件内容，不在 API 响应或日志中输出 Cookie；
- 不发布小红书笔记、图片或视频；
- 不自动点赞、收藏、关注、私信或批量互动；
- 评论/回复写操作不做网络重试，避免响应丢失时重复发布；
- 请只将它用于你有权运营的账号，并自行遵守小红书平台规则和适用法律。

## 项目结构

```text
apps/api       FastAPI、任务与数据库迁移
apps/web       中文 Next.js 控制台
tests          后端与工作流测试
infra/docker   API/Web 镜像
可以参考的开源项目/xiaohongshu-mcp-main
               本地小红书 MCP 服务
```
