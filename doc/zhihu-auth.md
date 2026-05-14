知乎 OAuth API 快速开始

概述

Base URL: https://openapi.zhihu.com/
协议: HTTPS
数据格式: JSON

知乎 OAuth API 提供了基于 OAuth 2.0 授权码模式的用户授权能力，支持获取用户信息、社交关系、关注动态等功能。

申请应用凭证

使用 OAuth 接口前，需要先获取 app_id 与 app_key：

渠道	说明
知乎商务渠道	通过知乎商务团队申请
知乎黑客松渠道	创建黑客松项目后，系统会自动生成
授权流程

采用标准的 OAuth 2.0 授权码模式。

1. 引导用户授权

引导用户打开授权页：

https://openapi.zhihu.com/authorize?redirect_uri={redirect_uri}&app_id={app_id}&response_type=code
2. 用户确认授权

用户在 https://openapi.zhihu.com 完成登录并确认授权后，平台会将请求重定向到：

{redirect_uri}?code={authorization_code}
3. 换取 access_token

使用第 2 步获取的 authorization_code，调用 获取 access_token 接口 换取 access_token。

4. 获取用户信息

使用 access_token 调用 获取用户信息接口 获取当前授权用户的基本信息。

公共说明

Access Token 使用方式

所有需要授权的接口，均需在 HTTP Header 中携带 access_token：

Authorization: Bearer {access_token}
通用分页参数

以下接口支持分页查询：

获取粉丝列表
获取关注列表
获取互相关注列表
获取关注动态
参数	类型	必填	说明	默认值
page	int	否	页码，从 0 开始	0
per_page	int	否	每页返回数量	10
用户对象字段说明

社交关系接口返回的用户列表中，单条用户对象包含以下字段：

字段	类型	说明
uid	int	知乎用户 ID
hash_id	string	用户 hash ID，用于 URL 展示
fullname	string	用户昵称
gender	string	性别（male、female、Unknown）
headline	string	用户个人简介
description	string	用户个人描述
avatar_path	string	用户头像完整 URL
url	string	用户主页 URL
email	string	用户邮箱（根据应用权限决定是否返回，无权限时为空字符串）
phone_no	string	用户手机号（根据应用权限决定是否返回，无权限时为空字符串）
公共错误响应

以下错误响应适用于所有需要 access_token 的接口：

场景	HTTP 状态码	响应体
缺少 Authorization Header	200	{"code": 401, "data": "Missing Authorization in request headers"}
Authorization 格式错误	200	{"code": 401, "data": "Token type is error"}
access_token 无效或已过期	200	{"code": 401, "data": "Access token is not valid"}
应用权限不足	200	{"code": 403, "data": "API Access Deny"}

获取 access_token

接口说明

使用用户授权后获得的 authorization_code 换取 access_token。

授权流程请参考 快速开始。

接口信息

说明	值
HTTP URL	https://openapi.zhihu.com/access_token
HTTP Method	POST
请求参数

参数	类型	必填	说明
app_id	string	是	第三方 APP_ID（需向知乎申请）
app_key	string	是	第三方 APP_KEY（需向知乎申请）
grant_type	string	是	固定值：authorization_code
redirect_uri	string	是	申请 APP_ID 时所填写的重定向地址
code	string	是	用户授权后生成的 authorization_code
响应数据

成功响应示例

{
  "access_token": "xxx",
  "token_type": "Bearer",
  "expires_in": 3600
}
响应字段说明

字段	类型	说明
access_token	string	访问令牌
token_type	string	令牌类型，如 Bearer
expires_in	long	过期时间（秒）
curl 示例

curl -s -X POST "https://openapi.zhihu.com/access_token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "app_id=${APP_ID}" \
  -d "app_key=${APP_KEY}" \
  -d "grant_type=authorization_code" \
  -d "redirect_uri=${REDIRECT_URI}" \
  -d "code=${CODE}"

获取用户信息

接口说明

获取当前授权用户的基本信息。

Access Token 使用方式请参考 快速开始。

接口信息

