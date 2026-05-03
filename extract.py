import json
with open(r'C:\Users\bauer\.gemini\antigravity\brain\1cf52579-f2c0-444f-a27f-6443ac829dba\.system_generated\logs\overview.txt', 'r', encoding='utf-8') as f:
    for line in f:
        if 'step_index":56' in line:
            start_idx = line.find('{')
            if start_idx != -1:
                try:
                    data = json.loads(line[start_idx:])
                    if 'content' in data:
                        with open('step56.txt', 'w', encoding='utf-8') as out:
                            out.write(data['content'])
                except:
                    pass
