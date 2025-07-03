// ===================================
// backend/routes/webhooks.js - Webhook Endpoints
// ===================================

const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { validateWebhookSignature } = require('../middleware/auth');
const { logWebhookEvent } = require('../services/analyticsService');
const { processAgentEvent } = require('../services/elevenLabsService');

// Atlas Agent Webhook
router.post('/elevenlabs/atlas-agent', validateWebhookSignature, async (req, res) => {
  try {
    const { event_type, conversation_id, agent_id, user_id, metadata } = req.body;
    
    console.log('Atlas webhook received:', {
      event_type,
      conversation_id,
      agent_id,
      timestamp: new Date().toISOString()
    });

    // Process the event based on type
    switch (event_type) {
      case 'conversation_started':
        await handleConversationStarted(conversation_id, user_id, metadata);
        break;
        
      case 'conversation_ended':
        await handleConversationEnded(conversation_id, metadata);
        break;
        
      case 'agent_response_generated':
        await handleAgentResponse(conversation_id, req.body);
        break;
        
      case 'financial_calculation_completed':
        await handleFinancialCalculation(conversation_id, req.body);
        break;
        
      default:
        console.log('Unknown event type:', event_type);
    }

    // Log event for analytics
    await logWebhookEvent('atlas', event_type, req.body);
    
    res.status(200).json({ success: true, message: 'Webhook processed successfully' });
    
  } catch (error) {
    console.error('Atlas webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Lexi Agent Webhook
router.post('/elevenlabs/lexi-agent', validateWebhookSignature, async (req, res) => {
  try {
    const { event_type, conversation_id, agent_id, user_id, metadata } = req.body;
    
    console.log('Lexi webhook received:', {
      event_type,
      conversation_id,
      agent_id,
      timestamp: new Date().toISOString()
    });

    // Process the event based on type
    switch (event_type) {
      case 'conversation_started':
        await handleConversationStarted(conversation_id, user_id, metadata);
        break;
        
      case 'conversation_ended':
        await handleConversationEnded(conversation_id, metadata);
        break;
        
      case 'order_processed':
        await handleOrderProcessed(conversation_id, req.body.order_data);
        break;
        
      case 'appointment_scheduled':
        await handleAppointmentScheduled(conversation_id, req.body.appointment_data);
        break;
        
      case 'customer_complaint_logged':
        await handleCustomerComplaint(conversation_id, req.body.complaint_data);
        break;
        
      default:
        console.log('Unknown event type:', event_type);
    }

    // Log event for analytics
    await logWebhookEvent('lexi', event_type, req.body);
    
    res.status(200).json({ success: true, message: 'Webhook processed successfully' });
    
  } catch (error) {
    console.error('Lexi webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ===================================
// Event Handlers
// ===================================

async function handleConversationStarted(conversationId, userId, metadata) {
  const { Conversation } = require('../models');
  
  try {
    await Conversation.create({
      conversation_id: conversationId,
      user_id: userId,
      agent_type: metadata.agent_type || 'unknown',
      language: metadata.user_language || 'en-NG',
      location: metadata.user_location || null,
      session_type: metadata.session_type || 'general',
      platform: metadata.platform || 'web',
      status: 'active',
      started_at: new Date()
    });
    
    console.log('Conversation started:', conversationId);
  } catch (error) {
    console.error('Error saving conversation:', error);
  }
}

async function handleConversationEnded(conversationId, metadata) {
  const { Conversation } = require('../models');
  
  try {
    await Conversation.update({
      status: 'completed',
      ended_at: new Date(),
      duration_seconds: metadata.duration_seconds || 0,
      total_exchanges: metadata.total_exchanges || 0,
      user_satisfaction: metadata.user_satisfaction || null,
      outcome: metadata.outcome || null
    }, {
      where: { conversation_id: conversationId }
    });
    
    console.log('Conversation ended:', conversationId);
  } catch (error) {
    console.error('Error updating conversation:', error);
  }
}

async function handleOrderProcessed(conversationId, orderData) {
  const { Order } = require('../models');
  const { sendOrderConfirmationSMS } = require('../services/smsService');
  
  try {
    // Save order to database
    const order = await Order.create({
      order_id: orderData.order_id,
      conversation_id: conversationId,
      items: JSON.stringify(orderData.items),
      total_amount: orderData.total_amount,
      currency: orderData.currency,
      payment_method: orderData.payment_method,
      delivery_address: JSON.stringify(orderData.delivery_address),
      customer_phone: orderData.customer_phone,
      status: 'confirmed'
    });
    
    // Send SMS confirmation
    await sendOrderConfirmationSMS(orderData.customer_phone, orderData.order_id);
    
    console.log('Order processed:', orderData.order_id);
  } catch (error) {
    console.error('Error processing order:', error);
  }
}

async function handleFinancialCalculation(conversationId, data) {
  const { FinancialCalculation } = require('../models');
  
  try {
    await FinancialCalculation.create({
      conversation_id: conversationId,
      calculation_type: data.calculation_type,
      input_parameters: JSON.stringify(data.input_parameters),
      result: JSON.stringify(data.result),
      timestamp: new Date()
    });
    
    console.log('Financial calculation completed:', data.calculation_type);
  } catch (error) {
    console.error('Error saving financial calculation:', error);
  }
}

module.exports = router;

// ===================================
// backend/services/elevenLabsService.js - ElevenLabs Integration
// ===================================

const axios = require('axios');
const WebSocket = require('ws');

class ElevenLabsService {
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY;
    this.baseUrl = process.env.ELEVENLABS_BASE_URL || 'https://api.elevenlabs.io';
    this.websocketUrl = process.env.ELEVENLABS_WEBSOCKET_URL || 'wss://api.elevenlabs.io/v1/convai/conversation';
  }

  // Create conversation session
  async createConversation(agentId, userId, language = 'en-NG') {
    try {
      const response = await axios.post(`${this.baseUrl}/v1/convai/conversations`, {
        agent_id: agentId,
        user_id: userId,
        language: language,
        webhook_url: this.getWebhookUrl(agentId)
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error creating ElevenLabs conversation:', error);
      throw error;
    }
  }

  // Get agent details
  async getAgent(agentId) {
    try {
      const response = await axios.get(`${this.baseUrl}/v1/convai/agents/${agentId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching agent details:', error);
      throw error;
    }
  }

  // Get conversation history
  async getConversationHistory(conversationId) {
    try {
      const response = await axios.get(`${this.baseUrl}/v1/convai/conversations/${conversationId}/history`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching conversation history:', error);
      throw error;
    }
  }

  // End conversation
  async endConversation(conversationId) {
    try {
      const response = await axios.post(`${this.baseUrl}/v1/convai/conversations/${conversationId}/end`, {}, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error ending conversation:', error);
      throw error;
    }
  }

  // Get webhook URL based on agent
  getWebhookUrl(agentId) {
    const baseWebhookUrl = process.env.ODIA_WEBHOOK_BASE_URL || 'https://api.odia.dev/webhooks/elevenlabs';
    
    if (agentId.includes('atlas')) {
      return `${baseWebhookUrl}/atlas-agent`;
    } else if (agentId.includes('lexi')) {
      return `${baseWebhookUrl}/lexi-agent`;
    } else {
      return `${baseWebhookUrl}/general`;
    }
  }

  // Create WebSocket connection URL
  createWebSocketUrl(agentId, conversationId) {
    return `${this.websocketUrl}?authorization=Bearer ${this.apiKey}&agent_id=${agentId}&conversation_id=${conversationId}`;
  }
}

module.exports = new ElevenLabsService();

// ===================================
// backend/routes/agents.js - Agent Management API
// ===================================

const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const elevenLabsService = require('../services/elevenLabsService');
const { generateUserId } = require('../utils/helpers');

// Start conversation with agent
router.post('/:agentId/conversations', auth, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { user_id, language, session_config } = req.body;

    // Generate user ID if not provided
    const userId = user_id || generateUserId();

    // Validate agent ID
    const validAgentIds = [
      'lexi_nigerian_customer_service_agent_v1',
      'atlas_nigerian_financial_intelligence_agent_v1'
    ];

    if (!validAgentIds.includes(agentId)) {
      return res.status(400).json({ error: 'Invalid agent ID' });
    }

    // Create conversation with ElevenLabs
    const conversation = await elevenLabsService.createConversation(agentId, userId, language);

    // Create WebSocket URL
    const websocketUrl = elevenLabsService.createWebSocketUrl(agentId, conversation.conversation_id);

    res.json({
      conversation_id: conversation.conversation_id,
      agent_id: agentId,
      user_id: userId,
      websocket_url: websocketUrl,
      session_token: conversation.session_token,
      expires_at: conversation.expires_at
    });

  } catch (error) {
    console.error('Error starting conversation:', error);
    res.status(500).json({ error: 'Failed to start conversation' });
  }
});

// Get conversation details
router.get('/conversations/:conversationId', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { Conversation } = require('../models');

    // Get conversation from database
    const conversation = await Conversation.findOne({
      where: { conversation_id: conversationId }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Get history from ElevenLabs
    const history = await elevenLabsService.getConversationHistory(conversationId);

    res.json({
      ...conversation.dataValues,
      history: history.messages || []
    });

  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// End conversation
router.post('/conversations/:conversationId/end', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;

    // End conversation with ElevenLabs
    await elevenLabsService.endConversation(conversationId);

    // Update database
    const { Conversation } = require('../models');
    await Conversation.update({
      status: 'ended',
      ended_at: new Date()
    }, {
      where: { conversation_id: conversationId }
    });

    res.json({ success: true, message: 'Conversation ended successfully' });

  } catch (error) {
    console.error('Error ending conversation:', error);
    res.status(500).json({ error: 'Failed to end conversation' });
  }
});

// Get agent performance metrics
router.get('/:agentId/performance', auth, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { date_from, date_to } = req.query;
    const { Conversation } = require('../models');
    const { Op } = require('sequelize');

    const whereClause = {
      agent_type: agentId.includes('atlas') ? 'atlas' : 'lexi'
    };

    if (date_from && date_to) {
      whereClause.started_at = {
        [Op.between]: [new Date(date_from), new Date(date_to)]
      };
    }

    const conversations = await Conversation.findAll({
      where: whereClause,
      attributes: [
        'conversation_id',
        'duration_seconds',
        'total_exchanges',
        'user_satisfaction',
        'outcome',
        'started_at'
      ]
    });

    // Calculate metrics
    const totalConversations = conversations.length;
    const averageDuration = conversations.reduce((sum, conv) => sum + (conv.duration_seconds || 0), 0) / totalConversations;
    const averageSatisfaction = conversations.filter(c => c.user_satisfaction).reduce((sum, conv) => sum + conv.user_satisfaction, 0) / conversations.filter(c => c.user_satisfaction).length;
    const successfulOutcomes = conversations.filter(c => c.outcome === 'successful').length;
    const successRate = (successfulOutcomes / totalConversations) * 100;

    res.json({
      agent_id: agentId,
      period: { date_from, date_to },
      metrics: {
        total_conversations: totalConversations,
        average_duration_seconds: Math.round(averageDuration),
        average_satisfaction: Math.round(averageSatisfaction * 10) / 10,
        success_rate: Math.round(successRate * 10) / 10,
        successful_outcomes: successfulOutcomes
      },
      conversations: conversations
    });

  } catch (error) {
    console.error('Error fetching agent performance:', error);
    res.status(500).json({ error: 'Failed to fetch performance metrics' });
  }
});

module.exports = router;

// ===================================
// backend/middleware/auth.js - Authentication Middleware
// ===================================

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Validate webhook signature from ElevenLabs
function validateWebhookSignature(req, res, next) {
  const signature = req.headers['elevenlabs-signature'];
  const webhookSecret = process.env.ELEVENLABS_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return res.status(401).json({ error: 'Missing signature or webhook secret' });
  }

  const body = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex');

  const receivedSignature = signature.replace('sha256=', '');

  if (!crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(receivedSignature))) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  next();
}

// Authenticate API requests
function auth(req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  const apiKey = req.header('X-API-Key');

  // Check for API key authentication
  if (apiKey) {
    if (apiKey !== process.env.ODIA_API_KEY) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    return next();
  }

  // Check for JWT authentication
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Rate limiting middleware
const rateLimit = require('express-rate-limit');

const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false
  });
};

// Different rate limits for different endpoints
const generalLimiter = createRateLimiter(15 * 60 * 1000, 100, 'Too many requests');
const webhookLimiter = createRateLimiter(1 * 60 * 1000, 30, 'Too many webhook requests');
const conversationLimiter = createRateLimiter(1 * 60 * 1000, 10, 'Too many conversation requests');

module.exports = {
  validateWebhookSignature,
  auth,
  generalLimiter,
  webhookLimiter,
  conversationLimiter
};

// ===================================
// backend/models/index.js - Database Models
// ===================================

const { Sequelize, DataTypes } = require('sequelize');

// Initialize Sequelize
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Conversation Model
const Conversation = sequelize.define('Conversation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  conversation_id: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  user_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  agent_type: {
    type: DataTypes.ENUM('lexi', 'atlas'),
    allowNull: false
  },
  language: {
    type: DataTypes.STRING,
    defaultValue: 'en-NG'
  },
  location: {
    type: DataTypes.STRING
  },
  session_type: {
    type: DataTypes.STRING,
    defaultValue: 'general'
  },
  platform: {
    type: DataTypes.STRING,
    defaultValue: 'web'
  },
  status: {
    type: DataTypes.ENUM('active', 'completed', 'ended', 'error'),
    defaultValue: 'active'
  },
  started_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  ended_at: {
    type: DataTypes.DATE
  },
  duration_seconds: {
    type: DataTypes.INTEGER
  },
  total_exchanges: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  user_satisfaction: {
    type: DataTypes.DECIMAL(3, 2)
  },
  outcome: {
    type: DataTypes.STRING
  }
}, {
  tableName: 'conversations',
  timestamps: true
});

// Order Model
const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  order_id: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  conversation_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  items: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'NGN'
  },
  payment_method: {
    type: DataTypes.STRING
  },
  delivery_address: {
    type: DataTypes.JSONB
  },
  customer_phone: {
    type: DataTypes.STRING
  },
  customer_email: {
    type: DataTypes.STRING
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'processing', 'delivered', 'cancelled'),
    defaultValue: 'pending'
  }
}, {
  tableName: 'orders',
  timestamps: true
});

// Financial Calculation Model
const FinancialCalculation = sequelize.define('FinancialCalculation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  conversation_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  calculation_type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  input_parameters: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  result: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'financial_calculations',
  timestamps: true
});

// Analytics Event Model
const AnalyticsEvent = sequelize.define('AnalyticsEvent', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  event_type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  agent_type: {
    type: DataTypes.ENUM('lexi', 'atlas', 'general')
  },
  conversation_id: {
    type: DataTypes.STRING
  },
  user_id: {
    type: DataTypes.STRING
  },
  event_data: {
    type: DataTypes.JSONB
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'analytics_events',
  timestamps: true
});

// User Model
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING
  },
  email: {
    type: DataTypes.STRING
  },
  name: {
    type: DataTypes.STRING
  },
  location: {
    type: DataTypes.STRING
  },
  preferred_language: {
    type: DataTypes.STRING,
    defaultValue: 'en-NG'
  },
  metadata: {
    type: DataTypes.JSONB
  }
}, {
  tableName: 'users',
  timestamps: true
});

// Associations
Conversation.belongsTo(User, { foreignKey: 'user_id', targetKey: 'user_id' });
Order.belongsTo(Conversation, { foreignKey: 'conversation_id', targetKey: 'conversation_id' });
FinancialCalculation.belongsTo(Conversation, { foreignKey: 'conversation_id', targetKey: 'conversation_id' });

module.exports = {
  sequelize,
  Conversation,
  Order,
  FinancialCalculation,
  AnalyticsEvent,
  User
};

// ===================================
// backend/services/analyticsService.js - Analytics Service
// ===================================

const { AnalyticsEvent } = require('../models');
const axios = require('axios');

class AnalyticsService {
  constructor() {
    this.mixpanelToken = process.env.MIXPANEL_PROJECT_TOKEN;
    this.gaTrackingId = process.env.GA_TRACKING_ID;
  }

  // Log webhook event
  async logWebhookEvent(agentType, eventType, eventData) {
    try {
      await AnalyticsEvent.create({
        event_type: eventType,
        agent_type: agentType,
        conversation_id: eventData.conversation_id,
        user_id: eventData.user_id,
        event_data: eventData,
        timestamp: new Date()
      });

      // Send to Mixpanel
      if (this.mixpanelToken) {
        await this.sendToMixpanel(eventType, {
          agent_type: agentType,
          conversation_id: eventData.conversation_id,
          ...eventData.metadata
        });
      }

      console.log('Analytics event logged:', eventType);
    } catch (error) {
      console.error('Error logging analytics event:', error);
    }
  }

  // Send event to Mixpanel
  async sendToMixpanel(eventName, properties) {
    try {
      const data = {
        event: eventName,
        properties: {
          token: this.mixpanelToken,
          time: Date.now(),
          ...properties
        }
      };

      await axios.post('https://api.mixpanel.com/track', {
        data: Buffer.from(JSON.stringify(data)).toString('base64')
      });
    } catch (error) {
      console.error('Error sending to Mixpanel:', error);
    }
  }

  // Get conversation analytics
  async getConversationAnalytics(dateFrom, dateTo, agentType = null) {
    const { Op } = require('sequelize');
    const { Conversation } = require('../models');

    const whereClause = {
      started_at: {
        [Op.between]: [new Date(dateFrom), new Date(dateTo)]
      }
    };

    if (agentType) {
      whereClause.agent_type = agentType;
    }

    const conversations = await Conversation.findAll({
      where: whereClause,
      attributes: [
        'agent_type',
        'language',
        'status',
        'duration_seconds',
        'total_exchanges',
        'user_satisfaction',
        'outcome'
      ]
    });

    // Calculate metrics
    const totalConversations = conversations.length;
    const byAgent = conversations.reduce((acc, conv) => {
      acc[conv.agent_type] = (acc[conv.agent_type] || 0) + 1;
      return acc;
    }, {});

    const byLanguage = conversations.reduce((acc, conv) => {
      acc[conv.language] = (acc[conv.language] || 0) + 1;
      return acc;
    }, {});

    const avgDuration = conversations.reduce((sum, conv) => sum + (conv.duration_seconds || 0), 0) / totalConversations;
    const avgSatisfaction = conversations.filter(c => c.user_satisfaction).reduce((sum, conv) => sum + conv.user_satisfaction, 0) / conversations.filter(c => c.user_satisfaction).length;

    return {
      period: { date_from: dateFrom, date_to: dateTo },
      total_conversations: totalConversations,
      by_agent: byAgent,
      by_language: byLanguage,
      average_duration_seconds: Math.round(avgDuration),
      average_satisfaction: Math.round(avgSatisfaction * 10) / 10,
      conversations: conversations
    };
  }

  // Track agent selection
  async trackAgentSelection(agentType, metadata = {}) {
    try {
      await this.logWebhookEvent('general', 'agent_selected', {
        agent_type: agentType,
        timestamp: new Date().toISOString(),
        ...metadata
      });
    } catch (error) {
      console.error('Error tracking agent selection:', error);
    }
  }
}

module.exports = new AnalyticsService();

// ===================================
// backend/services/paymentService.js - Payment Processing
// ===================================

const axios = require('axios');
const crypto = require('crypto');

class PaymentService {
  constructor() {
    this.paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    this.flutterwaveSecretKey = process.env.FLUTTERWAVE_SECRET_KEY;
  }

  // Process payment via Paystack
  async processPaystackPayment(paymentData) {
    try {
      const response = await axios.post('https://api.paystack.co/transaction/initialize', {
        email: paymentData.customer_email,
        amount: paymentData.amount * 100, // Convert to kobo
        currency: 'NGN',
        reference: paymentData.order_id,
        callback_url: `${process.env.ODIA_API_BASE_URL}/webhooks/paystack/callback`,
        metadata: {
          conversation_id: paymentData.conversation_id,
          agent_type: paymentData.agent_type,
          order_id: paymentData.order_id
        }
      }, {
        headers: {
          'Authorization': `Bearer ${this.paystackSecretKey}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        payment_url: response.data.data.authorization_url,
        reference: response.data.data.reference,
        access_code: response.data.data.access_code
      };
    } catch (error) {
      console.error('Paystack payment error:', error);
      throw new Error('Payment initialization failed');
    }
  }

  // Process payment via Flutterwave
  async processFlutterwavePayment(paymentData) {
    try {
      const response = await axios.post('https://api.flutterwave.com/v3/payments', {
        tx_ref: paymentData.order_id,
        amount: paymentData.amount,
        currency: 'NGN',
        redirect_url: `${process.env.ODIA_API_BASE_URL}/webhooks/flutterwave/callback`,
        payment_options: 'card,banktransfer,ussd',
        customer: {
          email: paymentData.customer_email,
          phone_number: paymentData.customer_phone,
          name: paymentData.customer_name
        },
        customizations: {
          title: 'ODIA AI Payment',
          description: `Payment for order ${paymentData.order_id}`,
          logo: 'https://odia.dev/assets/logo.png'
        },
        meta: {
          conversation_id: paymentData.conversation_id,
          agent_type: paymentData.agent_type
        }
      }, {
        headers: {
          'Authorization': `Bearer ${this.flutterwaveSecretKey}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        payment_url: response.data.data.link,
        tx_ref: response.data.data.tx_ref
      };
    } catch (error) {
      console.error('Flutterwave payment error:', error);
      throw new Error('Payment initialization failed');
    }
  }

  // Verify Paystack payment
  async verifyPaystackPayment(reference) {
    try {
      const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: {
          'Authorization': `Bearer ${this.paystackSecretKey}`
        }
      });

      return {
        success: response.data.data.status === 'success',
        amount: response.data.data.amount / 100, // Convert from kobo
        currency: response.data.data.currency,
        reference: response.data.data.reference,
        metadata: response.data.data.metadata
      };
    } catch (error) {
      console.error('Paystack verification error:', error);
      throw new Error('Payment verification failed');
    }
  }

  // Verify Flutterwave payment
  async verifyFlutterwavePayment(transactionId) {
    try {
      const response = await axios.get(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
        headers: {
          'Authorization': `Bearer ${this.flutterwaveSecretKey}`
        }
      });

      return {
        success: response.data.data.status === 'successful',
        amount: response.data.data.amount,
        currency: response.data.data.currency,
        tx_ref: response.data.data.tx_ref,
        metadata: response.data.data.meta
      };
    } catch (error) {
      console.error('Flutterwave verification error:', error);
      throw new Error('Payment verification failed');
    }
  }
}

module.exports = new PaymentService();

// ===================================
// frontend/src/services/api.js - Frontend API Service
// ===================================

import axios from 'axios';

class ApiService {
  constructor() {
    this.baseURL = process.env.REACT_APP_ODIA_API_URL || 'https://api.odia.dev';
    this.apiKey = process.env.REACT_APP_ODIA_API_KEY;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey
      }
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        console.log('API Request:', config.method.toUpperCase(), config.url);
        return config;
      },
      (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        console.log('API Response:', response.status, response.config.url);
        return response;
      },
      (error) => {
        console.error('API Response Error:', error.response?.status, error.response?.data);
        return Promise.reject(error);
      }
    );
  }

  // Agent Management
  async createConversation(agentId, language = 'en-NG') {
    const userId = this.generateUserId();
    
    const response = await this.client.post(`/api/v1/agents/${agentId}/conversations`, {
      user_id: userId,
      language: language,
      session_config: {
        max_duration: agentId.includes('atlas') ? 2700 : 1800,
        enable_analytics: true,
        enable_payments: true
      }
    });

    return response.data;
  }

  async getConversation(conversationId) {
    const response = await this.client.get(`/api/v1/conversations/${conversationId}`);
    return response.data;
  }

  async endConversation(conversationId) {
    const response = await this.client.post(`/api/v1/conversations/${conversationId}/end`);
    return response.data;
  }

  // Analytics
  async trackAgentSelection(agentType, metadata = {}) {
    try {
      await this.client.post('/api/v1/analytics/agent-selection', {
        agent_type: agentType,
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
        referrer: document.referrer,
        ...metadata
      });
    } catch (error) {
      console.error('Analytics tracking failed:', error);
    }
  }

  async getConversationAnalytics(dateFrom, dateTo, agentType = null) {
    const params = { date_from: dateFrom, date_to: dateTo };
    if (agentType) params.agent_type = agentType;

    const response = await this.client.get('/api/v1/analytics/conversations', { params });
    return response.data;
  }

  async getAgentPerformance(agentId, dateFrom, dateTo) {
    const response = await this.client.get(`/api/v1/analytics/agents/${agentId}/performance`, {
      params: { date_from: dateFrom, date_to: dateTo }
    });
    return response.data;
  }

  // Payments
  async processPayment(paymentData) {
    const response = await this.client.post('/api/v1/payments/process', paymentData);
    return response.data;
  }

  async verifyPayment(transactionId) {
    const response = await this.client.get(`/api/v1/payments/${transactionId}/verify`);
    return response.data;
  }

  // Utilities
  generateUserId() {
    return 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }

  // Health check
  async healthCheck() {
    const response = await this.client.get('/health');
    return response.data;
  }
}

export default new ApiService();

// ===================================
// frontend/src/hooks/useVoiceChat.js - Voice Chat Hook
// ===================================

import { useState, useEffect, useRef, useCallback } from 'react';
import ApiService from '../services/api';

export const useVoiceChat = () => {
  const [currentAgent, setCurrentAgent] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en-NG');
  const [conversationActive, setConversationActive] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  
  const websocketRef = useRef(null);
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);

  // Initialize audio context
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Start conversation
  const startConversation = useCallback(async (agentType) => {
    try {
      setError(null);
      setConnectionStatus('connecting');
      
      // Get agent ID
      const agentId = agentType === 'lexi' 
        ? process.env.REACT_APP_LEXI_AGENT_ID 
        : process.env.REACT_APP_ATLAS_AGENT_ID;

      // Create conversation session
      const session = await ApiService.createConversation(agentId, selectedLanguage);
      setConversationId(session.conversation_id);

      // Connect to WebSocket
      const wsUrl = `${process.env.REACT_APP_ELEVENLABS_WEBSOCKET_URL}?authorization=Bearer ${process.env.REACT_APP_ELEVENLABS_API_KEY}&agent_id=${agentId}`;
      
      websocketRef.current = new WebSocket(wsUrl);

      websocketRef.current.onopen = () => {
        console.log('WebSocket connected');
        setConnectionStatus('connected');
        setConversationActive(true);
        initializeAudioStream();
      };

      websocketRef.current.onmessage = (event) => {
        handleWebSocketMessage(event);
      };

      websocketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
        setError('Connection failed');
      };

      websocketRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setConnectionStatus('disconnected');
        setConversationActive(false);
      };

      // Track agent selection
      await ApiService.trackAgentSelection(agentType, {
        language: selectedLanguage,
        conversation_id: session.conversation_id
      });

    } catch (err) {
      console.error('Error starting conversation:', err);
      setError('Failed to start conversation');
      setConnectionStatus('error');
    }
  }, [selectedLanguage]);

  // End conversation
  const endConversation = useCallback(async () => {
    try {
      if (websocketRef.current) {
        websocketRef.current.close();
      }

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }

      if (conversationId) {
        await ApiService.endConversation(conversationId);
      }

      setConversationActive(false);
      setConversationId(null);
      setConnectionStatus('disconnected');
      setMessages([]);
      setError(null);

    } catch (err) {
      console.error('Error ending conversation:', err);
    }
  }, [conversationId]);

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'agent_response':
          addMessage('agent', data.message);
          break;
        case 'user_transcript':
          addMessage('user', data.message);
          break;
        case 'audio_response':
          playAudioResponse(data.audio);
          break;
        case 'conversation_ended':
          endConversation();
          break;
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (err) {
      console.error('Error parsing WebSocket message:', err);
    }
  }, [endConversation]);

  // Add message to conversation
  const addMessage = useCallback((sender, content) => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      sender,
      content,
      timestamp: new Date()
    }]);
  }, []);

  // Initialize audio stream
  const initializeAudioStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      // Set up audio processing here if needed
      console.log('Audio stream initialized');
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Microphone access required');
    }
  }, []);

  // Play audio response
  const playAudioResponse = useCallback((audioData) => {
    // Implement audio playback
    console.log('Playing audio response:', audioData);
  }, []);

  // Update connection status
  const updateConnectionStatus = useCallback((status, message = '') => {
    setConnectionStatus(status);
    if (message) {
      setError(message);
    }
  }, []);

  return {
    currentAgent,
    setCurrentAgent,
    selectedLanguage,
    setSelectedLanguage,
    conversationActive,
    conversationId,
    connectionStatus,
    messages,
    error,
    startConversation,
    endConversation,
    updateConnectionStatus
  };
};

// ===================================
// README.md - Updated with Integration Details
// ===================================