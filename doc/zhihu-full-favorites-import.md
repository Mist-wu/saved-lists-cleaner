# 知乎全部收藏夹内容获取方法

本文记录 2026-05-13 本地实测可用的知乎登录态全量导入方案。后续 agents 需要获取用户收藏夹内容时，优先按这里的全量方法做，不要只抓公开收藏夹。

## 结论

可通过知乎网页登录后的 Cookie 读取用户全部收藏夹列表，再逐个分页读取收藏夹内容。

本方案是 read-only 导入链路，只做读取和本地分析，不做删除、移动、取消收藏等写操作。

## 已验证结果

测试目录：

`/Users/wu/Github/saved-lists-cleaner/test/zhihu-oauth-import`

测试命令：

```bash
cd /Users/wu/Github/saved-lists-cleaner/test/zhihu-oauth-import
npm run login
npm run status
npm run import:all
```

2026-05-13 实测登录用户：

- name: `驱不散的雾`
- url_token: `hong-hong-92-90-7`

实测结果：

- 收藏夹数量：5
- 内容总数：167
- failedCollections：0
- pageLimitedCollections：0

收藏夹列表：

| 收藏夹 | ID | 拉取条数 |
|---|---:|---:|
| 我的收藏夹 | `700610748` | 161 |
| 神贴 | `973843499` | 2 |
| 旅游 | `970389674` | 1 |
| 表情包 | `978715170` | 3 |
| SCienCE | `970403174` | 0 |

## 获取流程

### 1. 获取知乎登录态

用真实浏览器打开知乎登录页，让用户完成登录。

```text
https://www.zhihu.com/signin?next=%2F
```

登录后需要保存并复用 `https://www.zhihu.com` 下的 Cookie。关键登录 Cookie：

```text
z_c0
```

只要 `z_c0` 存在，后续 API 请求通常可识别为已登录用户。

### 2. 获取当前用户信息

请求：

```http
GET https://www.zhihu.com/api/v4/me
```

请求头需要带：

```http
Cookie: <知乎登录 Cookie>
Referer: https://www.zhihu.com/
User-Agent: <真实浏览器 UA>
Accept: application/json, text/plain, */*
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
```

重点字段：

- `id`
- `name`
- `url_token`
- `avatar_url`

后续用 `url_token` 枚举收藏夹。

### 3. 获取全部收藏夹列表

优先接口：

```http
GET https://www.zhihu.com/api/v4/members/{url_token}/favlists?limit=20&offset=0
```

实测可用示例：

```text
https://www.zhihu.com/api/v4/members/hong-hong-92-90-7/favlists?limit=20&offset=0
```

分页规则：

- 读取响应里的 `data` 数组。
- 读取响应里的 `paging.is_end` 判断是否结束。
- 如果未结束，继续请求 `paging.next`。

收藏夹字段建议标准化为：

- `id`
- `title` 或 `name`
- `description`
- `item_count` / `items_count` / `content_count`
- `url`

可作为 fallback 尝试的接口：

```http
GET https://www.zhihu.com/api/v4/members/{url_token}/collections?limit=20&offset=0
GET https://www.zhihu.com/api/v4/members/{url_token}/created_collections?limit=20&offset=0
```

### 4. 逐个获取收藏夹内容

对每个收藏夹 ID 请求：

```http
GET https://www.zhihu.com/api/v4/collections/{collection_id}/contents?limit=20&offset=0
```

示例：

```text
https://www.zhihu.com/api/v4/collections/700610748/contents?limit=20&offset=0
```

分页规则同收藏夹列表：

- 读取 `data`。
- 根据 `paging.is_end` 结束。
- 未结束则继续请求 `paging.next`。

## 内容字段映射

每条内容建议保存这些字段：

- `platform`: 固定为 `zhihu`
- `platform_collection_id`: 收藏夹 ID
- `platform_item_id`: `id`
- `type`
- `url`
- `title`: 优先 `title`，其次 `question.title`
- `excerpt`
- `author_name`: `author.name`
- `voteup_count`
- `comment_count`
- `collect_time`
- `created_time`
- `updated_time`
- `raw_payload`: 原始 JSON，便于后续修正字段映射

## Adapter 设计建议

项目里应以全量登录态导入为主：

- `ZhihuOAuthCollectionAdapter`
  - `getViewer()`
  - `listCollections(viewer.url_token)`
  - `fetchCollectionContents(collection.id)`
  - `importAllCollections()`

公开收藏夹读取只保留为调试或无登录 demo：

- `ZhihuPublicCollectionAdapter`

MVP 正式导入流程不要只依赖公开收藏夹接口。

## 注意事项

- 这些接口属于知乎网页端 API，不要当成长期稳定合同。
- 黑客松如果提供正式 OAuth/Auth/API，应替换 Cookie 来源，但保留 adapter 的输出结构。
- 私有收藏夹读取需要用户登录态；公开收藏夹接口不能代表真实用户全量导入。
- 写操作暂不做。清理建议先保存为本地状态，例如 `keep`、`delete_marked`、`skim`、`archive_hidden`。
- 导入结果要记录错误集合，避免一个收藏夹失败导致整次导入中断。
