import "reflect-metadata";
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { initializeDatabase, AppDataSource, HandHistory } from './database';
import { analyzeHand, AnalysisResult } from './analysis';
import { parseCard, Card } from './logic';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// Initialize DB
initializeDatabase();

interface AnalyzeRequest {
    cards: string[]; // ["5H", "AC", ...]
    isDealer: boolean;
    numPlayers: number;
}

app.post('/api/analyze', async (req, res) => {
    try {
        const { cards, isDealer, numPlayers } = req.body;

        // Validate
        if (!cards || !Array.isArray(cards) || (cards.length !== 6 && cards.length !== 5)) {
            res.status(400).json({ error: "Invalid cards. Must be 5 or 6 cards." });
            return;
        }

        const parsedHand: Card[] = cards.map(c => parseCard(c));
        const results = analyzeHand(parsedHand, isDealer, numPlayers);

        res.json({ results });
    } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/history', async (req, res) => {
    try {
        const { originalHand, discarded, expectedValue, isDealer, numPlayers } = req.body;

        const entry = new HandHistory();
        entry.originalHand = originalHand;
        entry.discarded = discarded;
        entry.expectedValue = expectedValue;
        entry.isDealer = isDealer;
        entry.numPlayers = numPlayers;

        await AppDataSource.manager.save(entry);
        res.json({ success: true, id: entry.id });
    } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/history', async (req, res) => {
    try {
        const history = await AppDataSource.manager.find(HandHistory, {
            order: { timestamp: 'DESC' },
            take: 50
        });
        res.json(history);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
