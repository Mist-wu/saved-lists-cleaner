# AGENTS.md instructions for /Users/wu/Github/saved-lists-cleaner

## Project

项目名：saved-lists-cleaner

当前目标：参加知乎开发者黑客松，开发一个收藏夹管理网站。

当前执行目标：

- 完成 Next.js 全栈 MVP、PostgreSQL 数据库、DeepSeek 分析、GitHub 推送、VPS 部署、GitHub push webhook 自动部署。
- 当前 MVP 先走“公开收藏夹 URL 导入”的 read-only 链路，登录态全量导入保留为后续 adapter。
- 前端先保持极简文字排版，不做复杂样式设计。
- 构建、部署、实际点击测试过程中持续更新本文档。

一句话定位：

> 把吃灰的知乎收藏夹，变成今天能清空的待办列表。

核心不是“推荐更多内容”，而是帮助用户更快清空收藏夹和待看列表：

- 导入用户的知乎收藏夹。
- 用 AI 扫描每条收藏内容。
- 识别值得保留、适合速读、可以删除、重复、过时、标题党、低价值等内容。
- 让用户批量清理、压缩收藏夹，并生成清空进度报告。

后续可扩展平台：

- Bilibili 稍后再看
- 小红书收藏
- X / Twitter bookmarks

MVP 先只做知乎收藏夹导入。

## Product Loop

MVP 核心闭环：

1. 知乎登录
2. 导入收藏夹
3. AI 扫描每条内容
4. 打标签：保留 / 删除 / 速读 / 已过时 / 重复 / 低价值
5. 用户一键清理或批量处理
6. 生成清空进度报告

## MVP Pages

### 1. 首页

主文案：

> 即刻清空你吃灰的收藏夹。

主按钮：

> 登录知乎

### 2. 收藏夹导入页

导入流程状态：

- 正在导入收藏夹
- 正在分析标题
- 正在提取主题
- 正在检测重复
- 正在判断过时内容
- 正在生成清理建议

### 3. 体检报告页

核心展示：

- 收藏夹健康度：42 / 100
- 37% 可以直接删除
- 22% 适合只看摘要
- 真正值得精读的只有 16 条

### 4. 清理工作台

左侧筛选：

- 全部
- 建议删除
- 建议速读
- 值得精读
- 重复内容
- 过时内容

右侧卡片：

- 标题
- 平台
- AI 判断
- 删除理由
- 摘要
- 操作按钮

### 5. 今日清空

示例展示：

> 今天只处理 7 条，预计 18 分钟，能清掉 41 条收藏。

## Demo Features

### 收藏夹清债仪表盘

示例指标：

- 总收藏数：328
- 预计读完时间：42 小时
- 可直接删除：113 条
- 重复内容：36 条
- 过时内容：52 条
- 值得精读：18 条
- 5 分钟可清理：74 条

### AI 删除建议

示例理由：

> 建议删除：标题夸大，正文信息密度低，且同主题已有更高质量内容。

> 建议速读：观点有价值，但内容较长，可直接看 AI 摘要。

### 一键压缩收藏夹

按钮方向：

- 压缩到 50 条
- 删除明显低价值内容
- 只保留学习相关内容
- 清空 30 天前的过时热点
- 把同主题内容合并成一组

### 待看队列模式

不要叫“推荐”，叫“今日清空队列”。

用户可选状态：

- 我有 5 分钟
- 我有 15 分钟
- 我有 30 分钟
- 我现在很累
- 我想快速清理

### 收藏夹断舍离卡片

移动端优先交互：

- 保留
- 删除
- 稍后
- 生成摘要
- 加入学习路线
- 标记已读

### 收藏夹变课程表

把杂乱收藏变成学习路径，例如：

- 第 1 天：理解 Agent 是什么
- 第 2 天：工具调用
- 第 3 天：Memory
- 第 4 天：RAG
- 第 5 天：MCP
- 第 6 天：项目案例
- 第 7 天：自己做一个 Demo

每一天只给 3 条内容。

### 现在就看

根据当前时间、精力、兴趣，从旧收藏里挑内容：

- 5 分钟：短帖
- 15 分钟：视频
- 30 分钟：长文
- 太累了：总结版
- 想动手：带代码的内容

### 收藏夹搜索增强

用户可以像问 AI 一样问自己的收藏：

- 我之前是不是收藏过一个讲 AI Agent 记忆系统的文章？
- 帮我找适合做毕设参考的内容。

## AI Tags

- 值得精读
- 适合速读
- 可直接删除
- 内容过时
- 标题党
- 重复内容
- 低信息密度
- 工具教程
- 观点文章
- 学习资料
- 情绪爽文
- 营销软文
- 已解决需求

## Planned Stack

DigitalOcean：

- Frontend: Next.js
- Backend: API service
- Database: PostgreSQL
- AI: DeepSeek API

Cloudflare：

- DNS
- CDN
- HTTPS
- WAF / 安全防护
- 静态资源缓存

服务器：

- Ubuntu 22.04 LTS x64
- SSH: `ssh root@178.128.90.49`

