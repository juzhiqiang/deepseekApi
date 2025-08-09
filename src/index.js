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
        console.log('Chat resolver received input:', JSON.stringify(input));
        
        // 参数验证
        if (!input || !input.messages || !Array.isArray(input.messages) || input.messages.length === 0) {
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

        console.log('Sending request to DeepSeek:', JSON.stringify(requestBody));

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
        console.log('DeepSeek response:', JSON.stringify(data));
        return data;
      } catch (error) {
        console.error('Chat error:', error);
        throw new Error(`聊天请求失败: ${error.message}`);
      }
    },
    
    completion: async (_, { input }, { env }) => {
      try {
        // 参数验证
        if (!input || !input.prompt || typeof input.prompt !== 'string') {
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

// 完全重写的 GraphQL 执行器 - 正确处理嵌套字段
class GraphQLExecutor {
  static parseQuery(query) {
    const trimmed = query.trim();
    
    // 移除注释
    const withoutComments = trimmed.replace(/#[^\r\n]*/g, '');
    
    // 检测操作类型
    let operationType = 'query';
    let operationName = null;
    
    // 匹配操作定义
    const operationMatch = withoutComments.match(/^\s*(query|mutation)\s*(\w+)?\s*(\([^)]*\))?\s*{/i);
    if (operationMatch) {
      operationType = operationMatch[1].toLowerCase();
      operationName = operationMatch[2];
    } else if (withoutComments.match(/^\s*{/)) {
      // 匿名查询
      operationType = 'query';
    }
    
    // 提取操作体
    const bodyStart = withoutComments.indexOf('{');
    const bodyEnd = withoutComments.lastIndexOf('}');
    
    if (bodyStart === -1 || bodyEnd === -1) {
      throw new Error('Invalid GraphQL syntax: missing operation body');
    }
    
    const body = withoutComments.substring(bodyStart + 1, bodyEnd);
    const fields = this.parseTopLevelFields(body);
    
    return {
      operationType,
      operationName,
      fields
    };
  }
  
  static parseTopLevelFields(content) {
    const fields = [];
    let i = 0;
    const length = content.length;
    
    while (i < length) {
      // 跳过空白字符
      while (i < length && /\s/.test(content[i])) {
        i++;
      }
      
      if (i >= length) break;
      
      // 读取字段名
      const fieldStart = i;
      while (i < length && /[a-zA-Z0-9_]/.test(content[i])) {
        i++;
      }
      
      const fieldName = content.substring(fieldStart, i);
      if (!fieldName) break;
      
      // 跳过空白
      while (i < length && /\s/.test(content[i])) {
        i++;
      }
      
      // 检查是否有参数
      let args = {};
      if (i < length && content[i] === '(') {
        const argsStart = i + 1;
        let parenCount = 1;
        i++;
        
        while (i < length && parenCount > 0) {
          if (content[i] === '(') parenCount++;
          else if (content[i] === ')') parenCount--;
          i++;
        }
        
        const argsString = content.substring(argsStart, i - 1);
        args = this.parseArguments(argsString);
      }
      
      // 跳过到字段体或下一个字段
      while (i < length && /\s/.test(content[i])) {
        i++;
      }
      
      // 如果有选择集（{...}），跳过它
      if (i < length && content[i] === '{') {
        let braceCount = 1;
        i++;
        
        while (i < length && braceCount > 0) {
          if (content[i] === '{') braceCount++;
          else if (content[i] === '}') braceCount--;
          i++;
        }
      }
      
      fields.push({
        name: fieldName,
        arguments: args
      });
    }
    
    return fields;
  }
  
  static parseArguments(argsString) {
    if (!argsString || !argsString.trim()) return {};
    
    const args = {};
    const argPattern = /(\w+)\s*:\s*(\$\w+|"[^"]*"|'[^']*'|true|false|null|\d+\.?\d*|\{[^}]*\}|\[[^\]]*\])/g;
    let match;
    
    while ((match = argPattern.exec(argsString)) !== null) {
      const key = match[1];
      let value = match[2].trim();
      
      if (value.startsWith('$')) {
        // 变量引用
        args[key] = value;
      } else if (value.startsWith('"') && value.endsWith('"')) {
        // 字符串
        args[key] = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        // 字符串
        args[key] = value.slice(1, -1);
      } else if (value === 'true' || value === 'false') {
        // 布尔值
        args[key] = value === 'true';
      } else if (value === 'null') {
        // null 值
        args[key] = null;
      } else if (!isNaN(value) && !isNaN(parseFloat(value))) {
        // 数字
        args[key] = parseFloat(value);
      } else if (value.startsWith('{')) {
        // 对象（输入类型）
        args[key] = this.parseInputObject(value);
      } else if (value.startsWith('[')) {
        // 数组
        args[key] = this.parseInputArray(value);
      } else {
        // 其他类型，保持原样
        args[key] = value;
      }
    }
    
    return args;
  }
  
  static parseInputObject(objString) {
    // 简化的对象解析
    try {
      // 将 GraphQL 输入语法转换为 JSON
      const jsonLike = objString
        .replace(/(\w+):/g, '"$1":')
        .replace(/'/g, '"');
      return JSON.parse(jsonLike);
    } catch (e) {
      // 回退到手动解析
      const obj = {};
      const content = objString.slice(1, -1); // 移除 {}
      const fieldPattern = /(\w+)\s*:\s*([^,}]+)/g;
      let match;
      
      while ((match = fieldPattern.exec(content)) !== null) {
        const key = match[1];
        let value = match[2].trim();
        
        if (value.startsWith('"') && value.endsWith('"')) {
          obj[key] = value.slice(1, -1);
        } else if (value === 'true' || value === 'false') {
          obj[key] = value === 'true';
        } else if (!isNaN(value)) {
          obj[key] = parseFloat(value);
        } else if (value.startsWith('[')) {
          obj[key] = this.parseInputArray(value);
        } else if (value.startsWith('{')) {
          obj[key] = this.parseInputObject(value);
        } else {
          obj[key] = value;
        }
      }
      
      return obj;
    }
  }
  
  static parseInputArray(arrString) {
    try {
      // 将 GraphQL 数组语法转换为 JSON
      const jsonLike = arrString
        .replace(/(\w+):/g, '"$1":')
        .replace(/'/g, '"');
      return JSON.parse(jsonLike);
    } catch (e) {
      // 回退到简单解析
      return [];
    }
  }
  
  static async execute(query, variables = {}, context) {
    try {
      console.log('Executing GraphQL query:', query);
      console.log('With variables:', JSON.stringify(variables));
      
      const parsed = this.parseQuery(query);
      console.log('Parsed operation:', JSON.stringify(parsed));
      
      const result = { data: {} };
      
      for (const field of parsed.fields) {
        console.log(`Processing top-level field: ${field.name}`);
        
        if (parsed.operationType === 'query') {
          if (resolvers.Query[field.name]) {
            const resolvedArgs = this.resolveArguments(field.arguments, variables);
            console.log(`Resolved args for ${field.name}:`, JSON.stringify(resolvedArgs));
            result.data[field.name] = await resolvers.Query[field.name](null, resolvedArgs, context);
          } else {
            throw new Error(`Unknown query field: ${field.name}`);
          }
        } else if (parsed.operationType === 'mutation') {
          if (resolvers.Mutation[field.name]) {
            const resolvedArgs = this.resolveArguments(field.arguments, variables);
            console.log(`Resolved args for ${field.name}:`, JSON.stringify(resolvedArgs));
            result.data[field.name] = await resolvers.Mutation[field.name](null, resolvedArgs, context);
          } else {
            throw new Error(`Unknown mutation field: ${field.name}`);
          }
        }
      }
      
      return result;
    } catch (error) {
      console.error('GraphQL execution error:', error);
      return {
        errors: [{
          message: error.message,
          locations: [],
          path: [],
          extensions: {
            code: 'INTERNAL_ERROR'
          }
        }]
      };
    }
  }
  
  static resolveArguments(args, variables) {
    const resolved = {};
    
    for (const [key, value] of Object.entries(args)) {
      if (typeof value === 'string' && value.startsWith('$')) {
        const varName = value.substring(1);
        if (variables.hasOwnProperty(varName)) {
          resolved[key] = variables[varName];
        } else {
          throw new Error(`Variable "$${varName}" not provided`);
        }
      } else {
        resolved[key] = value;
      }
    }
    
    return resolved;
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
            errors: [{ 
              message: 'API Key not configured',
              extensions: { code: 'CONFIGURATION_ERROR' }
            }]
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
        const { query, variables = {}, operationName } = body;

        if (!query) {
          return new Response(
            JSON.stringify({
              errors: [{ 
                message: 'No query provided in request body',
                extensions: { code: 'BAD_REQUEST' }
              }]
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
            }
          );
        }

        // 执行 GraphQL 查询
        const result = await GraphQLExecutor.execute(query, variables, { env });

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // GraphQL Schema 信息 (GET 请求)
      if ((url.pathname === '/' || url.pathname === '/graphql') && request.method === 'GET') {
        return new Response(
          JSON.stringify({
            data: {
              message: 'DeepSeek GraphQL API',
              version: '1.0.0',
              endpoint: url.origin + '/',
              schema: typeDefs,
              examples: {
                getModels: {
                  query: 'query { models { id object owned_by } }',
                  description: '获取可用模型列表'
                },
                chat: {
                  query: 'mutation($input: ChatInput!) { chat(input: $input) { choices { message { content } } usage { total_tokens } } }',
                  variables: {
                    input: {
                      messages: [{ role: 'user', content: 'Hello!' }],
                      max_tokens: 200
                    }
                  },
                  description: '发送聊天消息'
                },
                completion: {
                  query: 'mutation($input: CompletionInput!) { completion(input: $input) { choices { text } } }',
                  variables: {
                    input: {
                      prompt: 'def fibonacci(n):',
                      max_tokens: 150
                    }
                  },
                  description: '代码补全'
                }
              }
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
          errors: [{ 
            message: 'GraphQL endpoint not found. Use POST / or POST /graphql for queries',
            extensions: { code: 'NOT_FOUND' }
          }]
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );

    } catch (error) {
      return new Response(
        JSON.stringify({
          errors: [{ 
            message: `Internal server error: ${error.message}`,
            extensions: { code: 'INTERNAL_ERROR' }
          }]
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }
  },
};