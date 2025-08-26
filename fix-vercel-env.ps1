# 🚀 JUST Frontend - Vercel Environment Variables Setup Script
# This script helps you set up the required environment variables in Vercel

Write-Host "🚀 JUST Frontend - Vercel Environment Variables Setup" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""

Write-Host "📋 Required Environment Variables:" -ForegroundColor Yellow
Write-Host ""

Write-Host "1️⃣ VITE_BACKEND_URL" -ForegroundColor Cyan
Write-Host "   Value: https://just-backend-7y7t.onrender.com/api" -ForegroundColor White
Write-Host ""

Write-Host "2️⃣ VITE_SUPABASE_URL" -ForegroundColor Cyan
Write-Host "   Value: https://tuhsvbzbbftaxdfqvxds.supabase.co" -ForegroundColor White
Write-Host ""

Write-Host "3️⃣ VITE_SUPABASE_ANON_KEY" -ForegroundColor Cyan
Write-Host "   Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1aHN2YnpiYmZ0YXhkZnF2eGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5ODgyNTEsImV4cCI6MjA3MTU2NDI1MX0.lLL6mwCKIHikjU5GS_nMUX__fSSJc52a5FygQGUonPM" -ForegroundColor White
Write-Host ""

Write-Host "🔧 Setup Instructions:" -ForegroundColor Yellow
Write-Host ""

Write-Host "1. Go to: https://vercel.com/dashboard" -ForegroundColor White
Write-Host "2. Click your 'just-frontend' project" -ForegroundColor White
Write-Host "3. Click 'Settings' tab" -ForegroundColor White
Write-Host "4. Click 'Environment Variables' in left sidebar" -ForegroundColor White
Write-Host "5. Add each variable above (copy EXACTLY)" -ForegroundColor White
Write-Host "6. Select ALL environments (Production, Preview, Development)" -ForegroundColor White
Write-Host "7. Click 'Save' after each one" -ForegroundColor White
Write-Host "8. Redeploy your frontend" -ForegroundColor White
Write-Host ""

Write-Host "✅ After Setup:" -ForegroundColor Green
Write-Host "   - Your 'Failed to fetch' error will disappear" -ForegroundColor White
Write-Host "   - User registration/login will work" -ForegroundColor White
Write-Host "   - All API calls will connect to your backend" -ForegroundColor White
Write-Host ""

Write-Host "🔍 Verify It's Working:" -ForegroundColor Yellow
Write-Host "1. Visit your deployed frontend" -ForegroundColor White
Write-Host "2. Go to Dashboard page" -ForegroundColor White
Write-Host "3. Look for Backend Connection Status component" -ForegroundColor White
Write-Host "4. Should show CONNECTED" -ForegroundColor White
Write-Host ""

Write-Host "🚨 Important Notes:" -ForegroundColor Red
Write-Host "- Copy values EXACTLY - no extra spaces" -ForegroundColor White
Write-Host "- Backend URL MUST end with /api" -ForegroundColor White
Write-Host "- Select ALL environments for each variable" -ForegroundColor White
Write-Host "- Redeploy after adding variables" -ForegroundColor White
Write-Host ""

Write-Host "🎯 This will fix your Failed to fetch error!" -ForegroundColor Green
Write-Host ""

# Test backend connection
Write-Host "🔍 Testing Backend Connection..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://just-backend-7y7t.onrender.com/" -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Backend is running and accessible!" -ForegroundColor Green
    } else {
        Write-Host "❌ Backend returned status: $($response.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Cannot connect to backend: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
