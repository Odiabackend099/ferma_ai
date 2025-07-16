#!/bin/bash

# ODIA AI - Agent Lexi Deployment Script
# Whisper Weave Agent Voice - Nigeria's First Voice-Based AI Infrastructure

set -e

echo "🇳🇬 ODIA AI - Deploying Agent Lexi (Whisper Weave) to Production"
echo "================================================================="

# Check if required tools are installed
command -v vercel >/dev/null 2>&1 || { echo "❌ Vercel CLI required. Install: npm i -g vercel"; exit 1; }
command -v git >/dev/null 2>&1 || { echo "❌ Git required"; exit 1; }

# Check if environment file exists
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local file not found!"
    echo "📋 Copy .env.example to .env.local and add your API keys"
    exit 1
fi

# Verify required environment variables
echo "🔍 Checking environment variables..."

required_vars=(
    "TWILIO_ACCOUNT_SID"
    "TWILIO_AUTH_TOKEN"
    "SUPABASE_URL"
    "SUPABASE_ANON_KEY"
    "ANTHROPIC_API_KEY"
    "ELEVENLABS_API_KEY"
    "FLUTTERWAVE_SECRET_KEY"
)

missing_vars=()
for var in "${required_vars[@]}"; do
    if ! grep -q "^$var=" .env.local; then
        missing_vars+=($var)
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo "❌ Missing required environment variables:"
    printf '   %s\n' "${missing_vars[@]}"
    exit 1
fi

echo "✅ Environment variables verified"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run tests if they exist
if [ -f "package.json" ] && grep -q "\"test\"" package.json; then
    echo "🧪 Running tests..."
    npm test
fi

# Add environment variables to Vercel
echo "🔐 Setting up Vercel environment variables..."

# Read .env.local and add to Vercel
while IFS='=' read -r key value; do
    # Skip comments and empty lines
    [[ $key =~ ^#.*$ 