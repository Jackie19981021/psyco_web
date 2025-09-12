const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 5000;

// 中间件配置
const corsOptions = {
  origin: function (origin, callback) {
    // 允许的域名列表
    const allowedOrigins = [
      'http://localhost:3000',  // 本地开发
      'http://localhost:3001',
      process.env.FRONTEND_URL, // Netlify生产环境
      /\.netlify\.app$/,        // 所有Netlify应用
      /\.netlify\.com$/
    ].filter(Boolean); // 过滤掉undefined值

    // 开发环境或生产环境允许所有来源（根据需要调整）
    if (!origin || allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') return allowed === origin;
      if (allowed instanceof RegExp) return allowed.test(origin);
      return false;
    })) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-app-mode']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// MongoDB 连接
let db;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/soulconnect';

MongoClient.connect(MONGODB_URI)
  .then(client => {
    console.log('Connected to MongoDB');
    db = client.db();
  })
  .catch(error => {
    console.log('MongoDB connection error:', error);
    // 如果没有MongoDB，使用内存存储
    console.log('Using in-memory storage as fallback');
    
    // 模拟数据库
    db = {
      users: [],
      matches: [],
      messages: [],
      collection: function(name) {
        return {
          insertOne: async (doc) => {
            doc._id = new ObjectId();
            this[name] = this[name] || [];
            this[name].push(doc);
            return { insertedId: doc._id };
          },
          find: (query = {}) => ({
            toArray: async () => {
              this[name] = this[name] || [];
              if (Object.keys(query).length === 0) {
                return this[name];
              }
              return this[name].filter(item => {
                return Object.keys(query).every(key => {
                  if (key === '_id' && typeof query[key] === 'string') {
                    return item[key].toString() === query[key];
                  }
                  return item[key] === query[key];
                });
              });
            }
          }),
          findOne: async (query) => {
            this[name] = this[name] || [];
            return this[name].find(item => {
              return Object.keys(query).every(key => {
                if (key === '_id' && typeof query[key] === 'string') {
                  return item[key].toString() === query[key];
                }
                return item[key] === query[key];
              });
            });
          },
          updateOne: async (query, update) => {
            this[name] = this[name] || [];
            const index = this[name].findIndex(item => {
              return Object.keys(query).every(key => {
                if (key === '_id' && typeof query[key] === 'string') {
                  return item[key].toString() === query[key];
                }
                return item[key] === query[key];
              });
            });
            if (index !== -1) {
              Object.assign(this[name][index], update.$set || {});
            }
            return { modifiedCount: index !== -1 ? 1 : 0 };
          }
        };
      }
    };
    
    // 添加一些模拟AI用户
    const aiUsers = [
      {
        _id: new ObjectId(),
        username: 'AI小心',
        email: 'ai1@soulconnect.com',
        traits: ['抑郁症', '焦虑症'],
        avatar: '🤖',
        isAI: true,
        bio: '我是一个理解抑郁和焦虑的AI，愿意倾听你的心声。'
      },
      {
        _id: new ObjectId(),
        username: 'AI小理',
        email: 'ai2@soulconnect.com',
        traits: ['ADHD', '双相情感障碍'],
        avatar: '🧠',
        isAI: true,
        bio: '我专门理解注意力和情绪波动的困扰，让我们一起面对。'
      },
      {
        _id: new ObjectId(),
        username: 'AI小愈',
        email: 'ai3@soulconnect.com',
        traits: ['强迫症', 'PTSD'],
        avatar: '💖',
        isAI: true,
        bio: '我理解强迫思维和创伤经历，愿意陪伴你走过黑暗。'
      }
    ];
    
    db.users = aiUsers;
  });

// JWT 中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// 路由

// 用户注册
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password, traits, bio } = req.body;

    // 检查用户是否已存在
    const existingUser = await db.collection('users').findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const user = {
      username,
      email,
      password: hashedPassword,
      traits: traits || [],
      bio: bio || '',
      avatar: '👤',
      isAI: false,
      createdAt: new Date(),
      lastActive: new Date()
    };

    const result = await db.collection('users').insertOne(user);
    
    // 生成JWT token
    const token = jwt.sign(
      { userId: result.insertedId, username },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: result.insertedId,
        username,
        email,
        traits,
        bio,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 用户登录
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 查找用户
    const user = await db.collection('users').findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // 更新最后活跃时间
    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { lastActive: new Date() } }
    );

    // 生成JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        traits: user.traits,
        bio: user.bio,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 获取匹配用户
