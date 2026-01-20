# TellBill - Invoice & Job Management App

A modern, privacy-first mobile application for creating, managing, and sending invoices. Built with React Native/Expo and powered by voice-to-text technology using OpenRouter's Whisper API.

## 🎯 Features

### Core Functionality
- **Voice-to-Invoice**: Record job details via voice, automatically extract invoice data
- **Invoice Management**: Create, edit, view, and manage invoices
- **Multi-channel Delivery**: Send invoices via Email, SMS, or WhatsApp
- **Client Management**: Track clients and their invoice history
- **Offline-First**: Full offline support with local SQLite database
- **Real-time Sync**: Automatic synchronization when connection restored

### Technical Features
- **AI-Powered**: Uses OpenRouter (GPT-4o-mini) for intelligent invoice data extraction
- **Speech Recognition**: OpenRouter Whisper API for accurate audio transcription
- **Secure Backend**: Custom authentication with bcrypt password hashing
- **Payment Integration**: Flutterwave for payment processing
- **Email Service**: Resend for reliable email delivery
- **Type-Safe Database**: Drizzle ORM with SQLite

## 📋 Tech Stack

### Frontend
- **Expo 54** - React Native development framework
- **React Native** - Cross-platform mobile UI
- **React Navigation** - Navigation and routing
- **TanStack React Query** - Server state management
- **AsyncStorage** - Local data persistence
- **Expo Audio** - Audio recording and playback

### Backend
- **Node.js/Express** - REST API server
- **TypeScript** - Type-safe code
- **SQLite** - Lightweight file-based database
- **Drizzle ORM** - Type-safe database queries
- **Better SQLite3** - SQLite driver for Node.js

### External Services
- **OpenRouter** - AI API for transcription (Whisper) and extraction (GPT-4o-mini)
- **Resend** - Email delivery service
- **Flutterwave** - Payment processing
- **Google Auth** - Social authentication

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Git
- Android emulator, iOS simulator, or Expo Go app (for mobile testing)

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Bill-Splitter
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   # Database
   DATABASE_URL=file:bill-splitter.db

   # AI & Transcription
   OPENROUTER_API_KEY=your_openrouter_api_key

   # Email Service
   RESEND_API_KEY=your_resend_api_key
   RESEND_FROM_EMAIL=noreply@yourapp.com

   # Payment Processing
   EXPO_PUBLIC_FLUTTERWAVE_PUBLIC_KEY=your_flutterwave_public_key
   FLUTTERWAVE_SECRET_KEY=your_flutterwave_secret_key

   # Backend Configuration
   EXPO_PUBLIC_BACKEND_IP=localhost

   # Google OAuth (Optional)
   EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your_ios_client_id
   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your_android_client_id
   ```

### Development Mode

1. **Start the backend server** (Terminal 1)
   ```bash
   npm run server:dev
   ```
   - Backend runs on `http://localhost:3000`
   - Database: `bill-splitter.db`

2. **Start the Expo development server** (Terminal 2)
   ```bash
   npx expo start
   ```
   - Press `w` for web preview
   - Press `a` for Android emulator
   - Press `i` for iOS simulator
   - Or scan QR code with Expo Go app

3. **Verify the setup**
   ```bash
   npm run check:types    # Type checking
   npm run lint          # Linting
   npm run format        # Code formatting
   ```

## 📦 Available Scripts

### Development
```bash
npm run server:dev          # Start backend in development mode
npx expo start              # Start frontend dev server
npm run check:types         # TypeScript type checking
npm run lint               # Run ESLint
npm run lint:fix           # Fix linting issues
npm run format             # Format code with Prettier
```

### Database
```bash
npm run db:push            # Run pending migrations
npm run db:reset           # Reset database to initial state
```

### Production
```bash
npm run server:build       # Build backend for production
npm run server:prod        # Start production backend
npm run expo:static:build  # Build static Expo files
```

## 🏗️ Architecture

### Directory Structure
```
Bill-Splitter/
├── client/                 # React Native/Expo frontend
│   ├── screens/           # App screens and pages
│   ├── components/        # Reusable UI components
│   ├── context/           # React Context for state management
│   ├── services/          # API and service integrations
│   ├── hooks/             # Custom React hooks
│   ├── stores/            # Data stores and state
│   └── lib/               # Utility functions
├── server/                # Express backend
│   ├── auth.ts            # Authentication routes
│   ├── invoices.ts        # Invoice management
│   ├── payments.ts        # Payment processing
│   ├── inventory.ts       # Inventory management
│   ├── transcription.ts   # OpenRouter integrations
│   ├── emailService.ts    # Email sending
│   ├── db.ts              # Database setup
│   └── routes.ts          # Route registration
├── migrations/            # Database migrations
├── scripts/               # Build and setup scripts
├── shared/                # Shared types and schemas
└── package.json
```

