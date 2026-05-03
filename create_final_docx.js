const fs = require('fs');
const htmlToDocx = require('html-to-docx');
const { marked } = require('marked');

(async () => {
    try {
        const markdownString = fs.readFileSync('DOKUMENTACIO.md', 'utf-8');
        
        // Custom renderer to add IDs to headings for optional linking
        const renderer = new marked.Renderer();
        const headings = [];
        renderer.heading = function({ text, depth }) {
            const id = text.toLowerCase().replace(/[^\w]+/g, '-');
            if (depth === 2 || depth === 3) {
                headings.push({ text, depth, id });
            }
            return `<h${depth} id="${id}">${text}</h${depth}>`;
        };
        
        const htmlContent = marked.parse(markdownString, { renderer });

        // Generate static Table of Contents
        let tocHtml = '<h2>Tartalomjegyzék</h2><ul>';
        headings.forEach(h => {
            const style = h.depth === 3 ? 'margin-left: 20px;' : '';
            tocHtml += `<li style="${style}"><a href="#${h.id}">${h.text}</a></li>`;
        });
        tocHtml += '</ul><br/><br/>';
        
        const fullHtml = `
            <!DOCTYPE html>
            <html>
                <head><meta charset="utf-8"></head>
                <body style="font-family: 'Times New Roman', serif;">
                    ${tocHtml}
                    ${htmlContent}
                </body>
            </html>
        `;

        const targetDir = 'C:\\Users\\bauer\\Desktop\\lanyi\\vizsgaremek';
        if (!fs.existsSync(targetDir)){
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const buffer = await htmlToDocx(fullHtml, null, {
            table: { row: { cantSplit: true } },
            footer: true,
            pageNumber: true,
            title: 'DragonWave 2026 - Rendszer Dokumentáció'
        });
        
        const targetFile = `${targetDir}\\2_0_vizsgareme.docx`;
        fs.writeFileSync(targetFile, buffer);
        console.log('Successfully created', targetFile);
    } catch (error) {
        console.error('Error generating docx:', error);
    }
})();
