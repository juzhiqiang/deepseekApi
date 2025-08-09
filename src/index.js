// DeepSeek GraphQL API for Cloudflare Workers
// 专为前端调用设计的 GraphQL 接口

// CORS 配置
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// DeepSeek API 基础 URL
const DEEPSEEK_API_BASE = 'https://api.deepseek.com/v1';

// GraphQL Schema 定义
const typeDefs = `
  type Query {
    models: [Model!]!
    hello: String!
  }
  
  type Mutation {
    chat(input: ChatInput!): ChatResponse!
    completion(input: CompletionInput!): CompletionResponse!
  }
  
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
  
  type CompletionResponse {
    id: String!
    object: String!
    created: Int!
    model: String!
    choices: [CompletionChoice!]!
    usage: Usage!
  }
  
  type CompletionChoice {
    text: String!
    index: Int!
    finish_reason: String
  }
  
  type Usage {
    prompt_tokens: Int!
    completion_tokens: Int!
    total_tokens: Int!
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
  
  input CompletionInput {
    model: String! = "deepseek-coder"
    prompt: String!
    max_tokens: Int = 1000
    temperature: Float = 0.7
    top_p: Float = 1.0
  }
`;

// GraphQL 解析器
const resolvers = {
  Query: {
    hello: () => 'DeepSeek GraphQL API is running!',
    
    models: async (_, __, { env }) => {
      try {
        const response = await fetch(`${DEEPSEEK_API_BASE}/models`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        const data = await response.json();
        return data.data || [];
      } catch (error) {
        throw new Error(`获取模型列表失败: ${error.message}`);
      }
    }
  },
  
  Mutation: {
    chat: async (_, { input }, { env }) => {
      try {
        // 参数验证
        if (!input.messages || !Array.isArray(input.messages) || input.messages.length === 0) {
          throw new Error('messages 参数是必需的，且必须是非空数组');
        }

        const requestBody = {
          model: input.model || 'deepseek-chat',
          messages: input.messages,
          max_tokens: input.max_tokens || 1000,
          temperature: input.temperature || 0.7,
          top_p: input.top_p || 1.0,
          stream: false
        };

        const response = await fetch(`${DEEPSEEK_API_BASE}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`DeepSeek API 错误 ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        throw new Error(`聊天请求失败: ${error.message}`);
      }
    },
    
    completion: async (_, { input }, { env }) => {
      try {
        // 参数验证
        if (!input.prompt || typeof input.prompt !== 'string') {
          throw new Error('prompt 参数是必需的，且必须是字符串');
        }

        const requestBody = {
          model: input.model || 'deepseek-coder',
          prompt: input.prompt,
          max_tokens: input.max_tokens || 1000,
          temperature: input.temperature || 0.7,
          top_p: input.top_p || 1.0,
          stream: false
        };

        const response = await fetch(`${DEEPSEEK_API_BASE}/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`DeepSeek API 错误 ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        throw new Error(`补全请求失败: ${error.message}`);
      }
    }
  }
};

// 简化的 GraphQL 解析器
class SimpleGraphQL {
  static parse(query) {
    const trimmed = query.trim();
    
    // 检测操作类型
    const isQuery = trimmed.startsWith('query') || (!trimmed.startsWith('mutation') && !trimmed.startsWith('subscription'));
    const isMutation = trimmed.startsWith('mutation');
    
    // 提取字段
    const fieldMatch = trimmed.match(/\{([^}]+)\}/);
    if (!fieldMatch) {
      throw new Error('Invalid GraphQL syntax');
    }
    
    const fieldsContent = fieldMatch[1];
    const fields = this.parseFields(fieldsContent);
    
    return {
      operationType: isQuery ? 'query' : 'mutation',
      fields
    };
  }
  
  static parseFields(content) {
    const fields = [];
    
    // 匹配字段和参数
    const fieldPattern = /(\\w+)(?:\\s*\\(([^)]+)\\))?(?:\\s*\\{([^}]+)\\})?/g;
    let match;
    
    while ((match = fieldPattern.exec(content)) !== null) {
      const fieldName = match[1];
      const argsString = match[2];
      const subFields = match[3];
      
      const field = {
        name: fieldName,
        arguments: this.parseArguments(argsString || ''),
        selectionSet: subFields ? subFields.split(/\\s+/).filter(s => s) : []
      };
      
      fields.push(field);
    }
    
    return fields;
  }
  
  static parseArguments(argsString) {
    if (!argsString.trim()) return {};
    
    const args = {};
    
    // 处理嵌套对象参数
    const argPattern = /(\\w+):\\s*([^,}]+)/g;
    let match;
    
    while ((match = argPattern.exec(argsString)) !== null) {
      const key = match[1];
      let value = match[2].trim();
      
      // 解析值类型
      if (value.startsWith('{') && value.endsWith('}')) {
        // 对象类型
        value = this.parseObjectValue(value);
      } else if (value.startsWith('[') && value.endsWith(']')) {
        // 数组类型
        value = this.parseArrayValue(value);
      } else if (value.startsWith('"') && value.endsWith('"')) {
        // 字符串
        value = value.slice(1, -1);
      } else if (value === 'true' || value === 'false') {
        // 布尔值
        value = value === 'true';
      } else if (!isNaN(value)) {
        // 数字
        value = parseFloat(value);
      }
      
      args[key] = value;
    }
    
    return args;
  }
  
  static parseObjectValue(objString) {
    const obj = {};
    const content = objString.slice(1, -1); // 移除 {}
    
    const fieldPattern = /(\\w+):\\s*([^,}]+)/g;
    let match;
    
    while ((match = fieldPattern.exec(content)) !== null) {
      const key = match[1];
      let value = match[2].trim();
      
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value === 'true' || value === 'false') {
        value = value === 'true';
      } else if (!isNaN(value)) {
        value = parseFloat(value);
      }
      
      obj[key] = value;
    }
    
    return obj;
  }
  
  static parseArrayValue(arrString) {
    const content = arrString.slice(1, -1); // 移除 []
    if (!content.trim()) return [];
    
    // 简单处理，假设数组元素是对象
    if (content.includes('{')) {
      const objects = [];
      const objPattern = /\\{([^}]+)\\}/g;
      let match;
      
      while ((match = objPattern.exec(content)) !== null) {
        objects.push(this.parseObjectValue(`{${match[1]}}`));
      }
      
      return objects;
    }
    
    // 简单值数组
    return content.split(',').map(item => {
      item = item.trim();
      if (item.startsWith('"') && item.endsWith('"')) {
        return item.slice(1, -1);
      }
      return item;
    });
  }
  
  static async execute(query, variables, context) {
    try {
      const parsed = this.parse(query);
      const result = { data: {} };
      
      for (const field of parsed.fields) {
        if (parsed.operationType === 'query') {
          if (resolvers.Query[field.name]) {
            result.data[field.name] = await resolvers.Query[field.name](null, field.arguments, context);
          } else {
            throw new Error(`Unknown query field: ${field.name}`);
          }
        } else if (parsed.operationType === 'mutation') {
          if (resolvers.Mutation[field.name]) {
            result.data[field.name] = await resolvers.Mutation[field.name](null, field.arguments, context);
          } else {
            throw new Error(`Unknown mutation field: ${field.name}`);
          }
        }
      }
      
      return result;
    } catch (error) {
      return {
        errors: [{
          message: error.message,
          extensions: {
            code: 'INTERNAL_ERROR'
          }
        }]
      };
    }
  }
}

