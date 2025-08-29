# JUST (Justice Under Surveillance Tech)

A full-stack web application for Nigerians to report police harassment incidents in real-time.

## 🚀 Features

- **Real-time Harassment Reporting** with GPS location capture
- **Live Video Streaming** using WebRTC
- **Interactive Incident Map** with Leaflet.js
- **Role-based Access Control** (User, Admin, SuperAdmin)
- **Offline Support** with local queuing
- **Mobile-first Responsive Design**

## 🏗️ Tech Stack

- **Frontend**: React + TailwindCSS
- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Deployment**: Vercel (Frontend) + Render/Railway (Backend)

## 📁 Project Structure

```
_JUST/
├── frontend/          # React application
├── backend/           # Node.js API server
├── docs/             # Documentation
├── .env.example      # Environment variables template
├── NEXT_STEPS.md     # Project roadmap tracker
└── README.md         # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Git

### 1. Clone & Setup

```bash
git clone https://github.com/ejoeltech/JUSTng.git
cd _JUST
```

### 2. Environment Setup

```bash
# Copy environment templates
cp .env.example .env
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

Edit the `.env` files with your Supabase credentials.

### 3. Install Dependencies

```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### 4. Start Development

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev
```

## 🌐 Deployment

### Frontend (Vercel)

```bash
cd frontend
npm run build
vercel --prod
```

### Backend (Render/Railway)

1. Push to GitHub
2. Connect repository to Render/Railway
3. Set environment variables
4. Deploy

## 📱 Mobile Optimization

- Progressive Web App (PWA) support
- Touch-friendly interface
- Offline-first architecture
- GPS location services

## 🔒 Security Features

- JWT authentication
- Role-based access control
- Encrypted video storage
- Secure API endpoints
- Input validation & sanitization

## 🧪 Testing

```bash
# Frontend tests
cd frontend
npm test

# Backend tests
cd backend
npm test
```

## 📊 Admin Features

- User management
- Incident analytics
- State/LGA filtering
- Maintenance mode toggle
- Database backup/restore

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For support, email support@just-app.ng or create an issue.

---

**Keep pushing. JUST matters!** 🚀

<!-- Git configuration updated to use ejoeltech-4856 -->
<!-- Standardized error handling system deployed -->
