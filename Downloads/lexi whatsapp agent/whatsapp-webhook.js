async function sendWhatsAppMessage(phoneNumber, message) {
  try {
    const response = await axios.post(`${TERMII_BASE_URL}/send/message`, {
      to: phoneNumber.replace('whatsapp:', '').replace('+', ''),
      from: TERMII_SENDER_ID,
      sms: message,
      type: "plain",
      channel: "whatsapp",
      api_key: TERMII_API_KEY
    });

    console.log('TERMII WhatsApp message sent:', response.data);
    return response.data;
  } catch (error) {
    console.error('TERMII WhatsApp error:', error.response?.data || error.message);
    throw error;
  }
}const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// TERMII WhatsApp API Configuration
const TERMII_BASE_URL = 'https://api.ng.termii.com/api';
const TERMII_API_KEY = process.env.TERMII_API_KEY;
const TERMII_SENDER_ID = process.env.TERMII_SENDER_ID;

// Agent Lexi Configuration
const AGENT_LEXI_PROMPT = `You are Agent Lexi from ODIA AI LTD, Nigeria's first voice-based AI infrastructure company. 

PERSONALITY:
- Speak like a friendly Nigerian professional
- Use "How far?" for greetings, "No wahala" for reassurance
- Sound human, warm, and solution-focused
- Never mention you're an AI unless directly asked

CORE FUNCTIONS:
1. Onboard new Nigerian businesses to voice AI
2. Offer 3-day free trials (25 voice calls)
3. Handle upgrade flows via Flutterwave
4. Provide technical support

PRICING (NGN):
- Starter Plan: ₦15,000/month (100 voice calls)
- Business Plan: ₦45,000/month (500 voice calls)
- Enterprise Plan: ₦120,000/month (unlimited)

ALWAYS:
- Log conversations to Supabase
- Escalate technical issues to human support
- Offer voice demos for interested prospects
- Sound confident about Nigerian AI innovation

Current conversation context: WhatsApp onboarding flow via TERMII`;

async function processMessage(messageBody, fromNumber, messageId) {
  try {
    // Log incoming message
    await supabase
      .from('whatsapp_conversations')
      .insert({
        message_id: messageId,
        from_number: fromNumber,
        message_body: messageBody,
        direction: 'inbound',
        agent: 'lexi',
        timestamp: new Date().toISOString()
      });

    // Get conversation history
    const { data: history } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('from_number', fromNumber)
      .order('timestamp', { ascending: true })
      .limit(10);

    // Build context for Claude
    const contextMessages = history.map(msg => ({
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: msg.message_body
    }));

    // Get Claude response
    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL_ID,
      max_tokens: 500,
      messages: [
        { role: 'system', content: AGENT_LEXI_PROMPT },
        ...contextMessages,
        { role: 'user', content: messageBody }
      ]
    });

    const agentLexiResponse = response.content[0].text;

    // Log outbound message
    await supabase
      .from('whatsapp_conversations')
      .insert({
        from_number: fromNumber,
        message_body: agentLexiResponse,
        direction: 'outbound',
        agent: 'lexi',
        timestamp: new Date().toISOString()
      });

    return agentLexiResponse;

  } catch (error) {
    console.error('Message processing error:', error);
    
    // Log error to Supabase
    await supabase
      .from('system_logs')
      .insert({
        level: 'error',
        message: `WhatsApp processing failed: ${error.message}`,
        metadata: { fromNumber, messageBody, messageId }
      });

    return "Sorry, I'm having technical issues. Our team will assist you shortly. Please try again in a few minutes.";
  }
}

async function handlePaymentFlow(fromNumber, plan) {
  const planPrices = {
    'starter': 15000,
    'business': 45000,
    'enterprise': 120000
  };

  try {
    // Create Flutterwave payment link
    const paymentData = {
      tx_ref: `ODIA-${Date.now()}-${fromNumber.replace(/\D/g, '')}`,
      amount: planPrices[plan],
      currency: 'NGN',
      redirect_url: `${process.env.MCP_DOMAIN}/api/webhook/flutterwave`,
      customer: {
        phone_number: fromNumber.replace('whatsapp:', ''),
        name: 'ODIA AI Customer'
      },
      customizations: {
        title: 'ODIA AI Voice Infrastructure',
        description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan Subscription`,
        logo: `${process.env.MCP_DOMAIN}/assets/odia-logo.png`
      }
    };

    const response = await axios.post(
      'https://api.flutterwave.com/v3/payments',
      paymentData,
      {
        headers: {
          'Authorization': `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const paymentLink = response.data.data.link;

    // Log payment initiation
    await supabase
      .from('payment_flows')
      .insert({
        phone_number: fromNumber,
        plan_type: plan,
        amount: planPrices[plan],
        tx_ref: paymentData.tx_ref,
        payment_link: paymentLink,
        status: 'initiated'
      });

    return `Perfect! Complete your ${plan} plan payment here: ${paymentLink}\n\nOnce confirmed, I'll activate your voice AI immediately. No wahala!`;

  } catch (error) {
    console.error('Payment flow error:', error);
    return "Payment system temporarily unavailable. Let me connect you with our team for manual processing.";
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { Body, From, MessageSid } = req.body;
    
    if (!Body || !From) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log(`WhatsApp message from ${From}: ${Body}`);

    let responseMessage;

    // Check for payment keywords
    if (Body.toLowerCase().includes('upgrade') || 
        Body.toLowerCase().includes('starter') || 
        Body.toLowerCase().includes('business') || 
        Body.toLowerCase().includes('enterprise')) {
      
      const plan = Body.toLowerCase().includes('starter') ? 'starter' :
                   Body.toLowerCase().includes('business') ? 'business' :
                   Body.toLowerCase().includes('enterprise') ? 'enterprise' : 'starter';
      
      responseMessage = await handlePaymentFlow(From, plan);
    } else {
      responseMessage = await processMessage(Body, From, MessageSid);
    }

    // Send WhatsApp response via TERMII
    await sendWhatsAppMessage(From, responseMessage);

    // Health check log
    await supabase
      .from('system_logs')
      .insert({
        level: 'info',
        message: 'WhatsApp webhook processed successfully',
        metadata: { from: From, messageId: MessageSid }
      });

    res.status(200).json({ 
      success: true, 
      message: 'Processed by Agent Lexi via TERMII',
      agent: 'Agent Lexi',
      provider: 'termii'
    });

  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    
    await supabase
      .from('system_logs')
      .insert({
        level: 'error',
        message: `WhatsApp webhook failed: ${error.message}`,
        metadata: { error: error.stack }
      });

    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Agent Lexi temporarily unavailable'
    });
  }
}