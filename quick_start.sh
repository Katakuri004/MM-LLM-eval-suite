#!/bin/bash

# Quick Start Script for LMMS-Eval Dashboard
# This script helps you get started with the dashboard and test the lmms-eval integration

set -e

echo "🚀 LMMS-Eval Dashboard Quick Start"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if lmms-eval exists
check_lmms_eval() {
    print_status "Checking lmms-eval installation..."
    
    if [ -d "/lmms-eval" ]; then
        print_success "Found lmms-eval at /lmms-eval"
        
        if [ -d "/lmms-eval/lmms_eval" ]; then
            print_success "Found lmms_eval module"
            return 0
        else
            print_error "lmms_eval module not found in /lmms-eval"
            return 1
        fi
    else
        print_error "lmms-eval not found at /lmms-eval"
        print_warning "Please ensure lmms-eval is installed at /lmms-eval"
        return 1
    fi
}

# Test lmms-eval CLI
test_lmms_eval_cli() {
    print_status "Testing lmms-eval CLI..."
    
    if python -m lmms_eval --help > /dev/null 2>&1; then
        print_success "lmms-eval CLI is working"
        return 0
    else
        print_error "lmms-eval CLI is not working"
        return 1
    fi
}

# Setup environment
setup_environment() {
    print_status "Setting up environment..."
    
    # Check if .env exists
    if [ ! -f "backend/.env" ]; then
        print_warning ".env file not found, creating from template..."
        cp backend/env.example backend/.env
        print_warning "Please edit backend/.env with your configuration"
    else
        print_success ".env file found"
    fi
    
    # Check if frontend .env.local exists
    if [ ! -f "frontend/.env.local" ]; then
        print_warning "frontend/.env.local not found, creating from template..."
        cp frontend/.env.example frontend/.env.local 2>/dev/null || echo "REACT_APP_API_URL=http://localhost:8000/api/v1" > frontend/.env.local
        print_warning "Please edit frontend/.env.local with your configuration"
    else
        print_success "frontend/.env.local found"
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Backend dependencies
    if [ -f "backend/requirements.txt" ]; then
        print_status "Installing backend dependencies..."
        pip install -r backend/requirements.txt
        print_success "Backend dependencies installed"
    fi
    
    # Frontend dependencies
    if [ -f "frontend/package.json" ]; then
        print_status "Installing frontend dependencies..."
        cd frontend
        npm install
        cd ..
        print_success "Frontend dependencies installed"
    fi
}

# Test integration
test_integration() {
    print_status "Testing integration..."
    
    if [ -f "test_lmms_eval_integration.py" ]; then
        python test_lmms_eval_integration.py
    else
        print_warning "Integration test script not found"
    fi
}

# Start services
start_services() {
    print_status "Starting services..."
    
    # Check if Docker is available
    if command -v docker-compose > /dev/null 2>&1; then
        print_status "Starting with Docker Compose..."
        docker-compose up -d
        print_success "Services started with Docker Compose"
    else
        print_warning "Docker Compose not available, starting manually..."
        print_status "Starting backend..."
        cd backend
        python main.py &
        BACKEND_PID=$!
        cd ..
        
        print_status "Starting frontend..."
        cd frontend
        npm run dev &
        FRONTEND_PID=$!
        cd ..
        
        print_success "Services started manually"
        print_warning "Backend PID: $BACKEND_PID"
        print_warning "Frontend PID: $FRONTEND_PID"
        print_warning "Use 'kill $BACKEND_PID $FRONTEND_PID' to stop services"
    fi
}

# Main execution
main() {
    echo
    print_status "Starting LMMS-Eval Dashboard setup..."
    echo
    
    # Check lmms-eval
    if ! check_lmms_eval; then
        print_error "lmms-eval check failed. Please ensure lmms-eval is installed at /lmms-eval"
        exit 1
    fi
    
    # Test lmms-eval CLI
    if ! test_lmms_eval_cli; then
        print_error "lmms-eval CLI test failed. Please check your lmms-eval installation"
        exit 1
    fi
    
    # Setup environment
    setup_environment
    
    # Install dependencies
    install_dependencies
    
    # Test integration
    test_integration
    
    # Start services
    start_services
    
    echo
    print_success "Setup complete!"
    echo
    print_status "Dashboard should be available at:"
    print_status "  Frontend: http://localhost:3000"
    print_status "  Backend API: http://localhost:8000"
    print_status "  API Documentation: http://localhost:8000/docs"
    echo
    print_status "To stop services:"
    print_status "  Docker: docker-compose down"
    print_status "  Manual: Use the PIDs shown above"
    echo
}

# Run main function
main "$@"