说明	值
HTTP URL	https://openapi.zhihu.com/user
HTTP Method	GET
请求参数

将获取的 access_token 放在 HTTP Header Authorization 中：

Authorization: Bearer {access_token}
响应数据

成功响应示例

{
  "uid": 123456789,
  "fullname": "知乎用户",
  "gender": "male",
  "headline": "个人简介",
  "description": "个人描述",
  "avatar_path": "https://picx.zhimg.com/...",
  "phone_no": "13800138000",
  "email": "user@example.com"
}
响应字段说明

字段	类型	说明
uid	int	知乎用户 ID
fullname	string	用户昵称
gender	string	性别（male、female、unknown）
headline	string	用户个人简介
description	string	用户个人描述
avatar_path	string	用户头像地址
phone_no	string	用户手机号（用户未授权时为空字符串）
email	string	用户邮箱（用户未授权时为空字符串）
错误响应

场景	HTTP 状态码	响应体
用户不存在	200	{"code": 404, "data": "User don't exist"}
其他公共错误（鉴权失败、权限不足等）请参考 快速开始 中的公共错误响应。

curl 示例

curl -s "https://openapi.zhihu.com/user" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

获取粉丝列表

接口说明

获取当前授权用户的关注者（粉丝）列表。

Access Token 使用方式及通用分页参数请参考 快速开始。

接口信息

说明	值
HTTP URL	https://openapi.zhihu.com/user/followers
HTTP Method	GET
请求参数

Query Parameters

参数	类型	必填	说明	默认值
page	int	否	页码，从 0 开始	0
per_page	int	否	每页返回数量	10
响应数据

成功响应示例

[
  {
    "uid": 123456789,
    "hash_id": "abc123",
    "fullname": "知乎用户",
    "gender": "male",
    "headline": "个人简介",
    "description": "个人描述",
    "avatar_path": "https://picx.zhimg.com/...",
    "url": "https://www.zhihu.com/people/abc123",
    "email": "",
    "phone_no": ""
  }
]
响应字段说明

返回值为用户对象数组，字段说明请参考 快速开始 中的「用户对象字段说明」。

错误响应

公共错误（鉴权失败、权限不足等）请参考 快速开始 中的公共错误响应。

curl 示例

curl -s "https://openapi.zhihu.com/user/followers?page=0&per_page=10" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

获取关注列表

接口说明

获取当前授权用户已关注的用户列表。

Access Token 使用方式及通用分页参数请参考 快速开始。

接口信息

说明	值
HTTP URL	https://openapi.zhihu.com/user/followed
HTTP Method	GET
请求参数

Query Parameters

参数	类型	必填	说明	默认值
page	int	否	页码，从 0 开始	0
per_page	int	否	每页返回数量	10
响应数据

成功响应示例

[
  {
    "uid": 123456789,
    "hash_id": "abc123",
    "fullname": "知乎用户",
    "gender": "male",
    "headline": "个人简介",
    "description": "个人描述",
    "avatar_path": "https://picx.zhimg.com/...",
    "url": "https://www.zhihu.com/people/abc123",
    "email": "",
    "phone_no": ""
  }
]
响应字段说明

返回值为用户对象数组，字段说明请参考 快速开始 中的「用户对象字段说明」。

错误响应

公共错误（鉴权失败、权限不足等）请参考 快速开始 中的公共错误响应。

curl 示例

curl -s "https://openapi.zhihu.com/user/followed?page=0&per_page=10" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}"

知乎 OAuth 登录 Skill

基本信息

名称: zhihu-oauth-skill
用途: 为 Web 应用接入知乎账号 OAuth 2.0 登录
适用场景: 需要集成知乎第三方登录的 Web 应用
核心流程

采用标准的 Authorization Code Flow：

用户点击登录按钮
跳转到知乎授权页面 https://openapi.zhihu.com/authorize
用户在知乎完成登录和授权
回调到 redirect_uri，携带 code
后端用 code 换取 access_token
使用 access_token 调用用户信息接口
前置准备

申请 APP_ID 和 APP_KEY

