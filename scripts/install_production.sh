#!/bin/bash
# Production installation script

set -e

echo "Installing Production Evaluation System"
echo "========================================"

# Check Python version
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "Python version: $python_version"

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
pip install -r requirements.txt
pip install psutil  # Add if not in requirements

# Verify lmms-eval installation
echo "Checking lmms-eval installation..."
if [ ! -d "../lmms-eval" ]; then
    echo "ERROR: lmms-eval not found in project directory"
    echo "Please clone lmms-eval: git clone https://github.com/EvolvingLMMs-Lab/lmms-eval.git"
    exit 1
fi

cd ../lmms-eval
pip install -e .
cd ../backend

# Create workspace directory
echo "Creating workspace directory..."
mkdir -p /tmp/lmms_eval_workspace

# Verify database connection
echo "Verifying database connection..."
python -c "from services.supabase_service import supabase_service; print('Database connection OK')"

# Run tests
echo "Running tests..."
python test_production_flow.py

echo "========================================"
echo "Installation completed successfully!"
echo "Start server with: python main_complete.py"
