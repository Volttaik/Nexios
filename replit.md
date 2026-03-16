# Nexios AI

## Overview

This is a Next.js 15 web application — Nexios AI — an enterprise-grade AI platform with user authentication, a dashboard, and AI chat features. It uses MongoDB for data storage, JWT for authentication, and Tailwind CSS v4 for styling.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS v4
- **Database**: MongoDB (via Mongoose)
- **Auth**: JWT tokens (jsonwebtoken + jose), bcryptjs for password hashing
- **Icons**: React Icons (hi/bs) + Font Awesome (via @fortawesome)
- **Language**: TypeScript

### Project Structure

```
app/
  api/
    login/route.ts       — POST /api/login
    register/route.ts    — POST /api/register
  components/
    Header.tsx           — Top navigation bar (public pages)
    MenuDropdown.tsx     — Navigation dropdown menu
    SubdomainHandler.tsx — Subdomain detection & redirect
    LoadingSpinner.tsx   — Reusable loading spinner
    ShareableLink.tsx    — Copy shareable auth link
  dashboard/
    layout.tsx           — Protected dashboard layout (auth check)
    page.tsx             — Dashboard overview
    chat/page.tsx        — AI chat page
    components/
      DashboardHeader.tsx   — Dashboard top bar
      DashboardSidebar.tsx  — Left navigation sidebar
      UserDropdown.tsx      — User profile dropdown
  lib/
    mongodb.ts           — Mongoose connection helper (cached)
    tokenUtils.ts        — JWT verify + URL token utilities
  models/
    user.ts              — Mongoose User schema
  login/page.tsx         — Login page
  register/page.tsx      — Register page
  page.tsx               — Landing/home page
  layout.tsx             — Root layout
  globals.css            — Global styles + Tailwind
components/
  UserDropdown.tsx       — Shared user dropdown (uses Next.js router)
public/
  images/logo.jpg        — App logo
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | Yes (for auth API) |
| `JWT_SECRET` | Secret for signing JWT tokens | Yes (auto-generated) |

### Authentication Flow

1. User registers at `/register` → POST `/api/register` → stores hashed password in MongoDB → returns JWT
2. User logs in at `/login` → POST `/api/login` → verifies password → returns JWT
3. JWT stored in `localStorage` and as a cookie
4. Dashboard layout checks `localStorage` for token; redirects to `/login` if absent

### Running the App

- **Dev server**: `npm run dev` (runs on port 5000, bound to 0.0.0.0 for Replit compatibility)
- **Prod server**: `npm run start` (runs on port 5000, bound to 0.0.0.0)
- **Workflow**: "Start application" — configured to auto-start with `npm run dev`

### Known Setup Notes

- The app's UI works without MongoDB; auth endpoints will fail gracefully with a clear error if `MONGODB_URI` is not set
- `JWT_SECRET` is auto-generated and stored as an env var on first setup
