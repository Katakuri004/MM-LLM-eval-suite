# Local LMMS-Eval Integration Summary

## 🎯 Overview

This document summarizes the configuration updates made to integrate your local lmms-eval installation at `/lmms-eval` with the LMMS-Eval Dashboard.

## ✅ Configuration Updates Made

### 1. **LMMSEvalRunner Updates** (`backend/runners/lmms_eval_runner.py`)

- **Enhanced Path Detection**: Updated `_find_lmms_eval_path()` method to prioritize local lmms-eval installation
- **Configuration Integration**: Added support for reading lmms-eval path from settings
- **Local Path Priority**: Added `/lmms-eval` as the first path to check
- **Logging**: Added detailed logging for path detection and validation

```python
def _find_lmms_eval_path(self) -> str:
    # First check if path is configured in settings
    if hasattr(settings, 'lmms_eval_path') and settings.lmms_eval_path:
        configured_path = settings.lmms_eval_path
        if os.path.exists(os.path.join(configured_path, "lmms_eval")):
            logger.info(f"Using configured lmms-eval path: {configured_path}")
            return configured_path
    
    # Check local lmms-eval directory first
    local_paths = [
        os.path.join(os.getcwd(), "lmms-eval"),
        os.path.join(os.path.dirname(os.getcwd()), "lmms-eval"),
        "/lmms-eval"  # Your local installation
    ]
    # ... rest of the method
```

### 2. **Configuration Updates** (`backend/config.py`)

- **Added LMMS-Eval Settings**: Added lmms-eval specific configuration to the Settings class
- **Environment Variable Support**: Added support for `LMMS_EVAL_PATH`, `HF_HOME`, `HF_TOKEN`, and API keys
- **Default Path**: Set default lmms-eval path to `/lmms-eval`

```python
# LMMS-Eval Integration
lmms_eval_path: str = "/lmms-eval"
hf_home: str = "/path/to/huggingface/cache"
hf_token: Optional[str] = None

# API Keys for different services
openai_api_key: Optional[str] = None
anthropic_api_key: Optional[str] = None
dashscope_api_key: Optional[str] = None
reka_api_key: Optional[str] = None
```

### 3. **Environment Configuration** (`backend/env.example`)

- **Updated Environment Template**: Added lmms-eval specific environment variables
- **Local Path Configuration**: Set `LMMS_EVAL_PATH=/lmms-eval`
- **API Keys**: Added placeholders for various API keys

```bash
# LMMS-Eval Integration
LMMS_EVAL_PATH=/lmms-eval
HF_HOME=/path/to/huggingface/cache
HF_TOKEN=your_huggingface_token

# API Keys for different services
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
DASHSCOPE_API_KEY=your_dashscope_key
REKA_API_KEY=your_reka_key
```

### 4. **Docker Compose Updates** (`docker-compose.yml`)

- **Volume Mounting**: Added volume mount for `/lmms-eval:/lmms-eval:ro`
- **Environment Variables**: Added lmms-eval specific environment variables
- **Both Services**: Updated both backend and lmms-eval-runner services

```yaml
backend:
  environment:
    - LMMS_EVAL_PATH=/lmms-eval
    - HF_HOME=${HF_HOME:-/root/.cache/huggingface}
    - HF_TOKEN=${HF_TOKEN}
  volumes:
    - /lmms-eval:/lmms-eval:ro

lmms-eval-runner:
  environment:
    - LMMS_EVAL_PATH=/lmms-eval
    - HF_HOME=${HF_HOME:-/root/.cache/huggingface}
    - HF_TOKEN=${HF_TOKEN}
  volumes:
    - /lmms-eval:/lmms-eval:ro
```

### 5. **Documentation Updates**

#### **Setup Guide** (`SETUP_GUIDE.md`)
- **Updated Installation Section**: Changed to reflect local lmms-eval installation
- **Environment Configuration**: Updated with correct lmms-eval path
- **Verification Steps**: Added steps to verify local installation

#### **README** (`README.md`)
- **Installation Instructions**: Updated to reflect local lmms-eval setup
- **Environment Variables**: Updated with correct lmms-eval path
- **Quick Start**: Simplified setup process

### 6. **Testing and Verification**

#### **Integration Test Script** (`test_lmms_eval_integration.py`)
- **Comprehensive Testing**: Created script to test all aspects of lmms-eval integration
- **Path Detection**: Tests lmms-eval path detection
- **CLI Functionality**: Tests lmms-eval CLI commands
- **Runner Integration**: Tests LMMSEvalRunner initialization
- **Environment Validation**: Tests environment variable configuration

#### **Quick Start Scripts**
- **Windows Batch File** (`quick_start.bat`): Windows-compatible setup script
- **Linux/Mac Shell Script** (`quick_start.sh`): Unix-compatible setup script
- **Automated Setup**: Handles environment setup, dependency installation, and service startup

## 🚀 How to Use

### 1. **Verify Local Installation**
```bash
# Check if lmms-eval is accessible
cd /lmms-eval
python -m lmms_eval --help

# Check available models
python -m lmms_eval --models

# Check available benchmarks
python -m lmms_eval --benchmarks
```

