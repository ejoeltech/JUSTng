# 🚀 Vercel Environment Variables for JUST Frontend

## 📋 **Required Environment Variables**

Copy and paste these **EXACTLY** into your Vercel dashboard:

### **1. Backend API URL**
```
Variable Name: VITE_BACKEND_URL
Value: https://just-backend-7y7t.onrender.com/api
Environment: Production, Preview, Development
```

### **2. Supabase URL**
```
Variable Name: VITE_SUPABASE_URL
Value: https://tuhsvbzbbftaxdfqvxds.supabase.co
Environment: Production, Preview, Development
```

### **3. Supabase Anonymous Key**
```
Variable Name: VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1aHN2YnpiYmZ0YXhkZnF2eGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5ODgyNTEsImV4cCI6MjA3MTU2NDI1MX0.lLL6mwCKIHikjU5GS_nMUX__fSSJc52a5FygQGUonPM
Environment: Production, Preview, Development
```

## 🔧 **How to Set These in Vercel:**

1. **Go to:** [vercel.com/dashboard](https://vercel.com/dashboard)
2. **Click your `just-frontend` project**
3. **Click "Settings" tab**
4. **Click "Environment Variables" in left sidebar**
5. **Add each variable one by one**
6. **Make sure to select ALL environments (Production, Preview, Development)**
7. **Click "Save" after each one**

## 🚨 **Important Notes:**

- **Copy the values EXACTLY** - no extra spaces or characters
- **The backend URL MUST end with `/api`**
- **Select ALL environments** for each variable
- **Redeploy after adding variables**

## ✅ **After Setting Variables:**

1. **Go to "Deployments" tab**
2. **Find latest deployment**
3. **Click three dots (⋮) → "Redeploy"**
4. **Wait for "Ready" status**

## 🎯 **What This Fixes:**

- ✅ **Failed to fetch error** - Frontend connects to backend
- ✅ **Authentication errors** - Supabase connection works
- ✅ **API calls** - All endpoints accessible
- ✅ **User registration/login** - Forms work properly

## 🔍 **Verify It's Working:**

1. **Visit your deployed frontend**
2. **Go to Dashboard page**
3. **Look for "Backend Connection Status" component**
4. **Should show "✅ CONNECTED"**

## 🆘 **If Still Getting Errors:**

1. **Check Vercel deployment logs**
2. **Verify environment variables are set correctly**
3. **Make sure backend is running at:** `https://just-backend-7y7t.onrender.com`
4. **Test backend health endpoint:** `https://just-backend-7y7t.onrender.com/health`

---

**These environment variables will fix your "Failed to fetch" error!** 🚀
