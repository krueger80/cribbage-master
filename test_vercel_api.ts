import handler from './api/analyze';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Mock Response
const res: Partial<VercelResponse> = {
    status: (code: number) => {
        console.log(`Status: ${code}`);
        return res as VercelResponse;
    },
    json: (body: any) => {
        console.log('Response Body:', JSON.stringify(body, null, 2));
        return res as VercelResponse;
    },
    setHeader: (name: string, value: string | number | readonly string[]) => {
        // console.log(`Header: ${name}=${value}`);
        return res as VercelResponse;
    },
    end: () => {
        console.log('Response ended');
        return res as VercelResponse;
    }
};

// Mock Request
const req: Partial<VercelRequest> = {
    method: 'POST',
    body: {
        cards: ['5H', '5D', '5S', 'JC', '5C', '4H'], // Example hand
        isDealer: true,
        numPlayers: 2
    }
};

console.log('Testing /api/analyze with sample hand...');
handler(req as VercelRequest, res as VercelResponse);
