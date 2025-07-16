#!/bin/bash

# Agent Lexi - Whisper Weave Agent Voice Setup Script
# Connect to existing GitHub repository

set -e

echo "🇳🇬 Setting up Agent Lexi - Whisper Weave Agent Voice"
echo "======================================================"

# Check if git is installed
command -v git >/dev/null 2>&1 || { echo "❌ Git required. Install git first."; exit 1; }

# Initialize git if not already done
if [ ! -d ".git" ]; then
    echo "📁 Initializing Git repository..."
    git init
fi

# Add remote origin if not exists
if ! git remote | grep -q "origin"; then
    echo "🔗 Adding GitHub remote..."
    git remote add origin https://github.com/ODIAvoiceaiagency/whisper-weave-agent-voice.git
else
    echo "🔗 Remote origin already exists, updating URL..."
    git remote set-url origin https://github.com/ODIAvoiceaiagency/whisper-weave-agent-voice.git
fi

# Create .gitignore if not exists
if [ ! -f ".gitignore" ]; then
    echo "📝 Creating .gitignore..."
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Vercel
.vercel/
.vercel

# Build outputs
.next/
out/
dist/
build/

# ODIA AI specific
/supabase-keys.json
/termii-config.json
/flutterwave-test.json
/voice-samples/

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS generated files
.DS_Store
Thumbs.db
EOF
fi

# Stage all files
echo "📦 Staging files for commit..."
git add .

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo "✅ No changes to commit. Repository is up to date."
else
    # Commit changes
    echo "💾 Committing Agent Lexi files..."
    git commit -m "🇳🇬 Initial Agent Lexi setup - Whisper Weave Agent Voice

✅ TERMII WhatsApp integration
✅ 3-day trial (25 calls)
✅ Flutterwave payments (NGN)
✅ Nigerian English voice processing
✅ Production-ready Vercel deployment

Agent Lexi ready for Nigerian businesses!"
fi

# Push to GitHub
echo "🚀 Pushing to GitHub..."
git branch -M main

# Try to push, handle authentication if needed
if git push -u origin main; then
    echo "✅ Successfully pushed to GitHub!"
else
    echo "⚠️  Push failed. You may need to authenticate with GitHub."
    echo "💡 Run: gh auth login"
    echo "💡 Or set up SSH keys: https://docs.github.com/en/authentication/connecting-to-github-with-ssh"
fi

echo ""
echo "🎉 Git setup complete!"
echo "📂 Repository: https://github.com/ODIAvoiceaiagency/whisper-weave-agent-voice"
echo ""
echo "🔧 Next steps:"
echo "1. Set up environment variables"
echo "2. Deploy to Vercel: ./deploy.sh"
echo "3. Configure TERMII webhooks"
echo "4. Test Agent Lexi integration"
echo ""
echo "🇳🇬 Nigeria's voice AI infrastructure is ready!"