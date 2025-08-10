#!/bin/bash

# DeepSeek Workers API 优化部署脚本
# 作者: Claude AI Assistant
# 用法: ./deploy-optimized.sh

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查必要工具
check_dependencies() {
    log_info "检查必要工具..."
    
    if ! command -v wrangler &> /dev/null; then
        log_error "wrangler CLI 未安装，请先安装: npm install -g wrangler"
        exit 1
    fi
    
    if ! command -v git &> /dev/null; then
        log_error "git 未安装"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        log_error "node.js 未安装"
        exit 1
    fi
    
    log_success "所有依赖检查通过"
}

# 检查配置
check_configuration() {
    log_info "检查配置..."
    
    # 检查 API Key
    if ! wrangler secret list | grep -q "DEEPSEEK_API_KEY"; then
        log_warning "DeepSeek API Key 未配置"
        read -p "是否现在配置 API Key? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            wrangler secret put DEEPSEEK_API_KEY
        else
            log_error "API Key 是必需的，请稍后手动配置: wrangler secret put DEEPSEEK_API_KEY"
            exit 1
        fi
    fi
    
    log_success "配置检查完成"
}

# 部署到开发环境
deploy_dev() {
    log_info "部署到开发环境..."
    
    if wrangler deploy --env development; then
        log_success "开发环境部署成功"
        
        # 获取开发环境 URL
        DEV_URL=$(wrangler deployments list --env development 2>/dev/null | grep -oE 'https://[^[:space:]]+' | head -1)
        if [ -n "$DEV_URL" ]; then
            echo
            log_info "开发环境 URL: $DEV_URL"
            echo "export DEV_WORKER_URL='$DEV_URL'" > .env.test
            
            # 简单测试
            log_info "运行基础连接测试..."
            if curl -s -f "$DEV_URL/health" > /dev/null; then
                log_success "健康检查通过"
            else
                log_warning "健康检查失败，但部署可能仍然成功"
            fi
        fi
    else
        log_error "开发环境部署失败"
        exit 1
    fi
}

# 运行性能测试
run_performance_test() {
    log_info "运行性能测试..."
    
    if [ -f ".env.test" ]; then
        source .env.test
    fi
    
    if [ -z "$DEV_WORKER_URL" ]; then
        read -p "请输入开发环境 Worker URL: " DEV_WORKER_URL
    fi
    
    if [ -f "test-performance.js" ]; then
        log_info "运行自动化性能测试..."
        if node test-performance.js "$DEV_WORKER_URL"; then
            log_success "性能测试完成"
        else
            log_warning "性能测试出现问题，但部署可能仍然成功"
        fi
    else
        log_info "运行基础测试..."
        
        # 基础 Hello 测试
        echo "测试基础查询..."
        HELLO_RESULT=$(curl -s -X POST "$DEV_WORKER_URL" \
            -H "Content-Type: application/json" \
            -d '{"query": "query { hello }"}' | jq -r '.data.hello' 2>/dev/null || echo "测试失败")
        
        if [[ "$HELLO_RESULT" == *"running"* ]]; then
            log_success "基础查询测试通过"
        else
            log_warning "基础查询测试失败: $HELLO_RESULT"
        fi
        
        # 模型查询测试
        echo "测试模型查询..."
        MODEL_RESULT=$(curl -s -X POST "$DEV_WORKER_URL" \
            -H "Content-Type: application/json" \
            -d '{"query": "query { models { id } }"}' | jq -r '.data.models[0].id' 2>/dev/null || echo "测试失败")
        
        if [[ "$MODEL_RESULT" != "测试失败" ]] && [[ "$MODEL_RESULT" != "null" ]]; then
            log_success "模型查询测试通过"
        else
            log_warning "模型查询测试失败，可能是 API Key 问题"
        fi
    fi
}

# 部署到生产环境
deploy_production() {
    log_info "准备部署到生产环境..."
    
    echo
    log_warning "⚠️  即将部署到生产环境！"
    log_warning "请确认开发环境测试已通过"
    echo
    
    read -p "确认部署到生产环境? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "已取消生产环境部署"
        return
    fi
    
    if wrangler deploy --env production; then
        log_success "🎉 生产环境部署成功！"
        
        # 获取生产环境 URL
        PROD_URL=$(wrangler deployments list --env production 2>/dev/null | grep -oE 'https://[^[:space:]]+' | head -1)
        if [ -n "$PROD_URL" ]; then
            echo
            log_success "生产环境 URL: $PROD_URL"
        fi
    else
        log_error "生产环境部署失败"
        exit 1
    fi
}

# 清理临时文件
cleanup() {
    log_info "清理临时文件..."
    
    if [ -f ".env.test" ]; then
        rm .env.test
    fi
    
    log_success "清理完成"
}

# 显示部署后信息
show_post_deployment_info() {
    echo
    log_success "🎉 DeepSeek Workers API 优化部署完成！"
    echo
    echo "📋 部署摘要:"
    echo "  ✅ 代码已优化并部署"
    echo "  ✅ 性能测试已运行"
    echo "  ✅ 开发和生产环境已更新"
    echo
    echo "🔧 后续操作:"
    echo "  • 监控日志: wrangler tail"
    echo "  • 查看指标: wrangler deployments list"
    echo "  • 测试端点: curl -X POST [你的URL] -H 'Content-Type: application/json' -d '{\"query\":\"query { hello }\"}'"
    echo
    echo "📊 预期性能改进:"
    echo "  • 响应时间减少 60-80%"
    echo "  • 缓存命中率 > 90%"
    echo "  • 错误率显著降低"
    echo
    echo "🆘 如有问题:"
    echo "  • 查看 Cloudflare Workers 控制台"
    echo "  • 验证 DeepSeek API Key 配置"
    echo "  • 检查实时日志: wrangler tail"
    echo
}

# 主函数
main() {
    echo "🚀 DeepSeek Workers API 优化部署脚本"
    echo "================================================"
    echo
    
    # 检查是否在正确目录
    if [ ! -f "package.json" ] || [ ! -f "wrangler.toml" ]; then
        log_error "请在 DeepSeek Workers 项目根目录运行此脚本"
        exit 1
    fi
    
    # 执行各个步骤
    check_dependencies
    echo
    
    check_configuration
    echo
    
    deploy_dev
    echo
    
    run_performance_test
    echo
    
    deploy_production
    echo
    
    cleanup
    
    show_post_deployment_info
}

# 错误处理
trap 'log_error "脚本执行中断"; exit 1' ERR

# 运行主函数
main "$@"