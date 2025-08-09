# DeepSeek GraphQL API Worker

🚀 专为前端调用设计的 DeepSeek GraphQL API 代理服务，部署在 Cloudflare Workers 上。

## ✨ 特性

- ✅ **GraphQL 接口** - 统一端点，灵活查询
- ✅ **CORS 支持** - 前端可直接跨域调用  
- ✅ **类型安全** - 完整的 GraphQL Schema
- ✅ **零配置** - 一键部署即可使用
- ✅ **高性能** - Cloudflare 边缘计算

## 🚀 快速开始

### 1. 部署 API
```bash
# 克隆项目
git clone https://github.com/juzhiqiang/deepseekApi.git
cd deepseekApi

# 安装依赖
npm install

# 部署 (API 密钥已配置)
wrangler deploy
```

### 2. 测试 API
访问: https://deepseek.jzq1020814597.workers.dev

## 📡 GraphQL Schema

### Queries (查询)
```graphql
type Query {
  hello: String!           # 健康检查
  models: [Model!]!        # 获取可用模型
}
```

### Mutations (变更)
```graphql
type Mutation {
  chat(input: ChatInput!): ChatResponse!           # 聊天对话
  completion(input: CompletionInput!): CompletionResponse!  # 文本补全
}
```

### 完整类型定义
```graphql
type Model {
  id: String!
  object: String!
  created: Int!
  owned_by: String!
}

type ChatResponse {
  id: String!
  object: String!
  created: Int!
  model: String!
  choices: [ChatChoice!]!
  usage: Usage!
}

type ChatChoice {
  index: Int!
  message: Message!
  finish_reason: String
}

type Message {
  role: String!
  content: String!
}

input ChatInput {
  model: String! = "deepseek-chat"
  messages: [MessageInput!]!
  max_tokens: Int = 1000
  temperature: Float = 0.7
  top_p: Float = 1.0
}

input MessageInput {
  role: String!
  content: String!
}
```

## 🌐 前端使用示例

### 1. 基础 JavaScript
```javascript
// GraphQL 查询函数
async function graphqlQuery(query, variables = {}) {
  const response = await fetch('https://deepseek.jzq1020814597.workers.dev', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query, variables })
  });
  
  return await response.json();
}

// 获取模型列表
const models = await graphqlQuery(`
  query {
    models {
      id
      object
      owned_by
    }
  }
`);
console.log(models.data.models);

// 聊天对话
const chatResult = await graphqlQuery(`
  mutation($input: ChatInput!) {
    chat(input: $input) {
      choices {
        message {
          content
        }
      }
      usage {
        total_tokens
      }
    }
  }
`, {
  input: {
    messages: [
      { role: 'user', content: '你好，请介绍一下自己' }
    ],
    max_tokens: 200
  }
});
console.log(chatResult.data.chat.choices[0].message.content);
```

### 2. React + Apollo Client
```jsx
import { ApolloClient, InMemoryCache, gql, useQuery, useMutation } from '@apollo/client';

const client = new ApolloClient({
  uri: 'https://deepseek.jzq1020814597.workers.dev',
  cache: new InMemoryCache()
});

// 查询组件
function ModelsList() {
  const { loading, error, data } = useQuery(gql`
    query GetModels {
      models {
        id
        object
        owned_by
      }
    }
  `);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <ul>
      {data.models.map(model => (
        <li key={model.id}>{model.id} - {model.owned_by}</li>
      ))}
    </ul>
  );
}

// 聊天组件
function ChatComponent() {
  const [sendMessage] = useMutation(gql`
    mutation SendChat($input: ChatInput!) {
      chat(input: $input) {
        choices {
          message {
            content
          }
        }
      }
    }
  `);

  const handleSend = async (message) => {
    const result = await sendMessage({
      variables: {
        input: {
          messages: [{ role: 'user', content: message }],
          max_tokens: 200
        }
      }
    });
    
    console.log(result.data.chat.choices[0].message.content);
  };

  return (
    <button onClick={() => handleSend('Hello!')}>
      Send Message
    </button>
  );
}
```

