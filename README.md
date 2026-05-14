# saved-lists-cleaner

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

把吃灰的知乎收藏夹，变成今天能清空的待办列表：导入收藏夹、用 AI 做结构化 triage（保留 / 速读 / 删除等），在只读 MVP 下先做本地标记与报告，不写回知乎。

## 技术栈

- Next.js（App Router）
- PostgreSQL + Prisma
- DeepSeek API（分析）
- Docker / docker-compose（可选本地或服务器部署）

## 本地开发

### 环境变量

复制示例文件并按需填写（勿将密钥提交到仓库）：

```bash
cp .env.example .env
```

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | PostgreSQL 连接串 |
| `APP_SECRET` | 用于加密本应用 session / 知乎 Cookie 等 |
| `DEEPSEEK_API_KEY` | DeepSeek OpenAPI 密钥 |

可选：知乎 OAuth、HTTPS Cookie 等见仓库内 `AGENTS.md` 与 `doc/`。

### 安装与数据库

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000)。

### 常用脚本

| 命令 | 作用 |
|------|------|
| `npm run dev` | 开发服务器 |
| `npm run build` | 生产构建 |
| `npm run start` | 生产启动 |
| `npm run lint` | ESLint |
| `npm run test:deepseek` | 校验 DeepSeek 调用 |
| `npm run test:zhihu:public` | 校验公开收藏夹接口 |
| `npm run test:zhihu:cookie-favorites` | 本机已登录 Chrome/Playwright profile 下的 Cookie 链路（不打印 Cookie） |

## 免责声明

- 知乎网页/API 非长期稳定合同，MVP 以 adapter 封装，后续可替换为官方授权接口。
- 用户自行粘贴 Cookie 等行为需自担账号与合规风险；本项目以只读导入与本地分析为主。

## 开源协议

本项目以 [MIT License](./LICENSE) 发布。
