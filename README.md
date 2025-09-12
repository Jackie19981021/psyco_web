# 🧠 PSYCHO Platform

A comprehensive mental health social platform with psychological matching, real-time chat, and bilingual interaction features.

## ✨ Core Features

### 🎯 Fully Implemented Features
- ✅ **User System**: Complete registration, login, and JWT authentication
- ✅ **Smart Matching**: Multi-dimensional user matching algorithm based on psychological traits  
- ✅ **Real-time Chat**: Cross-user real-time messaging system powered by Socket.io
- ✅ **Data Persistence**: MongoDB database storage with offline mode support
- ✅ **Bilingual Support**: Complete Chinese-English language switching
- ✅ **Mind Maze Game**: Fully bilingual psychological exploration game
- ✅ **Production Ready**: Supports deployment on Netlify + Render + MongoDB Atlas

## 🏗️ Technical Architecture

```
Frontend (React + TypeScript)
├── User Authentication System
├── Psychological Matching Algorithm 
├── Real-time Chat Interface
├── Multi-language Internationalization
└── Psychological Game Module

Backend (Node.js + Express)  
├── RESTful API
├── JWT Authentication
├── Socket.io Real-time Communication
├── MongoDB Data Storage
└── Intelligent Matching Engine
```

## 🚀 Local Development

### Start Development Environment
```bash
# Install dependencies
npm install

# Start both frontend and backend simultaneously
npm run dev

# Or start separately
npm run frontend  # http://localhost:3000
npm run backend   # http://localhost:5001
```

### Environment Requirements
- Node.js >= 18.0.0
- npm >= 9.0.0
- MongoDB (optional, has offline mode)

## 🌐 Production Deployment

### Quick Deployment
```bash
# Use automated deployment script
./deploy.sh
```

### Manual Deployment Steps
1. **Setup MongoDB Atlas** - Create cloud database
2. **Deploy Backend to Render** - API server
3. **Deploy Frontend to Netlify** - Static website

For detailed steps, see [DEPLOYMENT.md](./DEPLOYMENT.md)

## 🎮 Feature Demonstration

### User Registration and Login
- Email registration support with encrypted password storage
- JWT token persistent login
- Automatic state recovery

### Intelligent User Matching
- Compatibility analysis based on psychological traits
- AI-enhanced multi-dimensional matching algorithm
- Mystery and compatibility scoring system

### Real-time Chat System  
- WebSocket instant messaging
- Emotional analysis and mood identification
- Chat history persistent storage

### Mind Maze Game
- Complete story-driven experience
- Fully bilingual in Chinese and English
- Psychological analysis and choice consequences

## 🔧 Configuration Files

### Development Environment
- `frontend/.env` - Frontend development configuration
- `backend/.env` - Backend development configuration

### Production Environment  
- `frontend/.env.production` - Frontend production configuration
- `backend/.env.production` - Backend production configuration
- `netlify.toml` - Netlify deployment configuration

## 🧪 Testing Cross-Network Features

After deployment, you can:
1. Have friends from different networks access your website
2. They register different accounts
3. Test mutual matching and real-time chat
4. Verify data persistence and login state recovery

## 🔒 Security Features

- ✅ JWT Authentication
- ✅ Password bcrypt encryption
- ✅ CORS cross-origin protection
- ✅ Input data validation
- ✅ Secure environment variable management

## 📱 Supported Features

### User Features
- [x] User registration/login
- [x] Personal profile management
- [x] Psychological trait analysis
- [x] Matching preference settings

### Interactive Features  
- [x] Intelligent user matching
- [x] Real-time chat conversations
- [x] Emotional state analysis
- [x] Chat history records

### Game Features
- [x] Mind maze exploration
- [x] Psychological test assessments  
- [x] Achievement system
- [x] Multi-language support

## 🌍 Internationalization Support

Full support for Chinese and English:
- [x] Interface text translation
- [x] Game content localization  
- [x] Error message translation
- [x] Dynamic language switching

## 📊 System Status

### Local Development ✅
- Frontend: http://localhost:3000  
- Backend: http://localhost:5001
- Database: MongoDB local or memory mode

### Production Ready ✅
- Frontend: Deployable to Netlify
- Backend: Deployable to Render  
- Database: Connectable to MongoDB Atlas

## 🚀 Successful Deployment Indicators

When you complete deployment, you should see:
1. ✅ Cross-network users can register and login
2. ✅ User data saved in cloud database
3. ✅ Different users can match and chat  
4. ✅ WebSocket real-time messaging works
5. ✅ Language switching functions properly
6. ✅ All game features are bilingual

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Styled Components, React Router, i18next
- **Backend**: Node.js, Express, Socket.io, MongoDB, JWT, bcrypt
- **Database**: MongoDB with Atlas cloud support
- **Deployment**: Netlify (frontend) + Render (backend) + MongoDB Atlas
- **Authentication**: JWT with secure token management
- **Real-time**: Socket.io for WebSocket communications

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

🎉 **PSYCHO Platform is now fully ready to support real cross-network user interaction!**

Follow the deployment guide and your platform will enable users worldwide to register, match, and engage in real-time psychological interactions.