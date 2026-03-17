# Nexios AI

## Overview

Nexios AI is a Next.js 15 enterprise AI platform featuring a dark glass design system, user authentication, an AI chat assistant, and a full AI-powered coding workspace (IDE) with Monaco editor, file tree, AI code agent, sandbox terminal, GitHub import, and API search.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Tech Stack

- **Framework**: Next.js 15.5.12 (App Router)
- **Styling**: Tailwind CSS v4 + CSS custom properties (dark glass design system)
- **Database**: MongoDB (via Mongoose)
- **Auth**: JWT tokens (jsonwebtoken + jose), bcryptjs
- **Icons**: React Icons (hi/bs)
- **Code Editor**: @monaco-editor/react (Monaco / VS Code editor)
- **Language**: TypeScript

### Design System

Dark glass theme defined in `app/globals.css`:
- `--bg-primary: #080c14` — page background
- `--accent: #818cf8` — indigo accent, glows/buttons
- `--glass-border` — semi-transparent borders
- `.glass` — glass card utility (backdrop-blur, semi-transparent bg)
- `.btn-primary`, `.btn-ghost` — button utilities
- `.input-base` — dark input with focus glow
- Icons always placed on the **RIGHT** side of input fields
- Animations: fadeIn, slideUp, scaleIn, glow, float

### Project Structure

```
app/
  api/
    login/route.ts         — POST /api/login
    register/route.ts      — POST /api/register
  components/
    Header.tsx             — Public nav header
    MenuDropdown.tsx       — Navigation dropdown
    SubdomainHandler.tsx   — Subdomain detection
    LoadingSpinner.tsx     — Loading spinner
    ShareableLink.tsx      — Copy auth link
  dashboard/
    layout.tsx             — Protected layout (auth check, dark bg)
    page.tsx               — Dashboard overview with stats & activity
    components/
      DashboardHeader.tsx  — Fixed top bar with search & user
      DashboardSidebar.tsx — Dark glass sidebar with Projects link
      UserDropdown.tsx     — User profile dropdown
    chat/page.tsx          — AI chat (Gemini-powered)
    projects/
      page.tsx             — Projects list (localStorage, GitHub import)
      [id]/page.tsx        — Full AI workspace (Monaco + AI + Terminal + API search)
  lib/
    mongodb.ts             — Mongoose connection helper
    tokenUtils.ts          — JWT utilities
  models/
    user.ts                — Mongoose User schema
  types/
    user.ts                — AppUser interface
  login/page.tsx           — Dark glass login (icons RIGHT side)
  register/page.tsx        — Dark glass register (icons RIGHT side)
  page.tsx                 — Dark glass landing page (hero + features + CTA)
  layout.tsx               — Root layout
  globals.css              — Dark glass design system + Tailwind v4
```

### Project Workspace Features (`/dashboard/projects/[id]`)

- **File tree** — collapsible sidebar, create/delete files, folder expand
- **Monaco editor** — VS Code editor with syntax highlighting, 40+ languages
- **AI Code Agent** — Gemini-powered chat that reads workspace files, writes code to editor
- **Terminal** — Browser-based terminal with: ls, cat, run, test, install, git status, clear
- **Live Preview** — iframe preview for HTML/CSS/JS code
- **GitHub Import** — fetches public repo files via GitHub REST API (max 20 files)
- **API Search** — 12+ curated public APIs with category filter, one-click code snippets
- **Panel system** — collapsible right panel (AI / APIs) and bottom panel (Terminal / Preview)

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | Yes (auth endpoints) |
| `JWT_SECRET` | JWT signing secret | Yes (auto-generated) |
| `NEXT_PUBLIC_GEMINI_API_KEY` | Google Gemini API key | Yes (AI features) |

### Authentication Flow

1. Register at `/register` → POST `/api/register` → stores hashed password → returns JWT
2. Login at `/login` → POST `/api/login` → verifies password → returns JWT
3. JWT stored in `localStorage` + cookie (`auth_token`)
4. Dashboard `layout.tsx` checks localStorage; redirects to `/login` if absent
5. Project workspace has its own full-screen layout (no dashboard shell)

### Data Storage

- **Users**: MongoDB (required for auth)
- **Projects**: `localStorage` (`nexios_projects`)  
- **Project files**: `localStorage` (`nexios_files_<id>`)
- No backend required for projects — fully client-side

### Running the App

- **Dev server**: `npm run dev` (port 5000)
- **Workflow**: "Start application"

### GitHub Repository

- URL: `https://github.com/Volttaik/Nexios.git`
- Push method: GitHub REST API (Replit git safety system blocks direct push)

### Known Notes

- Monaco editor uses `dynamic()` with `ssr: false` to avoid SSR issues
- `NEXT_PUBLIC_GEMINI_API_KEY` must be set for AI agent features; fails gracefully without it
- App works without MongoDB; auth endpoints fail gracefully with a clear error
- `npm audit` reports 0 vulnerabilities (Next.js 15.5.12 security backport)
