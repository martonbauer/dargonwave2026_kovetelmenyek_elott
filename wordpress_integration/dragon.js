/**
 * DragonWave 2026 - Event Management System
 * Core Logic: RaceManager & Storage (API Version)
 */

const API_URL = 'https://dragonwave-api.onrender.com/api'; // FRISSÍTSD MAJD AZ ÉLŐ CÍMEDRE!

class RaceManager {
    constructor() {
        this.data = {
            racers: [],
            categories: {}, // { 'category_id': startTime (timestamp) }
            events: []
        };
        this.categoryMap = {
            'versenykajak_noi_1': 'Versenykajak női-1 (38 cm)',
            'versenykajak_ferfi_1': 'Versenykajak férfi-1 (38 cm)',
            'turakajak_noi_1': 'Túrakajak női 1 (42-44-46-48-51 cm)',
            'turakajak_ferfi_1': 'Túrakajak férfi-1 (42-44-46-48-51 cm)',
            'turakajak_2_nyitott': 'Túrakajak 2 (nyitott)',
            'tengeri_kajak_noi_1': 'Tengeri kajak női 1 (51cm>)',
            'tengeri_kajak_ferfi_1': 'Tengeri kajak férfi 1 (51cm>)',
            'surfski_noi': 'Surfski női kajak',
            'surfski_ferfi': 'Surfski férfi kajak',
            'kenu_noi_1': 'Kenu női-1',
            'kenu_ferfi_1': 'Kenu férfi-1',
            'kenu_2_ferfi': 'Kenu 2 férfi',
            'kenu_2_vegyes': 'Kenu 2 vegyes',
            'kenu_3_nyitott': 'Kenu 3 (nyitott)',
            'kenu_4_nyitott': 'Kenu 4 (nyitott)',
            'outrigger_noi_1': 'Outrigger női-1',
            'outrigger_ferfi_1': 'Outrigger férfi-1',
            'outrigger_2_nyitott': 'Outrigger 2 (nyitott)',
            'sup_noi_1_merev_39_alatt': 'SUP női-1 merev (39 év alatt)',
            'sup_noi_1_merev_39_felett': 'SUP női-1 merev (40 év felett)',
            'sup_ferfi_1_merev_39_alatt': 'SUP férfi-1 merev (39 év alatt)',
            'sup_ferfi_1_merev_39_felett': 'SUP férfi-1 merev (40 év felett)',
            'sup_noi_1_felfujhato_39_alatt': 'SUP női-1 felfújható (39 év alatt)',
            'sup_noi_1_felfujhato_39_felett': 'SUP női-1 felfújható (40 év felett)',
            'sup_ferfi_1_felfujhato_39_alatt': 'SUP férfi-1 felfújható (39 év alatt)',
            'sup_ferfi_1_felfujhato_39_felett': 'SUP férfi-1 felfújható (40 év felett)',
            'sarkanyhajo_otproba': 'Sárkányhajó ötpróba'
        };
        this.groupMap = {
            'kajak_hosszu': 'Összes Hosszú Kajak (22 km)',
            'kajak_rovid': 'Összes Rövid Kajak (11 km)',
            'kenu_hosszu': 'Összes Hosszú Kenu (22 km)',
            'kenu_rovid': 'Összes Rövid Kenu (11 km)',
            'sup_4km': 'Összes SUP (4 km)',
            'sarkanyhajo_11km': 'Sárkányhajó ötpróba (11 km)'
        };
        this.init();
    }

    async init() {
        await this.loadData();
        this.renderUI();
        this.startTickLoop();
    }

    // --- Database / Storage (API) ---

    async loadData() {
        try {
            const response = await fetch(`${API_URL}/data`);
            this.data = await response.json();
            console.log("Data loaded from API:", this.data);
        } catch (err) {
            console.error("Failed to load data:", err);
            showToast("Szerver hiba az adatok betöltésekor!", "error");
        }
    }

    // --- Core Logic (API) ---

