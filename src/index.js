// DeepSeek GraphQL Streaming API for Cloudflare Workers
// 支持流式响应的 GraphQL 接口

// CORS 配置
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
  'Access-Control-Max-Age': '86400',
};

// 流式响应的 CORS 配置
const streamCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
  'Access-Control-Max-Age': '86400',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
  'Content-Type': 'text/event-stream',
};

// DeepSeek API 基础 URL
const DEEPSEEK_API_BASE = 'https://api.deepseek.com/v1';

// GraphQL Schema 定义 - 添加流式支持
const typeDefs = `
  type Query {
    models: [Model!]!
    hello: String!
  }
  
  type Mutation {
    chat(input: ChatInput!): ChatResponse!
    completion(input: CompletionInput!): CompletionResponse!
  }
  
  type Subscription {
    chatStream(input: ChatInput!): ChatStreamChunk!
    completionStream(input: CompletionInput!): CompletionStreamChunk!
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
  
  # 流式响应类型
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
  
  type CompletionStreamChunk {
    id: String!
    object: String!
    created: Int!
    model: String!
    choices: [CompletionStreamChoice!]!
  }
  
  type CompletionStreamChoice {
    text: String!
    index: Int!
    finish_reason: String
  }
  
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
`;

// GraphQL 解析器
const resolvers = {
  Query: {
    hello: () => 'DeepSeek GraphQL Streaming API is running!',
    
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

// 流式响应处理器
class StreamingHandler {
  static async createChatStream(input, env) {
    const requestBody = {
      model: input.model || 'deepseek-chat',
      messages: input.messages,
      max_tokens: input.max_tokens || 1000,
      temperature: input.temperature || 0.7,
      top_p: input.top_p || 1.0,
      stream: true
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

    return response.body;
  }

  static async createCompletionStream(input, env) {
    const requestBody = {
      model: input.model || 'deepseek-coder',
      prompt: input.prompt,
      max_tokens: input.max_tokens || 1000,
      temperature: input.temperature || 0.7,
      top_p: input.top_p || 1.0,
      stream: true
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

    return response.body;
  }

  static createServerSentEventStream(sourceStream, operationType = 'chat') {
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    this.processStream(sourceStream, writer, operationType).catch(error => {
      console.error('Stream processing error:', error);
      writer.write(new TextEncoder().encode(`event: error\ndata: ${JSON.stringify({ 
        errors: [{ message: error.message }] 
      })}\n\n`));
      writer.close();
    });

    return readable;
  }

  static async processStream(sourceStream, writer, operationType) {
    const reader = sourceStream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          await writer.write(new TextEncoder().encode(`event: complete\ndata: {"type":"complete"}\n\n`));
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              await writer.write(new TextEncoder().encode(`event: complete\ndata: {"type":"complete"}\n\n`));
              continue;
            }

            try {
              const jsonData = JSON.parse(data);
              
              const graphqlResponse = {
                data: {
                  [operationType === 'chat' ? 'chatStream' : 'completionStream']: jsonData
                }
              };

              await writer.write(new TextEncoder().encode(
                `event: data\ndata: ${JSON.stringify(graphqlResponse)}\n\n`
              ));
            } catch (parseError) {
              console.error('JSON parse error:', parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Stream read error:', error);
      throw error;
    } finally {
      await writer.close();
    }
  }
}

// GraphQL 执行器类
class GraphQLExecutor {
  static parseQuery(query) {
    const trimmed = query.trim();
    const withoutComments = trimmed.replace(/#[^\r\n]*/g, '');
    
    let operationType = 'query';
    let operationName = null;
    
    const operationMatch = withoutComments.match(/^\s*(query|mutation|subscription)\s*(\w+)?\s*(\([^)]*\))?\s*{/i);
    if (operationMatch) {
      operationType = operationMatch[1].toLowerCase();
      operationName = operationMatch[2];
    } else if (withoutComments.match(/^\s*{/)) {
      operationType = 'query';
    }
    
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
      while (i < length && /\s/.test(content[i])) {
        i++;
      }
      
      if (i >= length) break;
      
      const fieldStart = i;
      while (i < length && /[a-zA-Z0-9_]/.test(content[i])) {
        i++;
      }
      
      const fieldName = content.substring(fieldStart, i);
      if (!fieldName) break;
      
      while (i < length && /\s/.test(content[i])) {
        i++;
      }
      
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
      
      while (i < length && /\s/.test(content[i])) {
        i++;
      }
      
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
        args[key] = value;
      } else if (value.startsWith('"') && value.endsWith('"')) {
        args[key] = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        args[key] = value.slice(1, -1);
      } else if (value === 'true' || value === 'false') {
        args[key] = value === 'true';
      } else if (value === 'null') {
        args[key] = null;
      } else if (!isNaN(value) && !isNaN(parseFloat(value))) {
        args[key] = parseFloat(value);
      } else if (value.startsWith('{')) {
        args[key] = this.parseInputObject(value);
      } else if (value.startsWith('[')) {
        args[key] = this.parseInputArray(value);
      } else {
        args[key] = value;
      }
    }
    
    return args;
  }
  
  static parseInputObject(objString) {
    try {
      const jsonLike = objString
        .replace(/(\w+):/g, '"$1":')
        .replace(/'/g, '"');
      return JSON.parse(jsonLike);
    } catch (e) {
      const obj = {};
      const content = objString.slice(1, -1);
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
      const jsonLike = arrString
        .replace(/(\w+):/g, '"$1":')
        .replace(/'/g, '"');
      return JSON.parse(jsonLike);
    } catch (e) {
      return [];
    }
  }
  
  static async execute(query, variables = {}, context) {
    try {
      const parsed = this.parseQuery(query);
      const result = { data: {} };
      
      for (const field of parsed.fields) {
        if (parsed.operationType === 'query') {
          if (resolvers.Query[field.name]) {
            const resolvedArgs = this.resolveArguments(field.arguments, variables);
            result.data[field.name] = await resolvers.Query[field.name](null, resolvedArgs, context);
          } else {
            throw new Error(`Unknown query field: ${field.name}`);
          }
        } else if (parsed.operationType === 'mutation') {
          if (resolvers.Mutation[field.name]) {
            const resolvedArgs = this.resolveArguments(field.arguments, variables);
            result.data[field.name] = await resolvers.Mutation[field.name](null, resolvedArgs, context);
          } else {
            throw new Error(`Unknown mutation field: ${field.name}`);
          }
        } else if (parsed.operationType === 'subscription') {
          throw new Error('Subscriptions should be handled via /stream endpoint');
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
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    try {
      const url = new URL(request.url);
      
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

      // GraphQL 流式端点
      if (url.pathname === '/stream' && request.method === 'POST') {
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

        try {
          const parsed = GraphQLExecutor.parseQuery(query);
          
          if (parsed.operationType !== 'subscription') {
            return new Response(
              JSON.stringify({
                errors: [{ 
                  message: 'Stream endpoint only supports subscription operations',
                  extensions: { code: 'BAD_REQUEST' }
                }]
              }),
              {
                status: 400,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
              }
            );
          }

          for (const field of parsed.fields) {
            const resolvedArgs = GraphQLExecutor.resolveArguments(field.arguments, variables);
            
            if (field.name === 'chatStream') {
              const sourceStream = await StreamingHandler.createChatStream(resolvedArgs.input, env);
              const eventStream = StreamingHandler.createServerSentEventStream(sourceStream, 'chat');
              
              return new Response(eventStream, {
                status: 200,
                headers: streamCorsHeaders,
              });
            } else if (field.name === 'completionStream') {
              const sourceStream = await StreamingHandler.createCompletionStream(resolvedArgs.input, env);
              const eventStream = StreamingHandler.createServerSentEventStream(sourceStream, 'completion');
              
              return new Response(eventStream, {
                status: 200,
                headers: streamCorsHeaders,
              });
            } else {
              throw new Error(`Unknown subscription field: ${field.name}`);
            }
          }
        } catch (error) {
          return new Response(
            `event: error\ndata: ${JSON.stringify({
              errors: [{ message: error.message }]
            })}\n\n`,
            {
              status: 200,
              headers: streamCorsHeaders,
            }
          );
        }
      }

      // 标准 GraphQL 端点
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

        const result = await GraphQLExecutor.execute(query, variables, { env });

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // GraphQL Schema 信息
      if ((url.pathname === '/' || url.pathname === '/graphql') && request.method === 'GET') {
        return new Response(
          JSON.stringify({
            data: {
              message: 'DeepSeek GraphQL Streaming API',
              version: '2.0.0',
              endpoints: {
                graphql: url.origin + '/',
                stream: url.origin + '/stream'
              },
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
                chatStream: {
                  query: 'subscription($input: ChatInput!) { chatStream(input: $input) { choices { delta { content } } } }',
                  variables: {
                    input: {
                      messages: [{ role: 'user', content: 'Hello!' }],
                      max_tokens: 200
                    }
                  },
                  endpoint: '/stream',
                  description: '流式聊天（Server-Sent Events）'
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
                },
                completionStream: {
                  query: 'subscription($input: CompletionInput!) { completionStream(input: $input) { choices { text } } }',
                  variables: {
                    input: {
                      prompt: 'def fibonacci(n):',
                      max_tokens: 150
                    }
                  },
                  endpoint: '/stream',
                  description: '流式代码补全（Server-Sent Events）'
                }
              },
              usage: {
                standardGraphQL: {
                  url: url.origin + '/',
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: {
                    query: 'query { hello }',
                    variables: {}
                  }
                },
                streamingGraphQL: {
                  url: url.origin + '/stream',
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream'
                  },
                  body: {
                    query: 'subscription($input: ChatInput!) { chatStream(input: $input) { choices { delta { content } } } }',
                    variables: {
                      input: {
                        messages: [{ role: 'user', content: 'Hello!' }]
                      }
                    }
                  },
                  note: 'Returns Server-Sent Events stream'
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

      return new Response(
        JSON.stringify({
          errors: [{ 
            message: 'Endpoint not found. Use POST / for GraphQL queries or POST /stream for streaming subscriptions',
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