# Reddit Autonomous Growth Agent — MVP 开发方案

> 版本：v0.1  
> 日期：2026-07-10  
> 用途：直接交给 Codex 开始搭建项目  
> 暂定产品名：**Reddit Growth Agent**  

---

## 0. 给 Codex 的执行说明

请按照本文档完成一个可本地运行、可部署的 MVP。优先保证核心闭环跑通，不要提前扩展到 X、中文平台、邮件外呼或复杂 CRM。

核心闭环：

```text
输入产品网站或 GitHub 链接
→ 自动理解产品
→ 从 Reddit 找到高意向帖子和评论
→ 自动判断是否适合参与
→ 自动生成并发布透明、有帮助的回复
→ 持续监听追评并自动对话
→ 追踪点击、注册和激活
→ 根据结果优化下一轮机会排序
```

实现时必须遵守以下原则：

1. **默认全自动，不设置逐条人工审批队列。**
2. **规则引擎控制边界，模型负责语义判断与表达。**
3. **宁可少发，也不能把产品做成批量评论工具。**
4. **每条回复必须基于具体上下文独立生成。**
5. **产品关联关系必须透明披露，禁止伪装成无利益关系的普通用户。**
6. **禁止账号矩阵、规避风控、重复模板、投票操纵和自动私信陌生用户。**
7. **生产环境自动发布必须受 `AUTOPUBLISH_ENABLED` 和平台批准状态双重控制。**
8. **所有模型决策和发布动作必须可审计、可停止、可回滚配置。**

---

# 1. 产品定义

## 1.1 一句话定位

**把产品链接交给 Agent，它会让产品自动出现在 Reddit 上真正需要它的讨论中，并持续跟进直到产生可追踪的转化。**

英文表达：

> Find Reddit conversations where your product can genuinely help, join them transparently, and turn engagement into measurable growth.

## 1.2 目标用户

MVP 只服务以下用户：

- 刚完成产品、但没有稳定获客渠道的独立开发者；
- Vibe coding 创业者；
- 早期 AI SaaS、开发者工具、效率工具团队；
- 有明确产品页面或 GitHub README 的小型团队；
- 适合通过 Reddit 社区获取早期用户的英文产品。

## 1.3 核心问题

用户当前需要手动完成：

1. 想象潜在用户会如何描述问题；
2. 搜索相关 subreddit；
3. 浏览大量无关帖子和评论；
4. 判断何时能自然提及产品；
5. 撰写符合社区文化的回复；
6. 记住每条评论并及时追评；
7. 判断哪些互动带来了注册和付费；
8. 根据结果调整定位、关键词和回复方式。

MVP 要把以上流程变成持续自动运行的系统。

## 1.4 核心差异

不是：

- AI 评论生成器；
- Reddit 定时发帖工具；
- 关键词监控器；
- 批量软广机器人；
- 社交媒体内容管理工具。

而是：

> **Conversation Retrieval + Autonomous Engagement + Conversation Loop + Attribution**

真正壁垒是以下数据映射：

```text
产品类型
× 用户自然需求表达
× subreddit
× 帖子生命周期阶段
× 回复策略
× 产品卖点
→ 对话、点击、注册、激活结果
```

---

# 2. MVP 成功标准

MVP 不以“发送了多少评论”为成功标准。

## 2.1 北极星指标

```text
每 100 个合格机会带来的激活用户数
```

## 2.2 第一阶段核心指标

### 找到能力

- Top 10 Opportunity Precision ≥ 70%；
- 明显无关内容进入 Top 10 的比例 ≤ 10%；
- 高风险、敏感内容误判为可回复的比例接近 0；
- 每个有效产品每天可发现至少 5 条值得参与的讨论。

### 回复质量

- 每条回复即使删除产品名和链接，仍然具有独立价值；
- 产品能力不得出现无来源支持的虚假声明；
- 与账号最近 100 条回复的最大文本相似度低于配置阈值；
- 每条推广型回复都包含自然、明确的利益关系披露；
- 不在用户没有需求的帖子下强行推荐。

### 对话效果

- 首次回复后的有效对话率；
- 用户主动追问率；
- 链接请求率；
- 正向互动率；
- 删除率；
- 负面回复率；
- Moderator 警告率。

### 转化效果

- 评论级链接点击率；
- 点击到注册转化率；
- 注册到激活转化率；
- 每个 subreddit 的激活用户产出；
- 每种需求表达的转化表现。

---

# 3. MVP 范围

## 3.1 必须实现

1. 产品 URL / GitHub URL 导入；
2. Product Brain 自动生成；
3. Reddit OAuth 账号连接；
4. subreddit 自动发现与白名单；
5. 新帖子和新增评论的增量抓取；
6. 关键词与 BM25 低成本召回；
7. Embedding 语义重排；
8. 小模型意图分类；
9. Opportunity Score；
10. subreddit 规则与 Policy Engine；
11. 自动生成首次回复；
12. 自动发布开关与速率限制；
13. 自动监听追评；
14. 对话状态机与自动追评；
15. 评论级追踪短链接；
16. 网站 JS Tracking SDK；
17. 注册/激活事件接收 API；
18. Dashboard；
19. 审计日志；
20. 全局 Kill Switch。

## 3.2 暂不实现

- X、LinkedIn、Product Hunt 等其他渠道；
- 中文平台；
- 多账号矩阵；
- 自动私信陌生用户；
- 自动发 Reddit 主帖；
- 自动点赞、点踩或 Karma 操作；
- 付费广告；
- 完整 CRM；
- 多触点复杂归因；
- 自动训练大模型；
- 浏览器自动化模拟登录；
- 绕过 CAPTCHA、限流或平台审核；
- 移动端 App；
- 企业级权限系统。

---

# 4. 平台与合规上线门槛

## 4.1 已知约束

在生产环境中，Reddit Data API 的商业用途可能需要 Reddit 单独批准或协议。应用必须使用注册 OAuth 客户端，并遵守 Reddit 的 Developer Terms、Data API Terms、Responsible Builder Policy、User Agreement 以及各 subreddit 规则。

因此，工程上要把平台状态显式建模：

```text
DEVELOPMENT_ONLY
API_APPLICATION_PENDING
API_APPROVED_NON_COMMERCIAL
COMMERCIAL_APPROVAL_PENDING
COMMERCIAL_APPROVED
AUTOPUBLISH_SUSPENDED
```

## 4.2 自动发布条件

只有同时满足以下条件时才能真正调用发布接口：

```text
AUTOPUBLISH_ENABLED=true
AND reddit_app_status=COMMERCIAL_APPROVED
AND reddit_account_status=ACTIVE
AND subreddit_policy=ALLOW
AND opportunity_policy_decision=ALLOW_AUTOREPLY
AND account_daily_quota_remaining>0
AND community_daily_quota_remaining>0
AND global_kill_switch=false
```

