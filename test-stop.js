const fetch = require('node-fetch');

async function testStop() {
    const bib = 100;
    console.log(`Próbálkozás a #${bib} beérkeztetésével...`);

    try {
        const response = await fetch('http://localhost:3001/api/stop-racer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bib })
        });

        const result = await response.json();
        console.log("Válasz:", result);

        if (response.ok) {
            console.log("SIKER: A 100-as rajtszám beérkezett.");
        } else {
            console.log("HIBA:", result.error);
        }
    } catch (err) {
        console.error("Kritikus hiba:", err);
    }
}

testStop();
