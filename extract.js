const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\bauer\\.gemini\\antigravity\\brain\\1cf52579-f2c0-444f-a27f-6443ac829dba\\.system_generated\\logs\\overview.txt', 'utf8');
const lines = content.split('\n');
for (const line of lines) {
    if (line.includes('"step_index":56')) {
        const startIdx = line.indexOf('{');
        if (startIdx !== -1) {
            try {
                const data = JSON.parse(line.substring(startIdx));
                if (data.content) {
                    fs.writeFileSync('step56.txt', data.content, 'utf8');
                }
            } catch (e) {
            }
        }
    }
}