发送邮件至：product-platform@zhihu.com
邮件主题：<公司名称>申请接入知乎 oauth 服务
申请时需提供 redirect_uri（回调地址）
关键 API 端点

功能	URL	方法
授权页面	https://openapi.zhihu.com/authorize	GET
Token 交换	https://openapi.zhihu.com/access_token	POST
用户信息	https://openapi.zhihu.com/user	GET
粉丝列表	https://openapi.zhihu.com/user/followers	GET
关注列表	https://openapi.zhihu.com/user/followed	GET
关注动态	https://openapi.zhihu.com/user/moments	GET
实现架构

后端接口设计

推荐实现以下接口：

1. 生成授权 URL

接口: GET /api/auth/zhihu/url

功能: 生成知乎授权跳转 URL

请求参数:

{
  "redirect_uri": "https://yourdomain.com/callback"
}
返回示例:

{
  "authorize_url": "https://openapi.zhihu.com/authorize?redirect_uri=https://yourdomain.com/callback&app_id=YOUR_APP_ID&response_type=code&state=RANDOM_STATE"
}
实现要点:

生成随机 state 参数防止 CSRF 攻击
将 state 存储在 session 或 Redis 中，用于回调验证
URL 参数需要进行 URL 编码
2. 处理授权回调

接口: POST /api/auth/zhihu/callback

功能: 接收授权码，换取 token 并获取用户信息

请求参数:

{
  "code": "authorization_code_from_zhihu",
  "state": "state_from_url",
  "redirect_uri": "https://yourdomain.com/callback"
}
返回示例:

{
  "access_token": "fc42fc30390c455184ddbd7e710d05ad",
  "expires_in": 2592000,
  "user": {
    "uid": 23456789876,
    "fullname": "用户昵称",
    "gender": "male",
    "headline": "个人简介",
    "avatar_path": "https://picl.zhimg.com/xxx.jpg",
    "email": "user@example.com",
    "phone_no": "+8618800000000"
  }
}
实现流程:

验证 state 参数是否匹配
调用 https://openapi.zhihu.com/access_token 换取 token
使用 token 调用 https://openapi.zhihu.com/user 获取用户信息
返回 token 和用户信息给前端
API 详细说明

1. 授权接口

URL: https://openapi.zhihu.com/authorize

请求参数:

参数	必填	说明
redirect_uri	是	授权回调地址（需与申请时一致）
app_id	是	第三方应用 ID
response_type	是	固定值：code
state	否	防 CSRF 攻击的随机字符串（强烈推荐）
示例:

https://openapi.zhihu.com/authorize?redirect_uri=https://yourdomain.com/callback&app_id=YOUR_APP_ID&response_type=code&state=RANDOM_STATE
2. Token 交换接口

URL: https://openapi.zhihu.com/access_token

请求方式: POST

请求参数:

参数	必填	说明
app_id	是	第三方应用 ID
app_key	是	第三方应用密钥
grant_type	是	固定值：authorization_code
redirect_uri	是	授权回调地址（需与申请时一致）
code	是	授权码
返回数据:

字段	类型	说明
access_token	string	访问令牌
token_type	string	固定值：bearer
expires_in	long	有效期（秒），默认 30 天
返回示例:

{
  "access_token": "fc42fc30390c455184ddbd7e710d05ad",
  "token_type": "bearer",
  "expires_in": 2592000
}
3. 用户信息接口

URL: https://openapi.zhihu.com/user

请求方式: GET

请求头:

Authorization: Bearer {access_token}
返回数据:

字段	类型	说明
uid	int	知乎用户 ID
fullname	string	用户昵称
gender	string	性别（male, female, unknown）
headline	string	个人简介
description	string	个人描述
avatar_path	string	头像 URL
phone_no	string	手机号（需授权，否则为空）
email	string	邮箱（需授权，否则为空）
返回示例:

{
  "uid": 23456789876,
  "fullname": "用户昵称",
  "gender": "male",
  "headline": "个人简介",
  "description": "个人描述",
  "avatar_path": "https://picl.zhimg.com/xxx.jpg",
  "phone_no": "+8618800000000",
  "email": "user@zhihu.com"
}
社交关系接口

