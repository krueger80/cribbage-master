const start = async () => {
    // Hand: 5H, 5D, 5C, JS, AH, KS (Jack is Spades)
    const body = {
        cards: ["5H", "5D", "5C", "JS", "AH", "KS"],
        isDealer: true,
        numPlayers: 2
    };

    try {
        const res = await fetch('http://localhost:3000/api/analyze', {
            method: 'POST',
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
};

start();