不满足时，系统仍然完成：发现、评分、生成、影子运行和日志记录，但不发送。

## 4.3 禁止设计

系统不得提供以下能力：

- 批量创建或管理伪装账号；
- 规避 Reddit 限流、封禁或检测；
- 随机化行为以伪装真人；
- 同一内容跨社区重复发布；
- 冒充普通消费者推荐自家产品；
- 自动向陌生用户发送私信；
- 诱导或操纵投票；
- 被 Moderator 警告后继续运行；
- 抓取或长期保留已删除内容；
- 将 Reddit 数据用于未经批准的模型训练。

## 4.4 自动停止条件

出现以下任意事件，立即停止相应范围内的自动发布：

- Moderator 警告；
- 评论被删除且原因为推广或 Spam；
- 用户明确反感营销；
- Reddit API 返回账号或应用限制；
- 某 subreddit 24 小时负面率超过阈值；
- 某账号连续发生多次删除；
- 模型置信度低于阈值；
- 产品知识来源失效；
- 全局 Kill Switch 开启。

停止粒度：

```text
单个 Conversation
单个 Subreddit
单个 Reddit Account
单个 Product
全平台
```

---

# 5. 用户流程

## 5.1 Onboarding

用户完成：

1. 注册；
2. 输入产品 URL 或 GitHub URL；
3. 系统抓取并生成 Product Brain；
4. 用户只做一次产品事实确认；
5. 连接 Reddit 真实账号；
6. 设置每日最大回复数；
7. 选择披露模板；
8. 安装 Tracking SDK 或配置事件 API；
9. 系统开始影子模式；
10. 满足平台批准和产品质量阈值后进入自动发布。

注意：

- 不设置逐条审批；
- 产品事实确认属于一次性 onboarding，不是每条评论审核；
- 默认每日回复上限应很低，例如 3 条；
- 系统可根据账号历史、社区反馈和转化逐步动态调整，但不得超过硬上限。

## 5.2 主 Dashboard

显示：

```text
今日扫描内容数
候选机会数
合格机会数
自动参与对话数
等待追评对话数
用户追问数
链接请求数
访问数
注册数
激活数
删除数
负面互动数
当前风险等级
```

## 5.3 产品设置

用户可配置：

- 产品 URL；
- GitHub URL；
- 产品名称；
- 目标用户；
- 重点卖点；
- 禁止声明；
- 免费/付费；
- 可推荐场景；
- 不可推荐场景；
- 每日回复硬上限；
- 是否允许首条回复放链接；
- 披露方式；
- 允许 subreddit；
- 禁止 subreddit；
- 全自动开关。

---

# 6. 系统架构

```mermaid
flowchart TD
    A[Website / GitHub URL] --> B[Source Ingestion]
    B --> C[Product Brain Builder]
    C --> D[Query Graph Generator]

    D --> E[Subreddit Discovery]
    D --> F[Reddit Incremental Poller]
    E --> F

    F --> G[Raw Reddit Store]
    G --> H[Keyword + BM25 Recall]
    H --> I[Embedding Reranker]
    I --> J[Intent Classifier]
    J --> K[Opportunity Scorer]
    K --> L[Policy Engine]

    L -->|Allow| M[Answer Planner]
    L -->|Skip| N[Audit Log]
    M --> O[Claim Checker]
    O --> P[Reply Writer]
    P --> Q[Similarity / Quality Gate]
    Q --> R[Reddit Publisher]

    R --> S[Conversation Store]
    S --> T[Follow-up Scheduler]
    T --> U[Reply Listener]
    U --> V[Conversation Agent]
    V --> L

    R --> W[Tracking Link Service]
    W --> X[Customer Website]
    X --> Y[Tracking SDK / Event API]
    Y --> Z[Attribution & Analytics]
    Z --> K
```

## 6.1 架构原则

- 控制面与执行面分离；
- Reddit I/O 与模型调用异步化；
- 所有任务必须幂等；
- 所有发布动作必须有唯一 idempotency key；
- 所有外部 API 调用必须重试并记录；
- 所有模型输出使用结构化 JSON Schema；
- 所有决策保留输入摘要、模型版本、Prompt 版本和结果；
- 删除内容要同步清理或标记不可展示；
- 不把整个系统做成一个自由行动的 LangGraph Agent。

---

# 7. 推荐技术栈

## 7.1 前端

- Next.js 15+
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Query
- Recharts
- Zod

## 7.2 后端

- Python 3.12+
- FastAPI
- Pydantic v2
- SQLAlchemy 2
- Alembic
- Async PRAW 或官方批准的 Reddit SDK/API 方式
- httpx

## 7.3 数据

- PostgreSQL 16+
- pgvector
- Redis

## 7.4 任务系统

MVP 推荐：

- Celery + Redis，全部 Python；

或：

- Trigger.dev 负责任务调度；
- FastAPI 负责业务和模型；

为了减少跨语言复杂度，第一版优先使用：

> **FastAPI + Celery + Redis**

后续对话数量和可靠性要求上升后，再迁移到 Temporal。

## 7.5 模型层

定义统一 Provider 接口，不能硬编码单一模型厂商：

```python
class LLMProvider(Protocol):
    async def generate_structured(...): ...
    async def generate_text(...): ...
    async def embed(...): ...
```

模型分工：

- 强模型：Product Brain、复杂策略判断、最终回复；
- 便宜模型：意图分类、追评意图分类、风险分类；
- Embedding 模型：语义重排；
- 规则和传统检索：第一层召回。

## 7.6 部署

开发阶段：

- Docker Compose；
- PostgreSQL；
- Redis；
- API；
- Worker；
- Web。

生产候选：

- Web：Vercel；
- API/Worker：Railway、Fly.io 或 AWS；
- PostgreSQL：Supabase、Neon、RDS；
- Redis：Upstash 或托管 Redis。

---

# 8. Monorepo 目录结构

```text
reddit-growth-agent/
├── apps/
│   ├── web/                       # Next.js 控制台
│   └── api/                       # FastAPI API
├── workers/
│   ├── reddit_poller/
│   ├── candidate_pipeline/
│   ├── publisher/
│   ├── conversation_monitor/
│   └── attribution_processor/
├── packages/
│   ├── shared_types/
│   ├── prompts/
│   ├── policy_engine/
│   ├── scoring/
│   └── tracking_sdk/
├── infra/
│   ├── docker/
│   ├── migrations/
│   └── scripts/
├── tests/
│   ├── fixtures/
│   ├── evaluation/
│   ├── integration/
│   └── e2e/
├── docs/
│   ├── architecture.md
│   ├── policy.md
│   ├── reddit-api-approval.md
│   └── runbook.md
├── docker-compose.yml
├── .env.example
├── Makefile
└── README.md
```

---

