#!/bin/bash

# PSYCHO Platform 快速部署脚本
echo "🚀 PSYCHO Platform 生产环境部署脚本"
echo "=================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 函数：显示步骤
show_step() {
    echo -e "${BLUE}[$1]${NC} $2"
}

# 函数：显示成功
show_success() {
    echo -e "${GREEN}✅${NC} $1"
}

# 函数：显示警告
show_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

# 函数：显示错误
show_error() {
    echo -e "${RED}❌${NC} $1"
}

# 检查必要工具
show_step "1" "检查部署工具..."

if ! command -v heroku &> /dev/null; then
    show_error "Heroku CLI 未安装. 请访问: https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    show_error "Node.js/npm 未安装"
    exit 1
fi

show_success "部署工具检查完成"

# 生成JWT密钥
show_step "2" "生成安全密钥..."
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
show_success "JWT密钥已生成: ${JWT_SECRET:0:20}..."

# 设置环境变量
show_step "3" "配置环境变量..."

echo "请输入以下信息:"
read -p "MongoDB Atlas 连接字符串: " MONGODB_URI
read -p "Netlify 应用域名 (例: https://your-app.netlify.app): " FRONTEND_URL

# 创建环境变量文件
cat > backend/.env.production << EOF
NODE_ENV=production
MONGODB_URI=${MONGODB_URI}
JWT_SECRET=${JWT_SECRET}
FRONTEND_URL=${FRONTEND_URL}
EOF

show_success "环境变量配置完成"

# 部署后端到Heroku
show_step "4" "部署后端到Heroku..."

cd backend

# 检查是否已登录Heroku
if ! heroku auth:whoami &> /dev/null; then
    show_warning "请先登录Heroku..."
    heroku login
fi

# 创建Heroku应用（如果不存在）
APP_NAME="psycho-backend-$(date +%s)"
echo "创建Heroku应用: $APP_NAME"

if heroku create $APP_NAME; then
    show_success "Heroku应用创建成功: $APP_NAME"
    
    # 设置环境变量
    heroku config:set MONGODB_URI="$MONGODB_URI" -a $APP_NAME
    heroku config:set JWT_SECRET="$JWT_SECRET" -a $APP_NAME  
    heroku config:set NODE_ENV=production -a $APP_NAME
    heroku config:set FRONTEND_URL="$FRONTEND_URL" -a $APP_NAME
    
    show_success "Heroku环境变量设置完成"
    
    # 初始化Git并部署
    if [ ! -d .git ]; then
        git init
        git add .
        git commit -m "Initial commit for production deployment"
    fi
    
    # 添加Heroku远程仓库
    heroku git:remote -a $APP_NAME
    
    # 部署
    if git push heroku main 2>/dev/null || git push heroku master 2>/dev/null; then
        show_success "后端部署成功!"
        HEROKU_URL="https://$APP_NAME.herokuapp.com"
        echo "后端API地址: $HEROKU_URL"
    else
        show_error "后端部署失败"
        exit 1
    fi
else
    show_error "Heroku应用创建失败"
    exit 1
fi

cd ..

# 配置前端环境变量
show_step "5" "配置前端生产环境..."

cat > frontend/.env.production << EOF
REACT_APP_ENV=production
REACT_APP_PROD_API_URL=${HEROKU_URL}
REACT_APP_SOCKET_URL=${HEROKU_URL}
REACT_APP_NAME=PSYCHO Platform
REACT_APP_VERSION=1.0.0
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_CHAT=true
REACT_APP_ENABLE_MATCHING=true
REACT_APP_API_TIMEOUT=5000
REACT_APP_MAX_RETRIES=2
REACT_APP_DISABLE_DEVTOOLS=true
REACT_APP_SECURE_MODE=true
EOF

show_success "前端环境变量配置完成"

# 构建前端
show_step "6" "构建前端应用..."

cd frontend

if npm run build; then
    show_success "前端构建完成!"
    show_success "构建文件位于: frontend/build/"
else
    show_error "前端构建失败"
    exit 1
fi

cd ..

# 显示部署总结
echo ""
echo "🎉 部署配置完成!"
echo "=================="
echo ""
echo -e "${GREEN}后端服务器:${NC} $HEROKU_URL"
echo -e "${GREEN}前端构建文件:${NC} frontend/build/"
echo ""
echo "📋 接下来的步骤:"
echo "1. 将 frontend/build/ 文件夹拖拽到 Netlify"
echo "2. 在 Netlify 项目设置中添加环境变量："
echo "   REACT_APP_PROD_API_URL = $HEROKU_URL"
echo "   REACT_APP_SOCKET_URL = $HEROKU_URL"
echo ""
echo "3. 测试部署结果："
echo "   - 不同网络用户注册和登录"
echo "   - 用户匹配和实时聊天"
echo "   - 数据持久化验证"
echo ""
echo "📚 详细部署指南请查看 DEPLOYMENT.md"
echo ""
show_success "🚀 PSYCHO Platform 已准备好支持跨网络用户交互!"