# Creative Subscription Hub

A centralized dashboard and management platform for creative tool subscriptions (ChatGPT, Magnific AI, Midjourney, Canva, Adobe CC, Envato, etc.), renewal alerts, email reminders, and AI token consumption tracking.

---

## 🚀 Architecture Overview

- **Frontend**: React 19 + Vite + Lucide Icons + Vanilla CSS Design System
- **Backend API**: Node.js + Express + MongoDB Atlas + JWT Authentication
- **Serverless & Functions**: Netlify Serverless Functions (`send-reminder.js` via Resend API) & AWS Lambda support
- **Hosting & CI/CD**: Netlify

---

## ⚡ Netlify Deployment Guide

This repository is pre-configured with `netlify.toml` for zero-configuration Netlify deployment.

### Option 1: Deploy via GitHub (Recommended)

1. Push this repository to GitHub: `https://github.com/kyawzinsoe-tech/marcomms.git`
2. Log into your [Netlify Dashboard](https://app.netlify.com/).
3. Click **Add new site** > **Import an existing project** > **GitHub**.
4. Select the `marcomms` repository.
5. Netlify will automatically detect build settings from `netlify.toml`:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Functions directory**: `netlify/functions`
6. Click **Deploy Site**.

### Option 2: Environment Variables on Netlify

Go to **Site settings** > **Environment variables** in Netlify and configure:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `RESEND_API_KEY` | *(Optional)* Resend API key for automated email delivery | `re_123456789...` |
| `REMINDER_FROM_EMAIL` | *(Optional)* Verified sender email for alerts | `alerts@yourdomain.com` |
| `NODE_VERSION` | Node.js runtime version | `20` |

> **Note**: If `RESEND_API_KEY` is not provided, clicking **Send Email Alert** will automatically open the user's default email client (`mailto:`) with a pre-filled subject and alert body.

---

## 💻 Local Development

### 1. Install Dependencies
```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install
```

### 2. Start Local Servers
```bash
# In one terminal: Start Frontend (http://localhost:5173)
cd frontend
npm run dev

# In another terminal: Start Backend (http://localhost:5001)
cd backend
npm run dev
```

---

## 📂 Repository Structure

```
├── frontend/                     # React + Vite Application
│   ├── src/
│   │   ├── components/           # UI components (Header, Forms, Tables, Charts, Modals)
│   │   ├── context/              # React Context (Auth, Theme)
│   │   ├── hooks/                # Custom hooks (State, Filter, Export)
│   │   ├── services/             # API, Auth, and Email services
│   │   └── utils/                # Calculation, date, format helpers
│   ├── public/
│   │   ├── _redirects            # Netlify SPA routing rules
│   │   └── images/               # App brand assets & logos
│   └── netlify/functions/        # Netlify Serverless functions
├── backend/                      # Express REST API & MongoDB models
│   ├── src/
│   │   ├── controllers/          # Subscriptions, Tokens, Auth, Backups
│   │   ├── models/               # Mongoose Schemas (User, Subscription, Token, Setting)
│   │   └── routes/               # Express API routes
│   └── template.yaml             # AWS SAM / Lambda CloudFormation template
├── netlify/functions/            # Root Netlify Serverless Functions
├── netlify.toml                  # Netlify deployment configuration
└── package.json                  # Workspace unified scripts
```

---

## 🔒 Security

- `.env` files are strictly excluded via `.gitignore`.
- Secrets, credentials, and API keys must be provided through Netlify / environment variables.
