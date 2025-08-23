#!/bin/bash

# JUST App Deployment Script
# This script automates the deployment process for both frontend and backend

set -e

echo "🚀 Starting JUST App Deployment..."

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

# Check if required tools are installed
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js v18 or higher."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm."
        exit 1
    fi
    
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed. Please install Git."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Build frontend
build_frontend() {
    print_status "Building frontend..."
    
    cd frontend
    
    # Install dependencies
    print_status "Installing frontend dependencies..."
    npm install
    
    # Build for production
    print_status "Building frontend for production..."
    npm run build
    
    print_success "Frontend build completed"
    cd ..
}

# Deploy frontend to Vercel
deploy_frontend() {
    print_status "Deploying frontend to Vercel..."
    
    cd frontend
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        print_warning "Vercel CLI not found. Installing..."
        npm install -g vercel
    fi
    
    # Deploy to Vercel
    print_status "Running Vercel deployment..."
    vercel --prod --yes
    
    print_success "Frontend deployed to Vercel"
    cd ..
}

# Deploy backend to Render
deploy_backend_render() {
    print_status "Deploying backend to Render..."
    
    print_warning "Manual deployment required for Render:"
    echo "1. Visit https://render.com"
    echo "2. Create new Web Service"
    echo "3. Connect your GitHub repository"
    echo "4. Configure environment variables"
    echo "5. Deploy"
    
    read -p "Press Enter when backend is deployed to Render..."
}

# Deploy backend to Railway
deploy_backend_railway() {
    print_status "Deploying backend to Railway..."
    
    print_warning "Manual deployment required for Railway:"
    echo "1. Visit https://railway.app"
    echo "2. Create new project"
    echo "3. Deploy from GitHub repo"
    echo "4. Configure environment variables"
    echo "5. Deploy"
    
    read -p "Press Enter when backend is deployed to Railway..."
}

# Run tests
run_tests() {
    print_status "Running tests..."
    
    # Backend tests
    cd backend
    if npm test; then
        print_success "Backend tests passed"
    else
        print_warning "Backend tests failed - continuing deployment"
    fi
    cd ..
    
    # Frontend tests (if available)
    cd frontend
    if npm run test; then
        print_success "Frontend tests passed"
    else
        print_warning "Frontend tests failed - continuing deployment"
    fi
    cd ..
}

# Health check
health_check() {
    print_status "Performing health checks..."
    
    # This would need to be updated with actual URLs after deployment
    print_warning "Health checks require deployed URLs. Please run manually after deployment."
}

# Main deployment flow
main() {
    echo "=========================================="
    echo "    JUST App Deployment Script"
    echo "=========================================="
    
    # Check prerequisites
    check_prerequisites
    
    # Ask user for deployment preferences
    echo ""
    echo "Choose deployment options:"
    echo "1. Deploy frontend only"
    echo "2. Deploy backend only"
    echo "3. Deploy both (recommended)"
    echo "4. Exit"
    
    read -p "Enter your choice (1-4): " choice
    
    case $choice in
        1)
            build_frontend
            deploy_frontend
            ;;
        2)
            echo "Choose backend platform:"
            echo "1. Render"
            echo "2. Railway"
            read -p "Enter your choice (1-2): " backend_choice
            
            case $backend_choice in
                1) deploy_backend_render ;;
                2) deploy_backend_railway ;;
                *) print_error "Invalid choice" && exit 1 ;;
            esac
            ;;
        3)
            build_frontend
            deploy_frontend
            
            echo "Choose backend platform:"
            echo "1. Render"
            echo "2. Railway"
            read -p "Enter your choice (1-2): " backend_choice
            
            case $backend_choice in
                1) deploy_backend_render ;;
                2) deploy_backend_railway ;;
                *) print_error "Invalid choice" && exit 1 ;;
            esac
            ;;
        4)
            print_status "Deployment cancelled"
            exit 0
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac
    
    # Run tests if deploying both
    if [ "$choice" = "3" ]; then
        run_tests
    fi
    
    # Final instructions
    echo ""
    echo "=========================================="
    echo "    Deployment Summary"
    echo "=========================================="
    print_success "Deployment completed!"
    echo ""
    echo "Next steps:"
    echo "1. Configure environment variables in your deployment platform"
    echo "2. Test your application"
    echo "3. Set up monitoring and logging"
    echo "4. Configure custom domains if needed"
    echo "5. Set up CI/CD for future deployments"
    echo ""
    echo "For detailed instructions, see DEPLOYMENT.md"
    echo "=========================================="
}

# Run main function
main "$@"
