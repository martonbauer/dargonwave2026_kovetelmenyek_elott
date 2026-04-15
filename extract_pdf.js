const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('C:\\Users\\bauer\\Desktop\\lanyi\\vizsgaremek\\Vizsgaremek_elvaras_minta.pdf');

pdf(dataBuffer).then(function(data) {
    fs.writeFileSync('C:\\Users\\bauer\\Desktop\\dargonwave2026_kovetelmenyek_elott\\pdf_text.txt', data.text, 'utf-8');
});
