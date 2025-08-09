#!/bin/bash

# 部署 GraphQL API 到 Cloudflare Workers
echo "🚀 部署 DeepSeek GraphQL API..."

# 确保在项目目录中
if [ ! -f "wrangler.toml" ]; then
    echo "❌ 请在项目根目录运行此脚本"
    exit 1
fi

# 检查 wrangler 安装
if ! command -v wrangler &> /dev/null; then
    echo "📦 安装 Wrangler CLI..."
    npm install -g wrangler
fi

# 登录检查
if ! wrangler whoami &> /dev/null; then
    echo "🔐 请先登录 Cloudflare:"
    wrangler login
fi

# 确保 API 密钥已设置
echo "🔑 检查 API 密钥..."
if ! wrangler secret list | grep -q "DEEPSEEK_API_KEY"; then
    echo "设置 DeepSeek API 密钥..."
    echo "sk-76c8f552ea8640a49376fcf64b1d5fc8" | wrangler secret put DEEPSEEK_API_KEY
fi

# 部署
echo "🚀 部署 GraphQL API..."
wrangler deploy

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 GraphQL API 部署成功！"
    echo ""
    echo "📡 GraphQL 端点:"
    echo "  https://deepseek.jzq1020814597.workers.dev"
    echo ""
    echo "🧪 测试方法:"
    echo "  1. 打开浏览器访问上述地址查看 Schema"
    echo "  2. 打开 examples/graphql-test.html 进行交互测试"
    echo "  3. 使用 POST 请求发送 GraphQL 查询"
    echo ""
    echo "📖 示例查询:"
    echo '  {"query": "query { models { id } }"}'
    echo ""
    echo "现在你可以在前端使用 GraphQL 接口了！🚀"
else
    echo "❌ 部署失败，请检查错误信息"
    exit 1
fi