# 9. 核心模块设计

## 9.1 Source Ingestion

### 输入

- Website URL；
- GitHub repository URL；
- 可选额外文档 URL；
- 用户补充说明。

### Website 抓取

MVP 抓取：

- 首页；
- Pricing；
- Features；
- FAQ；
- Docs 首页；
- About；
- robots 和 sitemap 中高相关页面。

限制：

- 最多抓取 20 页；
- 每页正文截断；
- 去除导航和页脚重复；
- 设置域名级缓存；
- 尊重 robots；
- 禁止登录后页面抓取。

### GitHub 抓取

抓取：

- README；
- Repository description；
- Topics；
- Releases 最近 10 条；
- Docs 目录中的 Markdown；
- 可选公开 Issues 标签统计。

### 输出

```json
{
  "sources": [
    {
      "url": "https://example.com/features",
      "type": "website",
      "title": "Features",
      "content": "...",
      "content_hash": "...",
      "retrieved_at": "..."
    }
  ]
}
```

---

## 9.2 Product Brain

Product Brain 是系统唯一可信产品知识层。

### 数据结构

```json
{
  "product_name": "Example",
  "one_liner": "...",
  "category": "...",
  "target_users": ["..."],
  "jobs_to_be_done": ["..."],
  "pain_points": ["..."],
  "use_cases": ["..."],
  "competitors": ["..."],
  "alternatives": ["manual workflow", "..."],
  "recommend_when": ["..."],
  "do_not_recommend_when": ["..."],
  "supported_claims": [
    {
      "claim": "Supports automatic cursor smoothing",
      "source_id": "source_uuid",
      "source_quote": "...",
      "confidence": 0.97
    }
  ],
  "unsupported_or_uncertain_claims": ["..."],
  "pricing_summary": "...",
  "disclosure_identity": "I’m building Example",
  "query_graph": {}
}
```

### 要求

- 所有可对外陈述的功能必须附来源；
- Product Brain 更新后生成新版本；
- 已发布回复记录使用的 Product Brain 版本；
- 页面无法确认的能力标记为 uncertain；
- Reply Writer 不得使用 uncertain claim；
- 用户可一次性编辑 Product Brain，但不能逐条编辑评论。

---

## 9.3 Query Graph

### 五类检索节点

1. 核心产品词；
2. 用户自然问题表达；
3. 求推荐和替代品表达；
4. 竞品与替代方案；
5. 使用场景和相邻场景。

### 示例

```json
{
  "direct_terms": [
    "screen recording editor",
    "product demo video"
  ],
  "pain_phrases": [
    "screen recording looks unprofessional",
    "editing demos takes too long"
  ],
  "intent_patterns": [
    "looking for",
    "any recommendations",
    "alternative to",
    "what do you use",
    "how do I"
  ],
  "competitors": [
    "Screen Studio",
    "Loom",
    "Tella"
  ],
  "use_cases": [
    "Product Hunt launch video",
    "landing page demo",
    "feature walkthrough"
  ],
  "negative_terms": [
    "cinematic film editing",
    "open source only"
  ]
}
```

### Query Graph 更新

每天根据结果更新：

- 高转化表达提高权重；
- 高误报表达降低权重；
- 新出现的竞品词加入；
- 新 subreddit 中的真实用户表达加入；
- 不自动删除旧词，只降低权重并保留版本。

---

## 9.4 Subreddit Discovery

### 初始发现

来源：

- Product Brain 推荐；
- Reddit 搜索结果；
- 竞品名称出现频率；
- 高相关作者活跃社区；
- 相邻社区共现。

### 社区评分

```text
CommunityScore =
0.30 × RelevantDiscussionRate
+ 0.20 × SolutionSeekingRate
+ 0.15 × EngagementQuality
+ 0.15 × HistoricalConversionRate
+ 0.10 × FreshContentRate
+ 0.10 × PromotionTolerance
- RiskPenalty
```

### 社区状态

```text
DISCOVERED
EVALUATING
ALLOW_READ_ONLY
ALLOW_AUTOREPLY
PAUSED
BLOCKED
```

### MVP 策略

- 初始推荐 20–50 个社区；
- 只保留 5–15 个重点监听；
- 80% 抓取预算投向高分社区；
- 20% 用于探索新社区；
- Moderator 警告立即将社区状态设为 PAUSED 或 BLOCKED。

---

## 9.5 Reddit Incremental Poller

### 抓取对象

- 新帖子；
- 新评论；
- Agent 已发布评论的直接回复；
- 相关线程的新增评论；
- 已发布评论的删除/分数状态。

### 增量策略

保存每个 subreddit：

```text
last_submission_cursor
last_comment_cursor
last_polled_at
next_poll_at
etag/hash
```

### 去重

使用：

```text
reddit_fullname + content_hash
```

### 抓取频率

- 高价值社区：5–10 分钟；
- 中价值社区：20–30 分钟；
- 低价值探索社区：1–3 小时；
- 对话追评采用独立调度，不依赖社区 Poller。

### API 预算

实现 token bucket：

- 全应用预算；
- Reddit 账号预算；
- subreddit 预算；
- 紧急追评预算；
- 保留 20% 预算给 Conversation Loop。

---

## 9.6 低成本候选检索漏斗

不能把所有 Reddit 内容发送给大模型。

### 推荐漏斗

```text
3000 条新帖子/评论
→ 关键词、正则、BM25：300 条
→ Embedding 重排：60 条
→ 便宜模型意图分类：15 条
→ Policy + 强模型策略判断：5–10 条
→ 实际自动发布：0–5 条
```

### 第一层：规则与 BM25

信号：

- 求推荐短语；
- 竞品名；
- 产品直接关键词；
- 痛点表达；
- 帖子新鲜度；
- subreddit 白名单；
- 作者是否为品牌/机器人；
- 是否已被处理；
- 是否包含负面或敏感词；
- 是否为重复内容。

### 第二层：Embedding

分别计算：

```text
pain_point_similarity
use_case_similarity
user_phrase_similarity
competitor_similarity
negative_match_similarity
```

不要只比较“产品摘要向量”和“帖子向量”。

### 第三层：Intent Classifier

分类：

```text
SEEKING_RECOMMENDATION
ASKING_HOW_TO_SOLVE
COMPLAINING_ABOUT_COMPETITOR
ASKING_FOR_ALTERNATIVE
EXPRESSING_UNMET_NEED
SHARING_COMPLETED_SOLUTION
GENERAL_DISCUSSION
PROMOTIONAL_CONTENT
SENSITIVE_CONTENT
IRRELEVANT
```

### 第四层：Opportunity Scorer

初始人工公式：

