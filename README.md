# DeepSeek GraphQL Streaming API

专为前端调用设计的 DeepSeek GraphQL 流式接口，基于 Cloudflare Workers 构建，支持标准 GraphQL 查询和流式 Server-Sent Events 响应。

## ✨ 特性

- **GraphQL 接口**：标准 GraphQL API，支持 Query 和 Mutation
- **流式支持**：支持 Server-Sent Events 流式响应
- **双端点设计**：
  - `/` 或 `/graphql`：标准 GraphQL 端点
  - `/stream`：流式 GraphQL 端点（仅支持 Subscription）
- **完整类型系统**：完整的 GraphQL Schema 定义
- **CORS 支持**：完整的跨域支持
- **错误处理**：详细的错误信息和状态码

## 🚀 快速开始

### 部署到 Cloudflare Workers

1. 克隆仓库：
```bash
git clone https://github.com/juzhiqiang/deepseekApi.git
cd deepseekApi
```

2. 安装依赖：
```bash
npm install
```

3. 配置 API Key：
```bash
npx wrangler secret put DEEPSEEK_API_KEY
```

4. 部署：
```bash
npm run deploy
```

## 📖 API 使用

### 端点

- **GraphQL 端点**：`POST /` 或 `POST /graphql`
- **流式端点**：`POST /stream`
- **Schema 查看**：`GET /`

### 标准 GraphQL 查询

```javascript
// 查询可用模型
const response = await fetch('https://your-worker.workers.dev/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: 'query { models { id object owned_by } }'
  })
});

// 聊天对话
const chatResponse = await fetch('https://your-worker.workers.dev/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: `
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
    `,
    variables: {
      input: {
        messages: [
          { role: 'user', content: 'Hello!' }
        ],
        max_tokens: 200
      }
    }
  })
});
```

### 流式响应（Server-Sent Events）

```javascript
// 流式聊天
const eventSource = new EventSource('https://your-worker.workers.dev/stream', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream'
  },
  body: JSON.stringify({
    query: `
      subscription($input: ChatInput!) {
        chatStream(input: $input) {
          choices {
            delta {
              content
            }
          }
        }
      }
    `,
    variables: {
      input: {
        messages: [
          { role: 'user', content: 'Hello!' }
        ],
        max_tokens: 200
      }
    }
  })
});

eventSource.onmessage = function(event) {
  const data = JSON.parse(event.data);
  if (data.data?.chatStream?.choices?.[0]?.delta?.content) {
    console.log('New content:', data.data.chatStream.choices[0].delta.content);
  }
};

eventSource.addEventListener('complete', function(event) {
  console.log('Stream completed');
  eventSource.close();
});

eventSource.addEventListener('error', function(event) {
  console.error('Stream error:', event.data);
  eventSource.close();
});
```

### 使用 fetch 实现流式响应

```javascript
async function streamChat(messages) {
  const response = await fetch('https://your-worker.workers.dev/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream'
    },
    body: JSON.stringify({
      query: `
        subscription($input: ChatInput!) {
          chatStream(input: $input) {
            choices {
              delta {
                content
              }
            }
          }
        }
      `,
      variables: {
        input: {
          messages: messages,
          max_tokens: 1000
        }
      }
    })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '{"type":"complete"}') {
            console.log('Stream completed');
            return;
          }

          try {
            const parsed = JSON.parse(data);
            if (parsed.data?.chatStream?.choices?.[0]?.delta?.content) {
              console.log('Content:', parsed.data.chatStream.choices[0].delta.content);
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// 使用示例
streamChat([
  { role: 'user', content: '请介绍一下 GraphQL' }
]);
```

## 📋 GraphQL Schema

### Query

```graphql
type Query {
  models: [Model!]!
  hello: String!
}
```

### Mutation

```graphql
type Mutation {
  chat(input: ChatInput!): ChatResponse!
  completion(input: CompletionInput!): CompletionResponse!
}
```

