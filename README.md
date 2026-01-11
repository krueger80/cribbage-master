# Cribbage Assistant

A powerful web application to help you optimize your Cribbage discarding strategy.

## Tech Stack
- **Frontend**: Angular 17+ (Video/Audio capabilities? No, just pure UI)
- **Backend**: Node.js + Express
- **Database**: SQLite
- **Style**: Modern Dark Theme (Custom CSS)

## How to Run

### 1. Start the Server
```bash
cd server
npm install
npx ts-node src/app.ts
```
The server runs on `http://localhost:3000`.

### 2. Start the Client
```bash
cd client
npm install
npm start
```
The client runs on `http://localhost:4200`.

## Features
- **Discard Optimization**: Calculates Expected Value (EV) for Hand and Crib.
- **Detailed Stats**: Shows min/max/avg points, breakdown by 15s, runs, pairs, etc.
- **Pegging Heuristics**: Estimates pegging potential.
- **History**: Saves your hands (Backend ready, UI placeholder).
- **Multi-player**: Supports 2, 3, and 4 player configurations.

## Development
- Run Unit Tests: `cd server && npx ts-node src/test_scoring.ts`
