// DeepSeek API Proxy for Cloudflare Workers
// 简单的代理接口，供前端页面调用

// CORS 配置
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// DeepSeek API 基础 URL
const DEEPSEEK_API_BASE = 'https://api.deepseek.com/v1';

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
      const path = url.pathname;

      // 检查 API Key
      if (!env.DEEPSEEK_API_KEY) {
        return new Response(
          JSON.stringify({ error: 'API Key not configured' }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      // 路由处理
      if (path === '/api/models' && request.method === 'GET') {
        return handleModels(env);
      }
      
      if (path === '/api/chat' && request.method === 'POST') {
        return handleChat(request, env);
      }
      
      if (path === '/api/completions' && request.method === 'POST') {
        return handleCompletions(request, env);
      }

      // 默认返回 API 信息
      if (path === '/' || path === '/api') {
        return new Response(
          JSON.stringify({
            name: 'DeepSeek API Proxy',
            version: '1.0.0',
            endpoints: {
              models: 'GET /api/models',
              chat: 'POST /api/chat',
              completions: 'POST /api/completions'
            }
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      // 404 处理
      return new Response(
        JSON.stringify({ error: 'Endpoint not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );

    } catch (error) {
      return new Response(
        JSON.stringify({ error: `Server error: ${error.message}` }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }
  },
};

// 获取模型列表
async function handleModels(env) {
  try {
    const response = await fetch(`${DEEPSEEK_API_BASE}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: `Failed to fetch models: ${error.message}` }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
}

// 处理聊天请求
async function handleChat(request, env) {
  try {
    const body = await request.json();
    
    // 基本参数验证
    if (!body.messages || !Array.isArray(body.messages)) {
      return new Response(
        JSON.stringify({ error: 'messages field is required and must be an array' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // 设置默认参数
    const requestBody = {
      model: body.model || 'deepseek-chat',
      messages: body.messages,
      max_tokens: body.max_tokens || 1000,
      temperature: body.temperature || 0.7,
      top_p: body.top_p || 1,
      stream: false, // Workers 暂不支持流式响应
      ...body
    };

    const response = await fetch(`${DEEPSEEK_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: `Chat request failed: ${error.message}` }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
}

// 处理文本补全请求
async function handleCompletions(request, env) {
  try {
    const body = await request.json();
    
    // 基本参数验证
    if (!body.prompt) {
      return new Response(
        JSON.stringify({ error: 'prompt field is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // 设置默认参数
    const requestBody = {
      model: body.model || 'deepseek-coder',
      prompt: body.prompt,
      max_tokens: body.max_tokens || 1000,
      temperature: body.temperature || 0.7,
      top_p: body.top_p || 1,
      stream: false,
      ...body
    };

    const response = await fetch(`${DEEPSEEK_API_BASE}/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: `Completion request failed: ${error.message}` }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
}