### Subscription

```graphql
type Subscription {
  chatStream(input: ChatInput!): ChatStreamChunk!
  completionStream(input: CompletionInput!): CompletionStreamChunk!
}
```

### 输入类型

```graphql
input ChatInput {
  model: String! = "deepseek-chat"
  messages: [MessageInput!]!
  max_tokens: Int = 1000
  temperature: Float = 0.7
  top_p: Float = 1.0
  stream: Boolean = false
}

input MessageInput {
  role: String!
  content: String!
}

input CompletionInput {
  model: String! = "deepseek-coder"
  prompt: String!
  max_tokens: Int = 1000
  temperature: Float = 0.7
  top_p: Float = 1.0
  stream: Boolean = false
}
```

### 响应类型

```graphql
type ChatResponse {
  id: String!
  object: String!
  created: Int!
  model: String!
  choices: [ChatChoice!]!
  usage: Usage!
}

type ChatStreamChunk {
  id: String!
  object: String!
  created: Int!
  model: String!
  choices: [ChatStreamChoice!]!
}

type ChatStreamChoice {
  index: Int!
  delta: Delta!
  finish_reason: String
}

type Delta {
  role: String
  content: String
}
```

## 🛠️ 开发

### 本地开发

```bash
npm run dev
```

### 查看日志

```bash
npm run logs
```

### 设置密钥

```bash
npm run secret:set
npm run secret:list
```

## 🔧 配置

### 环境变量

- `DEEPSEEK_API_KEY`：DeepSeek API 密钥（必需）

### wrangler.toml

```toml
name = "deepseek-graphql-api"
main = "src/index.js"
compatibility_date = "2023-10-30"

[env.production]
name = "deepseek-graphql-api-production"
```

## 📝 示例代码

### React Hook 示例

```javascript
import { useState, useCallback } from 'react';

export function useDeepSeekStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [content, setContent] = useState('');

  const streamChat = useCallback(async (messages) => {
    setIsStreaming(true);
    setContent('');

    try {
      const response = await fetch('https://your-worker.workers.dev/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          query: `
            subscription($input: ChatInput!) {
              chatStream(input: $input) {
                choices {
                  delta {
                    content
                  }
                }
              }
            }
          `,
          variables: {
            input: {
              messages: messages,
              max_tokens: 1000
            }
          }
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '{"type":"complete"}') {
              setIsStreaming(false);
              return;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.data?.chatStream?.choices?.[0]?.delta?.content) {
                setContent(prev => prev + parsed.data.chatStream.choices[0].delta.content);
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error) {
      console.error('Stream error:', error);
      setIsStreaming(false);
    }
  }, []);

  return { streamChat, isStreaming, content };
}
```

### Vue Composition API 示例

```javascript
import { ref } from 'vue';

export function useDeepSeekStream() {
  const isStreaming = ref(false);
  const content = ref('');

  const streamChat = async (messages) => {
    isStreaming.value = true;
    content.value = '';

    try {
      const response = await fetch('https://your-worker.workers.dev/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          query: `
            subscription($input: ChatInput!) {
              chatStream(input: $input) {
                choices {
                  delta {
                    content
                  }
                }
              }
            }
          `,
          variables: {
            input: {
              messages: messages,
              max_tokens: 1000
            }
          }
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '{"type":"complete"}') {
              isStreaming.value = false;
              return;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.data?.chatStream?.choices?.[0]?.delta?.content) {
                content.value += parsed.data.chatStream.choices[0].delta.content;
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error) {
      console.error('Stream error:', error);
      isStreaming.value = false;
    }
  };

  return { streamChat, isStreaming, content };
}
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🔗 相关链接

- [DeepSeek API 文档](https://platform.deepseek.com/api-docs/)
- [GraphQL 规范](https://graphql.org/)
- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Server-Sent Events 规范](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)