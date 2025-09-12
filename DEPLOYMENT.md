# PSYCHO Platform 生产环境部署指南

## 🎯 部署目标
将PSYCHO平台部署到生产环境，实现：
- ✅ 真实跨网络用户注册和登录
- ✅ 用户数据持久化存储在云数据库
- ✅ 不同网络用户可以匹配并实时聊天
- ✅ 完整的双语支持和游戏功能

## 🏗️ 部署架构
```
用户浏览器 → Netlify (前端) → Heroku (后端API) → MongoDB Atlas (数据库)
                              ↓
                         WebSocket 实时聊天
```

## 📋 部署清单

### ✅ 已完成的配置
- [x] 后端CORS生产环境配置
- [x] 前端API环境变量配置
- [x] Netlify部署配置文件
- [x] Heroku部署文件(Procfile)
- [x] 生产环境变量模板

### 🚀 部署步骤

## 步骤1: 设置MongoDB Atlas云数据库

### 1.1 创建MongoDB Atlas账户
1. 访问 [MongoDB Atlas](https://www.mongodb.com/atlas)
2. 注册免费账户
3. 创建新集群 (M0免费层)

### 1.2 获取数据库连接字符串
```
mongodb+srv://用户名:密码@cluster0.mongodb.net/psycho-production
```

## 步骤2: 部署后端到Heroku

### 2.1 创建Heroku应用
```bash
cd backend
heroku create psycho-backend-api
```

### 2.2 设置Heroku环境变量
```bash
heroku config:set MONGODB_URI="你的MongoDB Atlas连接字符串"
heroku config:set JWT_SECRET="生成一个64字符的随机密钥"
heroku config:set NODE_ENV=production
heroku config:set FRONTEND_URL="https://你的netlify应用.netlify.app"
```

### 2.3 部署后端
```bash
git push heroku main
```

## 步骤3: 部署前端到Netlify

### 3.1 更新前端环境变量
在 `frontend/.env.production` 中设置：
```env
REACT_APP_PROD_API_URL=https://你的heroku应用.herokuapp.com
REACT_APP_SOCKET_URL=https://你的heroku应用.herokuapp.com
```

### 3.2 部署到Netlify
1. 构建: `npm run build`
2. 在Netlify中拖拽build文件夹
3. 设置环境变量

## 🔧 关键配置文件

### backend/.env.production
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-super-secure-key
FRONTEND_URL=https://your-netlify-app.netlify.app
```

### frontend/netlify.toml
```toml
[build]
  base = "frontend/"
  command = "npm run build"
  publish = "build/"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## 🧪 测试生产环境

### 多用户测试流程
1. 在不同设备/网络注册用户A和用户B
2. 用户A登录并进入匹配页面
3. 用户B登录并进入匹配页面
4. 测试匹配和实时聊天功能
5. 退出并重新登录，验证数据持久化

### 验证清单
- [ ] 用户注册和登录正常
- [ ] 用户信息存储在MongoDB Atlas
- [ ] 跨用户匹配算法工作正常
- [ ] WebSocket实时聊天功能正常
- [ ] 中英文语言切换正常
- [ ] 内心迷宫游戏双语化正常
- [ ] 下次登录能恢复用户状态

## 🚨 重要安全配置

### 1. JWT密钥生成
```bash
# 生成安全的JWT密钥
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2. CORS配置
后端已配置只允许：
- localhost (开发环境)
- *.netlify.app (生产环境)
- 您指定的FRONTEND_URL

### 3. MongoDB安全
- 使用MongoDB Atlas的加密连接
- 设置强密码
- 配置IP白名单

## 📱 生产环境URL示例

部署完成后，您的平台将有以下URL：
- **前端**: https://psycho-platform.netlify.app
- **后端API**: https://psycho-backend-api.herokuapp.com
- **数据库**: MongoDB Atlas云端

## 🎉 部署成功标志

当您看到以下情况，说明部署成功：
1. ✅ 不同网络的朋友可以访问您的Netlify网站
2. ✅ 他们可以注册新账户并登录
3. ✅ 注册用户可以相互匹配和聊天
4. ✅ 用户数据保存在云端，下次可以直接登录
5. ✅ WebSocket实时消息正常工作
6. ✅ 语言切换和游戏功能正常

## 🛠️ 故障排查

### WebSocket连接问题
- 检查Heroku dyno是否运行
- 确认CORS配置包含Netlify域名

### 数据库连接问题
- 验证MongoDB Atlas连接字符串
- 检查网络访问白名单设置

### 跨域请求问题
- 确认前端API_URL设置正确
- 检查后端CORS配置

---

🚀 **准备好了！按照这个指南，您的PSYCHO平台将支持真正的跨网络用户交互！**