### 2. **Configure Environment**
```bash
# Copy environment template
cp backend/env.example backend/.env

# Edit with your configuration
# Set LMMS_EVAL_PATH=/lmms-eval (already set)
# Add your API keys and other configuration
```

### 3. **Test Integration**
```bash
# Run the integration test
python test_lmms_eval_integration.py

# Or use the quick start script
# Windows:
quick_start.bat

# Linux/Mac:
./quick_start.sh
```

### 4. **Start the Dashboard**
```bash
# Using Docker Compose
docker-compose up -d

# Or manually
cd backend && python main.py
cd frontend && npm run dev
```

## 🔧 Configuration Details

### **Path Detection Priority**
1. **Settings Configuration**: `settings.lmms_eval_path` (from environment variable)
2. **Local Paths**: Current directory, parent directory, `/lmms-eval`
3. **Common Paths**: `/opt/lmms-eval`, `/usr/local/lmms-eval`, `~/lmms-eval`
4. **Python Import**: Try to import lmms_eval and get path
5. **Default**: Current directory

### **Environment Variables**
- `LMMS_EVAL_PATH=/lmms-eval` - Path to lmms-eval installation
- `HF_HOME=/path/to/huggingface/cache` - Hugging Face cache directory
- `HF_TOKEN=your_token` - Hugging Face API token
- `OPENAI_API_KEY=your_key` - OpenAI API key
- `ANTHROPIC_API_KEY=your_key` - Anthropic API key
- `DASHSCOPE_API_KEY=your_key` - DashScope API key
- `REKA_API_KEY=your_key` - Reka API key

### **Docker Integration**
- **Volume Mount**: `/lmms-eval:/lmms-eval:ro` (read-only)
- **Environment Variables**: Passed through to containers
- **Both Services**: Backend and runner services have access to lmms-eval

## 🎯 Benefits

### **1. Seamless Integration**
- **Automatic Detection**: Dashboard automatically finds your local lmms-eval installation
- **No Manual Configuration**: Works out of the box with `/lmms-eval` path
- **Fallback Support**: Multiple fallback paths if primary path is not found

### **2. Development Friendly**
- **Local Development**: Use your local lmms-eval installation for development
- **Version Control**: Keep lmms-eval separate from dashboard code
- **Easy Updates**: Update lmms-eval independently

### **3. Production Ready**
- **Docker Support**: Works with Docker containers
- **Environment Flexibility**: Can be configured for different environments
- **Scalable**: Supports distributed evaluation setups

## 🔍 Troubleshooting

### **Common Issues**

#### **1. lmms-eval Not Found**
```bash
# Check if lmms-eval exists
ls -la /lmms-eval

# Check if lmms_eval module exists
ls -la /lmms-eval/lmms_eval

# Test CLI
cd /lmms-eval && python -m lmms_eval --help
```

#### **2. Permission Issues**
```bash
# Check permissions
ls -la /lmms-eval

# Fix permissions if needed
sudo chown -R $USER:$USER /lmms-eval
```

#### **3. Python Path Issues**
```bash
# Add lmms-eval to Python path
export PYTHONPATH="/lmms-eval:$PYTHONPATH"

# Or install in development mode
cd /lmms-eval && pip install -e .
```

#### **4. Docker Volume Issues**
```bash
# Check Docker volume mount
docker-compose exec backend ls -la /lmms-eval

# Check volume configuration
docker-compose config
```

### **Debug Mode**
```bash
# Enable debug logging
export LOG_LEVEL=DEBUG

# Run with verbose output
python test_lmms_eval_integration.py
```

## 📊 Verification Checklist

- [ ] **lmms-eval Directory**: `/lmms-eval` exists and contains `lmms_eval` module
- [ ] **CLI Working**: `python -m lmms_eval --help` works
- [ ] **Models Available**: `python -m lmms_eval --models` shows models
- [ ] **Benchmarks Available**: `python -m lmms_eval --benchmarks` shows benchmarks
- [ ] **Environment Variables**: `.env` file configured correctly
- [ ] **Integration Test**: `python test_lmms_eval_integration.py` passes
- [ ] **Docker Mount**: Docker containers can access `/lmms-eval`
- [ ] **Dashboard Startup**: Dashboard starts without errors

## 🎉 Conclusion

Your local lmms-eval installation at `/lmms-eval` is now fully integrated with the LMMS-Eval Dashboard. The integration provides:

- **Automatic Detection**: Dashboard finds your local installation automatically
- **Seamless Operation**: Works with both manual and Docker deployments
- **Development Ready**: Perfect for local development and testing
- **Production Ready**: Scalable and configurable for production use

The integration maintains all the powerful features of the [lmms-eval](https://github.com/EvolvingLMMs-Lab/lmms-eval) framework while providing a user-friendly web interface for managing evaluations, monitoring progress, and analyzing results.

---

**Ready to start evaluating multimodal models! 🚀**