### Data Flow

```
User Input
    ↓
Frontend (Expo/React Native)
    ↓
Backend API (Express)
    ↓
OpenRouter APIs (Transcription/Extraction)
    ↓
SQLite Database
    ↓
Services (Email/SMS/WhatsApp/Payments)
```

## 📱 Production Deployment

### Backend Deployment

1. **Build the backend**
   ```bash
   npm run server:build
   ```
   - Outputs to `server_dist/index.js`

2. **Deploy to your server** (e.g., AWS EC2, Heroku, Railway)
   ```bash
   # Set production environment variables
   export NODE_ENV=production
   export OPENROUTER_API_KEY=xxx
   export RESEND_API_KEY=xxx
   # ... other env vars
   
   # Start the server
   npm run server:prod
   ```

3. **Configure database** (Production)
   - Use persistent storage (not ephemeral file systems)
   - Configure `DATABASE_URL` to point to your SQLite location
   - Ensure proper backups are in place
   - Consider WAL (Write-Ahead Logging) mode for concurrency

### Frontend Deployment

#### Web Version
```bash
npm run expo:static:build
```
- Creates static files in `static-build/`
- Deploy to Vercel, Netlify, or any static hosting

#### Mobile App (iOS/Android)
1. **Build for EAS** (Expo Application Services)
   ```bash
   npm install -g eas-cli
   eas build --platform ios
   eas build --platform android
   ```

2. **Manual Build**
   - iOS: Use Xcode with `npx expo run:ios`
   - Android: Use Android Studio with `npx expo run:android`

### Environment Variables for Production

```env
NODE_ENV=production

# Database - Use persistent storage path
DATABASE_URL=file:/var/data/bill-splitter.db

# Services
OPENROUTER_API_KEY=your_production_key
RESEND_API_KEY=your_production_key
FLUTTERWAVE_SECRET_KEY=your_production_key

# Frontend
EXPO_PUBLIC_BACKEND_IP=api.yourapp.com
EXPO_PUBLIC_BACKEND_PORT=443
EXPO_PUBLIC_DOMAIN=yourapp.com
```

### Performance Optimization

1. **Database Optimization**
   - Enable WAL mode (already configured)
   - Regular VACUUM operations
   - Index frequently queried columns

2. **API Optimization**
   - Enable gzip compression
   - Implement rate limiting
   - Cache responses appropriately

3. **Frontend Optimization**
   - Use metro bundler minification
   - Optimize asset loading
   - Implement code splitting

## 🔒 Security Considerations

- **API Keys**: Never commit `.env` files, use environment variables
- **Database**: Regular backups, proper file permissions
- **Authentication**: bcrypt for password hashing, secure session management
- **CORS**: Configured for localhost, localhost IP ranges, and production domain
- **HTTPS**: Use TLS/SSL in production

## 🧪 Testing

```bash
# Type checking
npm run check:types

# Code quality
npm run lint
npm run lint:fix

# Formatting
npm run check:format
npm run format
```

## 📚 API Documentation

### Core Endpoints

**Authentication**
- `POST /api/auth/signup` - Create new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

**Invoices**
- `GET /api/invoices` - List all invoices
- `POST /api/invoices` - Create invoice
- `GET /api/invoices/:id` - Get invoice details
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice
- `POST /api/invoices/send` - Send invoice via email/SMS/WhatsApp

**Transcription**
- `POST /api/transcribe` - Transcribe audio to text
- `POST /api/extract-invoice` - Extract invoice data from transcript

**Payments**
- `POST /api/payments/initialize` - Initialize payment
- `POST /api/payments/verify` - Verify payment

## 🐛 Troubleshooting

### Backend won't start
- Check if port 3000 is in use: `lsof -i :3000`
- Verify `.env` file exists and has required variables
- Check Node version: `node --version` (requires 18+)

### Database errors
- Reset database: `npm run db:reset`
- Check database file permissions
- Ensure `DATABASE_URL` path is writable

### Frontend won't connect to backend
- Verify `EXPO_PUBLIC_BACKEND_IP` matches your backend address
- Check firewall/networking between frontend and backend
- Ensure backend is running on correct port

### Transcription fails
- Verify `OPENROUTER_API_KEY` is valid
- Check OpenRouter service status
- Ensure audio file is in supported format

## 📞 Support

For issues, questions, or contributions:
1. Check existing documentation
2. Review error logs
3. Submit issues with detailed error messages

## 📄 License

Proprietary - All rights reserved

## 🎉 Getting Help

- Review documentation files in the project
- Check environment configuration
- Enable debug logging in development mode
- Test API endpoints with curl or Postman

---

**Last Updated**: January 2026  
**Version**: 1.0.0  
**Status**: Production Ready