## Verified API Notes

### DeepSeek

- base URL: `https://api.deepseek.com`
- 模型：`deepseek-v4-flash`
- 当前 `.env` 中的 DEEPSEEK_API_KEY 可用。

### Zhihu Favorites

2026-05-13 本地验证：

- 旧接口 `https://www.zhihu.com/api/v4/favlists/{id}/items` 对公开收藏夹测试失败。
- 新接口 `https://www.zhihu.com/api/v4/collections/{id}/contents?limit=5&offset=0` 可无登录读取公开收藏夹内容。
- 测试公开收藏夹：`https://www.zhihu.com/collection/21827231`
- 测试结果：`totals = 1060`，第一页成功返回 5 条内容。
- 登录态全量导入已验证可用，具体方法见 `doc/zhihu-full-favorites-import.md`。
- 获取用户全部收藏夹内容时，优先使用登录态全量导入，不要只获取公开收藏夹。
- 全量流程：`/api/v4/me` 获取 `url_token` -> `/api/v4/members/{url_token}/favlists` 获取全部收藏夹 -> `/api/v4/collections/{id}/contents` 逐个分页获取内容。
- 2026-05-13 实测账号 `驱不散的雾` 拉取到 5 个收藏夹、167 条内容，失败收藏夹数为 0。

可用字段示例：

- `type`
- `id`
- `url`
- `question.title`
- `excerpt`
- `author.name`
- `voteup_count`
- `comment_count`
- `collect_time`
- `created_time`
- `updated_time`

注意：

- 当前构建阶段先用公开收藏夹 URL 导入完成可演示 MVP。
- 登录态全量导入是后续正式导入方向，但不阻塞当前部署闭环。
- 用户自己的私有收藏夹读取需要知乎登录态、Cookie 或黑客松提供的正式 Auth/API。
- 批量管理、删除/移动等写操作暂不做；先做 read-only 导入和本地标记。
- 不要把非官方网页接口当成长期稳定合同；MVP 可以先封装成 adapter，后续替换为官方授权接口。

## Implementation Guidance

- 先做 read-only 导入和 AI 分析，不要先做删除写操作。
- 收藏夹导入层要设计成 provider adapter：
  - `ZhihuOAuthCollectionAdapter`
  - `ZhihuPublicCollectionAdapter` 只保留为调试或无登录 demo
  - 未来扩展 `BilibiliWatchLaterAdapter`、`XBookmarksAdapter`
- 数据库里要保存原始平台 ID、原始 URL、标题、摘要、作者、收藏时间、更新时间、AI 标签、AI 理由、处理状态。
- AI 输出必须结构化，优先 JSON schema，便于筛选和批量操作。
- 清理操作先做“本地标记删除/隐藏”，等授权确认后再做真实平台写回。

## Build Log

### 2026-05-13

- 已确认当前目标：完整搭建、部署、GitHub webhook 自动部署、实际点击测试。
- 前端要求调整为极简文字排版，暂不做复杂视觉设计。
- 当前实现路径：公开知乎收藏夹 URL -> Next.js API -> Zhihu public collections endpoint -> DeepSeek 分析 -> PostgreSQL 持久化 -> 页面展示。
- 已完成极简文字版页面、`/api/import`、`/api/runs`、Prisma schema、Dockerfile、docker-compose、GitHub webhook 服务脚本。
- 本地验证通过：`npm run test:deepseek` 返回 `OK`；`npm run test:zhihu:public` 返回公开收藏夹 `totals=1060`；`npm run build` 通过。
- 本机 Docker daemon 未运行且未找到 Docker Desktop 应用，本地数据库点击流改到 VPS 部署后验证。
- 已将 ESLint 9 配置改为 `eslint.config.mjs`，`npm run lint` 和 `npm run build` 均通过。
- GitHub 仓库已创建并推送：`https://github.com/Mist-wu/saved-lists-cleaner`。
- VPS 已安装 Docker Engine / Docker Compose plugin，应用容器和 PostgreSQL 容器已首次启动。
- 生产入口当前使用 `http://178.128.90.49`，GitHub webhook 入口为 `http://178.128.90.49:9000/github`。
- GitHub webhook 已创建，事件为 `push`，服务端 systemd 服务名为 `saved-lists-webhook.service`。
- 已修复 webhook 部署脚本路径：webhook server 从 `REPO_DIR/deploy/deploy.sh` 执行部署。
- GitHub webhook 自动部署验证通过：push 后 GitHub delivery 状态 `OK` / HTTP `202`，服务器仓库 HEAD 自动更新到最新提交。
- 线上点击测试通过：访问 `http://178.128.90.49`，点击“开始导入”，页面展示体检报告和清理工作台。
- 线上数据库写入验证通过：PostgreSQL 中 `ImportRun=2`、`SavedItem=24`，最近两次导入均为 `itemCount=12`、`analyzedCount=12`。
- 线上容器状态：`app-app-1` 暴露 `80->3000`，`app-postgres-1` healthy；app 容器内 OpenSSL 已存在，Prisma OpenSSL warning 已消除。