    // 1. Registration
    async registerRacer(members, category, distance) {
        try {
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ members, category, distance })
            });
            const newRacer = await response.json();

            await this.loadData();
            this.renderUI();

            showToast(`Sikeres nevezés! Rajtszám: ${newRacer.bib.toString().padStart(3, '0')}`, 'success');

            // Átirányítás a fizetési oldalra 2 másodperc múlva
            setTimeout(() => {
                window.location.href = "https://sarkanyhajozz.hu/termek/dunakeszi-futam-elonevezes/";
            }, 2000);

            return newRacer.bib;
        } catch (err) {
            showToast("Hiba a regisztráció során!", "error");
        }
    }

    // 2. Master Start (Category/Group)
    async startCategory(categoryName, distance, groupId) {
        const startKey = groupId || `${categoryName}_${distance}`;
        if (this.data.categories[startKey]) {
            showToast(`Ez a futam (${this.formatCategoryName(startKey)}) már elindult!`, 'error');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/start-category`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ categoryName, distance, groupId })
            });
            const result = await response.json();

            if (response.ok) {
                await this.loadData();
                this.renderUI();
                showToast(`START: ${this.formatCategoryName(startKey)} (${result.startedCount} versenyző)`, 'success');
            } else {
                showToast(result.error, 'error');
            }
        } catch (err) {
            showToast("Hiba a rajt indításakor!", "error");
        }
    }

    async stopCategory(categoryName, distance, groupId) {
        const startKey = groupId || `${categoryName}_${distance}`;
        if (!this.data.categories[startKey]) {
            showToast(`Ez a futam még el sem indult!`, 'error');
            return;
        }

        if (confirm(`FIGYELEM! Leállítod a(z) ${this.formatCategoryName(startKey)} futamot?\nA még úton lévők automatikusan befejezik mostani idővel!`)) {
            try {
                const response = await fetch(`${API_URL}/stop-category`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ categoryName, distance, groupId })
                });
                const result = await response.json();

                await this.loadData();
                this.renderUI();
                this.updateLiveTimers();

                showToast(`STOP: ${this.formatCategoryName(startKey)} leállítva.`, 'success');
            } catch (err) {
                showToast("Hiba a megállítás során!", "error");
            }
        }
    }

    // 3. Finish / Stop (Bib)
    async stopRacer(bibInput) {
        const bib = parseInt(bibInput, 10);

        try {
            const response = await fetch(`${API_URL}/stop-racer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bib })
            });
            const result = await response.json();

            if (response.ok) {
                await this.loadData();
                this.renderUI();
                showToast(`CÉL: #${bib} ${result.racer.name} - ${this.formatTime(result.racer.totalTime)}`, 'success');
            } else {
                showToast(result.error, 'error');
            }
        } catch (err) {
            showToast("Hiba a célba érkezés rögzítésekor!", "error");
        }
    }

    // --- Admin Functions ---
    async deleteRacer(bib) {
        try {
            const response = await fetch(`${API_URL}/racer/${bib}`, { method: 'DELETE' });
            if (response.ok) {
                await this.loadData();
                this.renderUI();
                showToast(`Versenyző törölve: #${bib}`, 'info');
            }
        } catch (err) {
            showToast("Hiba a törlés során!", "error");
        }
    }

    async resetAll() {
        if (confirm('Biztosan törölsz MINDEN ADATOT?')) {
            try {
                const response = await fetch(`${API_URL}/reset`, { method: 'POST' });
                if (response.ok) {
                    await this.loadData();
                    this.renderUI();
                    showToast("Minden adat törölve!", 'error');
                    const timersContainer = document.getElementById('category-timers');
                    if (timersContainer) timersContainer.innerHTML = '<div style="text-align:center; color: var(--text-secondary); width:100%;">Még nincs indított kategória</div>';
                }
            } catch (err) {
                showToast("Hiba a törlés során!", "error");
            }
        }
    }

    // --- Helpers ---

    formatTime(ms) {
        if (ms === null || isNaN(ms)) return "00:00:00.000";
        const totalSec = Math.floor(ms / 1000);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        const sms = ms % 1000;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${sms.toString().padStart(3, '0')}`;
    }

    formatCategoryName(id) {
        if (this.groupMap[id]) return this.groupMap[id];
        if (id.includes('_')) {
            const parts = id.split('_');
            const dist = parts[parts.length - 1];
            if (dist === '11km' || dist === '22km' || dist === '4km') {
                const catId = id.substring(0, id.lastIndexOf('_'));
                return (this.categoryMap[catId] || catId) + ` [${dist}]`;
            }
        }
        return this.categoryMap[id] || id;
    }

    startTickLoop() {
        setInterval(() => {
            const now = new Date();
            const localTimeEl = document.getElementById('local-time-display');
            const localDateEl = document.getElementById('local-date-display');

            if (localTimeEl) {
                localTimeEl.textContent = now.toLocaleTimeString('hu-HU');
            }
            if (localDateEl) {
                const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                localDateEl.textContent = now.toLocaleDateString('hu-HU', options);
            }
            this.updateLiveTimers();
        }, 100);
    }

    getTeamSize(catId) {
        if (!catId) return 1;
        if (catId.includes('_2_')) return 2;
        if (catId === 'turakajak_2_nyitott') return 2;
        if (catId === 'kenu_2_ferfi' || catId === 'kenu_2_vegyes' || catId === 'outrigger_2_nyitott') return 2;
        if (catId === 'kenu_3_nyitott') return 3;
        if (catId === 'kenu_4_nyitott') return 4;
        if (catId === 'sarkanyhajo_otproba') return 1;
        return 1;
    }

    updateMemberFields() {
        const catId = document.getElementById('kategoria').value;
        const size = this.getTeamSize(catId);
        const container = document.getElementById('members-container');
        container.innerHTML = '';

        for (let i = 1; i <= size; i++) {
            const memberDiv = document.createElement('div');
            memberDiv.className = 'member-entry';
            memberDiv.style = "margin-bottom: 25px; padding: 15px; border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; background: rgba(255,255,255,0.02);";
            memberDiv.innerHTML = `
                <h4 style="margin-top:0; color:var(--accent-primary); font-size: 0.9rem; margin-bottom: 15px;">${size > 1 ? i + '. Versenyző adatai' : 'Versenyző adatai'}</h4>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <label>Név</label>
                        <input type="text" class="member-name" placeholder="Pl. Kiss János" required>
                    </div>
                    <div>
                        <label>Születési Dátum</label>
                        <input type="date" class="member-birth" required>
                    </div>
                </div>
                <div style="margin-top: 15px;">
                    <label>Ötpróba azonosító (opcionális)</label>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <input type="text" class="member-otproba" placeholder="Pl. 5P123456" 
                               pattern="5P[0-9]{6}" title="5P + 6 számjegy" maxlength="8" style="flex: 2;">
                        <label style="flex: 1; display: flex; align-items: center; gap: 5px; font-size: 0.75rem; cursor: pointer; border: 1px solid rgba(255,255,255,0.1); padding: 5px; border-radius: 4px;">
                            <input type="checkbox" onchange="const inp=this.parentElement.parentElement.querySelector('.member-otproba'); inp.disabled=this.checked; if(this.checked) inp.value='';">
                            Nincs
                        </label>
                    </div>
                </div>
            `;
            container.appendChild(memberDiv);
        }
    }

    updateLiveTimers() {
        const timersContainer = document.getElementById('category-timers');
        if (!timersContainer) return;

        const activeCategories = Object.keys(this.data.categories || {})
            .map(k => ({ id: k, start: this.data.categories[k] }))
            .sort((a, b) => a.start - b.start);

        if (activeCategories.length > 0) {
            if (timersContainer.children.length !== activeCategories.length || timersContainer.querySelector('.cat-timer') === null) {
                timersContainer.innerHTML = '';
                activeCategories.forEach(cat => {
                    const div = document.createElement('div');
                    div.className = 'cat-timer';
                    div.innerHTML = `
                        <div class="cat-name">${this.formatCategoryName(cat.id)}</div>
                        <div class="cat-time" id="timer-${cat.id}">00:00:00.000</div>
                    `;
                    timersContainer.appendChild(div);
                });
            }

            activeCategories.forEach(cat => {
                const timeEl = document.getElementById(`timer-${cat.id}`);
                if (timeEl) {
                    const diff = Date.now() - cat.start;
                    timeEl.textContent = this.formatTime(diff);
                }
            });
        } else {
            if (timersContainer.children.length === 0 || timersContainer.querySelector('.cat-timer') !== null) {
                timersContainer.innerHTML = '<div style="text-align:center; color: var(--text-secondary); width:100%;">Még nincs indított kategória</div>';
            }
        }

        const runningElements = document.querySelectorAll('tr.status-running .time');
        runningElements.forEach(el => {
            const startStr = el.getAttribute('data-start');
            if (startStr) {
                const diff = Date.now() - parseInt(startStr, 10);
                el.textContent = this.formatTime(diff);
            }
        });
    }

    // --- UI Rendering ---

    renderUI() {
        this.renderRacersList();
        if (typeof window.renderAdminTable === 'function') {
            window.renderAdminTable();
        }
        this.renderAdminControlButtons();
    }

    renderAdminControlButtons() {
        const container = document.getElementById('category-start-buttons');
        if (!container) return;

        // Csak akkor rajzoljuk újra, ha üres (bejelentkezéskor vagy első betöltéskor)
        if (container.children.length > 1) return;

        container.innerHTML = '';
        Object.keys(this.groupMap).forEach(groupId => {
            const name = this.groupMap[groupId];
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.gap = '10px';
            div.style.marginBottom = '8px';

            div.innerHTML = `
                <button onclick="startCategory(null, null, '${groupId}')" class="btn-start" style="flex:3; text-align:left; font-size:0.95rem; font-weight:bold; padding:10px 15px;">
                    ${name} (START)
                </button>
                <button onclick="stopCategory(null, null, '${groupId}')" class="btn-start" style="flex:1; background:rgba(255,0,0,0.1); border-color:var(--accent-secondary); color:var(--accent-secondary); padding:8px 5px;">
                    STOP
                </button>
            `;
            container.appendChild(div);
        });
    }

    renderRacersList() {
        const container = document.getElementById('results-tables-container');
        if (!container) return;
        container.innerHTML = '';

        if (!this.data.racers || this.data.racers.length === 0) {
            container.innerHTML = '<div style="text-align:center; color: var(--text-secondary); width:100%;">Nincsenek nevezett versenyzők</div>';
            return;
        }

        const groups = {};
        this.data.racers.forEach(r => {
            if (!groups[r.category]) groups[r.category] = [];
            groups[r.category].push(r);
        });

        const categories = Object.keys(groups).sort();

        categories.forEach(cat => {
            const sortedRacers = groups[cat].sort((a, b) => {
                if (a.status === 'finished' && b.status !== 'finished') return -1;
                if (a.status !== 'finished' && b.status === 'finished') return 1;
                if (a.status === 'finished' && b.status === 'finished') return a.totalTime - b.totalTime;
                if (a.status === 'running' && b.status !== 'running') return -1;
                if (a.status !== 'running' && b.status === 'running') return 1;
                return a.bib - b.bib;
            });

            const catWrapper = document.createElement('div');
            catWrapper.className = 'category-results-table';
            catWrapper.style.marginBottom = '2rem';

            const tableTitle = document.createElement('h4');
            tableTitle.textContent = this.formatCategoryName(cat);
            tableTitle.className = 'category-title';
            catWrapper.appendChild(tableTitle);

            const table = document.createElement('table');
            table.className = 'results-table';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Helyezés</th>
                        <th>Rajtszám</th>
                        <th>Név</th>
                        <th>Táv</th>
                        <th style="text-align:right;">Időeredmény</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;

            const tbody = table.querySelector('tbody');
            let rank = 1;

            sortedRacers.forEach(r => {
                const tr = document.createElement('tr');
                tr.className = `status-${r.status}`;
                tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';

                let timeDisplay = "még nem rajtolt el";
                let dataStartAttr = "";
                let rankDisplay = "-";

                if (r.status === 'running') {
                    timeDisplay = this.formatTime(Date.now() - r.startTime);
                    dataStartAttr = `data-start="${r.startTime}"`;
                }
                if (r.status === 'finished') {
                    timeDisplay = this.formatTime(r.totalTime);
                    rankDisplay = `${rank}.`;
                    rank++;
                }

                const formattedBib = r.bib.toString().padStart(3, '0');
                let rowColor = 'inherit';
                if (r.status === 'finished') rowColor = '#00ff88';
                else if (r.status === 'running') rowColor = 'var(--accent-primary)';

                const memberNames = r.members ? r.members.map(m => m.name).join(', ') : (r.name || '-');

                tr.innerHTML = `
                    <td class="rank-col" style="color:${rowColor};">${rankDisplay}</td>
                    <td class="bib-col">#${formattedBib}</td>
                    <td class="name-col">${memberNames}</td>
                    <td class="distance-col">${r.distance || '-'}</td>
                    <td class="time-col time" style="color:${rowColor};" ${dataStartAttr}>${timeDisplay}</td>
                `;
                tbody.appendChild(tr);
            });

            catWrapper.appendChild(table);
            container.appendChild(catWrapper);
        });
    }
}

// Instantiate
const raceManager = new RaceManager();

// --- Toast System ---
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.position = 'fixed';
        container.style.bottom = '20px';
        container.style.right = '20px';
        container.style.zIndex = '9999';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const bgColors = { 'success': 'rgba(0, 255, 136, 0.9)', 'error': 'rgba(255, 0, 60, 0.9)', 'info': 'rgba(0, 240, 255, 0.9)' };
    toast.style.background = bgColors[type] || 'rgba(50,50,50,0.9)';
    toast.style.color = (type === 'success' || type === 'info') ? '#000' : '#fff';
    toast.style.padding = '12px 20px';
    toast.style.borderRadius = '8px';
    toast.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
    toast.style.fontFamily = "'Space Mono', monospace";
    toast.style.fontWeight = 'bold';
    toast.style.transform = 'translateX(100%)';
    toast.style.opacity = '0';
    toast.style.transition = 'all 0.3s ease-out';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => { toast.style.transform = 'translateX(0)'; toast.style.opacity = '1'; }, 10);
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// --- Bind Events ---

document.getElementById('nevezesForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const kategoria = document.getElementById('kategoria').value;
    const tav = document.getElementById('versenytav').value;

    if (!kategoria) {
        showToast("Kérjük válasszon kategóriát!", "error");
        return;
    }

    const memberEntries = document.querySelectorAll('.member-entry');
    const members = [];

    memberEntries.forEach(entry => {
        const name = entry.querySelector('.member-name').value;
        const birthDate = entry.querySelector('.member-birth').value;
        const otprobaInp = entry.querySelector('.member-otproba');
        const otprobaId = otprobaInp.disabled ? "Nincs" : otprobaInp.value;

        members.push({ name, birthDate, otprobaId });
    });

    raceManager.registerRacer(members, kategoria, tav);

    // Form reset
    document.getElementById('kategoria').value = '';
    document.getElementById('members-container').innerHTML = `
        <div style="text-align: center; padding: 20px; color: #888; border: 1px dashed #444; border-radius: 8px; margin: 15px 0;">
            Válassz kategóriát a jelentkezési űrlap megjelenítéséhez.
        </div>
    `;
    document.getElementById('kategoria').focus();
});

window.startCategory = (cat, dist, group) => raceManager.startCategory(cat, dist, group);
window.stopCategory = (cat, dist, group) => raceManager.stopCategory(cat, dist, group);
window.stopRacer = () => {
    const input = document.getElementById('bib-input');
    if (input && input.value) {
        raceManager.stopRacer(input.value);
        input.value = '';
        input.focus();
    } else {
        showToast("Kérem adja meg a rajtszámot!", 'error');
    }
};

async function uploadCsv() {
    const fileInput = document.getElementById('csv-upload');
    if (!fileInput || fileInput.files.length === 0) {
        showToast("Válasszon ki egy CSV fájlt!", "error");
        return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    try {
        const response = await fetch(`${API_URL}/upload-csv`, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();

        if (response.ok) {
            showToast(`Sikeres importálás: ${result.importedCount} versenyző`, "success");
            await raceManager.loadData();
            raceManager.renderUI();
            fileInput.value = '';
        } else {
            showToast(result.error, "error");
        }
    } catch (err) {
        showToast("Hiba a feltöltés során!", "error");
    }
}
window.uploadCsv = uploadCsv;

document.addEventListener('DOMContentLoaded', () => {
    const bibInput = document.getElementById('bib-input');
    if (bibInput) {
        bibInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') window.stopRacer();
        });
    }

    const categorySelect = document.getElementById('kategoria');
    const distanceSelect = document.getElementById('versenytav');
    if (categorySelect && distanceSelect) {
        categorySelect.addEventListener('change', () => {
            if (categorySelect.value.startsWith('sup_')) {
                distanceSelect.value = '4km';
                Array.from(distanceSelect.options).forEach(opt => {
                    opt.disabled = (opt.value !== '4km');
                });
            } else if (categorySelect.value === 'sarkanyhajo_otproba') {
                distanceSelect.value = '11km';
                Array.from(distanceSelect.options).forEach(opt => {
                    opt.disabled = (opt.value !== '11km');
                });
            } else {
                Array.from(distanceSelect.options).forEach(opt => {
                    opt.disabled = false;
                });
                if (distanceSelect.value === '4km') distanceSelect.value = '11km';
            }
        });
    }
});

// --- Admin ---
window.switchTab = (tab) => {
    const publicSections = document.querySelectorAll('#registration-form, #live-results');
    const adminView = document.getElementById('admin-view');
    const btns = document.querySelectorAll('.nav-btn');
    btns.forEach(b => b.classList.remove('active'));

    if (tab === 'admin') {
        publicSections.forEach(s => s.classList.add('hidden'));
        adminView.classList.remove('hidden');
        btns[1].classList.add('active');
    } else {
        publicSections.forEach(s => s.classList.remove('hidden'));
        adminView.classList.add('hidden');
        btns[0].classList.add('active');
    }
};

window.loginAdmin = () => {
    const pass = document.getElementById('admin-pass').value;
    if (pass === 'dragon2026') {
        document.getElementById('admin-login-panel').classList.add('hidden');
        document.getElementById('admin-dashboard-panel').classList.remove('hidden');
        window.renderAdminTable();
        showToast('Sikeres belépés!', 'success');
    } else {
        showToast('Hibás jelszó!', 'error');
    }
};

window.renderAdminTable = () => {
    const tbody = document.getElementById('admin-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!raceManager.data.racers || raceManager.data.racers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Nincs rögzített adat</td></tr>';
        return;
    }

    raceManager.data.racers.forEach(r => {
        const tr = document.createElement('tr');
        let statusColor = "white";
        let dataStartAttr = "";

        if (r.status === 'running') {
            statusColor = 'var(--accent-primary)';
            tr.className = "status-running";
            dataStartAttr = `data-start="${r.startTime}"`;
        }
        if (r.status === 'finished') statusColor = '#00ff88';

        let timeStr = r.status === 'running' ? raceManager.formatTime(Date.now() - r.startTime) : (r.status === 'finished' ? raceManager.formatTime(r.totalTime) : "00:00:00.000");

        const memberList = r.members ? r.members.map(m => `<div style="margin-bottom:2px;">${m.name} <span style="font-size:0.7rem; color:#888;">(${m.birthDate || '?'})</span></div>`).join('') : (r.name || '-');
        const otprobaList = r.members ? r.members.map(m => `<div style="margin-bottom:2px;">${m.otprobaId || '-'}</div>`).join('') : (r.otprobaId || '-');

        tr.innerHTML = `
            <td><strong>#${r.bib}</strong></td>
            <td>${memberList}</td>
            <td>${otprobaList}</td>
            <td>${raceManager.formatCategoryName(r.category)}</td>
            <td>${r.distance || '-'}</td>
            <td style="color:${statusColor}">${r.status}</td>
            <td class="time" ${dataStartAttr}>${timeStr}</td>
            <td>
                <button class="action-btn delete" onclick="raceManager.deleteRacer(${r.bib})">Törlés</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
};
