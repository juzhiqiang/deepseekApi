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

// 简化但规范的 GraphQL 执行器
class GraphQLExecutor {
  static parseQuery(query) {
    // 简单的查询解析器，支持基本的 GraphQL 语法
    const trimmed = query.trim();
    
    // 移除注释
    const withoutComments = trimmed.replace(/#[^\r\n]*/g, '');
    
    // 检测操作类型
    let operationType = 'query';
    let operationContent = withoutComments;
    
    if (withoutComments.match(/^\s*mutation/i)) {
      operationType = 'mutation';
      operationContent = withoutComments.replace(/^\s*mutation[^{]*{/, '{');
    } else if (withoutComments.match(/^\s*query/i)) {
      operationType = 'query';
      operationContent = withoutComments.replace(/^\s*query[^{]*{/, '{');
    }
    
    // 提取主体内容
    const bodyMatch = operationContent.match(/{([\s\S]+)}$/);
    if (!bodyMatch) {
      throw new Error('Invalid GraphQL syntax: missing operation body');
    }
    
    const body = bodyMatch[1];
    const fields = this.parseFields(body);
    
    return {
      operationType,
      fields
    };
  }
  
  static parseFields(content) {
    const fields = [];
    const lines = content.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
    
    let currentField = null;
    let braceLevel = 0;
    let fieldContent = '';
    
    for (const line of lines) {
      // 计算大括号层级
      const openBraces = (line.match(/{/g) || []).length;
      const closeBraces = (line.match(/}/g) || []).length;
      
      if (braceLevel === 0) {
        // 顶级字段
        const fieldMatch = line.match(/^(\w+)(\s*\([^)]*\))?\s*({.*)?$/);
        if (fieldMatch) {
          if (currentField) {
            fields.push(currentField);
          }
          
          currentField = {
            name: fieldMatch[1],
            arguments: this.parseArguments(fieldMatch[2] || ''),
            selectionSet: []
          };
          
          fieldContent = fieldMatch[3] || '';
          braceLevel += openBraces;
          braceLevel -= closeBraces;
          
          if (braceLevel === 0 && !fieldMatch[3]) {
            // 简单字段，没有子选择
            fields.push(currentField);
            currentField = null;
          }
        }
      } else {
        // 在字段内部
        fieldContent += ' ' + line;
        braceLevel += openBraces;
        braceLevel -= closeBraces;
        
        if (braceLevel === 0) {
          // 字段结束
          currentField.selectionSet = this.parseSelectionSet(fieldContent);
          fields.push(currentField);
          currentField = null;
          fieldContent = '';
        }
      }
    }
    
    if (currentField) {
      fields.push(currentField);
    }
    
    return fields;
  }
  
  static parseArguments(argsString) {
    if (!argsString || !argsString.trim()) return {};
    
    // 移除括号
    const content = argsString.replace(/^\s*\(\s*/, '').replace(/\s*\)\s*$/, '');
    if (!content) return {};
    
    const args = {};
    
    // 简单解析参数（支持基本类型）
    const argPattern = /(\w+)\s*:\s*([^,}]+)/g;
    let match;
    
    while ((match = argPattern.exec(content)) !== null) {
      const key = match[1];
      let value = match[2].trim();
      
      // 解析值
      if (value.startsWith('$')) {
        // 变量引用，暂时跳过
        continue;
      } else if (value.startsWith('"') && value.endsWith('"')) {
        // 字符串
        args[key] = value.slice(1, -1);
      } else if (value === 'true' || value === 'false') {
        // 布尔值
        args[key] = value === 'true';
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
        // 其他类型，作为字符串处理
        args[key] = value;
      }
    }
    
    return args;
  }
  
  static parseInputObject(objString) {
    const obj = {};
    const content = objString.replace(/^\s*{\s*/, '').replace(/\s*}\s*$/, '');
    
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
  
  static parseInputArray(arrString) {
    const content = arrString.replace(/^\s*\[\s*/, '').replace(/\s*\]\s*$/, '');
    if (!content) return [];
    
    const items = [];
    const itemPattern = /{([^}]+)}/g;
    let match;
    
    while ((match = itemPattern.exec(content)) !== null) {
      items.push(this.parseInputObject(`{${match[1]}}`));
    }
    
    return items;
  }
  
  static parseSelectionSet(content) {
    const selections = [];
    const fields = content.match(/\w+/g) || [];
    return fields;
  }
  
  static async execute(query, variables = {}, context) {
    try {
      const parsed = this.parseQuery(query);
      const result = { data: {} };
      
      for (const field of parsed.fields) {
        if (parsed.operationType === 'query') {
          if (resolvers.Query[field.name]) {
            // 处理变量替换
            const args = this.resolveVariables(field.arguments, variables);
            result.data[field.name] = await resolvers.Query[field.name](null, args, context);
          } else {
            throw new Error(`Unknown query field: ${field.name}`);
          }
        } else if (parsed.operationType === 'mutation') {
          if (resolvers.Mutation[field.name]) {
            // 处理变量替换
            const args = this.resolveVariables(field.arguments, variables);
            result.data[field.name] = await resolvers.Mutation[field.name](null, args, context);
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
          locations: [],
          path: [],
          extensions: {
            code: 'INTERNAL_ERROR'
          }
        }]
      };
    }
  }
  
  static resolveVariables(args, variables) {
    // 简单的变量解析
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