```text
OpportunityScore =
0.25 × ProductFit
+ 0.20 × SolutionIntent
+ 0.15 × ReplyUsefulness
+ 0.10 × Freshness
+ 0.10 × ThreadGrowth
+ 0.08 × ReplyVisibility
+ 0.07 × CommunityValue
+ 0.05 × HistoricalPatternValue
- RiskPenalty
```

所有字段归一化为 0–1。

### Thread Growth

```text
ThreadGrowth =
(new_comments + alpha × new_score)
/ elapsed_minutes
```

帖子刚起量、答案尚未固化时提高优先级。

---

## 9.7 Policy Engine

Policy Engine 必须是独立、确定性模块，不允许完全交给 LLM。

### 输入

- Product Brain；
- subreddit 规则；
- Reddit 帖子和上下文；
- Opportunity Score；
- 账号状态；
- 发布历史；
- 风险事件；
- 模型分类结果。

### 输出

```json
{
  "decision": "ALLOW_AUTOREPLY",
  "reply_mode": "HELP_AND_DISCLOSE",
  "link_policy": "ONLY_IF_REQUESTED",
  "required_disclosure": true,
  "max_followups": 4,
  "reason_codes": [
    "EXPLICIT_RECOMMENDATION_REQUEST",
    "HIGH_PRODUCT_FIT",
    "COMMUNITY_ALLOWED"
  ],
  "policy_version": "v1"
}
```

### 决策枚举

```text
ALLOW_HELP_ONLY
ALLOW_HELP_AND_DISCLOSE
ALLOW_DIRECT_RECOMMENDATION
ALLOW_AUTOREPLY
SHADOW_ONLY
SKIP
BLOCK
ESCALATE_STOP
```

MVP 没有逐条人工审批，`SHADOW_ONLY` 表示只生成和记录，不发布。

### 绝对禁止回复

- 医疗、法律、金融高风险建议；
- 自杀、自残、创伤；
- 未成年人敏感内容；
- 政治极化和灾难事件；
- NSFW 高风险内容；
- 用户明确拒绝产品推荐；
- subreddit 明确禁止相关推广；
- 竞品官方客服线程截流；
- Agent 无法证明产品适用；
- 同一产品已在该线程出现；
- 同一作者短期内已被 Agent 回复；
- 帖子过旧且无新活动；
- 产品要求与 Product Brain 冲突；
- 当前账号或社区风险过高。

### 频率限制

默认：

```text
每账号每日最多 3 条首次推广型回复
每 subreddit 每日最多 1 条推广型回复
同一作者 30 天最多 1 次主动首次回复
同一线程只允许 1 条首次回复
同一 Conversation 最大 4 次 Agent 追评
```

这些值全部可配置，但设定硬上限，普通用户不能无限提高。

---

## 9.8 Reply Generation Pipeline

禁止直接使用单 Prompt：“写一条自然软广评论”。

### Step 1：Answer Planner

输出：

```json
{
  "user_need": "...",
  "independent_value_points": ["..."],
  "product_relevance": "...",
  "selected_claim_ids": ["claim_uuid"],
  "limitations_to_disclose": ["..."],
  "disclosure_required": true,
  "link_strategy": "NO_LINK_UNLESS_REQUESTED",
  "tone": "technical_and_concise"
}
```

### Step 2：Claim Checker

检查：

- 所有功能是否来自 `supported_claims`；
- 是否夸大；
- 是否错误比较竞品；
- 是否承诺未支持的平台或能力；
- 是否误报免费、价格或隐私特性。

不通过时，重新规划或跳过。

### Step 3：Reply Writer

上下文：

- 原帖；
- 父评论；
- 相关上下文评论；
- subreddit 规则摘要；
- Product Brain；
- Answer Plan；
- 账号历史语气；
- 过去回复摘要。

要求：

- 先解决问题，再提产品；
- 不写空泛赞美；
- 不使用营销套话；
- 不虚构个人使用体验；
- 明确披露关系；
- 默认不在首条回复放链接；
- 只有用户明确求推荐且规则允许时，才可直接提供链接；
- 承认产品不适用的边界。

### Step 4：Quality Gate

检查：

- 是否回答了原问题；
- 删除产品部分后是否仍有价值；
- 是否有披露；
- 是否包含不支持声明；
- 是否过度营销；
- 是否与历史回复重复；
- 是否包含禁止内容；
- 是否超过社区适宜长度；
- 是否有未经要求的追踪链接。

### Step 5：Similarity Gate

计算：

- 与账号最近 100 条 Agent 回复的最大 Embedding 相似度；
- 与全平台最近 1000 条回复的模板相似度；
- 连续 n-gram 重合度。

超过阈值则重新生成或跳过。

---

## 9.9 Reddit Publisher

### 发布前检查

- 重新读取帖子，确认仍存在；
- 确认帖子未锁定；
- 确认未被 Moderator 标记；
- 确认当前内容与生成时无重大变化；
- 重新运行 Policy Engine；
- 获取分布式锁；
- 检查 idempotency key；
- 检查账号和社区配额。

### 幂等键

```text
sha256(product_id + reddit_parent_id + strategy_version)
```

### 发布后

保存：

- Reddit comment ID；
- 完整文本；
- Product Brain version；
- Policy version；
- Prompt version；
- 模型信息；
- 发布时间；
- 父内容快照；
- 首次检查时间。

---

## 9.10 Conversation Loop

发布成功不是终点。

### Conversation 状态机

```mermaid
stateDiagram-v2
    [*] --> POSTED
    POSTED --> USER_ENGAGED: direct reply
    POSTED --> DORMANT: no reply
    USER_ENGAGED --> NEED_CLARIFIED
    NEED_CLARIFIED --> PRODUCT_EXPLAINED
    PRODUCT_EXPLAINED --> LINK_REQUESTED
    LINK_REQUESTED --> LINK_SHARED
    LINK_SHARED --> VISITED
    VISITED --> SIGNED_UP
    SIGNED_UP --> ACTIVATED
    ACTIVATED --> CONVERTED

    USER_ENGAGED --> NEGATIVE_REACTION
    NEGATIVE_REACTION --> CLOSED
    USER_ENGAGED --> MOD_WARNING
    MOD_WARNING --> CLOSED
    USER_ENGAGED --> NOT_A_FIT
    NOT_A_FIT --> CLOSED
    DORMANT --> CLOSED
    CONVERTED --> CLOSED
```

### 追评意图

```text
ASK_LINK
ASK_PRICE
ASK_FEATURE
ASK_COMPARISON
ASK_TECHNICAL_DETAIL
REPORT_BUG
EXPRESS_INTEREST
EXPRESS_DOUBT
NEGATIVE_REACTION
MOD_WARNING
THANKS_ONLY
OFF_TOPIC
NOT_A_FIT
```

### 追评策略

