
const BASE_URL = 'https://api.odia.dev';
const API_KEY = 'odia_prod_key_2024_atlas_lexi_v1';

export async function startConversation(agentId, userId, config = {}) {
  const response = await fetch(\`\${BASE_URL}/api/v1/agents/\${agentId}/conversations\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({
      user_id: userId,
      language: 'en-NG',
      session_config: {
        max_duration: 1800,
        enable_analytics: true,
        enable_payments: true,
        ...config
      }
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to start conversation');
  }

  return await response.json();
}
