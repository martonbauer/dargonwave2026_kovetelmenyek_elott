const fs = require('fs');
const pdf = require('pdf-parse');

const dataBuffer = fs.readFileSync('C:\\Users\\bauer\\Desktop\\lanyi\\vizsgaremek\\Vizsgaremek_elvaras_minta.pdf');

pdf(dataBuffer).then(function(data) {
    fs.writeFileSync('output.txt', data.text);
    console.log('Successfully extracted PDF text to output.txt');
}).catch(function(error) {
    console.error('Error parsing PDF:', error);
});
