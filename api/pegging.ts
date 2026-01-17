import { determinePeggingCard } from './_utils/pegging';
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
        const { hand, stack, total } = req.body;

        if (!hand || !Array.isArray(hand)) {
            res.status(400).json({ error: "Invalid hand. Must be array of card codes." });
            return;
        }

        const parsedHand: Card[] = hand.map(c => parseCard(c));
        const parsedStack: Card[] = (stack || []).map((c: string) => parseCard(c));
        const currentTotal = total || 0;

        const result = determinePeggingCard(parsedHand, parsedStack, currentTotal);

        res.status(200).json({
            card: result.card,
            score: result.score,
            debug: result.debug
        });

    } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
}