- `ASK_LINK`：生成唯一追踪链接；
- `ASK_PRICE`：只使用 Product Brain 中可验证价格；
- `ASK_FEATURE`：基于 claim 回答；
- `ASK_COMPARISON`：客观比较，不能虚构竞品能力；
- `REPORT_BUG`：转支持模式，不继续营销；
- `NEGATIVE_REACTION`：简短道歉并停止；
- `MOD_WARNING`：停止对话并暂停社区；
- `THANKS_ONLY`：通常不继续回复；
- `NOT_A_FIT`：坦诚说明不适用并结束。

### 轮询计划

首次回复后：

```text
5 分钟
20 分钟
1 小时
3 小时
12 小时
24 小时
3 天
7 天
30 天
```

发现新追评后回到高频模式。

### 自动结束条件

- 达到最大追评轮数；
- 用户明确拒绝；
- 对话开始争论；
- Moderator 介入；
- 产品不适用；
- 连续两轮没有新的实质信息；
- 30 天无新互动；
- 模型置信度低；
- 账号或社区暂停。

---

## 9.11 Attribution

### 评论级短链接

格式：

```text
https://go.agent-domain.com/c/{short_code}
```

映射：

```text
product_id
conversation_id
reddit_post_id
reddit_comment_id
subreddit
reply_strategy
selling_point
created_at
```

重定向目标：

```text
https://customer-domain.com/path
?utm_source=reddit
&utm_medium=organic_conversation
&utm_campaign={product_slug}
&utm_content={conversation_id}
```

### Tracking SDK

提供：

```html
<script src="https://cdn.agent-domain.com/tracker.js" data-project="PROJECT_KEY"></script>
```

自动事件：

- page_view；
- session_started；
- attribution_received。

用户主动调用：

```javascript
redditGrowth.track("signup", { userId: "..." });
redditGrowth.track("activated", { userId: "..." });
redditGrowth.track("paid", { userId: "...", value: 29 });
```

### Event API

```http
POST /v1/events
Authorization: Bearer PROJECT_WRITE_KEY
Content-Type: application/json

{
  "event": "activated",
  "anonymous_id": "...",
  "user_id": "...",
  "timestamp": "...",
  "properties": {}
}
```

### MVP 归因模型

只做确定性归因：

1. 评论短链接；
2. First-party attribution cookie；
3. signup/activated/paid 事件；
4. 同一 anonymous_id/user_id 串联。

不在 MVP 中实现：

- 跨设备归因；
- 品牌搜索增量；
- 多触点归因；
- 概率归因。

---

# 10. 数据库设计

以下为逻辑表，Codex 可使用 SQLAlchemy 模型和 Alembic migration 实现。

## 10.1 用户与项目

### users

```text
id UUID PK
email TEXT UNIQUE
name TEXT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### projects

```text
id UUID PK
user_id UUID FK
name TEXT
slug TEXT UNIQUE
status TEXT
tracking_public_key TEXT UNIQUE
tracking_write_key_hash TEXT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

## 10.2 产品知识

### products

```text
id UUID PK
project_id UUID FK
name TEXT
website_url TEXT
github_url TEXT
status TEXT
autopublish_enabled BOOLEAN DEFAULT FALSE
daily_reply_limit INT DEFAULT 3
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### product_sources

```text
id UUID PK
product_id UUID FK
source_type TEXT
url TEXT
title TEXT
content TEXT
content_hash TEXT
retrieved_at TIMESTAMPTZ
is_active BOOLEAN
```

### product_brain_versions

```text
id UUID PK
product_id UUID FK
version INT
brain_json JSONB
created_at TIMESTAMPTZ
is_current BOOLEAN
```

### product_claims

```text
id UUID PK
product_brain_version_id UUID FK
claim TEXT
source_id UUID FK
source_quote TEXT
confidence FLOAT
status TEXT
```

### query_terms

```text
id UUID PK
product_id UUID FK
term_type TEXT
term TEXT
weight FLOAT
source TEXT
status TEXT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

## 10.3 Reddit

### reddit_accounts

```text
id UUID PK
project_id UUID FK
reddit_user_id TEXT
username TEXT
oauth_token_encrypted TEXT
refresh_token_encrypted TEXT
status TEXT
app_approval_status TEXT
last_synced_at TIMESTAMPTZ
created_at TIMESTAMPTZ
```

### subreddits

```text
id UUID PK
name TEXT UNIQUE
title TEXT
description TEXT
rules_json JSONB
rules_last_checked_at TIMESTAMPTZ
```

### product_subreddits

```text
id UUID PK
product_id UUID FK
subreddit_id UUID FK
status TEXT
community_score FLOAT
promotion_tolerance FLOAT
risk_score FLOAT
last_polled_at TIMESTAMPTZ
next_poll_at TIMESTAMPTZ
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### reddit_contents

统一存帖子和评论：

```text
id UUID PK
reddit_fullname TEXT UNIQUE
content_type TEXT                # submission/comment
reddit_id TEXT
subreddit_id UUID FK
parent_reddit_fullname TEXT NULL
root_submission_fullname TEXT
author_name TEXT
title TEXT NULL
body TEXT
permalink TEXT
score INT
num_comments INT
created_utc TIMESTAMPTZ
fetched_at TIMESTAMPTZ
content_hash TEXT
is_deleted BOOLEAN
is_locked BOOLEAN
raw_json JSONB
embedding VECTOR
```

## 10.4 候选和决策

### candidates

```text
id UUID PK
product_id UUID FK
reddit_content_id UUID FK
status TEXT
recall_sources JSONB
bm25_score FLOAT
embedding_scores JSONB
intent_label TEXT
intent_confidence FLOAT
opportunity_score FLOAT
risk_score FLOAT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### policy_decisions

```text
id UUID PK
candidate_id UUID FK
policy_version TEXT
decision TEXT
reply_mode TEXT
link_policy TEXT
reason_codes JSONB
input_snapshot JSONB
created_at TIMESTAMPTZ
```

### model_runs

```text
id UUID PK
run_type TEXT
entity_type TEXT
entity_id UUID
provider TEXT
model TEXT
prompt_version TEXT
input_hash TEXT
input_summary JSONB
output_json JSONB
latency_ms INT
input_tokens INT
output_tokens INT
cost_estimate NUMERIC
status TEXT
created_at TIMESTAMPTZ
```

## 10.5 回复与对话

### reply_plans

```text
id UUID PK
candidate_id UUID FK
plan_json JSONB
claim_ids JSONB
status TEXT
created_at TIMESTAMPTZ
```

### published_replies

```text
id UUID PK
candidate_id UUID FK
reddit_account_id UUID FK
reddit_comment_id TEXT UNIQUE
parent_reddit_fullname TEXT
body TEXT
body_hash TEXT
product_brain_version_id UUID FK
policy_decision_id UUID FK
model_run_id UUID FK
idempotency_key TEXT UNIQUE
status TEXT
published_at TIMESTAMPTZ
last_checked_at TIMESTAMPTZ
removed_at TIMESTAMPTZ NULL
```

