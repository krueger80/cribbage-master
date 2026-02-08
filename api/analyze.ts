import { analyzeHand, analyzeHandGenerator } from './_utils/analysis';
import { parseCard, Card } from './_utils/logic';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
        const { cards, isDealer, numPlayers, simulationMode } = req.body;
        const isStream = req.query['stream'] === 'true';

        // Validate
        if (!cards || !Array.isArray(cards) || (cards.length !== 6 && cards.length !== 5)) {
            res.status(400).json({ error: "Invalid cards. Must be 5 or 6 cards." });
            return;
        }

        const parsedHand: Card[] = cards.map(c => parseCard(c));
        const mode = simulationMode === 'quick' ? 'quick' : 'precise';

        if (isStream) {
            // Streaming Response (NDJSON)
            res.setHeader('Content-Type', 'application/x-ndjson');
            res.setHeader('Transfer-Encoding', 'chunked');

            // Note: We need to import analyzeHandGenerator. 
            // Since we can't easily change imports in this tool step without replacing the whole file,
            // we assume the import is updated in a separate step or we use 'require' if needed. 
            // But we can update the import line above in a separate replacement.
            // Let's assume the user will update the import separately or we do it here if possible.
            // Actually, analyzeHand uses the generator internally now, but we want to use the generator directly.

            const generator = analyzeHandGenerator(parsedHand, isDealer, numPlayers, mode);

            for (const result of generator) {
                res.write(JSON.stringify(result) + '\n');
                // Yield to event loop to ensure chunk is flushed/sent
                await new Promise(resolve => setTimeout(resolve, 0));
            }
            res.end();

        } else {
            // Standard JSON Response
            const results = analyzeHand(parsedHand, isDealer, numPlayers, mode);
            res.status(200).json({ results });
        }

    } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
}
