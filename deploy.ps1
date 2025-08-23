# JUST App Deployment Script (PowerShell)
# This script automates the deployment process for both frontend and backend

param(
    [string]$DeployOption = "3",
    [string]$BackendPlatform = "1"
)

# Set error action preference
$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting JUST App Deployment..." -ForegroundColor Cyan

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check if required tools are installed
function Test-Prerequisites {
    Write-Status "Checking prerequisites..."
    
    # Check Node.js
    try {
        $nodeVersion = node --version
        Write-Success "Node.js found: $nodeVersion"
    }
    catch {
        Write-Error "Node.js is not installed. Please install Node.js v18 or higher."
        exit 1
    }
    
    # Check npm
    try {
        $npmVersion = npm --version
        Write-Success "npm found: $npmVersion"
    }
    catch {
        Write-Error "npm is not installed. Please install npm."
        exit 1
    }
    
    # Check Git
    try {
        $gitVersion = git --version
        Write-Success "Git found: $gitVersion"
    }
    catch {
        Write-Error "Git is not installed. Please install Git."
        exit 1
    }
    
    Write-Success "Prerequisites check passed"
}

# Build frontend
function Build-Frontend {
    Write-Status "Building frontend..."
    
    Push-Location frontend
    
    try {
        # Install dependencies
        Write-Status "Installing frontend dependencies..."
        npm install
        
        # Build for production
        Write-Status "Building frontend for production..."
        npm run build
        
        Write-Success "Frontend build completed"
    }
    finally {
        Pop-Location
    }
}

# Deploy frontend to Vercel
function Deploy-Frontend {
    Write-Status "Deploying frontend to Vercel..."
    
    Push-Location frontend
    
    try {
        # Check if Vercel CLI is installed
        try {
            $vercelVersion = vercel --version
            Write-Success "Vercel CLI found: $vercelVersion"
        }
        catch {
            Write-Warning "Vercel CLI not found. Installing..."
            npm install -g vercel
        }
        
        # Deploy to Vercel
        Write-Status "Running Vercel deployment..."
        vercel --prod --yes
        
        Write-Success "Frontend deployed to Vercel"
    }
    finally {
        Pop-Location
    }
}

# Deploy backend to Render
function Deploy-BackendRender {
    Write-Status "Deploying backend to Render..."
    
    Write-Warning "Manual deployment required for Render:"
    Write-Host "1. Visit https://render.com" -ForegroundColor Yellow
    Write-Host "2. Create new Web Service" -ForegroundColor Yellow
    Write-Host "3. Connect your GitHub repository" -ForegroundColor Yellow
    Write-Host "4. Configure environment variables" -ForegroundColor Yellow
    Write-Host "5. Deploy" -ForegroundColor Yellow
    
    Read-Host "Press Enter when backend is deployed to Render..."
}

# Deploy backend to Railway
function Deploy-BackendRailway {
    Write-Status "Deploying backend to Railway..."
    
    Write-Warning "Manual deployment required for Railway:"
    Write-Host "1. Visit https://railway.app" -ForegroundColor Yellow
    Write-Host "2. Create new project" -ForegroundColor Yellow
    Write-Host "3. Deploy from GitHub repo" -ForegroundColor Yellow
    Write-Host "4. Configure environment variables" -ForegroundColor Yellow
    Write-Host "5. Deploy" -ForegroundColor Yellow
    
    Read-Host "Press Enter when backend is deployed to Railway..."
}

# Run tests
function Invoke-Tests {
    Write-Status "Running tests..."
    
    # Backend tests
    Push-Location backend
    try {
        if (npm test) {
            Write-Success "Backend tests passed"
        }
        else {
            Write-Warning "Backend tests failed - continuing deployment"
        }
    }
    catch {
        Write-Warning "Backend tests failed - continuing deployment"
    }
    finally {
        Pop-Location
    }
    
    # Frontend tests (if available)
    Push-Location frontend
    try {
        if (npm run test) {
            Write-Success "Frontend tests passed"
        }
        else {
            Write-Warning "Frontend tests failed - continuing deployment"
        }
    }
    catch {
        Write-Warning "Frontend tests failed - continuing deployment"
    }
    finally {
        Pop-Location
    }
}

# Main deployment flow
function Start-Deployment {
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "    JUST App Deployment Script" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    
    # Check prerequisites
    Test-Prerequisites
    
    # Use parameters or ask user for deployment preferences
    if ($DeployOption -eq "") {
        Write-Host ""
        Write-Host "Choose deployment options:" -ForegroundColor White
        Write-Host "1. Deploy frontend only" -ForegroundColor White
        Write-Host "2. Deploy backend only" -ForegroundColor White
        Write-Host "3. Deploy both (recommended)" -ForegroundColor White
        Write-Host "4. Exit" -ForegroundColor White
        
        $DeployOption = Read-Host "Enter your choice (1-4)"
    }
    
    switch ($DeployOption) {
        "1" {
            Build-Frontend
            Deploy-Frontend
        }
        "2" {
            if ($BackendPlatform -eq "") {
                Write-Host "Choose backend platform:" -ForegroundColor White
                Write-Host "1. Render" -ForegroundColor White
                Write-Host "2. Railway" -ForegroundColor White
                $BackendPlatform = Read-Host "Enter your choice (1-2)"
            }
            
            switch ($BackendPlatform) {
                "1" { Deploy-BackendRender }
                "2" { Deploy-BackendRailway }
                default { Write-Error "Invalid choice" ; exit 1 }
            }
        }
        "3" {
            Build-Frontend
            Deploy-Frontend
            
            if ($BackendPlatform -eq "") {
                Write-Host "Choose backend platform:" -ForegroundColor White
                Write-Host "1. Render" -ForegroundColor White
                Write-Host "2. Railway" -ForegroundColor White
                $BackendPlatform = Read-Host "Enter your choice (1-2)"
            }
            
            switch ($BackendPlatform) {
                "1" { Deploy-BackendRender }
                "2" { Deploy-BackendRailway }
                default { Write-Error "Invalid choice" ; exit 1 }
            }
        }
        "4" {
            Write-Status "Deployment cancelled"
            exit 0
        }
        default {
            Write-Error "Invalid choice"
            exit 1
        }
    }
    
    # Run tests if deploying both
    if ($DeployOption -eq "3") {
        Invoke-Tests
    }
    
    # Final instructions
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "    Deployment Summary" -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Success "Deployment completed!"
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor White
    Write-Host "1. Configure environment variables in your deployment platform" -ForegroundColor White
    Write-Host "2. Test your application" -ForegroundColor White
    Write-Host "3. Set up monitoring and logging" -ForegroundColor White
    Write-Host "4. Configure custom domains if needed" -ForegroundColor White
    Write-Host "5. Set up CI/CD for future deployments" -ForegroundColor White
    Write-Host ""
    Write-Host "For detailed instructions, see DEPLOYMENT.md" -ForegroundColor White
    Write-Host "==========================================" -ForegroundColor Cyan
}

# Run main deployment function
Start-Deployment
