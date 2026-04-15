const fs = require('fs');
const htmlToDocx = require('html-to-docx');

(async () => {
    try {
        const htmlString = fs.readFileSync('C:\\Users\\bauer\\Desktop\\lanyi\\vizsgaremek\\beadando.html', 'utf-8');
        const buffer = await htmlToDocx(htmlString, null, {
            table: { row: { cantSplit: true } },
            footer: true,
            pageNumber: true
        });
        
        fs.writeFileSync('C:\\Users\\bauer\\Desktop\\lanyi\\vizsgaremek\\beadando.docx', buffer);
        console.log('Successfully created beadando.docx');
    } catch (error) {
        console.error('Error generating docx:', error);
    }
})();
