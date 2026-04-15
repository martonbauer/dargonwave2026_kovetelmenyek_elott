const fs = require('fs');
const htmlToDocx = require('html-to-docx');

(async () => {
    try {
        const htmlString = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>DragonWave 2026 - ER Diagram (Supabase)</title>
            <style>
                body { font-family: 'Times New Roman', Times, serif; }
                h1 { font-size: 18pt; text-align: center; }
                h2 { font-size: 14pt; color: #333; }
                h3 { font-size: 12pt; margin-bottom: 4px; }
                p { text-align: justify; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { border: 1px solid black; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .diagram-text { font-family: 'Courier New', Courier, monospace; font-size: 10pt; white-space: pre; background: #f9f9f9; padding: 10px; border: 1px solid #ccc; display: block; }
            </style>
        </head>
        <body>
            <h1>DragonWave 2026<br>Adatbázis ER (Entity-Relationship) Diagram és Séma</h1>
            
            <h2>1. Kapcsolati ábra (ERD - Logikai Modell)</h2>
            <div class="diagram-text">
  +------------------+           +------------------+
  |  registrations   |           |   race_timing    |
  +------------------+ 1       1 +------------------+
  | id (PK)          |-----------| id (PK)          |
  | full_name        |           | registration_id* |
  | email            |           | start_time       |
  | birth_date       |           | checkpoint_time  |
  | category         |           | end_time         |
  | status           |           | status           |
  | otproba_id       |           +------------------+
  +------------------+                    |
           | 1                            | 1
           |                              |
           | *                            | *
  +------------------+           +------------------+
  |     payments     |           |   checkpoints    |
  +------------------+           +------------------+
  | id (PK)          |           | id (PK)          |
  | registration_id* |           | registration_id* |
  | barion_tid       |           | milestone        |
  | status           |           | timestamp        |
  | amount           |           | recorded_by      |
  +------------------+           +------------------+
            </div>

            <h2>2. Táblastruktúrák és Mezők</h2>

            <h3>Tábla: registrations</h3>
            <p>A versenyre nevezett felhasználók alapadatait tartalmazza.</p>
            <table>
                <tr><th>Mezőnév</th><th>Típus</th><th>Kulcs / Megjegyzés</th></tr>
                <tr><td>id</td><td>UUID</td><td>Primary Key (PK)</td></tr>
                <tr><td>full_name</td><td>VARCHAR(100)</td><td>Versenyző neve</td></tr>
                <tr><td>email</td><td>VARCHAR(255)</td><td>E-mail címe (egyedi)</td></tr>
                <tr><td>birth_date</td><td>DATE</td><td>Születési dátum</td></tr>
                <tr><td>category</td><td>VARCHAR(50)</td><td>Kategóriabesorolás (pl. Férfi 22km)</td></tr>
                <tr><td>status</td><td>VARCHAR(20)</td><td>Jelenlegi státusz (pending, present)</td></tr>
                <tr><td>otproba_id</td><td>VARCHAR(20)</td><td>Opcionális Ötpróba azonosító</td></tr>
                <tr><td>created_at</td><td>TIMESTAMP</td><td>Létrehozás ideje</td></tr>
            </table>

            <h3>Tábla: race_timing</h3>
            <p>1:1 kapcsolatban áll a nevezésekkel. Verseny alatti teljesítményt és pontos időeredményeket rögzíti.</p>
            <table>
                <tr><th>Mezőnév</th><th>Típus</th><th>Kulcs / Megjegyzés</th></tr>
                <tr><td>id</td><td>UUID</td><td>Primary Key (PK)</td></tr>
                <tr><td>registration_id</td><td>UUID</td><td>Foreign Key (FK) -> registrations.id</td></tr>
                <tr><td>status</td><td>VARCHAR(20)</td><td>Állapot (racing, finished, dns)</td></tr>
                <tr><td>start_time</td><td>TIMESTAMP</td><td>Rajtidő (milliszekundum pontosság)</td></tr>
                <tr><td>checkpoint_time</td><td>TIMESTAMP</td><td>11km-es forduló időpontja</td></tr>
                <tr><td>end_time</td><td>TIMESTAMP</td><td>Célidő (véglegesített befutó)</td></tr>
            </table>

            <h3>Tábla: checkpoints (Auditor napló)</h3>
            <p>1:N kapcsolat a versenyzőkkel. Többszörös mérések hálózati logolására (versenybírói napló).</p>
            <table>
                <tr><th>Mezőnév</th><th>Típus</th><th>Kulcs / Megjegyzés</th></tr>
                <tr><td>id</td><td>UUID</td><td>Primary Key (PK)</td></tr>
                <tr><td>registration_id</td><td>UUID</td><td>Foreign Key (FK) -> registrations.id</td></tr>
                <tr><td>milestone</td><td>VARCHAR(50)</td><td>Pl. '11km-turn', 'finish-line'</td></tr>
                <tr><td>timestamp</td><td>TIMESTAMP</td><td>Érintés pontos ideje</td></tr>
                <tr><td>recorded_by</td><td>VARCHAR(50)</td><td>A rögzítő bíró (admin) azonosítója</td></tr>
            </table>
        </body>
        </html>
        `;

        const buffer = await htmlToDocx(htmlString, null, {
            table: { row: { cantSplit: true } },
            footer: true,
            pageNumber: true
        });
        
        fs.writeFileSync('C:\\Users\\bauer\\Desktop\\lanyi\\vizsgaremek\\Supabase_ER_Diagram.docx', buffer);
        console.log('Successfully created Supabase_ER_Diagram.docx');
    } catch (error) {
        console.error('Error generating docx:', error);
    }
})();
