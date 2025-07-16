# 🇳🇬 Agent Lexi - Whisper Weave Agent Voice

**Nigeria's First Voice-Based AI Infrastructure for Business Automation**

## 🚀 Quick Deploy to Vercel

```bash
# Clone repository
git clone https://github.com/ODIAvoiceaiagency/whisper-weave-agent-voice.git
cd whisper-weave-agent-voice

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Deploy to Vercel
npm run deploy
```

## 📋 Environment Variables Required

Create `.env.local` with these values:

```bash
# TERMII WhatsApp (Nigerian Provider)
TERMII_API_KEY=your_termii_api_key
TERMII_SENDER_ID=your_termii_sender_id
TERMII_WHATSAPP_NUMBER=your_termii_whatsapp_number

# Supabase Database
SUPABASE_URL=https://zemzolqyibadlpypxxji.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key

# Claude AI
ANTHROPIC_API_KEY=your_anthropic_api_key
CLAUDE_MODEL_ID=claude-3-sonnet-20240229

# ElevenLabs Voice
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=atxzO10LEsk8kEval3af

# Flutterwave Payments
FLUTTERWAVE_PUBLIC_KEY=your_flutterwave_public_key
FLUTTERWAVE_SECRET_KEY=your_flutterwave_secret_key

# ODIA Configuration
MCP_DOMAIN=https://odia.dev
```

## 🎯 Agent Lexi Capabilities

### WhatsApp Business Integration
- **Automatic onboarding** for Nigerian businesses
- **Voice message processing** with Nigerian English support
- **Payment flows** via Flutterwave integration
- **Free trial management** (3 days, 25 calls)
- **TERMII integration** for reliable Nigerian WhatsApp delivery

### Pricing Plans (NGN)
- **Starter**: ₦15,000/month (100 voice calls)
- **Business**: ₦45,000/month (500 voice calls)  
- **Enterprise**: ₦120,000/month (unlimited calls)

## 🛠 API Endpoints

### Core Endpoints
```
POST /api/webhook/whatsapp      # Twilio WhatsApp webhook
POST /api/webhook/flutterwave   # Payment confirmations
POST /api/voice/process         # Voice AI processing
GET  /api/health               # System health check
POST /api/lexi/onboard         # Advanced onboarding flow
```

### Webhook URLs for External Services
```
WhatsApp Webhook: https://your-domain.vercel.app/api/webhook/whatsapp
Flutterwave Webhook: https://your-domain.vercel.app/api/webhook/flutterwave
```

## 🏗 Database Schema (Supabase)

### Required Tables

```sql
-- WhatsApp conversations
CREATE TABLE whatsapp_conversations (
  id SERIAL PRIMARY KEY,
  message_id TEXT,
  from_number TEXT NOT NULL,
  message_body TEXT NOT NULL,
  direction TEXT CHECK (direction IN ('inbound', 'outbound')),
  agent TEXT DEFAULT 'lexi',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer records
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  phone_number TEXT UNIQUE NOT NULL,
  business_name TEXT,
  business_type TEXT,
  contact_person TEXT,
  subscription_status TEXT DEFAULT 'active',
  subscription_start TIMESTAMP WITH TIME ZONE,
  subscription_end TIMESTAMP WITH TIME ZONE,
  plan_type TEXT,
  payment_amount INTEGER,
  tx_ref TEXT,
  trial_calls_remaining INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment flows
CREATE TABLE payment_flows (
  id SERIAL PRIMARY KEY,
  phone_number TEXT NOT NULL,
  plan_type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  tx_ref TEXT UNIQUE NOT NULL,
  payment_link TEXT,
  status TEXT DEFAULT 'initiated',
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Voice sessions
CREATE TABLE voice_sessions (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  caller_id TEXT NOT NULL,
  speaker TEXT NOT NULL, -- 'user', 'lexi', 'system'
  transcript TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System logs
CREATE TABLE system_logs (
  id SERIAL PRIMARY KEY,
  level TEXT NOT NULL, -- 'info', 'warning', 'error'
  message TEXT NOT NULL,
  metadata JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Onboarding sessions
CREATE TABLE onboarding_sessions (
  id SERIAL PRIMARY KEY,
  phone_number TEXT UNIQUE NOT NULL,
  stage TEXT DEFAULT 'welcome',
  business_data JSONB DEFAULT '{}',
  conversation_history JSONB DEFAULT '[]',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔧 Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Test webhook locally with ngrok
npx ngrok http 3000

# Update Twilio webhook URL to:
# https://your-ngrok-url.ngrok.io/api/webhook/whatsapp
```

## 📱 WhatsApp Setup

1. **TERMII Console**: Create Nigerian WhatsApp Business account
2. **Webhook URL**: `https://your-domain.vercel.app/api/webhook/whatsapp`
3. **HTTP Method**: POST
4. **Sender ID**: Register your business sender ID with TERMII
5. **API Key**: Get your TERMII API key from dashboard

## 💳 Flutterwave Integration

1. **Dashboard**: Create Flutterwave account
2. **API Keys**: Get public and secret keys
3. **Webhook URL**: `https://your-domain.vercel.app/api/webhook/flutterwave`
4. **Events**: Enable `charge.completed` and `charge.failed`

## 🎤 Voice Features

### ElevenLabs Configuration
- **Voice ID**: `atxzO10LEsk8kEval3af` (Nigerian English)
- **Model**: `eleven_multilingual_v2`
- **Optimized for**: Nigerian business conversations

### Voice Flow
1. User sends voice note via WhatsApp
2. Whisper transcribes with Nigerian accent support
3. Claude processes business context
4. ElevenLabs generates natural Nigerian response
5. Audio sent back via WhatsApp

## 📊 Monitoring & Analytics

### Health Checks
```bash
# Check system status
curl https://your-domain.vercel.app/api/health

# View logs in Supabase
SELECT * FROM system_logs ORDER BY timestamp DESC LIMIT 50;
```

### Key Metrics
- Daily WhatsApp messages processed
- Active trial and paid customers
- Voice session duration and quality
- Payment conversion rates

## 🚨 Production Checklist

- [ ] All environment variables configured in Vercel
- [ ] Supabase database tables created
- [ ] Twilio WhatsApp webhook configured
- [ ] Flutterwave webhook configured
- [ ] ElevenLabs voice ID verified
- [ ] Health check endpoint responding
- [ ] Test complete onboarding flow
- [ ] Verify payment processing

## 🆘 Support & Troubleshooting

### Common Issues

**WhatsApp messages not received**
- Check TERMII webhook URL and API key
- Verify sender ID registration with TERMII
- Confirm phone number format (Nigerian numbers)

**Payment failures**
- Confirm Flutterwave keys and webhook setup
- Check Nigerian bank compatibility

**Voice processing errors**
- Verify ElevenLabs API limits
- Check audio format and size limits

### Contact ODIA AI
- **Email**: support@odia.dev
- **WhatsApp**: +234XXXXXXXXX
- **GitHub**: https://github.com/ODIA-AI

---

**Built with ❤️ in Nigeria by ODIA AI LTD**  
*Empowering African businesses with voice-first AI infrastructure*