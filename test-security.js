// test-security.js - Verify admin authentication
const API_URL = 'http://localhost:3001/api';

async function testSecurity() {
    console.log("Starting Security Audit...");

    const endpoints = [
        { url: '/start-category', method: 'POST', body: {} },
        { url: '/stop-category', method: 'POST', body: {} },
        { url: '/reset-category', method: 'POST', body: {} },
        { url: '/stop-racer', method: 'POST', body: { bib: 1 } },
        { url: '/racer/1', method: 'DELETE' },
        { url: '/reset', method: 'POST', body: {} },
        { url: '/upload-csv', method: 'POST', body: { csvData: '' } }
    ];

    for (const ep of endpoints) {
        console.log(`Testing ${ep.method} ${ep.url} without token...`);
        try {
            const res = await fetch(`${API_URL}${ep.url}`, {
                method: ep.method,
                headers: { 'Content-Type': 'application/json' },
                body: ep.body ? JSON.stringify(ep.body) : undefined
            });

            if (res.status === 401 || res.status === 403) {
                console.log(`  [OK] Returned expected ${res.status}`);
            } else {
                console.error(`  [FAILED] Returned ${res.status} instead of 401/403!`);
            }
        } catch (err) {
            console.error(`  [ERROR] Call failed:`, err.message);
        }
    }
    console.log("Security audit finished.");
}

testSecurity();
