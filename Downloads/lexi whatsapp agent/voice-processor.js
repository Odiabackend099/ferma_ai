const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');
const FormData = require('form-data');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Nigerian English Voice Processing
async function processVoiceWithWhisper(audioBuffer) {
  try {
    const formData = new FormData();
    formData.append('file', audioBuffer, {
      filename: 'audio.wav',
      contentType: 'audio/wav'
    });
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');
    formData.append('prompt', 'Nigerian English conversation with business context. Transcript should include Nigerian expressions like "How far", "No wahala", "Abi".');

    const response = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          ...formData.getHeaders()
        }
      }
    );

    return response.data.text;
  } catch (error) {
    console.error('Whisper transcription error:', error);
    throw new Error('Voice transcription failed');
  }
}

async function generateVoiceResponse(text, voiceId = process.env.ELEVENLABS_VOICE_ID) {
  try {
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.75,
          similarity_boost: 0.85,
          style: 0.6,
          use_speaker_boost: true
        }
      },
      {
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY
        },
        responseType: 'arraybuffer'
      }
    );

    return Buffer.from(response.data);
  } catch (error) {
    console.error('ElevenLabs TTS error:', error);
    throw new Error('Voice generation failed');
  }
}

async function processLexiVoiceCall(transcript, callerId, sessionId) {
  try {
    // Get conversation context
    const { data: context } = await supabase
      .from('voice_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: false })
      .limit(5);

    const conversationHistory = context?.map(msg => ({
      role: msg.speaker === 'user' ? 'user' : 'assistant',
      content: msg.transcript
    })) || [];

    // Enhanced Agent Lexi voice prompt
    const voicePrompt = `You are Agent Lexi from ODIA AI, speaking on a voice call with a Nigerian business owner.

VOICE CHARACTERISTICS:
- Speak conversationally, like you're talking to a friend
- Use Nigerian expressions naturally: "How far?", "No wahala", "Abi you understand?"
- Keep responses under 50 words for voice calls
- Sound confident and knowledgeable about AI

CURRENT CONTEXT: Voice call onboarding
CALLER: ${callerId}

Respond naturally and help them understand how ODIA AI can transform their business.`;

    // Get Claude response
    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL_ID,
      max_tokens: 200,
      messages: [
        { role: 'system', content: voicePrompt },
        ...conversationHistory,
        { role: 'user', content: transcript }
      ]
    });

    const agentLexiResponse = response.content[0].text;

    // Log voice interaction
    await supabase
      .from('voice_sessions')
      .insert([
        {
          session_id: sessionId,
          caller_id: callerId,
          speaker: 'user',
          transcript: transcript,
          timestamp: new Date().toISOString()
        },
        {
          session_id: sessionId,
          caller_id: callerId,
          speaker: 'Agent Lexi',
          transcript: agentLexiResponse,
          timestamp: new Date().toISOString()
        }
      ]);

    return agentLexiResponse;

  } catch (error) {
    console.error('Voice processing error:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { audioData, sessionId, callerId, action } = req.body;

    if (!audioData && action !== 'start_session') {
      return res.status(400).json({ error: 'Audio data required' });
    }

    let response;

    switch (action) {
      case 'start_session':
        // Initialize voice session
        await supabase
          .from('voice_sessions')
          .insert({
            session_id: sessionId,
            caller_id: callerId,
            speaker: 'system',
            transcript: 'Voice session started',
            timestamp: new Date().toISOString()
          });

        const welcomeMessage = `Hello! You've reached Agent Lexi from ODIA AI. How far? I'm here to show you how voice AI can transform your Nigerian business. What would you like to know?`;
        
        const welcomeAudio = await generateVoiceResponse(welcomeMessage);
        
        response = {
          success: true,
          transcript: welcomeMessage,
          audioData: welcomeAudio.toString('base64'),
          sessionId: sessionId
        };
        break;

      case 'process_audio':
        // Process incoming voice
        const audioBuffer = Buffer.from(audioData, 'base64');
        const transcript = await processVoiceWithWhisper(audioBuffer);
        
        const agentLexiResponse = await processLexiVoiceCall(transcript, callerId, sessionId);
        const responseAudio = await generateVoiceResponse(agentLexiResponse);

        response = {
          success: true,
          userTranscript: transcript,
          agentLexiResponse: agentLexiResponse,
          audioData: responseAudio.toString('base64'),
          sessionId: sessionId
        };
        break;

      case 'end_session':
        await supabase
          .from('voice_sessions')
          .insert({
            session_id: sessionId,
            caller_id: callerId,
            speaker: 'system',
            transcript: 'Voice session ended',
            timestamp: new Date().toISOString()
          });

        response = {
          success: true,
          message: 'Session ended successfully'
        };
        break;

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

    // Log API usage
    await supabase
      .from('api_usage')
      .insert({
        endpoint: '/api/voice/process',
        caller_id: callerId,
        session_id: sessionId,
        action: action,
        timestamp: new Date().toISOString()
      });

    res.status(200).json(response);

  } catch (error) {
    console.error('Voice API error:', error);
    
    await supabase
      .from('system_logs')
      .insert({
        level: 'error',
        message: `Voice processing failed: ${error.message}`,
        metadata: { 
          callerId: req.body.callerId,
          sessionId: req.body.sessionId,
          error: error.stack 
        }
      });

    res.status(500).json({
      success: false,
      error: 'Voice processing failed',
      message: 'Agent Lexi temporarily unavailable'
    });
  }
}