# DeepSeek API Worker

一个简单的 Cloudflare Workers 代理服务，为前端提供 DeepSeek API 接口。

## 🚀 功能特性

- ✅ 简单的 REST API 接口
- ✅ 支持 CORS 跨域请求
- ✅ DeepSeek API 代理
- ✅ 前端友好的错误处理
- ✅ 零配置部署

## 📡 API 接口

### 1. 获取模型列表
```
GET /api/models
```

### 2. 聊天对话
```
POST /api/chat
Content-Type: application/json

{
  "model": "deepseek-chat",
  "messages": [
    { "role": "user", "content": "你好" }
  ],
  "max_tokens": 200,
  "temperature": 0.7
}
```

### 3. 文本补全
```
POST /api/completions
Content-Type: application/json

{
  "model": "deepseek-coder",
  "prompt": "写一个Python函数",
  "max_tokens": 200,
  "temperature": 0.7
}
```

## 🛠️ 部署步骤

### 1. 克隆项目
```bash
git clone https://github.com/juzhiqiang/deepseekApi.git
cd deepseekApi
```

### 2. 安装依赖
```bash
npm install
```

### 3. 配置 API 密钥
```bash
# 设置 DeepSeek API 密钥
wrangler secret put DEEPSEEK_API_KEY
# 输入你的 API 密钥
```

### 4. 本地测试
```bash
npm run dev
```
访问 http://localhost:8787 测试接口

### 5. 部署到 Cloudflare
```bash
npm run deploy
```

## 🌐 前端使用示例

### JavaScript Fetch
```javascript
// 聊天示例
const response = await fetch('https://your-worker.workers.dev/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'deepseek-chat',
    messages: [
      { role: 'user', content: '你好' }
    ],
    max_tokens: 200
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);
```

### Axios
```javascript
import axios from 'axios';

const response = await axios.post('https://your-worker.workers.dev/api/chat', {
  model: 'deepseek-chat',
  messages: [
    { role: 'user', content: '你好' }
  ],
  max_tokens: 200
});

console.log(response.data.choices[0].message.content);
```

### jQuery
```javascript
$.ajax({
  url: 'https://your-worker.workers.dev/api/chat',
  method: 'POST',
  contentType: 'application/json',
  data: JSON.stringify({
    model: 'deepseek-chat',
    messages: [
      { role: 'user', content: '你好' }
    ],
    max_tokens: 200
  }),
  success: function(data) {
    console.log(data.choices[0].message.content);
  }
});
```

## 📝 测试页面

打开 `examples/test.html` 可以直接测试所有接口功能。

## ⚙️ 配置说明

### wrangler.toml
```toml
name = "deepseek-api"
main = "src/index.js"
compatibility_date = "2024-01-01"

# 环境变量在 Cloudflare 控制台设置
# DEEPSEEK_API_KEY = "your-api-key"
```

### 环境变量
- `DEEPSEEK_API_KEY`: DeepSeek API 密钥（必需）

## 🔒 安全注意事项

1. **API 密钥安全**: 
   - 永远不要在前端代码中暴露 API 密钥
   - 使用 Cloudflare Workers 的环境变量存储

2. **访问控制**: 
   - 可以在 Worker 中添加域名白名单
   - 考虑添加速率限制

3. **HTTPS**: 
   - Cloudflare Workers 自动提供 HTTPS

## 📊 监控和日志

在 Cloudflare 控制台中可以查看：
- 请求数量和延迟
- 错误率统计
- 实时日志

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🔗 相关链接

- [DeepSeek API 文档](https://platform.deepseek.com/docs)
- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [项目地址](https://github.com/juzhiqiang/deepseekApi)