const fs = require('fs');

async function testUpload() {
    const csvData = fs.readFileSync('nevezes_minta.csv', 'utf8');
    const lines = csvData.trim().split('\n');
    let added = 0;

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const fields = line.split(';').map(s => s.trim());
        if (fields.length >= 11) {
            const csvBib = fields[0];
            const category = fields[5] || '';
            const distance = fields[10] || '';

            const names = [fields[1], fields[2], fields[3], fields[4]];
            const birth_dates = [fields[6], fields[7], fields[8], fields[9]];
            const otproba_ids = [fields[11], fields[12], fields[13], fields[14]];

            console.log(`Row ${i}: Bib=${csvBib}, Cat=${category}, Dist=${distance}`);
            for (let j = 0; j < 4; j++) {
                if (names[j]) {
                    console.log(`  Mem ${j + 1}: Name=${names[j]}, Birth=${birth_dates[j]}, Otproba=${otproba_ids[j]}`);
                }
            }
        }
    }
}

testUpload();