export default {
  async fetch(request, env, ctx) {
    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    try {
      const url = new URL(request.url);
      
      // 检查 API Key
      if (!env.DEEPSEEK_API_KEY) {
        return new Response(
          JSON.stringify({
            errors: [{ message: 'API Key not configured' }]
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      // GraphQL 端点
      if ((url.pathname === '/' || url.pathname === '/graphql') && request.method === 'POST') {
        const body = await request.json();
        const { query, variables = {} } = body;

        if (!query) {
          return new Response(
            JSON.stringify({
              errors: [{ message: 'No query provided' }]
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
            }
          );
        }

        // 执行 GraphQL 查询
        const result = await SimpleGraphQL.execute(query, variables, { env });

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // GraphQL Playground (GET 请求返回 Schema 信息)
      if ((url.pathname === '/' || url.pathname === '/graphql') && request.method === 'GET') {
        return new Response(
          JSON.stringify({
            message: 'DeepSeek GraphQL API',
            endpoints: {
              graphql: 'POST /',
              playground: 'GET /'
            },
            schema: typeDefs,
            examples: {
              query: `query { models { id object owned_by } }`,
              mutation: `mutation { chat(input: { messages: [{ role: "user", content: "Hello" }] }) { choices { message { content } } } }`
            }
          }, null, 2),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      // 404 处理
      return new Response(
        JSON.stringify({
          errors: [{ message: 'GraphQL endpoint not found. Use POST / or POST /graphql' }]
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );

    } catch (error) {
      return new Response(
        JSON.stringify({
          errors: [{ message: `Internal server error: ${error.message}` }]
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }
  },
};