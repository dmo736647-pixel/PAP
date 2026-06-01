# PAP — Personal Autonomous Information Agent

PAP 是一个主动型个人信息代理，帮你从邮件和日历的噪音中解放出来。

它不只是一个邮件客户端——它会**自动分类**、**过滤低价值内容**、**协调会议**，只把真正需要你关注的事情呈现出来。

## ✨ 核心功能

### 📬 智能邮件分类
- 利用 Gmail 标签 + 扩展关键词库自动分类邮件
- 验证码、广告、垃圾邮件、社交通知 → 自动归档，不打扰你
- 只有真正需要回复的邮件才会出现在"待确认"队列

### 🤝 会议协调
- 自动识别包含会议意图的邮件
- 根据你的日历空闲时段推荐 3 个可选时间
- 一键发送回复邮件（通过 Gmail API）
- 支持编辑回复草稿、选择不同时间段

### 📊 今日简报
- 每日汇总：多少封邮件、多少需要关注、多少已自动处理
- 高优先级事项一目了然

### ⚙️ 自动化边界
- 用户可配置哪些操作允许自动执行
- 高风险操作（合同、付款、敏感信息）始终需要人工确认
- 所有自动操作可撤销

## 🏗️ 技术栈

- **前端**: Next.js 16 (App Router), React, TypeScript, Tailwind CSS
- **后端**: Next.js API Routes, Prisma ORM, PostgreSQL
- **集成**: Google OAuth 2.0, Gmail API, Google Calendar API
- **安全**: AES-256-GCM 加密 OAuth token, HMAC-SHA256 签名 session
- **测试**: Vitest, Testing Library

## 🚀 快速开始

### 前置条件
- Node.js 18+
- PostgreSQL
- Google Cloud Console 项目（启用 Gmail API + Calendar API）

### 安装

```bash
# 克隆仓库
git clone https://github.com/dmo736647-pixel/PAP.git
cd PAP

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入你的 Google OAuth 和数据库信息

# 数据库迁移
npm run db:generate
npm run db:migrate

# 添加测试用户
PAP_ALPHA_INVITE_EMAIL="your@gmail.com" npm run db:seed

# 启动开发服务器
npm run dev
```

### 环境变量

| 变量 | 说明 |
|---|---|
| `DATABASE_URL` | PostgreSQL 连接字符串 |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
| `GOOGLE_REDIRECT_URI` | OAuth 回调地址 |
| `PAP_SESSION_SECRET` | Session 签名密钥（至少 16 字符） |
| `PAP_TOKEN_ENCRYPTION_KEY` | 32 字节 Base64 加密密钥 |
| `NEXT_PUBLIC_APP_URL` | 应用 URL |
| `PAP_ALPHA_INVITE_EMAIL` | 种子邀请邮箱 |
| `HTTPS_PROXY` | 可选，代理地址（如 `http://127.0.0.1:7890`） |

### Google Cloud Console 配置

1. 创建项目并启用 **Gmail API** + **Google Calendar API**
2. 创建 OAuth 2.0 客户端 ID（Web 应用）
3. 重定向 URI 设为 `http://localhost:3000/api/auth/google/callback`
4. OAuth 范围：`openid`, `email`, `profile`, `gmail.readonly`, `gmail.send`, `calendar.readonly`

## 📁 项目结构

```
src/
├── app/
│   ├── api/
│   │   ├── auth/google/       # OAuth 登录/回调
│   │   ├── google/sync/       # Gmail/Calendar 数据同步
│   │   ├── google/send-reply/ # 发送回复邮件
│   │   └── alpha/             # 工作区 API
│   ├── pap-dashboard.tsx      # 主界面（单文件组件）
│   └── page.tsx               # 入口页
├── lib/pap/
│   ├── triage.ts              # 邮件分类引擎
│   ├── meetings.ts            # 会议协调算法
│   ├── risk.ts                # 风险评估
│   ├── briefing.ts            # 每日简报生成
│   ├── google-api.ts          # Google API 客户端
│   ├── google-oauth.ts        # OAuth 辅助
│   ├── google-sync.ts         # 数据同步编排
│   ├── crypto.ts              # Token 加密
│   └── session.ts             # Session 管理
└── prisma/
    └── schema.prisma          # 数据库模型
```

## 🧪 测试

```bash
npm test           # 运行所有测试
npm run build      # 生产构建
```

## 📝 当前状态

PAP 目前处于 **Private Alpha** 阶段：
- ✅ Google OAuth 登录
- ✅ Gmail + Calendar 只读同步
- ✅ 智能邮件分类（Gmail 标签 + 关键词）
- ✅ 会议协调 + Gmail 发送
- ✅ 自动化边界配置
- ⏳ 后台同步 / Webhook
- ⏳ Outlook 集成
- ⏳ 部署到云端

## 📄 License

Private — All rights reserved.
