# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SEMS (School/Examination Management System) is a full-stack MERN application for managing CBSE examination processes. It handles importing CBSE datesheets, candidate management, seating plan generation, answer sheet tracking, and Form 66 attendance.

## Development Commands

```bash
# Start both frontend and backend concurrently
npm run dev

# Start only backend (port 5000)
npm run server

# Start only frontend (port 5173)
npm run client

# Install all dependencies (root, server, client)
npm run install-all

# Build for production
npm run build

# Seed database
npm run seed
```

### Client-specific (from /client)
```bash
npm run type-check    # TypeScript checking without emit
npm run lint          # ESLint
```

### Server-specific (from /server)
```bash
npm run test          # Jest tests with watch mode
npm run lint:fix      # ESLint with auto-fix
npm run seed:subjects # Seed subjects only
```

## Architecture

### Monorepo Structure
- `/client` - React 18 + TypeScript + Vite frontend
- `/server` - Node.js + Express backend with MongoDB

### Client Architecture
- **State**: Redux Toolkit with slices in `/client/src/redux/slices/` (auth, teacher, student, subject, datesheet, room, dispatch)
- **Data Fetching**: TanStack React Query (v5) for server state
- **Routing**: React Router v6 with HashRouter, protected routes in `/client/src/routes/`
- **API Layer**: Axios services in `/client/src/services/`
- **UI**: Tailwind CSS with dark mode (class-based), Headless UI components

### Server Architecture
- **Entry**: `server.js` (startup) → `app.js` (Express config)
- **Models**: 13 Mongoose schemas in `/server/src/models/` (User, Teacher, Student, Candidate, Subject, DateSheet, CBSEDatesheet, Room, AnswerSheet, AnswerSheetDispatch, Form66, Calendar, FolderMapping)
- **Routes**: 15 route files mounted at `/api/*`
- **Validation**: Joi schemas in `/server/src/validations/`
- **File Processing**: Parsers in `/server/src/utils/` for CBSE PDFs, Form66, Excel files
- **PDF Generation**: Puppeteer (v24)

### API Endpoints
All routes prefixed with `/api`:
- `/auth` - JWT authentication with refresh tokens
- `/teachers` - Exam functionaries
- `/candidates` - Candidate import (PDF/Excel) and management
- `/subjects` - Subject master data
- `/datesheets` - CBSE datesheet import
- `/centre-datesheet` - Centre-specific datesheet generation
- `/seating-plan` - Seating arrangement with PDF export
- `/rooms` - Room/hall management
- `/form66` - Form 66 attendance import
- `/answersheets` - Answer sheet inventory
- `/dispatch` - Answer sheet dispatch
- `/export` - PDF/Excel exports
- `/guidelines` - Centre examination guidelines

## Key Patterns

- Frontend uses path aliases: `@/components`, `@/pages`, `@/services`, etc. (configured in tsconfig and vite.config)
- API calls proxy from Vite dev server (5173) to backend (5000)
- Authentication: JWT with role-based access (Admin, Data Entry Operator)
- File uploads: Multer with 10MB limit, Cloudinary for storage
- Security middleware: Helmet, rate limiting, mongo-sanitize, xss-clean

## Environment Variables

See `.env.example` for required variables:
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET`, `JWT_REFRESH_SECRET` - Auth tokens
- `CLOUDINARY_*` - Cloud storage credentials
- `SMTP_*` - Email configuration

## Default Dev Credentials
- Admin: admin@sems.com / admin123
- Operator: operator@sems.com / operator123
