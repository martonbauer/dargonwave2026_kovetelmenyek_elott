
const fetch = require('node-fetch');

const API_URL = 'http://localhost:3001/api';
const ADMIN_PASSWORD = 'dragon2026';

async function testDelete() {
    console.log("--- Deletion Test (By ID) ---");
    
    // 1. Get current data
    const res = await fetch(`${API_URL}/data`);
    const data = await res.json();
    
    if (!data.racers || data.racers.length === 0) {
        console.log("No racers to delete. Please register someone first.");
        return;
    }
    
    // Find a racer without a bib if possible, or just the last one
    const target = data.racers.find(r => !r.bib) || data.racers[data.racers.length - 1];
    console.log(`Attempting to delete racer ID: ${target.id} (Bib: ${target.bib || 'NONE'})`);
    
    // 2. Try to delete
    try {
        const response = await fetch(`${API_URL}/racer/${target.id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${ADMIN_PASSWORD}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`Response Status: ${response.status}`);
        const result = await response.json();
        console.log("Result:", result);
        
        if (response.ok) {
            console.log("SUCCESS: Racer deleted.");
        } else {
            console.log("FAILED: Racer NOT deleted.");
        }
    } catch (err) {
        console.error("ERROR during fetch:", err.message);
    }
}

testDelete();
