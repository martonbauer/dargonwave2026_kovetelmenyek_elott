// Using native fetch
const ADMIN_PASSWORD = 'dragon2026';
const API_URL = 'http://localhost:3001/api';

async function testPerformance() {
    console.log("Starting Performance / Bulk Update Test...");

    try {
        // 1. Register 50 racers in a specific category
        console.log("1. Registering 50 test racers in 'Perf Test' category...");
        const racers = [];
        for (let i = 1; i <= 50; i++) {
            const res = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    members: [{ name: `Perf Racer ${i}`, birth_date: '1990-01-01', otproba_id: '' }],
                    category: 'Perf Test',
                    distance: '11km'
                })
            });
            const data = await res.json();
            racers.push(data);
            if (i % 10 === 0) console.log(`${i} racers registered...`);
        }

        // 2. Start category
        console.log("2. Starting 'Perf Test_11km' category...");
        const startRes = await fetch(`${API_URL}/start-category`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ADMIN_PASSWORD}`
            },
            body: JSON.stringify({ categoryName: 'Perf Test', distance: '11km' })
        });
        const startData = await startRes.json();
        console.log("Start response:", startData);

        // 3. Measure time to stop category (Bulk Update)
        console.log("3. Stopping category and measuring time for bulk update of 50 racers...");
        const startTime = Date.now();
        const stopRes = await fetch(`${API_URL}/stop-category`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ADMIN_PASSWORD}`
            },
            body: JSON.stringify({ categoryName: 'Perf Test', distance: '11km' })
        });
        const stopTime = Date.now();
        const stopData = await stopRes.json();
        
        console.log(`Bulk stop took ${stopTime - startTime}ms.`);
        console.log("Stop response:", stopData);

        if (stopRes.ok && stopData.count === 50) {
            console.log("SUCCESS: Bulk update processed all 50 racers correctly.");
        } else {
            console.error(`FAILURE: Expected 50 racers, but got ${stopData.count}. Status: ${stopRes.status}`);
        }

        // 4. Cleanup (Optional but recommended - manually delete via DB or API if needed)
        // For this test we leave them to verify in UI if desired.

    } catch (err) {
        console.error("Performance test failed:", err);
    }
}

testPerformance();