所有社交关系接口均需在请求头中携带 access_token：

Authorization: Bearer {access_token}
通用分页参数

参数	类型	必填	说明	默认值
page	int	否	页码（从 0 开始）	0
per_page	int	否	每页数量	10
用户对象字段

字段	类型	说明
uid	int	知乎用户 ID
hash_id	string	用户 hash ID（用于 URL）
fullname	string	用户昵称
gender	string	性别
headline	string	个人简介
description	string	个人描述
avatar_path	string	头像 URL
url	string	用户主页 URL
email	string	邮箱（根据权限返回）
phone_no	string	手机号（根据权限返回）
1. 获取粉丝列表

URL: https://openapi.zhihu.com/user/followers

请求示例:

GET /user/followers?page=0&per_page=10
Authorization: Bearer fc42fc30390c455184ddbd7e710d05ad
2. 获取关注列表

URL: https://openapi.zhihu.com/user/followed

请求示例:

GET /user/followed?page=0&per_page=10
Authorization: Bearer fc42fc30390c455184ddbd7e710d05ad
3. 获取关注动态

URL: https://openapi.zhihu.com/user/moments

请求参数:

参数	类型	必填	说明	默认值
page	int	否	页码，从 0 开始	0
per_page	int	否	每页数量，最大 50，总计最多查询 200 条	10
请求示例:

GET /user/moments?page=0&per_page=10
Authorization: Bearer fc42fc30390c455184ddbd7e710d05ad
返回数据:

字段	类型	说明
data	array	动态列表
data[].actor.name	string	动作发起人昵称
data[].action_text	string	动作描述（如"回答了问题"）
data[].action_time	int	动作时间（Unix 时间戳）
data[].target.title	string	内容标题
data[].target.excerpt	string	内容摘要
data[].target.author.name	string	内容作者昵称
返回示例:

{
  "data": [
    {
      "actor": { "name": "用户昵称" },
      "action_text": "回答了问题",
      "action_time": 1713830400,
      "target": {
        "title": "问题标题",
        "excerpt": "回答摘要...",
        "author": { "name": "作者昵称" }
      }
    }
  ]
}
错误处理

通用错误响应

所有接口错误均返回 HTTP 200，通过响应体中的 code 字段判断错误类型：

场景	code	data
缺少 Authorization	401	Missing Authorization in request headers
Authorization 格式错误	401	Token type is error
access_token 无效或过期	401	Access token is not valid
应用权限不足	403	API Access Deny
用户不存在	404	User don't exist
错误响应示例:

{
  "code": 401,
  "data": "Access token is not valid"
}
安全要求

1. 密钥管理

✅ APP_KEY 必须通过环境变量注入
❌ 严禁硬编码或提交到代码仓库
推荐配置方式:

# .env 文件（不要提交到 git）
ZHIHU_APP_ID=your_app_id
ZHIHU_APP_KEY=your_app_key
ZHIHU_REDIRECT_URI=https://yourdomain.com/callback
2. CSRF 防护

生成随机 state 参数（推荐使用 UUID）
将 state 存储在服务端（session/Redis）
回调时验证 state 是否匹配
3. Token 安全

Token 交换必须在后端完成，不能暴露给前端
建议将 access_token 存储在 HttpOnly Cookie 中
定期检查 token 有效期，过期后引导用户重新授权
4. HTTPS 要求

生产环境必须使用 HTTPS
redirect_uri 必须使用 HTTPS 协议
实现示例（Node.js/Express）

后端代码示例

const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// 环境变量配置
const ZHIHU_APP_ID = process.env.ZHIHU_APP_ID;
const ZHIHU_APP_KEY = process.env.ZHIHU_APP_KEY;

// 存储 state（生产环境使用 Redis）
const stateStore = new Map();