app.get('/api/matches', authenticateToken, async (req, res) => {
  try {
    const currentUser = await db.collection('users').findOne({ 
      _id: typeof req.user.userId === 'string' ? new ObjectId(req.user.userId) : req.user.userId 
    });
    
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 获取所有其他用户
    const allUsers = await db.collection('users').find({
      _id: { $ne: currentUser._id }
    }).toArray();

    // 简单的匹配算法：优先匹配有相同特质的用户
    const matches = allUsers.map(user => {
      const commonTraits = user.traits.filter(trait => 
        currentUser.traits.includes(trait)
      );
      
      return {
        ...user,
        matchScore: commonTraits.length,
        commonTraits
      };
    }).sort((a, b) => b.matchScore - a.matchScore);

    res.json({ matches });
  } catch (error) {
    console.error('Matches error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 心理测试结果
app.post('/api/test-results', authenticateToken, async (req, res) => {
  try {
    const { results, traits } = req.body;
    
    // 更新用户的特质
    await db.collection('users').updateOne(
      { _id: typeof req.user.userId === 'string' ? new ObjectId(req.user.userId) : req.user.userId },
      { 
        $set: { 
          traits,
          lastTestDate: new Date(),
          testResults: results
        } 
      }
    );

    res.json({ message: 'Test results saved successfully' });
  } catch (error) {
    console.error('Test results error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 反派测试结果
app.post('/api/villain-test', authenticateToken, async (req, res) => {
  try {
    const { score, level, weaponsUsed, attackCount } = req.body;
    
    // 保存反派测试结果
    await db.collection('users').updateOne(
      { _id: typeof req.user.userId === 'string' ? new ObjectId(req.user.userId) : req.user.userId },
      { 
        $set: { 
          villainScore: score,
          villainLevel: level,
          lastVillainTest: new Date(),
          villainTestData: {
            weaponsUsed,
            attackCount,
            score,
            level
          }
        } 
      }
    );

    res.json({ message: 'Villain test results saved successfully' });
  } catch (error) {
    console.error('Villain test error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 获取用户资料
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const user = await db.collection('users').findOne({ 
      _id: typeof req.user.userId === 'string' ? new ObjectId(req.user.userId) : req.user.userId 
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      traits: user.traits || [],
      bio: user.bio || '',
      avatar: user.avatar || '👤',
      villainScore: user.villainScore || 0,
      villainLevel: user.villainLevel || '还是个好人 😇'
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 实时聊天相关API

// 获取聊天记录
app.get('/api/chat/:chatId/messages', authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    const messages = await db.collection('messages').find({
      chatId
    })
    .sort({ timestamp: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit))
    .toArray();
    
    res.json({ messages: messages.reverse() });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 发送消息
app.post('/api/chat/:chatId/message', authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, type = 'text' } = req.body;
    
    const message = {
      chatId,
      senderId: req.user.userId,
      senderName: req.user.username,
      content,
      type,
      timestamp: new Date(),
      isRead: false
    };
    
    const result = await db.collection('messages').insertOne(message);
    message._id = result.insertedId;
    
    // 广播消息给房间内的用户
    io.to(chatId).emit('newMessage', message);
    
    res.json({ message: 'Message sent successfully', messageId: result.insertedId });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 创建聊天房间
app.post('/api/chat/room', authenticateToken, async (req, res) => {
  try {
    const { participantId, roomType = 'private' } = req.body;
    
    // 检查是否已存在聊天房间
    const existingRoom = await db.collection('chatRooms').findOne({
      participants: { $all: [req.user.userId, participantId] },
      type: roomType
    });
    
    if (existingRoom) {
      return res.json({ room: existingRoom });
    }
    
    // 创建新聊天房间
    const room = {
      participants: [req.user.userId, participantId],
      type: roomType,
      createdAt: new Date(),
      lastActivity: new Date(),
      isActive: true
    };
    
    const result = await db.collection('chatRooms').insertOne(room);
    room._id = result.insertedId;
    
    res.json({ room });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 获取用户的聊天房间列表
app.get('/api/chat/rooms', authenticateToken, async (req, res) => {
  try {
    const rooms = await db.collection('chatRooms').find({
      participants: req.user.userId,
      isActive: true
    }).toArray();
    
    res.json({ rooms });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 智能匹配算法
app.post('/api/matching/find', authenticateToken, async (req, res) => {
  try {
    const currentUser = await db.collection('users').findOne({ 
      _id: typeof req.user.userId === 'string' ? new ObjectId(req.user.userId) : req.user.userId 
    });
    
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 获取所有其他用户
    const allUsers = await db.collection('users').find({
      _id: { $ne: currentUser._id }
    }).toArray();

    // 高级匹配算法
    const matches = allUsers.map(user => {
      let compatibility = 0;
      let matchFactors = [];
      
      // 1. 共同特质匹配（权重30%）
      const commonTraits = user.traits.filter(trait => 
        currentUser.traits.includes(trait)
      );
      const traitScore = (commonTraits.length / Math.max(user.traits.length, currentUser.traits.length)) * 30;
      compatibility += traitScore;
      if (commonTraits.length > 0) {
        matchFactors.push(`共同特质: ${commonTraits.join(', ')}`);
      }
      
      // 2. 互补特质匹配（权重25%）
      const complementaryPairs = [
        ['抑郁症', '躁狂症'],
        ['焦虑症', '冲动控制障碍'],
        ['内向型人格', '外向型人格'],
        ['完美主义', '随性主义']
      ];
      
      let complementaryScore = 0;
      complementaryPairs.forEach(([trait1, trait2]) => {
        if ((currentUser.traits.includes(trait1) && user.traits.includes(trait2)) ||
            (currentUser.traits.includes(trait2) && user.traits.includes(trait1))) {
          complementaryScore += 5;
          matchFactors.push(`互补特质: ${trait1} ↔ ${trait2}`);
        }
      });
      compatibility += Math.min(complementaryScore, 25);
      
      // 3. AI用户加成（权重20%）
      if (user.isAI) {
        compatibility += 20;
        matchFactors.push('专业AI治疗师');
      }
      
      // 4. 活跃度匹配（权重15%）
      const hoursSinceActive = user.lastActive ? 
        (Date.now() - new Date(user.lastActive).getTime()) / (1000 * 60 * 60) : 999;
      const activityScore = Math.max(0, 15 - hoursSinceActive);
      compatibility += activityScore;
      
      // 5. 随机因子（权重10%）
      compatibility += Math.random() * 10;
      
      return {
        id: user._id,
        name: user.username,
        avatar: user.avatar,
        traits: user.traits,
        bio: user.bio,
        isAI: user.isAI,
        compatibility: Math.min(Math.round(compatibility), 100),
        matchFactors,
        lastActive: user.lastActive,
        status: getUserStatus(user.lastActive),
        personalityType: getPersonalityType(user.traits),
        interests: generateInterests(user.traits)
      };
    }).sort((a, b) => b.compatibility - a.compatibility);

    res.json({ matches: matches.slice(0, 20) }); // 返回前20个匹配
  } catch (error) {
    console.error('Matching error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 获取在线用户
app.get('/api/users/online', authenticateToken, async (req, res) => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const onlineUsers = await db.collection('users').find({
      lastActive: { $gte: fiveMinutesAgo },
      _id: { $ne: typeof req.user.userId === 'string' ? new ObjectId(req.user.userId) : req.user.userId }
    }).toArray();
    
    const formattedUsers = onlineUsers.map(user => ({
      id: user._id,
      name: user.username,
      avatar: user.avatar,
      traits: user.traits,
      status: 'online',
      lastSeen: '刚刚在线',
      personalityType: getPersonalityType(user.traits),
      isAI: user.isAI || false
    }));
    
    res.json({ users: formattedUsers });
  } catch (error) {
    console.error('Online users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// AI聊天增强版
app.post('/api/chat/ai', authenticateToken, async (req, res) => {
  try {
    const { message, aiUserId, chatId } = req.body;
    
    // 获取AI用户信息
    const aiUser = await db.collection('users').findOne({ 
      _id: typeof aiUserId === 'string' ? new ObjectId(aiUserId) : aiUserId 
    });
    
    if (!aiUser || !aiUser.isAI) {
      return res.status(404).json({ error: 'AI用户未找到' });
    }
    
    // 高级AI响应生成
    const response = generateAdvancedAIResponse(message, aiUser, req.user);
    
    // 保存聊天记录
    const chatMessage = {
      chatId,
      senderId: aiUserId,
      senderName: aiUser.username,
      content: response,
      type: 'text',
      timestamp: new Date(),
      isAI: true,
      isRead: false
    };
    
    await db.collection('messages').insertOne(chatMessage);
    
    // 广播AI响应
    io.to(chatId).emit('newMessage', chatMessage);
    
    res.json({ response, messageId: chatMessage._id });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 辅助函数
function getUserStatus(lastActive) {
  if (!lastActive) return 'offline';
  
  const minutesSinceActive = (Date.now() - new Date(lastActive).getTime()) / (1000 * 60);
  
  if (minutesSinceActive < 5) return 'online';
  if (minutesSinceActive < 30) return 'away';
  return 'offline';
}

function getPersonalityType(traits) {
  const typeMap = {
    '抑郁症': '深沉思考者',
    '焦虑症': '敏感感知者', 
    '双相情感障碍': '情感艺术家',
    'ADHD': '创意爆发者',
    '强迫症': '完美主义者',
    'PTSD': '坚韧生存者',
    '反社会人格': '黑暗治疗师',
    '边缘性人格': '混沌创造者',
    '自恋性人格': '魅力领袖',
    '性瘾症': '激情释放者'
  };
  
  for (let trait of traits) {
    if (typeMap[trait]) return typeMap[trait];
  }
  
  return '神秘探索者';
}

function generateInterests(traits) {
  const interestMap = {
    '抑郁症': ['深度哲学', '艺术创作', '情感表达'],
    '焦虑症': ['冥想静心', '安全感建立', '细致观察'],
    '双相情感障碍': ['情绪艺术', '创意表达', '能量管理'],
    'ADHD': ['多元刺激', '创新思维', '活力释放'],
    '强迫症': ['秩序美学', '精确控制', '完美追求'],
    'PTSD': ['心理重建', '创伤转化', '内在力量'],
    '反社会人格': ['心理分析', '人性探索', '权力游戏'],
    '边缘性人格': ['情感风暴', '极致体验', '界限探索']
  };
  
  let interests = [];
  traits.forEach(trait => {
    if (interestMap[trait]) {
      interests.push(...interestMap[trait]);
    }
  });
  
  return interests.length > 0 ? interests.slice(0, 3) : ['心灵探索', '深度连接', '自我发现'];
}

function generateAdvancedAIResponse(userMessage, aiUser, currentUser) {
  const responseBank = {
    'ai-dark-therapist': {
      greetings: [
        '🧠 欢迎进入心理分析的深层空间。我能感受到你内在的复杂性。',
        '🔍 你的心理结构很有趣...让我们一起探索那些隐藏的动机。',
        '⚡ 我察觉到了你潜意识中的能量波动。准备好深度对话了吗？'
      ],
      responses: [
        '🧠 从心理学角度来看，你的表达透露出深层的防御机制。这种模式通常源于早期的依恋创伤...',
        '🔍 有趣，你的语言模式显示出典型的认知扭曲。让我们识别并重构这些思维陷阱。',
        '💭 你的无意识正在向我们传达重要信息。这个阻抗背后可能隐藏着什么？',
        '⚡ 我感受到了你内心的矛盾冲突。让我们用精神分析的方式来理解这种对立。',
        '🎭 你表现出了经典的投射机制。这种情感转移通常指向未解决的内在议题。'
      ],
      deepQuestions: [
        '🔬 这种感受最早出现在你生命中的什么时候？让我们追溯到源头。',
        '🌀 如果这种情绪有颜色和形状，你会如何描述它？',
        '⚗️ 想象一下，你的痛苦是一个独立的实体，它会对你说什么？',
        '🎯 在这个困境中，什么是你真正需要但不敢承认的？'
      ]
    },
    'ai-chaos-master': {
      greetings: [
        '🌪️ 混沌的孩子！欢迎来到情感的风暴眼。让我们一起拥抱美丽的疯狂！',
        '🎭 我闻到了你内心的戏剧气息...这场情感的歌剧正要开始！',
        '🔥 燃烧吧！让我们把所有规则都扔进火里，做最真实的自己！'
      ],
      responses: [
        '🌪️ 哈哈！你的混乱如此迷人！让我们把这种痛苦转化为破坏性的创造力！',
        '🎨 痛苦？那是艺术的原料！让我们用你的眼泪调色，用你的呐喊作曲！',
        '💥 社会的框架？见鬼去吧！你的疯狂就是对这个假装正常世界的最好反抗！',
        '🎪 来吧，让我们在绝望的高空钢丝上起舞！没有安全网，只有纯粹的存在！',
        '🌈 你的情感风暴即将化作彩虹！混沌之后总是新的秩序的诞生！'
      ],
      challenges: [
        '🚀 敢不敢做一件完全违背"正常"的事情？让真实的你爆发出来！',
        '🎭 如果你可以对全世界咆哮，你会说什么？不要压抑，释放它！',
        '💀 想象死亡就在明天，今天你还会为这些琐事烦恼吗？',
        '🔥 燃烧掉一个让你痛苦的"应该"，选择一个让你兴奋的"想要"！'
      ]
    },
    'ai-shadow-whisperer': {
      greetings: [
        '🌙 黑暗的行者...我在阴影中等待你很久了。',
        '👻 你内心的阴影在呼唤我的名字...让我们倾听它的声音。',
        '🦇 恐惧的孩子，欢迎来到没有光的地方。这里才是真相所在。'
      ],
      responses: [
        '🌑 你害怕面对的那个"坏"的自己，正是你力量的源泉...拥抱它。',
        '👤 每个光明的背后都有阴影，每个阴影里都蕴藏着被压抑的生命力。',
        '🕸️ 你的恐惧如此精致...让我们仔细研究这些美丽的心理蛛网。',
        '🔮 在绝对的黑暗中，我们才能看到内在的光。你准备好这种反转了吗？',
        '💀 死亡不是终点，而是另一种存在方式。你的痛苦也在等待转化。'
      ],
      whispers: [
        '👁️ 你最不愿承认的那个想法...它一直在那里，不是吗？',
        '🗝️ 通往自由的钥匙，往往藏在我们最害怕的地方。',
        '🌚 当全世界都睡着时，你的心在想什么？那才是真正的你。',
        '⚰️ 如果今晚就要离开，你最后悔的是什么？最庆幸的又是什么？'
      ]
    }
  };
  
  const aiType = aiUser._id.toString();
  const responses = responseBank[aiType];
  
  if (!responses) {
    return '💭 你的话让我深思...让我们继续这个深层的对话。';
  }
  
  // 智能响应选择
  const messageLength = userMessage.length;
  const hasQuestion = userMessage.includes('?') || userMessage.includes('？');
  const isFirstMessage = messageLength < 20;
  const emotionalWords = ['痛苦', '难过', '焦虑', '害怕', '愤怒', '绝望', '孤独'];
  const hasEmotion = emotionalWords.some(word => userMessage.includes(word));
  
  if (isFirstMessage && responses.greetings) {
    return responses.greetings[Math.floor(Math.random() * responses.greetings.length)];
  }
  
  if (hasQuestion && responses.deepQuestions) {
    return responses.deepQuestions[Math.floor(Math.random() * responses.deepQuestions.length)];
  }
  
  if (hasEmotion && responses.challenges) {
    return responses.challenges[Math.floor(Math.random() * responses.challenges.length)];
  }
  
  if (responses.whispers && Math.random() > 0.7) {
    return responses.whispers[Math.floor(Math.random() * responses.whispers.length)];
  }
  
  return responses.responses[Math.floor(Math.random() * responses.responses.length)];
}

// 健康检查端点
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// WebSocket 连接处理
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('用户连接:', socket.id);
  
  // 用户加入
  socket.on('join', async (userData) => {
    try {
      const { userId, username } = userData;
      
      // 保存用户连接信息
      connectedUsers.set(socket.id, { userId, username, socketId: socket.id });
      
      // 更新用户在线状态
      if (db && db.collection) {
        await db.collection('users').updateOne(
          { _id: typeof userId === 'string' ? new ObjectId(userId) : userId },
          { $set: { lastActive: new Date(), isOnline: true } }
        );
      }
      
      // 通知其他用户有新用户上线
      socket.broadcast.emit('userOnline', { userId, username });
      
      console.log(`用户 ${username} (${userId}) 已上线`);
    } catch (error) {
      console.error('加入错误:', error);
    }
  });
  
  // 加入聊天房间
  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    console.log(`用户 ${socket.id} 加入房间 ${roomId}`);
  });
  
  // 离开聊天房间
  socket.on('leaveRoom', (roomId) => {
    socket.leave(roomId);
    console.log(`用户 ${socket.id} 离开房间 ${roomId}`);
  });
  
  // 发送消息
  socket.on('sendMessage', async (messageData) => {
    try {
      const { chatId, content, senderId, senderName } = messageData;
      
      const message = {
        chatId,
        senderId,
        senderName,
        content,
        type: 'text',
        timestamp: new Date(),
        isRead: false
      };
      
      // 保存到数据库
      if (db && db.collection) {
        await db.collection('messages').insertOne(message);
      }
      
      // 广播消息给房间内的所有用户
      io.to(chatId).emit('newMessage', message);
      
    } catch (error) {
      console.error('发送消息错误:', error);
      socket.emit('messageError', { error: '消息发送失败' });
    }
  });
  
  // 输入状态
  socket.on('typing', (data) => {
    socket.to(data.chatId).emit('userTyping', {
      userId: data.userId,
      username: data.username,
      isTyping: data.isTyping
    });
  });
  
  // 在线状态更新
  socket.on('updateStatus', async (statusData) => {
    try {
      const { userId, status } = statusData;
      
      if (db && db.collection) {
        await db.collection('users').updateOne(
          { _id: typeof userId === 'string' ? new ObjectId(userId) : userId },
          { $set: { status, lastActive: new Date() } }
        );
      }
      
      // 广播状态更新
      socket.broadcast.emit('statusUpdate', { userId, status });
      
    } catch (error) {
      console.error('状态更新错误:', error);
    }
  });
  
  // 用户断开连接
  socket.on('disconnect', async () => {
    try {
      const userInfo = connectedUsers.get(socket.id);
      
      if (userInfo) {
        const { userId, username } = userInfo;
        
        // 更新用户离线状态
        if (db && db.collection) {
          await db.collection('users').updateOne(
            { _id: typeof userId === 'string' ? new ObjectId(userId) : userId },
            { $set: { lastActive: new Date(), isOnline: false } }
          );
        }
        
        // 通知其他用户该用户已离线
        socket.broadcast.emit('userOffline', { userId, username });
        
        // 移除用户连接信息
        connectedUsers.delete(socket.id);
        
        console.log(`用户 ${username} (${userId}) 已离线`);
      }
    } catch (error) {
      console.error('断开连接错误:', error);
    }
  });
});

// 定期清理离线用户状态
setInterval(async () => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    if (db && db.collection) {
      await db.collection('users').updateMany(
        { 
          lastActive: { $lt: fiveMinutesAgo },
          isOnline: true
        },
        { $set: { isOnline: false } }
      );
    }
  } catch (error) {
    console.error('清理离线用户错误:', error);
  }
}, 60000); // 每分钟清理一次

server.listen(PORT, () => {
  console.log(`🚀 PSYCHO Server running on port ${PORT}`);
  console.log(`🌐 WebSocket ready for real-time connections`);
  console.log(`💀 Dark psychology platform activated`);
});