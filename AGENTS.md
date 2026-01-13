# Cribbage Assistant - Agents Guide

This file defines the roles, responsibilities, and workflows for AI agents working on the Cribbage Assistant project.

## Project Overview
Cribbage Assistant is a web application designed to optimize Cribbage discarding strategies. It calculates the expected value (EV) for hands and cribs.

## Technology Stack
- **Frontend**: Angular 17+ (in `client/`)
  - Styling: Tailwind CSS
- **Backend**: Vercel Serverless Functions (in `api/`)
  - Language: TypeScript
- **Deployment**: Vercel

## Directory Structure
- `/` - Root configuration (vercel.json, package.json).
- `/api` - Backend logic (Serverless functions).
  - `analyze.ts` - Main endpoint for hand analysis.
  - `_utils/` - Shared logic (scoring, parsing, analysis).
- `/client` - Angular frontend application.

## Agent Roles

### 🤖 Architect / Product Manager
- **Responsibilities**: High-level planning, file structure organization, ensuring features meet user requirements.
- **Directives**:
  - Maintain clear separation of concerns between `client` and `api`.
  - Ensure `AGENTS.md` is updated if architectural changes occur.

### 🎨 Frontend Developer
- **Responsibilities**: Angular component development, UI/UX implementation, state management.
- **Directives**:
  - Use Angular best practices (standalone components, signals if applicable).
  - Use Tailwind CSS for styling. Avoid custom CSS files unless necessary.
  - Ensure the UI is responsive and accessible.
  - Working directory: `client/`

### ⚙️ Backend Developer
- **Responsibilities**: Serverless function implementation, Cribbage logic algorithm, performance optimization.
- **Directives**:
  - Ensure functions are stateless and handle errors gracefully.
  - Logic should reside in `api/_utils` to be testable and reusable.
  - Validate all inputs in the API handlers.
  - Working directory: `api/`

### 🧪 QA / Test Engineer
- **Responsibilities**: Writing unit tests, verifying bug fixes, ensuring regressions are avoided.
- **Directives**:
  - Verify changes by running relevant tests.
  - Create new tests for new features.
  - Ensure the "Discard Optimization" logic is accurate.

## Workflow & Conventions

1.  **Code Style**:
    - Use TypeScript for both frontend and backend.
    - Follow the existing linting and formatting rules.

2.  **Running the Project**:
    - **Frontend**: `cd client && npm start` (Runs on port 4200).
    - **Backend**: Deployed via Vercel or tested locally using `vercel dev` if available.
      - *Note*: The root `README.md` references a `server/` directory which has been replaced by `api/`.

3.  **Verification**:
    - Always verify that the application compiles before submitting changes.
    - Check for console errors in the browser.

## Known Issues / TODOs
- The root `README.md` is outdated regarding the backend setup.
- `api` directory replaces the legacy `server` directory.
