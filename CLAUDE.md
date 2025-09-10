# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is a local-first web application for automated invoice creation from payment data using AI and integrating with the Fiscozen API. The architecture consists of:

**Frontend (React + TypeScript + Tailwind)**
- Located in `/frontend/`
- **Triple workflow modes**: 
  - **Simplified Mode** (`SimpleWorkflow.tsx`): NEW - Direct transaction input → Smart client search → AI data parsing → Invoice draft creation
  - **Automated Mode** (`FastWorkflow.tsx`): Payment text → AI extraction → Client editing → Invoice creation
  - **Manual Mode**: 4-step wizard (ExtractStep → SearchStep → CreateStep → InvoiceStep)
- **AI Integration**: OpenAI GPT-4o-mini via `aiService.ts` with regex fallback when no API key
- **Smart Client Search**: Intelligent fuzzy matching with Fiscozen database
- **Data Persistence**: Transaction data preserved throughout entire workflow while allowing client data modification
- **Modern UX**: Fast-loading, intuitive interface with progress tracking and clear step separation
- State management through React hooks in `App.tsx`

**Backend (Node.js + Express + SQLite)**
- Located in `/backend/` 
- API proxy for Fiscozen integration with mock mode for development
- SQLite database for sessions and logging
- Route structure: `/api/fiscozen/*` and `/api/data/*`

**Database Layer**
- SQLite local database in `database/sessions.db`
- Handles session persistence and application logging
- Connection management in `backend/database/sqlite.js`

## Development Commands

### Setup and Start
- `npm run setup` - One-time setup: installs all dependencies, creates config files, builds frontend
- `npm start` - Starts both frontend and backend servers concurrently
- `npm run dev` - Alias for npm start

### Individual Services
- Backend only: `cd backend && npm start` (runs on port 3001)
- Backend dev mode: `cd backend && npm run dev` (with nodemon)
- Frontend only: `cd frontend && npm run dev` (runs on port 5173/5174)
- Frontend build: `cd frontend && npm run build`

### Linting and Type Checking
- Frontend lint: `cd frontend && npm run lint`
- Frontend type check: `cd frontend && tsc -b`

## Core Workflow Integration

The application offers three workflow modes for maximum flexibility:

### Simplified Workflow (`SimpleWorkflow.tsx`) - **RECOMMENDED**
**Perfect user experience for the most common use case:**
1. **Transaction Input**: User enters amount, client name, date, description
2. **Smart Client Search**: Intelligent search on Fiscozen database with fuzzy matching
3. **Client Selection**: If found → proceed to invoice | If not found → gather client data
4. **AI Data Processing**: When new client needed, AI analyzes and organizes data for Fiscozen API
5. **Data Review**: User confirms AI-parsed client information before creation
6. **Client Creation**: Auto-creates client in Fiscozen if needed
7. **Invoice Draft**: Creates invoice in draft status with predefined settings (0% VAT, ATECO 62.20.10, same payment date)

### Automated Workflow (`FastWorkflow.tsx`)
1. **Payment Data Input**: User pastes payment text (emails, receipts, notifications)
2. **AI Extraction**: `aiService.ts` uses OpenAI GPT-4o-mini to extract client/invoice data
3. **Data Review**: Transaction data displayed with client extraction status
4. **Client Editing**: Separate client form with transaction data preserved at top
5. **Invoice Preview**: Complete invoice preview with all data maintained
6. **Invoice Creation**: Final submission to backend API
7. **Fallback Options**: 
   - Regex extraction for common patterns when no API key
   - Local type definitions to avoid import conflicts

### Manual Workflow (4-step wizard)
1. **ExtractStep**: Manual data entry or Claude prompt generation
2. **SearchStep**: Client search in Fiscozen database  
3. **CreateStep**: New client creation if needed
4. **InvoiceStep**: Invoice creation with line items, totals, ATECO codes

## Environment Configuration