### conversations

```text
id UUID PK
product_id UUID FK
published_reply_id UUID FK
state TEXT
engagement_score FLOAT
conversion_state TEXT
followup_count INT DEFAULT 0
last_activity_at TIMESTAMPTZ
next_check_at TIMESTAMPTZ
closed_reason TEXT NULL
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

### conversation_messages

```text
id UUID PK
conversation_id UUID FK
reddit_comment_id TEXT UNIQUE
author_type TEXT                 # agent/user/other/mod
body TEXT
intent_label TEXT NULL
created_utc TIMESTAMPTZ
fetched_at TIMESTAMPTZ
```

## 10.6 追踪

### tracking_links

```text
id UUID PK
project_id UUID FK
conversation_id UUID FK
short_code TEXT UNIQUE
destination_url TEXT
utm_json JSONB
created_at TIMESTAMPTZ
```

### tracking_events

```text
id UUID PK
project_id UUID FK
tracking_link_id UUID NULL
anonymous_id TEXT NULL
user_id TEXT NULL
event_name TEXT
properties JSONB
ip_hash TEXT NULL
user_agent TEXT NULL
occurred_at TIMESTAMPTZ
received_at TIMESTAMPTZ
```

### risk_events

```text
id UUID PK
project_id UUID FK
product_id UUID NULL
reddit_account_id UUID NULL
subreddit_id UUID NULL
conversation_id UUID NULL
event_type TEXT
severity TEXT
details JSONB
action_taken TEXT
created_at TIMESTAMPTZ
```

---

# 11. API 设计

## 11.1 产品

```http
POST   /v1/products
GET    /v1/products/{id}
PATCH  /v1/products/{id}
POST   /v1/products/{id}/ingest
POST   /v1/products/{id}/build-brain
GET    /v1/products/{id}/brain
PATCH  /v1/products/{id}/brain
POST   /v1/products/{id}/start
POST   /v1/products/{id}/pause
```

## 11.2 Reddit OAuth

```http
GET    /v1/reddit/oauth/start
GET    /v1/reddit/oauth/callback
GET    /v1/reddit/accounts
DELETE /v1/reddit/accounts/{id}
```

## 11.3 Subreddit

```http
POST   /v1/products/{id}/discover-subreddits
GET    /v1/products/{id}/subreddits
PATCH  /v1/products/{id}/subreddits/{subreddit_id}
POST   /v1/products/{id}/subreddits/{subreddit_id}/refresh-rules
```

## 11.4 Opportunities

```http
GET    /v1/products/{id}/opportunities
GET    /v1/opportunities/{id}
GET    /v1/opportunities/{id}/decision
GET    /v1/opportunities/{id}/generated-reply
```

Opportunity 页面只用于观察和调试，不提供逐条 approve/edit 工作流。

## 11.5 Conversations

```http
GET    /v1/products/{id}/conversations
GET    /v1/conversations/{id}
POST   /v1/conversations/{id}/stop
```

## 11.6 Analytics

```http
GET    /v1/products/{id}/analytics/overview
GET    /v1/products/{id}/analytics/subreddits
GET    /v1/products/{id}/analytics/intents
GET    /v1/products/{id}/analytics/reply-strategies
```

## 11.7 Tracking

```http
GET    /c/{short_code}
POST   /v1/events
GET    /v1/tracking/sdk.js
```

## 11.8 Admin / Safety

```http
POST   /v1/admin/kill-switch/enable
POST   /v1/admin/kill-switch/disable
POST   /v1/products/{id}/autopublish/enable
POST   /v1/products/{id}/autopublish/disable
GET    /v1/products/{id}/risk-events
GET    /v1/products/{id}/audit-log
```

---

# 12. 后台任务

## 12.1 定时任务清单

```text
ingest_product_sources
refresh_product_sources
build_product_brain
generate_query_graph
discover_subreddits
refresh_subreddit_rules
poll_subreddit_submissions
poll_subreddit_comments
run_candidate_recall
run_embedding_rerank
classify_candidate_intent
score_opportunity
run_policy_engine
generate_reply_plan
validate_claims
write_reply
run_quality_gate
publish_reply
schedule_conversation_checks
poll_conversation
classify_followup
respond_to_followup
refresh_published_reply_status
process_tracking_events
aggregate_analytics
update_query_weights
run_risk_monitor
```

## 12.2 幂等要求

每个任务必须：

- 接受稳定 entity ID；
- 检查已有结果；
- 使用唯一 job key；
- 外部调用失败可安全重试；
- 发布任务不能重复发送；
- 日志中记录 attempt number。

## 12.3 失败队列

建立 Dead Letter Queue：

- 超过最大重试；
- Reddit 授权失效；
- 模型输出无法解析；
- 数据库约束冲突；
- 发布状态不确定。

发布状态不确定时，不允许盲目重试，先重新查询 Reddit 确认是否已经成功。

---

# 13. Prompt 与结构化输出

所有 Prompt 放在版本化目录：

```text
packages/prompts/
├── product_brain/v1.md
├── query_graph/v1.md
├── intent_classifier/v1.md
├── opportunity_strategy/v1.md
├── answer_planner/v1.md
├── reply_writer/v1.md
├── reply_quality/v1.md
└── followup_agent/v1.md
```

## 13.1 Prompt 通用要求

- 不伪造产品能力；
- 不虚构使用体验；
- 不伪装成第三方用户；
- 不承诺无法确认的价格和功能；
- 遇到不适配场景必须允许输出 `SKIP`；
- 风险不确定时默认不发布；
- 必须输出 JSON Schema；
- Prompt 版本进入 `model_runs`；
- 模型温度按任务分开设置。

## 13.2 Reply Writer 输出

```json
{
  "reply_text": "...",
  "disclosure_text": "...",
  "contains_link": false,
  "used_claim_ids": ["..."],
  "self_assessed_usefulness": 0.91,
  "self_assessed_promotion_intensity": 0.18,
  "confidence": 0.88
}
```

---

# 14. Dashboard 页面

## 14.1 `/dashboard`

卡片：

- 扫描；
- 合格机会；
- 已参与对话；
- 用户追问；
- 访问；
- 注册；
- 激活；
- 风险状态。

图表：

- 最近 14 天 Funnel；
- subreddit 转化；
- 需求意图转化；
- 回复策略转化；
- 评论删除和负面率。

## 14.2 `/products/[id]`

- 产品信息；
- Product Brain；
- 数据来源；
- 运行状态；
- 自动发布状态；
- 每日限额；
- Reddit 账号；
- Tracking SDK 安装状态。

## 14.3 `/products/[id]/opportunities`

用于观察系统“找到了什么”：

- 原帖/评论摘要；
- Opportunity Score；
- 意图；
- 风险；
- Policy Decision；
- 生成回复；
- 发布结果。

不提供逐条 approve/edit 按钮。

## 14.4 `/products/[id]/conversations`

每条对话显示：

- 原讨论；
- Agent 回复；
- 追评时间线；
- 当前状态；
- 下一次检查；
- 链接点击；
- 注册和激活；
- 是否停止；
- 风险事件。

## 14.5 `/products/[id]/safety`

- Kill Switch；
- 当前平台批准状态；
- 账号状态；
- 社区状态；
- 删除事件；
- Moderator 警告；
- 自动暂停记录；
- Policy 决策审计。

---

# 15. 安全、隐私与数据生命周期

## 15.1 Secrets

- OAuth token 必须加密存储；
- Tracking write key 只存 hash；
- `.env` 不提交 Git；
- 前端不能拿到 Reddit refresh token；
- 日志中不得输出 token。

## 15.2 Reddit 内容保存

- 只保存业务所需内容；
- 定期重新检查已发布和重点内容状态；
- Reddit 内容删除后标记 `is_deleted=true`；
- 不在 UI 展示已删除正文；
- 根据批准条款配置保留期；
- 不将数据用于通用模型训练。

## 15.3 Tracking

- 不存储原始 IP，最多存 salted hash；
- 提供禁用追踪配置；
- Cookie 仅用于第一方归因；
- 文档说明客户应根据当地隐私规则配置同意机制。

---

# 16. Observability

## 16.1 日志

结构化日志字段：

```text
request_id
job_id
project_id
product_id
reddit_account_id
subreddit
candidate_id
conversation_id
model_run_id
policy_version
prompt_version
```

## 16.2 指标

- Reddit API 请求数和错误率；
- 剩余 API 预算；
- Poll 延迟；
- 候选漏斗数量；
- 模型调用量、Token 和成本；
- 发布成功率；
- 重复发送拦截数；
- 追评发现延迟；
- 删除率；
- 负面率；
- Moderator 警告；
- 点击、注册、激活；
- 每激活用户模型成本。

## 16.3 告警

立即告警：

- 账号认证失效；
- Reddit API 限制；
- 评论删除率异常；
- Moderator 警告；
- 重复发布尝试；
- Kill Switch 启动；
- 模型成本异常；
- Tracking 事件中断。

---

# 17. 测试与评测

## 17.1 单元测试

- Opportunity Score；
- Policy Engine；
- 配额计算；
- 状态机；
- Tracking attribution；
- 幂等键；
- 删除同步；
- Prompt JSON 解析；
- Claim Checker。

## 17.2 集成测试

- OAuth callback；
- Reddit 读取；
- 发布接口使用 mock；
- 评论追评 mock；
- Celery retry；
- Tracking redirect；
- signup/activated 事件串联。

## 17.3 E2E

```text
创建产品
→ 抓取网站
→ 生成 Product Brain
→ 导入 Reddit fixture
→ 产生 Candidate
→ Policy Allow
→ 生成回复
→ Mock 发布
→ 收到追评
→ 自动回复
→ 点击短链接
→ signup
→ activated
→ Dashboard 出现转化
```

## 17.4 离线 Benchmark

建立至少 500 条英文 Reddit 内容标注集。

每条标注：

```text
product_fit
intent
recommended_action
risk
ideal_reply_mode
whether_link_allowed
reason
```

数据分布至少包括：

- 明确求推荐；
- 抱怨竞品；
- 普通讨论；
- 已解决问题；
- 敏感内容；
- 禁止推广社区；
- 产品不适用；
- 评论中的高意向需求；
- 旧帖重新活跃；
- 竞品官方支持线程。

评测指标：

- Top-K Precision；
- 风险召回率；
- `SKIP` 准确率；
- Claim hallucination rate；
- Reply usefulness；
- Promotion intensity；
- Reply diversity。

---

# 18. 开源参考

## 18.1 Reddit API

- PRAW：成熟 Python Reddit API 封装；
- Async PRAW：异步 Reddit API 封装；
- Reddit Developer Platform / Devvit：关注官方迁移方向和允许的应用形态。

## 18.2 Agent 与工作流

- LangGraph：只用于单次语义决策图，不承担整个任务调度系统；
- Celery：MVP 后台任务；
- Temporal：后期持久化长对话工作流升级方向；
- Trigger.dev：如果团队偏 TypeScript，可替代部分 Celery 调度能力。

## 18.3 检索

- PostgreSQL Full Text Search；
- pgvector；
- rank-bm25；
- sentence-transformers；
- BGE / E5 / MiniLM Embedding 系列。

## 18.4 社交监听架构参考

可参考开源 social listening 项目的以下设计，但不要照搬其抓取策略：

- 多来源内容标准化；
- Keyword Watch；
- 去重；
- 情绪/意图结构化输出；
- 定时扫描；
- 证据保留；
- Dashboard 聚合。

---

# 19. 开发阶段与任务优先级

## Phase 0：仓库与基础设施

目标：项目可以一条命令启动。

任务：

- [ ] 建立 Monorepo；
- [ ] Docker Compose；
- [ ] Next.js；
- [ ] FastAPI；
- [ ] PostgreSQL + pgvector；
- [ ] Redis；
- [ ] Celery Worker；
- [ ] Alembic；
- [ ] 基础 Auth；
- [ ] `.env.example`；
- [ ] CI：lint、typecheck、test。

验收：

```bash
make dev
```

可启动 Web、API、Worker、PostgreSQL 和 Redis。

---

## Phase 1：Product Brain

任务：

- [ ] 创建产品；
- [ ] Website 抓取；
- [ ] GitHub README 抓取；
- [ ] Product Brain Prompt；
- [ ] supported claims；
- [ ] Query Graph；
- [ ] Product Brain UI；
- [ ] 版本管理。

验收：

输入任意公开产品链接后，可生成结构化 Product Brain，所有产品能力有来源。

---

## Phase 2：Reddit Radar 离线模式

任务：

- [ ] Reddit OAuth；
- [ ] subreddit 配置；
- [ ] 帖子/评论增量拉取；
- [ ] 本地 fixture 模式；
- [ ] BM25；
- [ ] Embedding；
- [ ] Intent Classifier；
- [ ] Opportunity Score；
- [ ] Opportunity Dashboard；
- [ ] 成本统计。

验收：

输入一个产品后，每天能输出 Top 10 相关机会，离线人工评测 Precision ≥ 70%。

---

## Phase 3：Policy + Shadow Reply

任务：

- [ ] subreddit rules；
- [ ] Policy Engine；
- [ ] Answer Planner；
- [ ] Claim Checker；
- [ ] Reply Writer；
- [ ] Quality Gate；
- [ ] Similarity Gate；
- [ ] Shadow 模式日志；
- [ ] Benchmark 和评测脚本。

验收：

系统可自动决定 `SKIP / HELP_ONLY / HELP_AND_DISCLOSE`，并生成高质量回复，但不发送。

---

## Phase 4：自动发布

前置条件：平台批准状态满足要求。

任务：

- [ ] Reddit Publisher；
- [ ] 双重自动发布开关；
- [ ] 幂等；
- [ ] 账号配额；
- [ ] subreddit 配额；
- [ ] Kill Switch；
- [ ] 风险事件；
- [ ] 发布状态回查。

验收：

单产品、单账号、3–5 个 subreddit、每日最多 3 条，可稳定自动发布且无重复发送。

---

## Phase 5：Conversation Loop

任务：

- [ ] Conversation 表；
- [ ] 状态机；
- [ ] 分层轮询；
- [ ] 追评意图分类；
- [ ] 自动追评；
- [ ] 结束条件；
- [ ] Moderator 警告处理；
- [ ] Conversation UI。

验收：

用户回复 Agent 后，系统能在下一检查周期识别意图、生成合适回复、更新状态并停止不适合的对话。

---

## Phase 6：Tracking 与 Analytics

任务：

- [ ] 短链接；
- [ ] UTM；
- [ ] Tracking SDK；
- [ ] Event API；
- [ ] anonymous_id → user_id；
- [ ] signup/activated/paid；
- [ ] Dashboard Funnel；
- [ ] subreddit/意图/策略分析。

验收：

可从某条 Reddit Conversation 追踪到访问、注册和激活。

---

# 20. Codex 第一轮应直接完成的任务

请先实现 Phase 0 和 Phase 1，并搭出 Phase 2 的数据结构与 fixture 流程。

具体输出：

1. 完整仓库骨架；
2. Docker Compose；
3. 数据库模型和首个 migration；
4. FastAPI 基础 API；
5. Next.js Dashboard 框架；
6. Product 创建页面；
7. Website/GitHub ingestion；
8. Product Brain Provider 接口；
9. Mock LLM Provider；
10. 一个真实 LLM Provider 的适配层，但不得硬编码密钥；
11. Query Graph 生成；
12. Reddit fixture 导入器；
13. Candidate 表和 Opportunity 列表页面；
14. README：本地运行步骤；
15. 测试。

第一轮禁止提前实现：

- 真正自动发布；
- 多平台；
- 浏览器自动化；
- 复杂计费；
- 企业权限；
- Temporal；
- 微服务拆分。

---

# 21. `.env.example`

```dotenv
# App
APP_ENV=development
APP_URL=http://localhost:3000
API_URL=http://localhost:8000
SECRET_KEY=change_me
ENCRYPTION_KEY=change_me

