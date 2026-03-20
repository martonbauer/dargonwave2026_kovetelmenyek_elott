const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite'); // Note: This might not be installed, I'll use a native way if possible or skip iconv

async function testUpload() {
    console.log("--- CSV Feltöltés Teszt (Kódolás Fix) ---");
    
    const csvPath = path.join(__dirname, 'nevezes_minta.csv');
    const buffer = fs.readFileSync(csvPath);
    
    // Manual decoding for the test script (simulating the browser's TextDecoder)
    // Since I know the file is windows-1250:
    const decoder = new TextDecoder('windows-1250');
    const csvData = decoder.decode(buffer);
    
    try {
        const response = await fetch('http://localhost:3001/api/upload-csv', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer dragon2026' 
            },
            body: JSON.stringify({ csvData })
        });
        
        const result = await response.json();
        console.log("Status:", response.status);
        console.log("Result:", JSON.stringify(result, null, 2));
    } catch (err) {
        console.error("Hálózati Hiba:", err.message);
    }
}

testUpload();
