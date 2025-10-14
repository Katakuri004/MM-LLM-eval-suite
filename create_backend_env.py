#!/usr/bin/env python3
"""
Script to create the backend/.env file with proper Supabase credentials.
"""

import os
from pathlib import Path

def create_backend_env():
    """Create the backend/.env file."""
    
    env_content = """# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# LMMS-Eval Configuration
LMMS_EVAL_PATH=./lmms-eval
HF_HOME=/path/to/huggingface/cache
HF_TOKEN=your_huggingface_token_here

# API Keys (optional)
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
DASHSCOPE_API_KEY=your_dashscope_key_here
REKA_API_KEY=your_reka_key_here

# Development Configuration
DEBUG=false
RELOAD=false
"""
    
    backend_dir = Path("backend")
    env_file = backend_dir / ".env"
    
    # Create backend directory if it doesn't exist
    backend_dir.mkdir(exist_ok=True)
    
    # Write the .env file
    env_file.write_text(env_content)
    
    print(f"✅ Created {env_file}")
    print("\n📝 IMPORTANT: Please edit this file and replace the placeholder values with your actual Supabase credentials:")
    print("   1. SUPABASE_URL - Your Supabase project URL")
    print("   2. SUPABASE_KEY - Your Supabase anon/public key") 
    print("   3. SUPABASE_SERVICE_ROLE_KEY - Your Supabase service role key")
    print(f"\n   File location: {env_file.absolute()}")

if __name__ == "__main__":
    create_backend_env()