The application uses `frontend/.env.local` for configuration:
- `VITE_OPENAI_API_KEY` - OpenAI API key for automated extraction (see `API_SETUP.md`)
- `VITE_BACKEND_URL` - Backend API URL (default: http://localhost:3001)
- `FISCOZEN_BASE_URL` - Fiscozen API endpoint  
- `NODE_ENV` - Controls mock vs production API calls

**Without API Key**: App works with regex fallback + manual input forms

## Development vs Production Modes

The backend automatically uses mock data when `NODE_ENV=development`:
- Mock login tokens and API responses
- Simulated delays for realistic testing
- See `backend/routes/fiscozen.js:28` for mock implementations

## Database and Logging

All operations are logged to SQLite for debugging and session tracking. The database connection is established in `backend/server.js:76` and provides logging methods used throughout the application.

## Testing and Health Checks

- Backend health check: `GET /health`
- The setup script includes automatic backend testing
- Port conflicts are handled by the start scripts (will try alternative ports)

## Key Features Implemented

### Invoice Creation System
- **InvoiceStep.tsx**: Complete invoice creation with line items, calculations
- **Italian Tax Compliance**: 0% VAT, ATECO code 62.20.10 (IT consulting), unified payment/invoice dates
- **Backend Integration**: `/api/fiscozen/invoices` endpoint for invoice creation

### AI-Powered Data Extraction
- **aiService.ts**: OpenAI GPT-4o-mini integration with cost optimization (~$0.001-0.005/transaction)  
- **Regex Fallback**: Local pattern matching for amounts, VAT numbers, common companies
- **Smart Prompting**: Specialized prompts for payment data extraction vs general client data

### Enhanced User Experience
- **Workflow Mode Selector**: Toggle between automated and manual workflows
- **Manual Client Form**: Comprehensive fallback when AI extraction fails
- **API Status Indicators**: Visual feedback on OpenAI configuration status
- **Progress Tracking**: Visual progress bars throughout automated workflow

### Recent Updates (September 2025)

**Complete UX Redesign & Fiscozen Integration Fixed**
- **Problem Solved**: App needed perfect user experience for common transaction → invoice workflow + critical authentication bug preventing client search
- **Solution**: New simplified workflow with intelligent client search, AI-assisted data processing, and fully working Fiscozen API integration

**Key Components**
- `SimpleWorkflow.tsx` - **NEW** - Perfect streamlined workflow (RECOMMENDED)
- `FastWorkflow.tsx` - Automated workflow with payment text parsing
- `ModernUnifiedWorkflow.tsx` - Full-featured modern UI (archived due to performance)
- `OptimizedWorkflow.tsx` - Intermediate optimization (superseded)
- `WorkflowComponents.tsx` - Modular card components for modern design

**New Features**
- **Smart Client Search**: Fuzzy matching with Fiscozen database - finds existing clients even with slight name variations
- **AI Data Processing**: Analyzes user input and organizes it optimally for Fiscozen API requirements
- **Data Review Step**: User confirms AI-parsed data before client creation
- **Invoice Drafts**: All invoices created in draft status for user review
- **Triple Mode Selection**: Simplified/Automated/Manual modes accessible via UI selector

**Technical Improvements**
- **Data Persistence**: Transaction data preserved in state throughout entire workflow
- **Performance Optimization**: Eliminated import conflicts with local type definitions
- **Modern Design**: Clean interface with progress indicators and responsive layout
- **Fast Loading**: Resolved compilation errors and TypeScript conflicts
- **Backend Integration**: Full invoice creation API with mock development mode
- **Fiscozen API Authentication**: Fixed critical variable shadowing bug in session cookie management (backend/routes/fiscozen.js:84-85)

**Authentication & Security**
- **Session-Based Authentication**: Proper CSRF token handling and cookie persistence
- **Two-Step Login Process**: GET for CSRF token → POST with credentials
- **Secure Credential Management**: Credentials stored in `test-credentials.json` (gitignored)
- **Comprehensive Logging**: Detailed API call logging for debugging authentication flows
- **Automated Testing**: Playwright integration for login/search flow validation

### Files Added/Modified
- `SimpleWorkflow.tsx` - **NEW** - Streamlined transaction → invoice workflow
- `FastWorkflow.tsx` - Automated workflow with payment text parsing
- `InvoiceStep.tsx` - Invoice creation interface
- `aiService.ts` - OpenAI integration service (no external dependencies)
- `App.tsx` - Updated with triple workflow mode selector
- `LoginModal.tsx` - **FIXED** - Session-based authentication support
- `API_SETUP.md` - Complete API configuration guide
- `frontend/.env.local` - Environment configuration template
- `backend/routes/fiscozen.js` - **FIXED** - Invoice creation endpoint + authentication bug resolution
- `test-credentials.json` - Secure credential storage (gitignored)
- `test-playwright.js` - Basic login/search testing
- `test-full-workflow.js` - **NEW** - Complete E2E workflow testing
- `fiscozen_endpoints.md` - Reverse-engineered API documentation

## Testing & Debugging

### End-to-End Testing (Playwright)
- **Complete Workflow Testing**: `node test-full-workflow.js` - **NEW** - Tests entire invoice creation flow
- **Full Coverage**: Login → Client Search → Client Creation → Invoice Generation
- **Real API Integration**: Tests with actual Fiscozen credentials and API calls
- **Test Results**: ✅ All workflow steps verified working correctly

### Previous Testing Scripts
- **Basic Login Test**: `node test-playwright.js` - Tests login → search flow only
- **Test Coverage**: Login authentication, client search, error handling
- **Test Data**: Pre-configured with "scaccino" client search

### Debugging & Logging
- **Comprehensive Logging**: All API calls logged with request/response details
- **Authentication Flow Debugging**: Step-by-step CSRF and session cookie tracking
- **Error Handling**: 403/404 errors properly caught and logged
- **Console Debug**: LoginModal includes debug output for troubleshooting session-based auth

### Login System Fixes (Latest)
- **Session-Based Authentication**: Fixed LoginModal to accept session cookies instead of requiring JWT tokens
- **Token Handling**: Gracefully handles undefined tokens from session-based auth
- **Debug Logging**: Added comprehensive logging to troubleshoot authentication flow
- **Auto-Search After Login**: Fixed issue where client search wasn't triggered automatically after successful login

### Verified Working Flow
1. **✅ Login**: Real Fiscozen credentials, session cookies properly stored
2. **✅ Client Search**: Fuzzy search with `companyName=scaccino` parameter
3. **✅ Client Not Found**: Properly handled, proceeds to new client workflow
4. **✅ AI Data Processing**: Organizes client data for Fiscozen API format
5. **✅ Client Creation**: `POST /api/fiscozen/clients` with Test Scaccino SRL
6. **✅ Invoice Creation**: `POST /api/fiscozen/invoices` with line items and totals
7. **✅ Complete Success**: All API calls return 200 OK, workflow fully functional

### Common Issues & Solutions
- **Authentication Failed**: Check that `test-credentials.json` exists with valid Fiscozen credentials
- **403 Forbidden on Search**: Usually indicates session cookie persistence issue - restart backend
- **Variable Shadowing**: Avoid `let sessionCookies` declarations that mask global variables
- **Login Modal Not Closing**: Fixed by checking result.success instead of result.success && result.token
- **Client Search Not Auto-Starting**: Fixed by ensuring handleTransactionSubmit is called after login