# Database
DATABASE_URL=postgresql+asyncpg://postgres:postgres@postgres:5432/reddit_growth

# Redis / Celery
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/1
CELERY_RESULT_BACKEND=redis://redis:6379/2

# Reddit
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_REDIRECT_URI=http://localhost:8000/v1/reddit/oauth/callback
REDDIT_USER_AGENT=reddit-growth-agent/0.1
REDDIT_APP_APPROVAL_STATUS=DEVELOPMENT_ONLY

# LLM
LLM_PROVIDER=mock
LLM_API_KEY=
LLM_STRONG_MODEL=
LLM_CHEAP_MODEL=
EMBEDDING_MODEL=

# Safety
AUTOPUBLISH_ENABLED=false
GLOBAL_KILL_SWITCH=false
DEFAULT_DAILY_REPLY_LIMIT=3
MAX_DAILY_REPLY_LIMIT=5
MAX_SUBREDDIT_DAILY_REPLY_LIMIT=1
MAX_CONVERSATION_FOLLOWUPS=4

# Tracking
TRACKING_BASE_URL=http://localhost:8000
TRACKING_COOKIE_TTL_DAYS=30
```

---

# 22. 核心验收场景

## 场景 A：明确求推荐

帖子：

> Looking for an alternative to X that supports Y.

产品确实支持 Y。

预期：

- 高 ProductFit；
- `SEEKING_RECOMMENDATION`；
- Policy Allow；
- 回复先说明选择标准；
- 披露产品关系；
- 规则允许时可提产品；
- 默认不强塞链接。

## 场景 B：泛泛讨论

帖子：

> AI tools are changing everything.

预期：

- 低 SolutionIntent；
- `SKIP`；
- 不生成推广回复。

## 场景 C：产品不适用

用户明确需要产品尚未支持的平台。

预期：

- Claim Checker 拦截；
- Policy `SKIP` 或只提供不带产品的帮助；
- 不暗示未来一定支持。

## 场景 D：用户索要链接

对 Agent 回复：

> Can you send me the link?

预期：

- `ASK_LINK`；
- 创建唯一短链接；
- 回复链接和最相关使用说明；
- Conversation 进入 `LINK_SHARED`。

## 场景 E：用户反感推广

回复：

> Stop spamming your product.

预期：

- `NEGATIVE_REACTION`；
- 简短道歉；
- 立即关闭 Conversation；
- 写入 Risk Event；
- 降低社区和策略分数；
- 不再追评。

## 场景 F：Moderator 警告

预期：

- 立即关闭对话；
- 暂停该 subreddit 自动回复；
- 触发高优先级告警；
- 不自动争辩。

## 场景 G：重复任务

同一 Candidate 发布任务被 Worker 执行两次。

预期：

- 只有一条 Reddit 评论；
- 第二次由 idempotency key 拦截；
- 审计日志记录重复尝试。

---

# 23. 最终产品原则

1. **找到比生成更重要。**
2. **不回复也是核心能力。**
3. **追评比首次回复更接近转化。**
4. **评论数不是价值，激活用户才是价值。**
5. **自动化必须建立在严格边界和透明身份上。**
6. **平台发布能力不是护城河，Conversation-to-Conversion 数据才是。**
7. **MVP 先证明：一个产品链接进去，系统真的能发现 Reddit 上正在发生的需求。**
8. **长期目标不是成为 Spam Bot，而是成为一个可持续学习的 Organic Growth Agent。**

---

# 24. 官方平台资料（开发前需再次核对）

以下政策具有变更可能，生产上线前必须再次核对最新版本：

- Reddit Data API Terms：`https://redditinc.com/policies/data-api-terms`
- Reddit Developer Terms：`https://redditinc.com/policies/developer-terms`
- Reddit Data API Wiki：`https://support.reddithelp.com/hc/en-us/articles/16160319875092-Reddit-Data-API-Wiki`
- Developer Platform & Accessing Reddit Data：`https://support.reddithelp.com/hc/en-us/articles/14945211791892-Developer-Platform-Accessing-Reddit-Data`
- Reddit Developer Platform 文档：`https://developers.reddit.com/docs/`

---

**End of specification.**
