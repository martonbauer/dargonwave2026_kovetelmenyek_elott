const fs = require('fs');
const pdf = require('pdf-parse');

const dataBuffer = fs.readFileSync('C:\\Users\\bauer\\Desktop\\lanyi\\vizsgaremek\\Vizsgaremek_elvaras_minta.pdf');

// Sometimes pdf-parse exports a Module object in Node 20+, we need to drill into it
const parseFunc = (typeof pdf === 'function') ? pdf : (pdf.default || pdf);

Promise.resolve(parseFunc(dataBuffer)).then(function(data) {
    fs.writeFileSync('output.txt', data.text);
    console.log('SUCCESS');
}).catch(function(error) {
    console.error('ERROR:', error);
});
