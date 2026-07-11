# ThreadPilot

ThreadPilot 是一个以证据、透明披露和安全策略为核心的 Reddit 增长智能体。它把产品网站或 GitHub 仓库转换成 Product Brain，再完成机会判断、回复草稿、影子发布、对话跟进、短链归因和安全审计。

Web 控制台已经中文化。真实 Reddit Data API 当前仍在申请审核中，因此项目默认只运行本地与影子模式，不会访问或发布真实 Reddit 内容。

## 当前状态

| 能力 | 状态 | 说明 |
| --- | --- | --- |
| 中文 Web 控制台 | 已完成 | 动态导航高亮、产品分析、机会、对话、安全和漏斗页面 |
| 网站 / GitHub 公开资料抓取 | 已完成 | 提取正文、去除导航脚本、保存内容哈希和来源 |
| Product Brain | 已完成 | 严格 JSON Schema、自动修复重试、证据原文校验、版本管理 |
| 本地机会与策略闭环 | 已完成 | Fixture、意图、评分、Policy Engine、回复、审计 |
| 影子发布与对话状态机 | 已完成 | 幂等发布记录、追问分类、链接请求、停止条件 |
| Tracking SDK 与事件归因 | 已完成 | 访问、注册、激活事件和 Dashboard 汇总 |
| Reddit Data API 真实读取 | 等待批准 | `REDDIT_APP_APPROVAL_STATUS=API_APPLICATION_PENDING` |
| Reddit OAuth Token Exchange | 尚未启用 | 获批并取得 Client ID/Secret 后接通 |
| 真实 subreddit 搜索和规则同步 | 尚未启用 | 当前社区发现仅用于本地/影子验证 |
| 真实评论发布 | 强制关闭 | 未获 Reddit 明确许可前不能开启 |

## 技术栈

- Next.js 15 + React 19；
- FastAPI + SQLAlchemy Async；
- PostgreSQL 16 + pgvector；
- Redis + Celery；
- Docker Compose；
- OpenAI-compatible LLM Provider；
- Pytest、pytest-asyncio 与 TypeScript 类型检查。

## 快速启动

### 1. 环境要求

推荐只安装 Docker Desktop。macOS 通常已经包含 `make`。

- Docker Desktop：https://www.docker.com/products/docker-desktop/
- Git：用于版本管理；
- Make：用于简化常用命令。

### 2. 创建本地配置

```bash
git clone https://github.com/super-xinz/ThreadPilot.git
cd ThreadPilot
cp .env.example .env
```

`.env` 已被 `.gitignore` 排除，禁止将真实 API Key、OAuth Secret 或 Token 提交到 GitHub。

### 3. 启动全部服务

```bash
make dev
```

第一次启动会下载基础镜像并安装依赖。完成后访问：

- 中文控制台：http://localhost:3000
- API 文档：http://localhost:8000/docs
- API 健康检查：http://localhost:8000/health

停止服务：

```bash
make down
```

## 大模型配置

默认配置使用 `mock`，无需外部 Key，但只适合测试流程。

要获得真实产品分析，在 `.env` 中配置 OpenAI 或兼容接口：

```dotenv
LLM_PROVIDER=openai
LLM_API_KEY=你的密钥
LLM_BASE_URL=https://api.openai.com/v1
LLM_STRONG_MODEL=你实际可用的模型名称
LLM_CHEAP_MODEL=
EMBEDDING_MODEL=
```

修改后重新创建服务：

```bash
docker compose up -d --force-recreate api worker
```

Product Brain 会要求模型完整返回：

- 产品定位与品类；
- 目标用户；
- Jobs to be done；
- 痛点与使用场景；
- 推荐和禁止推荐边界；
- 带 `source_id`、原文引用和置信度的能力声明；
- 不确定信息；
- 高意向检索图谱。

缺字段或证据引用不真实时，系统会自动要求模型修复；再次失败则把产品标记为 `ANALYSIS_FAILED`，不会伪装为分析成功。

## 第一次本地体验

1. 打开 http://localhost:3000/products/new；
2. 输入产品名称，以及公开网站或 GitHub 仓库地址；
3. 系统抓取公开资料并构建 Product Brain；
4. 进入产品分析页检查目标用户、痛点、证据声明和不推荐边界；
5. 使用本地 Fixture 验证机会与对话闭环。

建议明确指定产品 ID，避免 Fixture 导入到其他产品：

```bash
make seed PRODUCT_ID=你的产品ID
```

产品 ID 可以从产品页面 URL 中取得：

```text
/products/{产品ID}
```

Fixture 导入会完成：

- 创建本地 Reddit 测试内容；
- 建立候选机会；
- 运行意图分类和机会评分；
- 运行 Policy Engine；
- 生成透明回复草稿；
- 写入策略审计。

## 页面说明

