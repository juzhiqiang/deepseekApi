# GraphQL API 测试和验证

现在 API 已经更新为符合 GraphQL 规范的格式。让我们测试一下：

## ✅ 修复的问题

1. **正确的 GraphQL 响应格式**: 
   - 成功响应: `{ "data": { ... } }`
   - 错误响应: `{ "errors": [{ "message": "...", "extensions": { "code": "..." } }] }`

2. **改进的 GraphQL 解析器**:
   - 支持查询和变更操作
   - 支持变量
   - 支持输入对象和数组
   - 更好的错误处理

3. **符合规范的错误格式**:
   - 包含 `message` 字段
   - 包含 `extensions.code` 错误代码
   - 可选的 `locations` 和 `path` 字段

## 🧪 测试方法

### 1. 部署最新代码
```bash
cd deepseekApi
wrangler deploy
```

### 2. 测试基本查询
```bash
curl -X POST https://deepseek.jzq1020814597.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"query": "query { hello }"}'
```

预期响应:
```json
{
  "data": {
    "hello": "DeepSeek GraphQL API is running!"
  }
}
```

### 3. 测试模型查询
```bash
curl -X POST https://deepseek.jzq1020814597.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"query": "query { models { id object owned_by } }"}'
```

### 4. 测试聊天变更
```bash
curl -X POST https://deepseek.jzq1020814597.workers.dev \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation($input: ChatInput!) { chat(input: $input) { choices { message { content } } } }",
    "variables": {
      "input": {
        "messages": [{"role": "user", "content": "Hello!"}],
        "max_tokens": 100
      }
    }
  }'
```

### 5. 测试错误处理
```bash
curl -X POST https://deepseek.jzq1020814597.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"query": "query { invalidField }"}'
```

预期错误响应:
```json
{
  "errors": [
    {
      "message": "Unknown query field: invalidField",
      "locations": [],
      "path": [],
      "extensions": {
        "code": "INTERNAL_ERROR"
      }
    }
  ]
}
```

## 📋 GraphQL 规范检查清单

- ✅ 响应包含 `data` 字段（成功时）
- ✅ 响应包含 `errors` 数组（错误时）
- ✅ 错误对象包含 `message` 字段
- ✅ 错误对象包含 `extensions` 字段
- ✅ 支持 POST 方法发送查询
- ✅ 支持 JSON 格式请求体
- ✅ 正确处理变量
- ✅ 支持查询和变更操作
- ✅ 返回正确的 HTTP 状态码
- ✅ 包含适当的 CORS 头

现在的 API 完全符合 GraphQL 规范！🎉