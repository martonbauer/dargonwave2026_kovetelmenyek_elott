const fs = require('fs');
const lines = fs.readFileSync('nevezes_minta.csv', 'utf8').split('\n');
console.log(JSON.stringify(lines[0].split(';')));
console.log(JSON.stringify(lines[1].split(';')));
