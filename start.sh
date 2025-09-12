#!/bin/bash

# 心灵连接平台启动脚本

echo "🌟 启动心灵连接平台..."

# 检查是否在项目根目录
if [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    echo "❌ 请在项目根目录运行此脚本"
    exit 1
fi

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js未安装，请先安装Node.js"
    exit 1
fi

# 检查npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm未安装，请先安装npm"
    exit 1
fi

echo "📦 检查依赖..."

# 安装后端依赖
if [ ! -d "backend/node_modules" ]; then
    echo "📦 安装后端依赖..."
    cd backend && npm install
    cd ..
fi

# 安装前端依赖
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 安装前端依赖..."
    cd frontend && npm install --legacy-peer-deps
    cd ..
fi

echo "🚀 启动服务..."

# 启动后端服务（后台运行）
echo "🔧 启动后端服务..."
cd backend && npm start &
BACKEND_PID=$!
cd ..

# 等待后端启动
sleep 3

# 检查后端是否启动成功
if ps -p $BACKEND_PID > /dev/null; then
    echo "✅ 后端服务启动成功 (PID: $BACKEND_PID)"
else
    echo "❌ 后端服务启动失败"
    exit 1
fi

echo "🌐 启动前端应用..."
cd frontend && npm start

# 如果前端退出，也停止后端
echo "🛑 停止后端服务..."
kill $BACKEND_PID 2>/dev/null