### 3. Vue.js 示例
```vue
<template>
  <div>
    <div>
      <input v-model="message" placeholder="输入消息..." />
      <button @click="sendMessage" :disabled="loading">
        {{ loading ? '发送中...' : '发送' }}
      </button>
    </div>
    <div v-if="response">
      <h3>回复:</h3>
      <p>{{ response }}</p>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      message: '',
      response: '',
      loading: false
    }
  },
  methods: {
    async sendMessage() {
      if (!this.message.trim()) return;
      
      this.loading = true;
      try {
        const result = await this.graphqlQuery(`
          mutation($input: ChatInput!) {
            chat(input: $input) {
              choices {
                message {
                  content
                }
              }
            }
          }
        `, {
          input: {
            messages: [{ role: 'user', content: this.message }],
            max_tokens: 200
          }
        });
        
        this.response = result.data.chat.choices[0].message.content;
        this.message = '';
      } catch (error) {
        console.error('Error:', error);
      } finally {
        this.loading = false;
      }
    },
    
    async graphqlQuery(query, variables = {}) {
      const response = await fetch('https://deepseek.jzq1020814597.workers.dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables })
      });
      return await response.json();
    }
  }
}
</script>
```

### 4. 文本补全示例
```javascript
// 代码补全
const completion = await graphqlQuery(`
  mutation($input: CompletionInput!) {
    completion(input: $input) {
      choices {
        text
      }
      usage {
        total_tokens
      }
    }
  }
`, {
  input: {
    model: 'deepseek-coder',
    prompt: 'def fibonacci(n):',
    max_tokens: 150
  }
});

console.log(completion.data.completion.choices[0].text);
```

## 🧪 测试页面

打开 `examples/graphql-test.html` 进行完整的 GraphQL API 测试，包含：
- 模型查询
- 聊天对话
- 文本补全
- 自定义 GraphQL 查询

## 📊 可用模型

- `deepseek-chat` - 通用对话模型
- `deepseek-coder` - 代码生成和编程
- `deepseek-math` - 数学推理和计算

## 🔧 GraphQL 查询示例

### 获取所有模型
```graphql
query {
  models {
    id
    object
    owned_by
    created
  }
}
```

### 聊天对话
```graphql
mutation {
  chat(input: {
    model: "deepseek-chat"
    messages: [
      { role: "user", content: "解释什么是GraphQL" }
    ]
    max_tokens: 300
    temperature: 0.7
  }) {
    id
    choices {
      message {
        role
        content
      }
      finish_reason
    }
    usage {
      prompt_tokens
      completion_tokens
      total_tokens
    }
  }
}
```

### 代码补全
```graphql
mutation {
  completion(input: {
    model: "deepseek-coder"
    prompt: "// 创建一个React组件\nfunction Button("
    max_tokens: 200
  }) {
    choices {
      text
      finish_reason
    }
    usage {
      total_tokens
    }
  }
}
```

## 🔒 安全说明

- API 密钥安全存储在 Cloudflare Workers 环境变量中
- 支持 CORS，允许前端跨域访问
- 所有请求通过 HTTPS 加密传输
- GraphQL 查询参数验证和错误处理

## 📈 性能优势

- **边缘计算**: Cloudflare 全球 CDN 网络
- **低延迟**: 就近访问最快节点
- **高可用**: 99.9% 可用性保证
- **免费额度**: 每天 100,000 次请求

## 🛠️ 开发工具

推荐使用以下工具进行 GraphQL 开发：

- **GraphQL Playground**: 在线查询测试
- **Apollo Client DevTools**: React/Vue 调试
- **GraphiQL**: 桌面端 GraphQL IDE
- **Insomnia**: REST/GraphQL 客户端

## 🤝 问题反馈

如遇到问题，请：
1. 查看 [GitHub Issues](https://github.com/juzhiqiang/deepseekApi/issues)
2. 检查 GraphQL 查询语法
3. 验证 API 密钥配置
4. 查看 Cloudflare Workers 日志

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

**🎯 现在你有了一个完整的 GraphQL API！**

- **端点**: https://deepseek.jzq1020814597.workers.dev  
- **测试页面**: `examples/graphql-test.html`
- **GitHub**: https://github.com/juzhiqiang/deepseekApi