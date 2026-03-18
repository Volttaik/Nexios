# Nexios AI

## Overview

Nexios AI is a Next.js 15 enterprise AI platform featuring a dark glass design system, user authentication, an AI chat assistant, and a full AI-powered coding workspace (IDE) with Monaco editor, TipTap rich-text document editor (Word-like), Excalidraw vector design canvas (CorelDraw-like), AI code agent with project-type specialisation, sandboxed NixOS terminal, GitHub/Figma import, and API search.

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

**Unified AI Agent System:**
The user sees one AI: "Nexios AI". Internally, three background processes work together transparently:
- **Conversational layer**: handles the natural language response shown in chat
- **Coding Agent**: parses AI-output `<nexios_ops>` JSON blocks and directly creates, edits, or deletes files in the workspace — no code shown in chat
- **Coordinator**: extracts structured file operations from the AI response and routes them to the Coding Agent silently

The AI outputs structured `<nexios_ops>[{op, path, content}]</nexios_ops>` blocks alongside text. The ops are stripped from the chat and executed immediately. Files appear in the tree automatically.

**Autonomous Mode** (toggled in Settings):
- Gives the AI awareness of its own logic and system prompt
- The AI can reason about its own limitations and propose self-improvements
- Indicated by a `⚡ AUTONOMOUS` badge in the workspace top bar

**UI Panels:**
- **Left sidebar** — File tree, collapsible, create/delete/rename files
- **Center content** — 4 tabs: Code (Monaco editor), Files list, Design canvas, Document editor
- **Right panel** — 2 tabs: Chat (single unified AI), Terminal (workspace shell)
- **Top bar** — Project name, type badge, single Nexios AI status indicator, export, model selector

**Content Modes:**
- **Code**: Monaco editor with syntax highlighting, 40+ languages
- **Files**: Visual file browser
- **Design**: Figma import + AI-generated UI via Agent 1
- **Document**: Markdown/text editor with AI assistance

**Other Features:**
- **GitHub Import** — fetches public repo metadata via GitHub REST API
- **Figma Import** — creates design project from Figma file URL
- **Export** — downloads project as JSON (files + chat history)
- **Save** — auto-saves to localStorage on every change

### Projects Page (`/dashboard/projects`)

- **Project types**: Code, Design, Document (visual selection in create modal + filter tabs)
- **GitHub Import** — imports public repos
- **Figma Import** — creates design projects from Figma URLs
- **Type filter** — filter projects by All / Code / Design / Document

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
