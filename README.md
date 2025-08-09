# DeepSeek API Worker

一个简单的 Cloudflare Workers 代理服务，为前端提供 DeepSeek API 接口。

## 🚀 一键部署

```bash
# 1. 克隆项目
git clone https://github.com/juzhiqiang/deepseekApi.git
cd deepseekApi

# 2. 安装依赖
npm install

# 3. 一键设置和部署
chmod +x setup.sh && ./setup.sh
```

就这么简单！脚本会自动：
- 安装 Wrangler CLI
- 登录 Cloudflare
- 设置 API 密钥
- 部署到 Workers

## 📡 API 接口

### 1. 获取模型列表
```bash
GET https://your-worker.workers.dev/api/models
```

### 2. 聊天对话
```bash
POST https://your-worker.workers.dev/api/chat
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
```bash
POST https://your-worker.workers.dev/api/completions
Content-Type: application/json

{
  "model": "deepseek-coder",
  "prompt": "写一个Python函数",
  "max_tokens": 200,
  "temperature": 0.7
}
```

## 🌐 前端使用示例

### 基础用法
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
      { role: 'user', content: '你好，请介绍一下自己' }
    ],
    max_tokens: 200
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);
```

### Vue.js 示例
```javascript
// 在 Vue 组件中使用
export default {
  data() {
    return {
      message: '',
      response: ''
    }
  },
  methods: {
    async sendMessage() {
      try {
        const res = await fetch('https://your-worker.workers.dev/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: this.message }],
            max_tokens: 200
          })
        });
        
        const data = await res.json();
        this.response = data.choices[0].message.content;
      } catch (error) {
        console.error('Error:', error);
      }
    }
  }
}
```

### React 示例
```javascript
import { useState } from 'react';

function ChatComponent() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');

  const sendMessage = async () => {
    try {
      const res = await fetch('https://your-worker.workers.dev/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: message }],
          max_tokens: 200
        })
      });
      
      const data = await res.json();
      setResponse(data.choices[0].message.content);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div>
      <input 
        value={message} 
        onChange={(e) => setMessage(e.target.value)} 
        placeholder="输入消息..." 
      />
      <button onClick={sendMessage}>发送</button>
      <div>{response}</div>
    </div>
  );
}
```

## 🧪 测试页面

打开 `examples/test.html` 可以直接测试所有接口功能。

![测试页面](https://your-worker.workers.dev)

## ⚙️ 手动配置（可选）

如果需要手动设置：

```bash
# 设置 API 密钥
wrangler secret put DEEPSEEK_API_KEY
# 输入: sk-76c8f552ea8640a49376fcf64b1d5fc8

# 部署
npm run deploy
```

## 📊 可用模型

- `deepseek-chat` - 通用对话模型
- `deepseek-coder` - 代码生成模型  
- `deepseek-math` - 数学推理模型

## 🔒 安全说明

- API 密钥安全存储在 Cloudflare Workers 环境变量中
- 支持 CORS，允许前端跨域访问
- 所有请求通过 HTTPS 加密

## 📈 费用说明

- Cloudflare Workers: 每天 100,000 次免费请求
- DeepSeek API: 根据使用量计费
- 部署完全免费

## 🤝 问题反馈

如有问题，请提交 [Issue](https://github.com/juzhiqiang/deepseekApi/issues)

## 📄 许可证

MIT License