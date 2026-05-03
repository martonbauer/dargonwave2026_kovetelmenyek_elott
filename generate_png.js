const fs = require('fs');
const https = require('https');

const mermaidDef = `erDiagram
    REGISTRATIONS {
        uuid id PK
        varchar full_name
        varchar email
        date birth_date
        varchar category
        varchar status "pending, present"
        varchar otproba_id
        timestamp created_at
    }
    RACE_TIMING {
        uuid id PK
        uuid registration_id FK
        varchar status "racing, finished, dns"
        timestamp start_time
        timestamp checkpoint_time
        timestamp end_time
    }
    CHECKPOINTS {
        uuid id PK
        uuid registration_id FK
        varchar milestone
        timestamp timestamp
        varchar recorded_by
    }
    PAYMENTS {
        uuid id PK
        uuid registration_id FK
        varchar barion_tid
        varchar status
        integer amount
    }

    REGISTRATIONS ||--o| RACE_TIMING : "generates (1:1)"
    REGISTRATIONS ||--o{ CHECKPOINTS : "logs (1:N)"
    REGISTRATIONS ||--o| PAYMENTS : "initiates (1:1)"
`;

const postData = JSON.stringify({
  diagram_source: mermaidDef,
  diagram_type: 'mermaid',
  output_format: 'png'
});

const options = {
  hostname: 'kroki.io',
  port: 443,
  path: '/',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  if (res.statusCode !== 200) {
    console.error("Failed with status " + res.statusCode);
    res.resume();
    return;
  }
  const fileStream = fs.createWriteStream('er_diagram.png');
  res.pipe(fileStream);
  fileStream.on('finish', () => {
    console.log('er_diagram.png saved successfully.');
  });
});

req.on('error', (e) => {
  console.error("Request error: " + e.message);
});

req.write(postData);
req.end();
