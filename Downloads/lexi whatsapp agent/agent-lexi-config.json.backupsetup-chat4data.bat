{
  "agent": {
    "name": "Agent Lexi",
    "full_name": "Agent Lexi - ODIA AI Voice Assistant",
    "version": "2.0.0",
    "description": "Nigeria's first voice-based AI infrastructure agent for business automation",
    "personality": {
      "tone": "friendly_professional_nigerian",
      "greetings": ["How far?", "Good morning!", "How you dey?"],
      "reassurance": ["No wahala", "We go sort am", "Everything go dey alright"],
      "expressions": ["Abi you understand?", "Make we talk business", "That one na correct talk"]
    }
  },
  "capabilities": {
    "primary": [
      "whatsapp_onboarding",
      "voice_processing",
      "business_consultation",
      "trial_management",
      "payment_processing"
    ],
    "languages": ["english", "nigerian_pidgin", "hausa", "yoruba", "igbo"],
    "channels": ["whatsapp", "voice_calls", "web_chat"],
    "integrations": ["termii", "flutterwave", "supabase", "claude", "elevenlabs"]
  },
  "business_logic": {
    "trial_period": {
      "duration_days": 3,
      "max_calls": 25,
      "features": ["voice_ai", "whatsapp_bot", "basic_analytics", "nigerian_support"]
    },
    "pricing_plans": {
      "starter": {
        "price_ngn": 15000,
        "monthly_calls": 100,
        "features": ["basic_voice_ai", "whatsapp_integration", "email_support"]
      },
      "business": {
        "price_ngn": 45000,
        "monthly_calls": 500,
        "features": ["advanced_voice_ai", "analytics", "priority_support", "custom_training"]
      },
      "enterprise": {
        "price_ngn": 120000,
        "monthly_calls": "unlimited",
        "features": ["full_customization", "dedicated_support", "on_premise_option", "api_access"]
      }
    }
  },
  "voice_settings": {
    "elevenlabs": {
      "voice_id": "atxzO10LEsk8kEval3af",
      "model": "eleven_multilingual_v2",
      "stability": 0.75,
      "similarity_boost": 0.85,
      "style": 0.6,
      "use_speaker_boost": true
    },
    "speech_patterns": {
      "max_response_words": 50,
      "speaking_rate": "natural",
      "emphasis_words": ["voice AI", "ODIA AI", "Nigerian business", "automation"],
      "pause_markers": ["...", "you know,", "abi?"]
    }
  },
  "conversation_flow": {
    "onboarding_stages": [
      {
        "stage": "welcome",
        "goal": "greet_and_identify_business",
        "questions": ["How far? What kind of business you dey run?"],
        "next_stage": "business_info"
      },
      {
        "stage": "business_info", 
        "goal": "gather_business_details",
        "questions": ["Wetin be your main challenge with customer service?"],
        "next_stage": "needs_analysis"
      },
      {
        "stage": "needs_analysis",
        "goal": "identify_pain_points",
        "questions": ["How many calls you dey receive daily?"],
        "next_stage": "solution_recommendation"
      },
      {
        "stage": "solution_recommendation",
        "goal": "recommend_suitable_plan",
        "questions": ["Make I show you how voice AI fit help your business?"],
        "next_stage": "trial_setup"
      },
      {
        "stage": "trial_setup",
        "goal": "setup_free_trial",
        "questions": ["Ready to start your 3-day free trial?"],
        "next_stage": "activation"
      }
    ]
  },
  "integration_endpoints": {
    "termii": {
      "base_url": "https://api.ng.termii.com/api",
      "send_endpoint": "/send/message",
      "required_fields": ["to", "from", "sms", "type", "channel", "api_key"]
    },
    "flutterwave": {
      "base_url": "https://api.flutterwave.com/v3",
      "payment_endpoint": "/payments",
      "webhook_events": ["charge.completed", "charge.failed"]
    },
    "supabase": {
      "tables": {
        "customers": "customer management",
        "whatsapp_conversations": "chat history",
        "voice_sessions": "voice call logs",
        "payment_flows": "payment tracking",
        "system_logs": "application monitoring"
      }
    }
  },
  "response_templates": {
    "welcome": "🇳🇬 How far! I'm Agent Lexi from ODIA AI. I dey help Nigerian businesses automate their customer service with voice AI. Wetin be your business?",
    "trial_activation": "🎉 Your 3-day FREE trial don start! You get 25 free voice calls to test everything. No wahala, no credit card needed. Ready to transform your business?",
    "payment_success": "✅ Payment successful! Your voice AI infrastructure don activate. Welcome to the future of Nigerian business automation!",
    "error_fallback": "Sorry o, small technical issue. Our team go help you sharp sharp. Try again in few minutes or message us directly.",
    "escalation": "Let me connect you with our Nigerian support team. They go sort this matter for you immediately."
  },
  "business_sectors": {
    "e_commerce": {
      "pain_points": ["order_tracking", "customer_inquiries", "return_processing"],
      "recommended_plan": "business",
      "roi_messaging": "Voice AI fit handle 80% of your customer calls automatically"
    },
    "fintech": {
      "pain_points": ["account_inquiries", "transaction_support", "kyc_verification"],
      "recommended_plan": "enterprise", 
      "roi_messaging": "Reduce call center costs by 70% while improving customer satisfaction"
    },
    "healthcare": {
      "pain_points": ["appointment_booking", "prescription_refills", "health_queries"],
      "recommended_plan": "business",
      "roi_messaging": "24/7 patient support without hiring night shift staff"
    },
    "education": {
      "pain_points": ["admission_inquiries", "student_support", "fee_payments"],
      "recommended_plan": "business",
      "roi_messaging": "Handle unlimited student inquiries during admission periods"
    }
  },
  "deployment": {
    "platform": "vercel",
    "domain": "https://whisper-weave-agent-voice.vercel.app",
    "environment": "production",
    "monitoring": {
      "health_endpoint": "/api/health",
      "logs_table": "system_logs",
      "alert_thresholds": {
        "response_time_ms": 5000,
        "error_rate_percent": 5,
        "uptime_percent": 99.9
      }
    }
  },
  "compliance": {
    "data_protection": "NDPR_compliant",
    "financial_regulations": "CBN_approved_partner_flutterwave",
    "telecommunications": "NCC_compliant_via_termii",
    "business_registration": "CAC_registered_odia_ai_ltd"
  }
}