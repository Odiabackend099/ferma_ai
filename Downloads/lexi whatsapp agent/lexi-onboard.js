const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');

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

    return response.data;
  } catch (error) {
    console.error('TERMII WhatsApp error:', error.response?.data || error.message);
    throw error;
  }
}

const AGENT_LEXI_ONBOARDING_PROMPT = `You are Agent Lexi, ODIA AI's lead onboarding specialist for Nigerian businesses.

ONBOARDING FLOW:
1. Warm welcome + business context gathering
2. Pain point identification (customer service, sales, operations)
3. Voice AI demonstration offer
4. Custom solution recommendation
5. Free trial setup (3 days, 25 calls)
6. Implementation timeline

CONVERSATION STYLE:
- Professional but friendly Nigerian tone
- Use "How far?" for greetings, "No wahala" for reassurance
- Ask one question at a time
- Listen actively and reference previous responses
- Show genuine interest in their business growth

PRICING KNOWLEDGE:
- Starter: ₦15,000/month (100 voice calls, basic features)
- Business: ₦45,000/month (500 voice calls, advanced analytics)  
- Enterprise: ₦120,000/month (unlimited, custom integrations)

Always focus on ROI: "This ₦15,000 investment typically saves businesses ₦100,000+ monthly through automation."`;

async function analyzeBusinessNeeds(businessInfo, conversationHistory) {
  try {
    const analysisPrompt = `Analyze this Nigerian business for AI readiness:

Business Info: ${JSON.stringify(businessInfo)}
Conversation History: ${JSON.stringify(conversationHistory)}

Provide:
1. Primary pain points that voice AI can solve
2. Recommended ODIA AI solution (Starter/Business/Enterprise)
3. ROI projection for Nigerian market
4. Implementation timeline
5. Key success metrics

Focus on practical Nigerian business challenges like customer service delays, language barriers, or manual processes.`;

    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL_ID,
      max_tokens: 500,
      messages: [
        { role: 'user', content: analysisPrompt }
      ]
    });

    return response.content[0].text;
  } catch (error) {
    console.error('Business analysis error:', error);
    return "Based on our conversation, I believe voice AI can significantly improve your customer experience and operational efficiency.";
  }
}

async function setupFreeTrial(phoneNumber, businessData) {
  try {
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 3); // 3-day trial

    // Create trial customer record
    const { data: customer, error } = await supabase
      .from('customers')
      .insert({
        phone_number: phoneNumber,
        business_name: businessData.businessName,
        business_type: businessData.businessType,
        contact_person: businessData.contactPerson,
        subscription_status: 'trial',
        subscription_start: new Date().toISOString(),
        subscription_end: trialEnd.toISOString(),
        plan_type: 'trial',
        trial_calls_remaining: 25,
        onboarding_stage: 'trial_setup'
      })
      .select()
      .single();

    if (error) throw error;

    // Send trial confirmation via TERMII
    const trialMessage = `🎉 Your 3-day FREE trial is now active!

✅ 25 free voice AI calls
✅ Full feature access
✅ Nigerian business support
✅ No credit card required

Trial Dashboard: ${process.env.MCP_DOMAIN}/trial/${customer.id}
Expires: ${trialEnd.toLocaleDateString('en-NG')}

Ready to test? I'll guide you through your first voice AI implementation.

Questions? Just reply here!
- Agent Lexi (via TERMII)`;

    await sendWhatsAppMessage(phoneNumber, trialMessage);

    // Log trial setup
    await supabase
      .from('system_logs')
      .insert({
        level: 'info',
        message: 'Free trial activated',
        metadata: { customerId: customer.id, phoneNumber, businessData }
      });

    return customer;

  } catch (error) {
    console.error('Trial setup error:', error);
    throw error;
  }
}

