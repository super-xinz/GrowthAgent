# ThreadPilot — Reddit Growth Agent MVP

这是一个“证据优先、受门禁保护的自动增长 Agent”MVP。它可以把一个公开产品网站或 GitHub 链接转换成 Product Brain、Query Graph、Reddit 机会列表、策略决策、透明回复草稿、对话记录、追踪短链、归因事件和 Dashboard 指标。

## 你需要先安装什么

最省心的方式是用 Docker 跑整个项目。你只需要安装：

1. Docker Desktop  
   下载地址：https://www.docker.com/products/docker-desktop/

2. Make  
   macOS 通常自带。你可以在终端运行：

```bash
make --version
```

如果能看到版本号，就不用管它。

如果你不想用 Docker，也可以手动安装 Python 3.12、Node.js、PostgreSQL、Redis，但不推荐第一轮这么做，坑会多很多。

## 你现在要做什么

在项目目录里执行：

```bash
cd /Users/jiangguangqun/Desktop/ThreadPilot
cp .env.example .env
make dev
```

第一次启动会下载镜像和依赖，可能比较慢。启动后打开：

- Web 控制台：http://localhost:3000
- API 文档：http://localhost:8000/docs

默认 `LLM_PROVIDER=mock`，所以第一轮不需要 OpenAI key，也不需要 Reddit key。

## 第一次体验流程

1. 打开 http://localhost:3000
2. 添加一个产品，填产品名和公开网站 URL 或 GitHub 仓库 URL。
3. 系统会抓取公开页面并生成 Product Brain。
4. 创建产品并生成 Product Brain 后，在另一个终端运行：

```bash
cd /Users/jiangguangqun/Desktop/ThreadPilot
make seed
```

这会导入本地 Reddit fixture 数据，并自动完成：

- 创建 subreddit allowlist；
- 生成候选机会；
- 跑 Policy Engine；
- 生成 shadow reply；
- 写入审计记录。

然后刷新机会页面：

```text
/products/{产品ID}/opportunities
```

你也可以从 Dashboard 点进去。

## 已实现内容

- FastAPI 后端；
- Next.js Dashboard；
- Docker Compose；
- PostgreSQL + pgvector；
- Redis；
- Celery Worker；
- Alembic migration；
- 产品创建；
- Website / GitHub README 抓取；
- Product Brain；
- Query Graph；
- Reddit fixture 导入；
- subreddit 发现与白名单；
- Candidate / Opportunity 列表；
- Policy Engine；
- 自动回复生成；
- 质量状态记录；
- 影子发布 / Mock 发布；
- 幂等发布键；
- Conversation Loop；
- 追评意图分类；
- Tracking Link；
- Tracking SDK；
- Event API；
- Analytics Overview；
- Risk Events；
- Audit Log；
- 全局 Kill Switch 配置入口。

## 重要边界

现在不会真的往 Reddit 发评论。

真实发布必须同时满足：

```text
AUTOPUBLISH_ENABLED=true
产品 autopublish_enabled=true
reddit_app_approval_status=COMMERCIAL_APPROVED
reddit_account_status=ACTIVE
subreddit_policy=ALLOW
opportunity_policy_decision=ALLOW_AUTOREPLY
global_kill_switch=false
```

也就是说，本地默认只会 shadow 记录，不会绕过 Reddit 审批，也不会做账号矩阵、私信、模拟登录、刷票、规避风控这些东西。

## 如果你要接真实模型

编辑 `.env`：

```dotenv
LLM_PROVIDER=openai
LLM_API_KEY=你的 key
LLM_STRONG_MODEL=你要用的模型
```

如果你用的是 OpenAI-compatible 服务，也可以设置：

```dotenv
LLM_BASE_URL=https://你的服务地址/v1
```

改完后重启：

```bash
make down
make dev
```

## 如果你要接真实 Reddit OAuth

你需要先准备：

- Reddit 开发者应用；
- `REDDIT_CLIENT_ID`；
- `REDDIT_CLIENT_SECRET`；
- `REDDIT_REDIRECT_URI`；
- Reddit 平台/API 使用批准状态。

把它们填进 `.env`：

```dotenv
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_REDIRECT_URI=http://localhost:8000/v1/reddit/oauth/callback
REDDIT_APP_APPROVAL_STATUS=DEVELOPMENT_ONLY
```

注意：没有商业/API 批准前，自动发布仍然应该保持关闭。

## 常用命令

启动：

```bash
make dev
```

停止：

```bash
make down
```

导入 fixture：

```bash
make seed
```

跑测试：

```bash
make test
```

跑 lint：

```bash
make lint
```

## API 主流程

1. `POST /v1/products`
2. `POST /v1/products/{id}/ingest`
3. `POST /v1/products/{id}/build-brain`
4. `POST /v1/products/{id}/discover-subreddits`
5. `GET /v1/products/{id}/brain`
6. `GET /v1/products/{id}/opportunities`
7. `GET /v1/opportunities/{candidate_id}/decision`
8. `GET /v1/opportunities/{candidate_id}/generated-reply`
9. `POST /v1/opportunities/{candidate_id}/publish`
10. `POST /v1/conversations/{conversation_id}/followup`
11. `GET /c/{short_code}`
12. `POST /v1/events`

## Dashboard 页面

- `/dashboard`：总览扫描、机会、对话、访问、注册、激活和风险；
- `/products/{id}`：产品、Product Brain、证据 claims、Tracking SDK；
- `/products/{id}/opportunities`：机会、策略决策、生成回复、发布状态；
- `/products/{id}/conversations`：对话状态机；
- `/products/{id}/safety`：subreddit 状态、风险事件、策略审计。

## 参考项目如何使用

仓库里的开源项目只作为参考，不整块照搬。

这里借鉴了：

- Reddit 内容标准化；
- 低成本召回；
- 证据保留；
- 自动化面板；
- 规则和速率边界；
- 审计记录。

明确不采用：

- 多账号轮换；
- 自动私信陌生用户；
- 浏览器模拟登录；
- 绕过平台审核；
- 批量重复模板评论。

## 下一步

下一阶段应该做：

- 接入真实 Reddit OAuth token exchange；
- 做 live read-only polling；
- 用 PostgreSQL full-text / BM25 做真实召回；
- 接 embedding rerank；
- 接真实 subreddit rules refresh；
- 建 500 条标注 benchmark；
- 做 Top-K Precision 和风险召回评测。

真实发布必须等 Reddit 平台批准和完整门禁都满足后再打开。
