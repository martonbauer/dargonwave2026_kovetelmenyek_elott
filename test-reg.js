const fetch = require('node-fetch'); // Assuming it's available or I can use native if node is new enough

async function testRegistration() {
    console.log("--- Testing Manual Registration ---");
    const data = {
        members: [{ name: "Test User", birth_date: "1990-01-01", otproba_id: "123456" }],
        category: "versenykajak_noi_1",
        distance: "11km",
        is_series: false,
        email: "test@example.com",
        phone: "12345678"
    };
    
    try {
        const response = await fetch('http://localhost:3001/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        console.log("Status:", response.status);
        console.log("Result:", JSON.stringify(result, null, 2));
    } catch (err) {
        console.error("Fetch Error:", err.message);
    }
}

testRegistration();
