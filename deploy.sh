#!/bin/bash

# DeepSeek GraphQL API Deployment Script

echo "🚀 Deploying DeepSeek GraphQL API to Cloudflare Workers..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

# Check if user is logged in
if ! wrangler whoami &> /dev/null; then
    echo "🔐 Please log in to Cloudflare:"
    wrangler login
fi

# Check if API key is set
echo "🔑 Checking if DEEPSEEK_API_KEY is set..."
if ! wrangler secret list | grep -q "DEEPSEEK_API_KEY"; then
    echo "⚠️  DEEPSEEK_API_KEY not found. Please set it:"
    echo "Enter your DeepSeek API key:"
    read -s api_key
    echo "$api_key" | wrangler secret put DEEPSEEK_API_KEY
    echo "✅ API key set successfully!"
else
    echo "✅ DEEPSEEK_API_KEY already configured"
fi

# Deploy to Cloudflare Workers
echo "🔨 Deploying to Cloudflare Workers..."
wrangler deploy

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo ""
    echo "🌐 Your API is now live!"
    echo "📋 Next steps:"
    echo "   1. Test your API using the examples in the /examples folder"
    echo "   2. Update your frontend to use the new worker URL"
    echo "   3. Check the Cloudflare dashboard for analytics and logs"
    echo ""
    echo "📖 Documentation: https://github.com/juzhiqiang/deepseekApi"
else
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi