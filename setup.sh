#!/bin/bash

# 快速设置脚本
echo "🚀 DeepSeek API Worker 快速设置"

# 检查是否安装了 wrangler
if ! command -v wrangler &> /dev/null; then
    echo "📦 安装 Wrangler CLI..."
    npm install -g wrangler
fi

# 检查是否已登录
echo "🔐 检查 Cloudflare 登录状态..."
if ! wrangler whoami &> /dev/null; then
    echo "请先登录 Cloudflare:"
    wrangler login
fi

# 设置 API 密钥
echo "🔑 设置 DeepSeek API 密钥..."
echo "sk-76c8f552ea8640a49376fcf64b1d5fc8" | wrangler secret put DEEPSEEK_API_KEY

echo "✅ API 密钥设置完成！"

# 部署
echo "🚀 部署到 Cloudflare Workers..."
npm run deploy

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 部署成功！"
    echo "🌐 你的 API 现在可以使用了"
    echo ""
    echo "📋 API 接口："
    echo "  GET  /api/models       - 获取模型列表"
    echo "  POST /api/chat         - 聊天对话"
    echo "  POST /api/completions  - 文本补全"
    echo ""
    echo "🧪 测试："
    echo "  打开 examples/test.html 进行测试"
    echo ""
    echo "📖 Worker URL 将在上方显示"
else
    echo "❌ 部署失败，请检查错误信息"
fi