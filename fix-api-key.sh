#!/bin/bash

# 快速修复 API 密钥配置
echo "🔧 修复 DeepSeek API 密钥配置"

# 确保在正确的目录
if [ ! -f "wrangler.toml" ]; then
    echo "❌ 请在项目根目录运行此脚本"
    exit 1
fi

# 检查 wrangler 是否已安装
if ! command -v wrangler &> /dev/null; then
    echo "📦 安装 Wrangler CLI..."
    npm install -g wrangler
fi

# 登录检查
echo "🔐 检查登录状态..."
if ! wrangler whoami &> /dev/null; then
    echo "请先登录 Cloudflare："
    wrangler login
    echo "登录完成后，按回车键继续..."
    read
fi

# 强制设置 API 密钥
echo "🔑 设置 API 密钥..."
echo "sk-76c8f552ea8640a49376fcf64b1d5fc8" | wrangler secret put DEEPSEEK_API_KEY

# 验证密钥是否设置成功
echo "✅ 验证密钥设置..."
if wrangler secret list | grep -q "DEEPSEEK_API_KEY"; then
    echo "✅ API 密钥设置成功！"
else
    echo "❌ API 密钥设置失败，请手动设置"
    echo "运行: wrangler secret put DEEPSEEK_API_KEY"
    echo "然后输入: sk-76c8f552ea8640a49376fcf64b1d5fc8"
    exit 1
fi

# 重新部署
echo "🚀 重新部署 Worker..."
wrangler deploy

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 修复完成！"
    echo "🌐 你的 API 现在应该可以正常工作了"
    echo ""
    echo "🧪 测试链接："
    echo "  https://deepseek.jzq1020814597.workers.dev/"
    echo "  https://deepseek.jzq1020814597.workers.dev/api/models"
    echo ""
    echo "如果还有问题，请检查 Cloudflare 控制台的环境变量设置"
else
    echo "❌ 部署失败，请检查错误信息"
fi