// Using native fetch available in Node.js 18+
const ADMIN_PASSWORD = 'dragon2026'; // Default password from server.js

async function testAutoStop() {
    console.log("Starting Auto-Stop Verification Test...");

    try {
        // 1. Register test racers
        console.log("1. Registering test racers...");
        const registerRacer = async (name, bib) => {
            const res = await fetch('http://localhost:3001/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    members: [{ name, birth_date: '1990-01-01', otproba_id: '' }],
                    category: 'sup_noi_1_merev_39_alatt',
                    distance: '4km'
                })
            });
            return await res.json();
        };

        const r1 = await registerRacer("Test User 1");
        const r2 = await registerRacer("Test User 2");
        console.log(`Registered racers with bibs: ${r1.bib}, ${r2.bib}`);

        // 2. Start category
        console.log("2. Starting SUP 4km category...");
        const startRes = await fetch('http://localhost:3001/api/start-category', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ADMIN_PASSWORD}`
            },
            body: JSON.stringify({ groupId: 'sup_4km' })
        });
        const startData = await startRes.json();
        console.log("Start response:", startData);

        // 3. Check categories
        const checkState = async () => {
            const res = await fetch('http://localhost:3001/api/data');
            return await res.json();
        };

        let state = await checkState();
        if (state.categories['sup_4km']) {
            console.log("SUCCESS: Category 'sup_4km' is running.");
        } else {
            console.error("FAILURE: Category 'sup_4km' did not start.");
            return;
        }

        // 4. Stop first racer
        console.log(`3. Stopping first racer (Bib #${r1.bib})...`);
        await fetch('http://localhost:3001/api/stop-racer', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ADMIN_PASSWORD}`
            },
            body: JSON.stringify({ bib: r1.bib })
        });

        state = await checkState();
        if (state.categories['sup_4km']) {
            console.log("SUCCESS: Category 'sup_4km' still running as expected.");
        } else {
            console.error("FAILURE: Category 'sup_4km' stopped too early!");
            return;
        }

        // 5. Stop second (last) racer
        console.log(`4. Stopping last racer (Bib #${r2.bib})...`);
        await fetch('http://localhost:3001/api/stop-racer', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ADMIN_PASSWORD}`
            },
            body: JSON.stringify({ bib: r2.bib })
        });

        state = await checkState();
        if (!state.categories['sup_4km']) {
            console.log("SUCCESS: Category 'sup_4km' automatically stopped!");
        } else {
            console.error("FAILURE: Category 'sup_4km' is still running!");
        }

    } catch (err) {
        console.error("Test failed with error:", err);
    }
}

testAutoStop();
