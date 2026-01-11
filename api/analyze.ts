import { analyzeHand } from './_utils/analysis';
import { parseCard, Card } from './_utils/logic';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method Not Allowed' });
        return;
    }

    try {
        const { cards, isDealer, numPlayers } = req.body;

        // Validate
        if (!cards || !Array.isArray(cards) || (cards.length !== 6 && cards.length !== 5)) {
            res.status(400).json({ error: "Invalid cards. Must be 5 or 6 cards." });
            return;
        }

        const parsedHand: Card[] = cards.map(c => parseCard(c));
        const results = analyzeHand(parsedHand, isDealer, numPlayers);

        res.status(200).json({ results });
    } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
}