- `/dashboard`：扫描、机会、对话、访问、注册、激活与风险总览；
- `/products/new`：产品接入与自动分析；
- `/products/{id}`：完整 Product Brain、证据、推荐边界和 Tracking SDK；
- `/products/{id}/opportunities`：候选内容、意图、机会/风险分、策略和回复草稿；
- `/products/{id}/conversations`：对话、追问、链接请求、转化和关闭状态；
- `/products/{id}/safety`：社区状态、风险事件和策略审计。

侧边栏根据当前 URL 和产品 ID 动态生成。只有当前页面对应的入口会高亮，产品子页面不会再错误高亮“总览”。

## Reddit API 申请阶段

Reddit Responsible Builder Policy 要求先申请并获得明确批准。申请等待期间使用：

```dotenv
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_REDIRECT_URI=http://localhost:8000/v1/reddit/oauth/callback
REDDIT_USER_AGENT=macos:threadpilot:v0.1 (by /u/你的专用账号)
REDDIT_APP_APPROVAL_STATUS=API_APPLICATION_PENDING
AUTOPUBLISH_ENABLED=false
GLOBAL_KILL_SWITCH=false
```

申请入口：

https://support.reddithelp.com/hc/en-us/requests/new?ticket_form_id=14868593862164

源码地址：

https://github.com/super-xinz/ThreadPilot

批准非商业访问后，才能根据 Reddit 的实际批准范围修改：

```dotenv
REDDIT_APP_APPROVAL_STATUS=API_APPROVED_NON_COMMERCIAL
```

不能自行填写 `COMMERCIAL_APPROVED`。真实发布开关也不能因为取得 Client ID 就直接打开。

## 发布安全边界

项目默认不会向 Reddit 发布评论。当前发布端点只会生成 `SHADOW_RECORDED` 或本地模拟记录。

任何真实发布实现都必须同时满足：

```text
环境 AUTOPUBLISH_ENABLED=true
产品 autopublish_enabled=true
Reddit 明确批准对应用途
专用 Reddit 账号 ACTIVE
社区规则明确允许
策略决策 ALLOW_AUTOREPLY
账号和社区配额充足
GLOBAL_KILL_SWITCH=false
```

项目明确禁止：

- 多账号矩阵和账号轮换；
- 自动点赞、点踩或操纵 Karma；
- 自动私信陌生用户；
- 重复或近似模板跨社区发布；
- 浏览器模拟登录和绕过 CAPTCHA；
- 规避限流、封禁、用户屏蔽或 Moderator 决定；
- 用 Reddit 数据训练或微调模型；
- 推断 Redditor 的敏感属性。

## 验证与测试

运行全部后端测试：

```bash
make test
```

当前测试共 10 项，包含一条完整受保护 API 闭环：

```text
创建产品
→ 构建并严格校验 Product Brain
→ 社区状态与规则
→ 创建机会
→ 策略决策
→ 回复生成
→ 幂等影子发布
→ 对话和链接请求
→ 短链跳转
→ 注册/激活事件
→ Analytics、风险和审计
→ Reddit 账号 CRUD
→ 产品启停和安全开关入口
```

前端类型检查：

```bash
make typecheck
```

常规代码检查：

```bash
make lint
```

## API 主流程

```text
POST /v1/products
POST /v1/products/{id}/ingest
POST /v1/products/{id}/build-brain
GET  /v1/products/{id}/brain
POST /v1/products/{id}/discover-subreddits
GET  /v1/products/{id}/opportunities
GET  /v1/opportunities/{candidate_id}/decision
GET  /v1/opportunities/{candidate_id}/generated-reply
POST /v1/opportunities/{candidate_id}/publish
POST /v1/conversations/{conversation_id}/followup
GET  /c/{short_code}
POST /v1/events
GET  /v1/products/{id}/analytics/overview
GET  /v1/products/{id}/risk-events
GET  /v1/products/{id}/audit-log
```

## 数据与隐私

- `.env`、本地数据库、缓存和依赖目录不会进入 Git；
- Reddit API 获批前不读取真实 Reddit 数据；
- 真实接入后必须同步删除或移除状态，及时清理已删除内容；
- Token 必须加密保存，日志不得输出 Client Secret、Access Token 或 Refresh Token；
- Tracking SDK 仅接收项目定义的访问、注册和激活事件，不应收集敏感个人信息。

## 已知外部阻塞

以下能力不能通过本地代码自行解锁：

1. Reddit Data API 访问批准；
2. OAuth Client ID 与 Client Secret；
3. Reddit 明确允许的读取和发布 scope；
4. 各 subreddit 的真实规则和 Moderator 决定。

收到 Reddit 批准后，下一步是实现并验证 OAuth Token Exchange、加密 Token 存储、只读内容同步、删除同步和真实社区规则刷新；在这些环节全部通过前，真实发布保持关闭。