// 1. 生成授权 URL
app.get('/api/auth/zhihu/url', (req, res) => {
  const { redirect_uri } = req.query;

  // 生成随机 state
  const state = crypto.randomUUID();
  stateStore.set(state, { timestamp: Date.now() });

  const authorizeUrl = `https://openapi.zhihu.com/authorize?` +
    `redirect_uri=${encodeURIComponent(redirect_uri)}` +
    `&app_id=${ZHIHU_APP_ID}` +
    `&response_type=code` +
    `&state=${state}`;

  res.json({ authorize_url: authorizeUrl, state });
});

// 2. 处理回调
app.post('/api/auth/zhihu/callback', async (req, res) => {
  const { code, state, redirect_uri } = req.body;

  // 验证 state
  if (!stateStore.has(state)) {
    return res.status(400).json({ error: 'Invalid state' });
  }
  stateStore.delete(state);

  try {
    // 换取 access_token
    const tokenResponse = await axios.post('https://openapi.zhihu.com/access_token', {
      app_id: ZHIHU_APP_ID,
      app_key: ZHIHU_APP_KEY,
      grant_type: 'authorization_code',
      redirect_uri,
      code
    });

    const { access_token, expires_in } = tokenResponse.data;

    // 获取用户信息
    const userResponse = await axios.get('https://openapi.zhihu.com/user', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    res.json({
      access_token,
      expires_in,
      user: userResponse.data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000);
前端代码示例

// 1. 发起登录
async function loginWithZhihu() {
  const redirectUri = `${window.location.origin}/callback`;

  // 获取授权 URL
  const response = await fetch(`/api/auth/zhihu/url?redirect_uri=${encodeURIComponent(redirectUri)}`);
  const { authorize_url, state } = await response.json();

  // 保存 state 到 localStorage
  localStorage.setItem('zhihu_oauth_state', state);

  // 跳转到知乎授权页面
  window.location.href = authorize_url;
}

// 2. 处理回调（在 /callback 页面）
async function handleCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const state = urlParams.get('state');

  // 验证 state
  const savedState = localStorage.getItem('zhihu_oauth_state');
  if (state !== savedState) {
    console.error('State mismatch');
    return;
  }
  localStorage.removeItem('zhihu_oauth_state');

  // 发送到后端换取 token
  const response = await fetch('/api/auth/zhihu/callback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      state,
      redirect_uri: window.location.origin + '/callback'
    })
  });

  const { access_token, user } = await response.json();

  // 保存 token 和用户信息
  localStorage.setItem('access_token', access_token);
  localStorage.setItem('user', JSON.stringify(user));

  // 跳转到首页
  window.location.href = '/';
}
最佳实践

1. Token 管理

在后端维护 token 与用户 session 的映射关系
定期刷新 token（知乎 token 有效期为 30 天）
Token 过期后自动引导用户重新授权
2. 用户信息缓存

将用户基本信息缓存到数据库
减少对知乎 API 的调用频率
定期同步更新用户信息
3. 错误处理

对所有 API 调用添加超时控制
实现重试机制（指数退避）
记录详细的错误日志便于排查
4. 性能优化

使用连接池管理 HTTP 请求
对社交关系接口实现分页加载
考虑使用 CDN 缓存用户头像
常见问题

Q1: redirect_uri 不匹配怎么办？

A: redirect_uri 必须与申请 APP_ID 时填写的地址完全一致（包括协议、域名、路径）。

Q2: access_token 有效期是多久？

A: 默认 30 天（2592000 秒），过期后需要用户重新授权。

Q3: 如何获取用户手机号和邮箱？

A: 需要在申请 APP_ID 时向知乎申请相应权限，用户授权后才能获取。

Q4: 社交关系接口有调用频率限制吗？

A: 建议合理控制调用频率，避免频繁请求。具体限制请咨询知乎技术支持。

Q5: 支持刷新 token 吗？

A: 知乎 OAuth 2.0 目前不支持 refresh_token，token 过期后需要用户重新授权。

参考资料

OAuth 2.0 RFC 6749: https://tools.ietf.org/html/rfc6749
知乎开放平台邮箱: product-platform@zhihu.com
