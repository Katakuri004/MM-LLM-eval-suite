#!/usr/bin/env python3
"""
Environment setup script for LMMS-Eval Dashboard.
This script helps you configure the .env file with Supabase credentials.
"""

import os
from pathlib import Path

def create_env_file():
    """Create the .env file with proper configuration."""
    
    env_content = """# Supabase Configuration
SUPABASE_URL=your_supabase_project_url_here
SUPABASE_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

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
    
    env_file = Path("backend/.env")
    
    if env_file.exists():
        print(f"✅ .env file already exists at {env_file}")
        return True
    
    try:
        env_file.parent.mkdir(exist_ok=True)
        env_file.write_text(env_content)
        print(f"✅ Created .env file at {env_file}")
        print("\n📝 Please edit the .env file and add your actual Supabase credentials:")
        print("   1. SUPABASE_URL - Your Supabase project URL")
        print("   2. SUPABASE_KEY - Your Supabase anon/public key")
        print("   3. SUPABASE_SERVICE_ROLE_KEY - Your Supabase service role key")
        return True
    except Exception as e:
        print(f"❌ Failed to create .env file: {e}")
        return False

def test_supabase_connection():
    """Test the Supabase connection."""
    
    try:
        from dotenv import load_dotenv
        load_dotenv("backend/.env")
        
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_KEY')
        
        if not supabase_url or not supabase_key:
            print("❌ Supabase credentials not found in .env file")
            return False
        
        if supabase_url == "your_supabase_project_url_here" or supabase_key == "your_supabase_anon_key_here":
            print("❌ Please update the .env file with your actual Supabase credentials")
            return False
        
        print(f"✅ Supabase URL: {supabase_url}")
        print(f"✅ Supabase Key: {supabase_key[:20]}...")
        
        # Test connection
        import requests
        response = requests.get(
            f"{supabase_url}/rest/v1/",
            headers={
                "apikey": supabase_key,
                "Authorization": f"Bearer {supabase_key}"
            },
            timeout=10
        )
        
        if response.status_code == 200:
            print("✅ Supabase connection successful!")
            return True
        else:
            print(f"❌ Supabase connection failed: {response.status_code}")
            return False
            
    except ImportError:
        print("❌ python-dotenv not installed. Run: pip install python-dotenv")
        return False
    except Exception as e:
        print(f"❌ Connection test failed: {e}")
        return False

def main():
    """Main setup function."""
    print("🚀 LMMS-Eval Dashboard Environment Setup")
    print("=" * 50)
    
    # Create .env file
    if create_env_file():
        print("\n🔍 Testing Supabase connection...")
        if test_supabase_connection():
            print("\n🎉 Environment setup completed successfully!")
            print("\nNext steps:")
            print("1. Run: python setup_database.py")
            print("2. Restart the backend server")
            print("3. The backend should now connect to Supabase in full mode")
        else:
            print("\n⚠️  Please update your .env file with correct Supabase credentials")
    else:
        print("\n❌ Environment setup failed")

if __name__ == "__main__":
    main()
