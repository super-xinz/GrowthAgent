# GrowthAgent

GrowthAgent 是一个低频运行的小红书需求发现与产品触达工具。它读取产品网站或 GitHub 的公开资料，建立带证据的 Product Brain，寻找正在经历相关痛点的人，并只在高匹配、低风险时发送一句简短且披露关系的回复。

## 当前产品定义

- 每个产品默认每 3 小时搜索一轮；每轮 3 个中文需求词，每词读取 2 个结果；
- 机会分达到 75、风险分不高于 35 才能进入自动发布；
- 每轮最多发布 1 条，两次发布至少间隔 4 小时，每个产品每天最多 2 条；
- 回复严格为 6–25 个字符，不含链接，不编造能力；推广自有产品时必须自然披露关系；
- 模型评分失败时降级分最高 64，不会自动发布；连续 3 次运行异常后自动暂停；
- 外部写操作不重试，避免平台已经接收但响应丢失时重复评论；
- 不发布笔记，不点赞、收藏、关注、私信，也不轮换账号或绕过平台限制。

## 启动

需要 macOS Apple Silicon 和 Docker Desktop。

```bash
cp .env.example .env
make dev
```

在 `.env` 中配置 OpenAI-compatible 模型：

```dotenv
LLM_PROVIDER=openai
LLM_API_KEY=你的密钥
LLM_BASE_URL=https://api.openai.com/v1
LLM_STRONG_MODEL=接口实际支持的模型名
```

打开：

- 工作台：<http://localhost:3000/dashboard>
- 小红书登录：<http://localhost:3000/account>
- API 文档：<http://localhost:8000/docs>

首次使用：扫码登录小红书，添加产品公开地址，确认产品关系披露，然后开启自动获客。新产品默认直接开启；可以在产品页随时暂停或立即运行一轮。

## 核心流程

```text
公开产品资料
  → Product Brain（用户 / 痛点 / 能力证据 / 搜索图谱）
  → 每 3 小时选择 3 个中文需求词
  → 搜索笔记与评论
  → 严格评分（用户匹配 / 痛点 / 意图 / 能力 / 时机）
  → 75 分与风险门槛
  → 6–25 字口语回复
  → 冷却、日上限、登录与目标刷新检查
  → 最多发布 1 条
```

## 测试

```bash
make test
make lint
make typecheck
make build
```

## 目录

```text
apps/api       FastAPI、自动化任务、提示词与数据库迁移
apps/web       极简 Next.js 控制台
tests          后端和小红书工作流测试
infra/docker   API / Web 镜像
可以参考的开源项目/xiaohongshu-mcp-main
               项目运行所需的精简本地 MCP 源码
```

Cookie 只保存在本地 `.xiaohongshu-data/`。请仅使用你有权运营的账号，并遵守平台规则和适用法律。