async function scheduleFollowUp(customerId, followUpType, daysFromNow) {
  const followUpDate = new Date();
  followUpDate.setDate(followUpDate.getDate() + daysFromNow);

  await supabase
    .from('follow_ups')
    .insert({
      customer_id: customerId,
      follow_up_type: followUpType,
      scheduled_for: followUpDate.toISOString(),
      status: 'pending',
      agent: 'lexi'
    });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      phoneNumber, 
      businessName, 
      businessType, 
      contactPerson, 
      currentStage,
      conversationHistory,
      userMessage 
    } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number required' });
    }

    // Get or create onboarding session
    let { data: session } = await supabase
      .from('onboarding_sessions')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single();

    if (!session) {
      const { data: newSession } = await supabase
        .from('onboarding_sessions')
        .insert({
          phone_number: phoneNumber,
          stage: 'welcome',
          business_data: {},
          conversation_history: [],
          started_at: new Date().toISOString()
        })
        .select()
        .single();
      
      session = newSession;
    }

    // Update conversation history
    const updatedHistory = [
      ...session.conversation_history,
      { role: 'user', content: userMessage, timestamp: new Date().toISOString() }
    ];

    // Generate contextual response
    const contextualPrompt = `${AGENT_LEXI_ONBOARDING_PROMPT}

Current Stage: ${session.stage}
Business Data: ${JSON.stringify(session.business_data)}
Conversation: ${JSON.stringify(updatedHistory.slice(-6))} // Last 6 messages

User just said: "${userMessage}"

Respond as Agent Lexi with the next appropriate step in the onboarding flow.`;

    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL_ID,
      max_tokens: 300,
      messages: [
        { role: 'user', content: contextualPrompt }
      ]
    });

    const agentLexiResponse = response.content[0].text;

    // Update business data based on conversation
    let updatedBusinessData = { ...session.business_data };
    if (businessName) updatedBusinessData.businessName = businessName;
    if (businessType) updatedBusinessData.businessType = businessType;
    if (contactPerson) updatedBusinessData.contactPerson = contactPerson;

    // Determine next stage
    let nextStage = session.stage;
    if (session.stage === 'welcome' && businessName) nextStage = 'needs_analysis';
    if (session.stage === 'needs_analysis' && businessType) nextStage = 'solution_recommendation';
    if (session.stage === 'solution_recommendation' && userMessage.toLowerCase().includes('trial')) {
      nextStage = 'trial_setup';
    }

    // Update session
    const finalHistory = [
      ...updatedHistory,
      { role: 'assistant', content: agentLexiResponse, timestamp: new Date().toISOString() }
    ];

    await supabase
      .from('onboarding_sessions')
      .update({
        stage: nextStage,
        business_data: updatedBusinessData,
        conversation_history: finalHistory,
        updated_at: new Date().toISOString()
      })
      .eq('id', session.id);

    // Handle special actions
    let actionResult = null;
    if (nextStage === 'trial_setup' && businessName) {
      try {
        const customer = await setupFreeTrial(phoneNumber, updatedBusinessData);
        actionResult = { type: 'trial_created', customerId: customer.id };
        
        // Schedule follow-ups
        await scheduleFollowUp(customer.id, 'trial_check_in', 1);
        await scheduleFollowUp(customer.id, 'trial_expiry_reminder', 2);
      } catch (error) {
        console.error('Trial setup failed:', error);
        actionResult = { type: 'trial_error', error: error.message };
      }
    }

    // Log onboarding interaction
    await supabase
      .from('system_logs')
      .insert({
        level: 'info',
        message: 'Onboarding interaction processed',
        metadata: {
          phoneNumber,
          stage: nextStage,
          businessData: updatedBusinessData,
          action: actionResult
        }
      });

    res.status(200).json({
      success: true,
      response: agentLexiResponse,
      stage: nextStage,
      businessData: updatedBusinessData,
      action: actionResult,
      agent: 'Agent Lexi'
    });

  } catch (error) {
    console.error('Onboarding API error:', error);
    
    await supabase
      .from('system_logs')
      .insert({
        level: 'error',
        message: `Onboarding failed: ${error.message}`,
        metadata: { phoneNumber: req.body.phoneNumber, error: error.stack }
      });

    res.status(500).json({
      success: false,
      error: 'Onboarding process failed',
      message: 'Agent Lexi temporarily unavailable'
    });
  }
}