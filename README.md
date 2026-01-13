# Cribbage Assistant

A powerful web application to help you optimize your Cribbage discarding strategy.

## Tech Stack
- **Frontend**: Angular 17+
- **Backend**: Vercel Serverless Functions (TypeScript)
- **Database**: Supabase
- **Style**: Modern Dark Theme (Tailwind CSS)

## How to Run

### 1. Start the Client
```bash
cd client
npm install
npm start
```
The client runs on `http://localhost:4200`.

### 2. Backend
The backend is hosted on Vercel. For local development, you can use `vercel dev` if you have the Vercel CLI installed.

## Features
- **Discard Optimization**: Calculates Expected Value (EV) for Hand and Crib.
- **Detailed Stats**: Shows min/max/avg points, breakdown by 15s, runs, pairs, etc.
- **Pegging Heuristics**: Estimates pegging potential.
- **History**: Saves your hands (via Supabase).
- **Multi-player**: Supports 2, 3, and 4 player configurations.

## Development
- **Client**: The client is a standard Angular application. Use `ng test` to run unit tests.
