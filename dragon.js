/**
 * DunakesziFutam - DragonWave Időmérési és Regisztrációs Rendszer
 * Core Logic: RaceManager & Storage (API Version)
 */

// API Configuration - Set this to your Render.com URL in production


const API_URL = (window.location.hostname === 'localhost' || window.location.protocol === 'file:')
    ? 'http://localhost:3001/api'
    : '/api';
const APP_VERSION = "2.2.1"; // Verziószám frissítése
console.log(`DragonWave Időmérési Rendszer v${APP_VERSION} inicializálva.`);

// --- Admin & UI Helpers (Előrehozva az inicializálás miatt) ---
window.switchTab = (tab) => {
    console.log(`Switching tab to: ${tab}`);
    const regForm = document.getElementById('registration-form');
    const liveResults = document.getElementById('live-results');
    const adminView = document.getElementById('admin-view');
    const clockContainer = document.getElementById('local-time-container');
    const btns = document.querySelectorAll('.nav-btn');
    btns.forEach(b => b.classList.remove('active'));

    // Mindent elrejt
    if (regForm) regForm.classList.add('hidden');
    if (liveResults) liveResults.classList.add('hidden');
    if (adminView) adminView.classList.add('hidden');
    if (clockContainer) clockContainer.classList.add('hidden'); // Default hide

    if (tab === 'regisztracio') {
        if (regForm) regForm.classList.remove('hidden');
        const btn = document.getElementById('btn-regisztracio');
        if (btn) btn.classList.add('active');
    } else if (tab === 'eredmenyek') {
        if (liveResults) liveResults.classList.remove('hidden');
        if (clockContainer) clockContainer.classList.remove('hidden'); // Show clock
        const btn = document.getElementById('btn-eredmenyek');
        if (btn) btn.classList.add('active');
        if (window.raceManager) window.raceManager.updateLiveTimers();
    } else if (tab === 'admin') {
        if (adminView) adminView.classList.remove('hidden');
        if (clockContainer) clockContainer.classList.remove('hidden'); // Show clock
        const btn = document.getElementById('btn-admin');
        if (btn) btn.classList.add('active');
        
        // Admin specifikus panel kezelés
        const loginPanel = document.getElementById('admin-login-panel');
        const dashboardPanel = document.getElementById('admin-dashboard-panel');
        
        if (window.raceManager && window.raceManager.adminPassword) {
            if (loginPanel) loginPanel.classList.add('hidden');
            if (dashboardPanel) dashboardPanel.classList.remove('hidden');
            window.renderAdminTable();
            window.raceManager.renderUI();
        } else {
            if (loginPanel) loginPanel.classList.remove('hidden');
            if (dashboardPanel) dashboardPanel.classList.add('hidden');
        }
    }
};

window.loginAdmin = async () => {
    const password = document.getElementById('admin-pass').value;
    
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            window.raceManager.adminPassword = password;
            sessionStorage.setItem('dragonAdminPassword', password);
            document.getElementById('admin-login-panel').classList.add('hidden');
            document.getElementById('admin-dashboard-panel').classList.remove('hidden');
            window.renderAdminTable();
            window.raceManager.renderUI();
            showToast('Sikeres belépés!', 'success');
        } else {
            showToast(result.error || 'Hibás jelszó!', 'error');
        }
    } catch (err) {
        console.error("Login error:", err);
        showToast("Hiba a belépés során!", "error");
    }
};

window.logoutAdmin = () => {
    sessionStorage.removeItem('dragonAdminPassword');
    if (window.raceManager) {
        window.raceManager.adminPassword = '';
    }
    document.getElementById('admin-login-panel').classList.remove('hidden');
    document.getElementById('admin-dashboard-panel').classList.add('hidden');
    document.getElementById('admin-pass').value = '';
    showToast('Sikeres kijelentkezés', 'info');
};

window.renderAdminTable = () => {
    const tbody = document.getElementById('admin-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!window.raceManager || !window.raceManager.data.racers || window.raceManager.data.racers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Nincs rögzített adat</td></tr>';
        return;
    }

    [...window.raceManager.data.racers].filter(r => r && r.status).sort((a, b) => (a.bib || 0) - (b.bib || 0)).forEach(r => {
        const tr = document.createElement('tr');
        let statusColor = "white";
        let dataStartAttr = "";

        if (r.status === 'running') {
            statusColor = 'var(--accent-primary)';
            tr.className = "status-running";
            dataStartAttr = `data-start="${r.start_time || 0}"`;
        }
        if (r.status === 'finished') statusColor = '#00FFCC'; // More vibrant cyan-blue for finished

        let timeStr = "00:00:00.000";
        if (r.status === 'running') {
            timeStr = window.raceManager.formatTime(Date.now() - (r.start_time || 0));
        } else if (r.status === 'finished') {
            timeStr = window.raceManager.formatTime(r.total_time || 0);
        }

        const memberList = r.members ? r.members.map(m => `<div style="margin-bottom:2px;">${m.name || '?'} <span style="font-size:0.7rem; color:#888;">(${m.birth_date || '?'})</span></div>`).join('') : (r.name || '-');
        const otprobaList = r.members ? r.members.map(m => `<div style="margin-bottom:2px;">${m.otproba_id || '-'}</div>`).join('') : (r.otproba_id || '-');
        const isSeriesText = r.is_series ? '<span style="color:var(--accent-secondary); font-weight:bold;">IGEN</span>' : 'nem';

        tr.innerHTML = `
            <td><strong>#${(r.bib || 0).toString().padStart(3, '0')}</strong></td>
            <td>${memberList}</td>
            <td>${otprobaList}</td>
            <td>${isSeriesText}</td>
            <td>${window.raceManager.formatCategoryName(r.category)}</td>
            <td>${r.distance || '-'}</td>
            <td style="color:${statusColor}">${(r.status || 'registered').toUpperCase()}</td>
            <td class="time" ${dataStartAttr}>${timeStr}</td>
            <td>
                <button class="action-btn edit" onclick="window.raceManager.openEditModal('${r.id}')">Szerkesztés</button>
                <button class="action-btn delete" onclick="window.raceManager.deleteRacer('${r.id}', ${r.bib || 'null'})">Törlés</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
};

window.exportResultsToExcel = () => {
    if (!window.raceManager || !window.raceManager.data || !window.raceManager.data.racers || window.raceManager.data.racers.length === 0) {
        showToast('Nincs menthető adat!', 'error');
        return;
    }

    const allRacers = [...window.raceManager.data.racers].sort((a, b) => a.bib - b.bib);
    const wb = XLSX.utils.book_new();

    const summaryRows = [
        ["Rajtszám", "Név (Egység tagjai)", "Születési dátumok", "Ötpróba ID-k", "Kategória", "Táv", "Sorozat", "Státusz", "Időeredmény"]
    ];

    allRacers.forEach(r => {
        const names = r.members ? r.members.map(m => m.name).join(', ') : (r.name || '-');
        const births = r.members ? r.members.map(m => m.birth_date || '').filter(d => d).join(', ') : '-';
        const otprobas = r.members ? r.members.map(m => m.otproba_id || '').filter(id => id).join(', ') : (r.otproba_id || '-');
        const series = r.is_series ? 'Igen' : 'Nem';
        const timeStr = r.status === 'finished' ? window.raceManager.formatTime(r.total_time) : (r.status === 'running' ? 'Folyamatban' : 'Regisztrálva');

        summaryRows.push([
            r.bib,
            names,
            births,
            otprobas,
            window.raceManager.formatCategoryName(r.category),
            r.distance,
            series,
            r.status,
            timeStr
        ]);
    });

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Összesített_Lista");

    const groups = {};
    allRacers.forEach(r => {
        if (!groups[r.category]) groups[r.category] = [];
        groups[r.category].push(r);
    });

    Object.keys(groups).sort().forEach(cat => {
        const sorted = groups[cat].sort((a, b) => {
            if (a.status === 'finished' && b.status !== 'finished') return -1;
            if (a.status !== 'finished' && b.status === 'finished') return 1;
            if (a.status === 'finished' && b.status === 'finished') return a.total_time - b.total_time;
            return a.bib - b.bib;
        });

        const catRows = [
            ["Helyezés", "Rajtszám", "Név (Csapattagok)", "Születési dátumok", "Ötpróba ID-k", "Táv", "Sorozat", "Státusz", "Időeredmény"]
        ];

        let rank = 1;
        sorted.forEach(r => {
            const currentRank = r.status === 'finished' ? rank++ : '-';
            const names = r.members ? r.members.map(m => m.name).join(', ') : (r.name || '-');
            const births = r.members ? r.members.map(m => m.birth_date || '').filter(d => d).join(', ') : '-';
            const otprobas = r.members ? r.members.map(m => m.otproba_id || '').filter(id => id).join(', ') : (r.otproba_id || '-');
            const series = r.is_series ? 'Igen' : 'Nem';
            const timeStr = r.status === 'finished' ? window.raceManager.formatTime(r.total_time) : (r.status === 'running' ? 'Folyamatban' : 'Regisztrálva');

            catRows.push([currentRank, r.bib, names, births, otprobas, r.distance, series, r.status, timeStr]);
        });

        const ws = XLSX.utils.aoa_to_sheet(catRows);
        let sheetName = window.raceManager.formatCategoryName(cat).replace(/[\\/?*\[\]]/g, '').substring(0, 31);
        
        let finalSheetName = sheetName;
        let counter = 1;
        while (wb.SheetNames.includes(finalSheetName)) {
            const suffix = `_${counter}`;
            finalSheetName = sheetName.substring(0, 31 - suffix.length) + suffix;
            counter++;
        }
        XLSX.utils.book_append_sheet(wb, ws, finalSheetName);
    });

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Eredmenyek_DragonWave_${dateStr}.xlsx`);
    showToast('Kibővített Excel sikeresen exportálva!', 'success');
};


class RaceManager {
    constructor() {
        this.data = {
            racers: [],
            categories: {}, // { 'category_id': startTime (timestamp) }
            events: []
        };
        this.serverTimeOffset = 0;
        this.adminPassword = sessionStorage.getItem('dragonAdminPassword') || '';
        this.categoryMap = {
            // 11 km (Rövid)
            'kajak_1_nyitott_11km': 'Kajak-1 nyitott',
            'kajak_2_nyitott_11km': 'Kajak-2 nyitott',
            'kenu_nyitott_11km': 'Kenu nyitott',
            'rovid_kenu_11km': 'Rövid kenu',

            // 22 km (Hosszú)
            'versenykajak_noi_1_22km': 'Versenykajak női-1 (38 cm)',
            'versenykajak_ferfi_1_22km': 'Versenykajak férfi-1 (38 cm)',
            'turakajak_noi_1_22km': 'Túrakajak női-1 (42–51 cm)',
            'turakajak_ferfi_1_22km': 'Túrakajak férfi-1 (42–51 cm)',
            'turakajak_2_nyitott_22km': 'Túrakajak 2 (nyitott)',
            'tengeri_kajak_noi_1_22km': 'Tengeri kajak női-1 (51 cm>)',
            'tengeri_kajak_ferfi_1_22km': 'Tengeri kajak férfi-1 (51 cm>)',
            'mk_1_fiu_22km': 'MK-1 fiú',
            'mk_1_leany_22km': 'MK-1 leány',
            'outrigger_noi_1_22km': 'Outrigger női-1',
            'outrigger_ferfi_1_22km': 'Outrigger férfi-1',
            'outrigger_2_nyitott_22km': 'Outrigger-2 (nyitott)',
            'kenu_2_ferfi_22km': 'Kenu-2 férfi',
            'kenu_2_vegyes_22km': 'Kenu-2 vegyes',
            'kenu_3_nyitott_22km': 'Kenu-3 (nyitott)',
            'kenu_4_nyitott_22km': 'Kenu-4 (nyitott)',
            'sup_noi_1_22km': 'SUP női-1',
            'sup_ferfi_1_22km': 'SUP férfi-1',

            // 4 km SUP
            'sup_noi_1_merev_39_alatt_4km': 'SUP női-1- merev deszka 39 év alatt',
            'sup_noi_1_merev_40_felett_4km': 'SUP női-1- merev deszka 40 év felett',
            'sup_ferfi_1_merev_39_alatt_4km': 'SUP férfi-1- merev deszka 39 év alatt',
            'sup_ferfi_1_merev_40_felett_4km': 'SUP férfi-1- merev deszka 40 év felett',
            'sup_noi_1_felfujhato_39_alatt_4km': 'SUP női-1- felfújható deszka 39 év alatt',
            'sup_noi_1_felfujhato_40_felett_4km': 'SUP női-1- felfújható deszka 40 év felett',
            'sup_ferfi_1_felfujhato_39_alatt_4km': 'SUP férfi-1- felfújható deszka 39 év alatt',
            'sup_ferfi_1_felfujhato_40_felett_4km': 'SUP férfi-1- felfújható deszka 40 év felett',
            
            // Legacy / Admin support
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
        await this.checkConnectivity();
        await this.loadData();
        this.renderUI();
        this.startTickLoop();
    }



    async checkConnectivity() {
        try {
            const response = await fetch(`${API_URL}/health`);
            const result = await response.json();
            if (response.ok && result.database === 'connected') {
                console.log("Database connectivity verified.");
                // Optional: Update UI to show connected status
            } else {
                throw new Error(result.error || "Database disconnected");
            }
        } catch (err) {
            console.error("Connectivity check failed:", err);
            showToast("Hiba: Nincs adatbázis kapcsolat! Ellenőrizd a szervert.", "error");
        }
    }

    getAuthHeader() {
        return { 'Authorization': `Bearer ${this.adminPassword}` };
    }

    // --- Shared Helpers ---

    /** Adatok újratöltése + UI frissítése – korábban ~12x ismételt 2 sor */
    async refreshUI() {
        await this.loadData();
        this.renderUI();
    }

    /**
     * Általános API-hívó helper: elvégzi a fetch-et, kezeli a 401/403-at.
     * Visszatér a Response-szal, vagy null-lal ha auth-hiba volt.
     */
    async apiCall(path, method = 'GET', body = undefined) {
        const opts = {
            method,
            headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() }
        };
        if (body !== undefined) opts.body = JSON.stringify(body);
        const response = await fetch(`${API_URL}/${path}`, opts);
        if (response.status === 401 || response.status === 403) {
            showToast("Nincs jogosultságod a művelethez! Jelentkezz be újra.", "error");
            if (response.status === 403) sessionStorage.removeItem('dragonAdminPassword');
            return null;
        }
        return response;
    }

    // --- Database / Storage (API) ---

    async loadData() {
        try {
            console.log(`Fetching data from: ${API_URL}/data`);
            const response = await fetch(`${API_URL}/data`);

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Server returned error:", errorData);
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            this.data = result;
            
            // Time synchronization: calculate offset between server and client
            if (result.serverNow) {
                this.serverTimeOffset = result.serverNow - Date.now();
                console.log(`Time sync: offset is ${this.serverTimeOffset}ms`);
            }
            
            console.log("Data successfully loaded:", this.data);
        } catch (err) {
            console.error("CRITICAL: Failed to load data from server:", err);
            showToast("Szerver hiba az adatok betöltésekor! Ellenőrizd a konzolt (F12).", "error");
        }
    }

    // --- Core Logic (API) ---

    // 1. Registration
    async registerRacer(members, category, distance, is_series, email, phone, contactName) {
        try {
            const formattedMembers = members.map(m => ({
                name: m.name,
                birth_date: m.birth_date,
                otproba_id: m.otproba_id
            }));

            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    members: formattedMembers, 
                    category, 
                    distance, 
                    is_series, 
                    email, 
                    phone,
                    contact_name: contactName // Added contact_name
                })
            });

            if (response.status === 401 || response.status === 403) {
                const errorData = await response.json();
                showToast(`Hitelesítési hiba: ${errorData.error}`, "error");
                // Clear password if it's invalid
                if (response.status === 403) sessionStorage.removeItem('dragonAdminPassword');
                return;
            }

            if (response.ok) {
                const newRacer = await response.json();
                await this.loadData();
                this.renderUI();

                showToast(`Sikeres nevezés! Rajtszám: ${newRacer.bib.toString().padStart(3, '0')}`, 'success');

                // Átirányítás a fizetési oldalra 2 másodperc múlva
                setTimeout(() => {
                    window.location.href = "https://sarkanyhajozz.hu/termek/dunakeszi-futam-elonevezes/";
                }, 2000);

                return newRacer.bib;
            } else {
                const errorData = await response.json();
                showToast(errorData.error || "Hiba a regisztráció során!", "error");
            }
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
            const response = await this.apiCall('start-category', 'POST', { categoryName, distance, groupId });
            if (!response) return;
            const result = await response.json();
            if (response.ok) {
                await this.refreshUI();
                showToast(`START: ${this.formatCategoryName(startKey)} (${result.startedCount || result.count} versenyző)`, 'success');
                console.log("StartCategory success:", result);
            } else {
                showToast(result.error, 'error');
                console.warn("StartCategory error:", result.error);
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
                const response = await this.apiCall('stop-category', 'POST', { categoryName, distance, groupId });
                if (!response) return;
                const result = await response.json();
                console.log("StopCategory response:", result);
                await this.refreshUI();
                this.updateLiveTimers();
                showToast(`STOP: ${this.formatCategoryName(startKey)} leállítva. (${result.count} versenyző beérkezett)`, 'success');
                console.log("StopCategory success:", result);
            } catch (err) {
                showToast("Hiba a megállítás során!", "error");
                console.error("StopCategory exception:", err);
            }
        }
    }

    async resetCategory(categoryName, distance, groupId) {
        const startKey = groupId || `${categoryName}_${distance}`;
        if (confirm(`Biztosan törlöd a(z) ${this.formatCategoryName(startKey)} időmérőjét?\n(A futó óra leáll, de a versenyzők státusza nem változik!)`)) {
            try {
                const response = await this.apiCall('reset-category', 'POST', { categoryName, distance, groupId });
                if (!response) return;
                if (response.ok) {
                    await this.refreshUI();
                    showToast("Időmérő törölve.", "info");
                }
            } catch (err) {
                console.error("ResetCategory error:", err);
            }
        }
    }

    // 3. Finish / Stop (Bib)
    async stopRacer(bibInput) {
        const bib = parseInt(bibInput, 10);
        try {
            const response = await this.apiCall('stop-racer', 'POST', { bib });
            if (!response) return;
            const result = await response.json();
            if (response.ok) {
                await this.refreshUI();
                showToast(`CÉL: #${bib} ${result.racer.name} - ${this.formatTime(result.racer.total_time)}`, 'success');
                console.log("StopRacer success:", result);
                const bibInputEl = document.getElementById('bib-input');
                if (bibInputEl) { bibInputEl.value = ''; bibInputEl.focus(); }
            } else {
                showToast(result.error, 'error');
                console.warn("StopRacer error:", result.error);
            }
        } catch (err) {
            showToast("Hiba a célba érkezés rögzítésekor!", "error");
            console.error("StopRacer exception:", err);
        }
    }

    async startIndividual(bib) {
        if (!bib) { showToast("Kérlek adj meg egy rajtszámot!", "error"); return; }
        try {
            const response = await this.apiCall('start-individual', 'POST', { bib });
            if (!response) return;
            const result = await response.json();
            if (response.ok) {
                await this.refreshUI();
                showToast(`RAJT: #${bib} elindult!`, 'success');
            } else {
                showToast(result.error, 'error');
            }
        } catch (err) {
            showToast("Hiba az egyéni indításkor!", "error");
        }
    }

    async startMass() {
        if (!confirm("BIZTOSAN ELINDÍTOD A TÖMEGRAJTOT?\nMinden 'Regisztrált' állapotú versenyző elindul az aktuális idővel!")) return;
        try {
            const response = await this.apiCall('start-mass', 'POST');
            if (!response) return;
            const result = await response.json();
            if (response.ok) {
                await this.refreshUI();
                showToast(`TÖMEGRAJT: ${result.count} versenyző elindult!`, 'success');
            } else {
                showToast(result.error, 'error');
            }
        } catch (err) {
            showToast("Hiba a tömegrajt indításakor!", "error");
        }
    }

    async startDistance(distance) {
        if (!confirm(`Elindítod a(z) ${distance} táv rajtját?`)) return;
        try {
            const response = await this.apiCall('start-distance', 'POST', { distance });
            if (!response) return;
            const result = await response.json();
            if (response.ok) {
                await this.refreshUI();
                showToast(`TÁV RAJT (${distance}): ${result.count} versenyző elindult!`, 'success');
            } else {
                showToast(result.error, 'error');
            }
        } catch (err) {
            showToast("Hiba a táv szerinti indításkor!", "error");
        }
    }

    // --- Admin Functions ---
    async deleteRacer(id, bib) {
        if (!confirm(`Biztosan törlöd ezt a versenyzőt?${bib ? ' (Rajtszám: #' + bib + ')' : ''}`)) return;
        
        try {
            const response = await fetch(`${API_URL}/racer/${id}`, { 
                method: 'DELETE',
                headers: this.getAuthHeader()
            });

            if (response.ok) {
                await this.loadData();
                this.renderUI();
                showToast(`Versenyző törölve: ${bib ? '#' + bib : 'ID: ' + id}`, 'info');
            } else {
                const errData = await response.json();
                showToast(`Hiba a törlés során: ${errData.error || response.statusText}`, "error");
            }
        } catch (err) {
            console.error("Delete error:", err);
            showToast("Hiba a hálózati kapcsolatban!", "error");
        }
    }

    openEditModal(id) {
        console.log(`[Edit] Opening modal for ID: ${id}`);
        if (!this.data || !this.data.racers) {
            console.error("[Edit] Data not loaded yet!");
            showToast("Hiba: Adatok még nem töltődtek be!", "error");
            return;
        }

        const racer = this.data.racers.find(r => r.id === id);
        if (!racer) {
            console.error(`[Edit] Racer not found for ID: ${id}`);
            showToast("Hiba: Versenyző nem található!", "error");
            return;
        }

        // Fill basic info
        document.getElementById('edit-id').value = racer.id;
        document.getElementById('edit-bib').value = racer.bib || '';
        document.getElementById('edit-status').value = racer.status || 'registered';
        document.getElementById('edit-category').value = racer.category || '';
        document.getElementById('edit-distance').value = racer.distance || '11km';
        document.getElementById('edit-email').value = racer.email || '';
        document.getElementById('edit-phone').value = racer.phone || '';
        document.getElementById('edit-is_series').checked = !!racer.is_series;

        // Populate members
        const container = document.getElementById('edit-members-container');
        if (container) {
            container.innerHTML = '';
            const members = racer.members || [];
            
            members.forEach((m, idx) => {
                const row = document.createElement('div');
                row.className = 'member-edit-row';
                // Normalize date to YYYY-MM-DD for <input type="date">
                let birth = m.birth_date || '';
                if (birth && birth.includes('.')) {
                    // Try to handle DD.MM.YYYY
                    const parts = birth.split('.');
                    if (parts.length === 3) birth = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
                }
                
                row.innerHTML = `
                    <input type="text" class="edit-m-name" value="${m.name || ''}" placeholder="Név">
                    <input type="date" class="edit-m-birth" value="${birth}">
                    <input type="text" class="edit-m-otproba" value="${m.otproba_id || ''}" placeholder="5P ID">
                `;
                container.appendChild(row);
            });
        }

        const modal = document.getElementById('editRacerModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            console.log("[Edit] Modal displayed.");
        } else {
            console.error("[Edit] Modal element not found!");
        }
    }

    closeEditModal() {
        const modal = document.getElementById('editRacerModal');
        if (modal) modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    async saveRacer() {
        const id = document.getElementById('edit-id').value;
        const membersRows = document.querySelectorAll('.member-edit-row');
        const members = Array.from(membersRows).map(row => ({
            name: row.querySelector('.edit-m-name').value,
            birth_date: row.querySelector('.edit-m-birth').value,
            otproba_id: row.querySelector('.edit-m-otproba').value
        }));
        const data = {
            bib: document.getElementById('edit-bib').value ? parseInt(document.getElementById('edit-bib').value) : null,
            status: document.getElementById('edit-status').value,
            category: document.getElementById('edit-category').value,
            distance: document.getElementById('edit-distance').value,
            email: document.getElementById('edit-email').value,
            phone: document.getElementById('edit-phone').value,
            is_series: document.getElementById('edit-is_series').checked,
            members: members
        };
        try {
            const response = await this.apiCall(`racer/${id}`, 'PUT', data);
            if (!response) return;
            if (response.ok) {
                showToast("Sikeres mentés!", "success");
                this.closeEditModal();
                await this.refreshUI();
            } else {
                const err = await response.json();
                showToast(err.error || "Hiba a mentés során!", "error");
            }
        } catch (err) {
            console.error("Save error:", err);
            showToast("Hiba a szerver kapcsolatban!", "error");
        }
    }

    async resetAll() {
        if (confirm('Biztosan törölsz MINDEN ADATOT?')) {
            try {
                const response = await this.apiCall('reset', 'POST');
                if (!response) return;
                if (response.ok) {
                    await this.refreshUI();
                    showToast("Minden adat törölve!", 'error');
                    const t = document.getElementById('category-timers');
                    if (t) t.innerHTML = '<div style="text-align:center; color: var(--text-secondary); width:100%;">Még nincs indított kategória</div>';
                }
            } catch (err) {
                showToast("Hiba a törlés során!", "error");
            }
        }
    }

    async resetTimes() {
        if (confirm('BIZTOSAN NULLÁZOD AZ ÖSSZES IDŐT ÉS EREDMÉNYT?\nA versenyzők profiljai megmaradnak, de mindenki újra "Regisztrálva" státuszba kerül!')) {
            try {
                const response = await this.apiCall('reset-times', 'POST');
                if (!response) return;
                if (response.ok) {
                    await this.refreshUI();
                    showToast("Minden időeredmény sikeresen nullázva!", 'success');
                    const t = document.getElementById('category-timers');
                    if (t) t.innerHTML = '<div style="text-align:center; color: var(--text-secondary); width:100%;">Még nincs indított kategória</div>';
                } else {
                    const data = await response.json();
                    showToast(`Hiba: ${data.error}`, 'error');
                }
            } catch (err) {
                showToast("Hálózati hiba a nullázás során!", "error");
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
        if (!id) return 'Ismeretlen Kategória';
        if (id === 'MASS_START_ALL') return '🚀 Tömegrajt - Mindenki';
        if (id.startsWith('DISTANCE_')) {
            const dist = id.replace('DISTANCE_', '');
            const distName = dist === '11km' ? 'Rövid táv' : (dist === '22km' ? 'Hosszú táv' : '4 km-es táv');
            return `📏 ${dist} - ${distName} (Összesített)`;
        }
        if (this.groupMap[id]) return this.groupMap[id];
        
        if (id.includes('_')) {
            const parts = id.split('_');
            const dist = parts[parts.length - 1];
            if (dist === '11km' || dist === '22km' || dist === '4km') {
                const catId = id.substring(0, id.lastIndexOf('_'));
                const distName = dist === '11km' ? '11km' : (dist === '22km' ? '22km' : '4km');
                const catName = this.categoryMap[catId] || catId;
                // Remove the "(38 cm)" etc suffixes for cleaner timer labels if they are redundant
                return `${catName} (${distName})`;
            }
        }
        return this.categoryMap[id] || id;
    }


    startTickLoop() {
        const tick = () => {
            this.updateTick();
            this.animationFrameId = requestAnimationFrame(tick);
        };
        this.animationFrameId = requestAnimationFrame(tick);
    }

    updateTick() {
        const now = new Date();
        const localTimeEl = document.getElementById('local-time-display');
        const localDateEl = document.getElementById('local-date-display');

        // Only update Date/Clock displays at most ~2 times per second for efficiency
        const timestamp = Date.now();
        if (!this._lastClockUpdate || timestamp - this._lastClockUpdate > 500) {
            if (localTimeEl) {
                localTimeEl.textContent = now.toLocaleTimeString('hu-HU');
            }
            if (localDateEl) {
                const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                localDateEl.textContent = now.toLocaleDateString('hu-HU', options);
            }
            this._lastClockUpdate = timestamp;
        }

        this.updateLiveTimers();
    }

    getTeamSize(catId) {
        if (!catId) return 1;
        if (catId.includes('_2_')) return 2;
        if (catId.includes('_3_')) return 3;
        if (catId.includes('_4_')) return 4;
        if (catId.includes('turakajak_2_nyitott')) return 2;
        if (catId.includes('outrigger_2_nyitott')) return 2;
        if (catId.includes('kenu_2_ferfi') || catId.includes('kenu_2_vegyes')) return 2;
        if (catId.includes('kenu_3_nyitott')) return 3;
        if (catId.includes('kenu_4_nyitott')) return 4;
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
            memberDiv.style = "margin-bottom: 25px; padding: 15px; border: 1px solid var(--glass-border); border-radius: 12px; background: rgba(255, 255, 255, 0.05);";
            memberDiv.innerHTML = `
                    <div>
                        <label>Név</label>
                        <input type="text" class="member-name" placeholder="Pl. Kiss János" required maxlength="100">
                    </div>
                    <div>
                        <label>Születési Dátum</label>
                        <input type="date" class="member-birth" required>
                    </div>
                </div>
                <div style="margin-top: 15px;">
                    <label>Ötpróba azonosító (opcionális)</label>
                    <div style="display: flex; gap: 0; align-items: center;">
                        <span style="background: rgba(0, 145, 255, 0.1); color: var(--accent-primary); padding: 8px 12px; border: 1px solid var(--accent-primary); border-right: none; border-radius: 4px 0 0 4px; font-family: 'Space Mono', monospace; font-weight: bold;">5P</span>
                        <input type="text" class="member-otproba" placeholder="123456" 
                               pattern="[0-9]{6}" title="6 darab számjegy" maxlength="6" 
                               style="flex: 2; border-radius: 0 4px 4px 0;">
                        <label style="flex: 1; display: flex; align-items: center; gap: 5px; font-size: 0.75rem; cursor: pointer; border: 1px solid var(--glass-border); padding: 5px; border-radius: 4px; margin-left: 10px;">
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
        const publicContainer = document.getElementById('category-timers');
        const adminContainer = document.getElementById('admin-category-timers');

        const containers = [];
        if (publicContainer) containers.push(publicContainer);
        if (adminContainer) containers.push(adminContainer);

        if (containers.length === 0) return;

        const activeCategories = Object.keys(this.data.categories || {})
            .map(k => ({ id: k, start: this.data.categories[k] }))
            .sort((a, b) => a.start - b.start);

        containers.forEach(container => {
            if (activeCategories.length > 0) {
                // Determine if we need to rebuild the timer boxes
                const needsRebuild = container.children.length !== activeCategories.length || container.querySelector('.cat-timer') === null;

                if (needsRebuild) {
                    container.innerHTML = '';
                    activeCategories.forEach(cat => {
                        const div = document.createElement('div');
                        div.className = 'cat-timer';
                        const isAdmin = container.id === 'admin-category-timers';
                        div.innerHTML = `
                            <div class="cat-name">${this.formatCategoryName(cat.id)}</div>
                            <div class="cat-time" id="${container.id}-timer-${cat.id}">00:00:00.000</div>
                            ${isAdmin ? `
                                <button onclick="window.stopCategory(null, null, '${cat.id}')" 
                                        style="margin-top:10px; padding:5px 10px; font-size:0.7rem; background:rgba(255,68,68,0.2); color:#ff4444; border:1px solid #ff4444; border-radius:4px; cursor:pointer; width:100%;">
                                    AZONNALI LEÁLLÍTÁS (CÉL)
                                </button>
                            ` : ''}
                        `;
                        container.appendChild(div);
                    });
                }

                activeCategories.forEach(cat => {
                    const timeEl = document.getElementById(`${container.id}-timer-${cat.id}`);
                    if (timeEl) {
                        const now = Date.now() + (this.serverTimeOffset || 0);
                        const diff = now - cat.start;
                        timeEl.textContent = this.formatTime(diff);
                    }
                });
            } else {
                if (container.children.length === 0 || container.querySelector('.cat-timer') !== null) {
                    container.innerHTML = '<div style="text-align:center; color: var(--text-secondary); width:100%; padding:20px;">Még nincs aktív futam</div>';
                }
            }
        });

        // Update racer table timers
        const runningElements = document.querySelectorAll('tr.status-running .time');
        runningElements.forEach(el => {
            const startStr = el.getAttribute('data-start');
            if (startStr) {
                const now = Date.now() + (this.serverTimeOffset || 0);
                const diff = now - parseInt(startStr, 10);
                el.textContent = this.formatTime(diff);
            }
        });
    }

    // --- UI Rendering ---

    renderUI() {
        this.renderRacersList();
        this.renderAdminStats();
        if (typeof window.renderAdminTable === 'function') {
            window.renderAdminTable();
        }
        this.renderAdminControlButtons();
    }

    renderAdminStats() {
        const statsEl = document.getElementById('admin-global-stats');
        if (!statsEl) return;

        const total = this.data.racers.length;
        const running = this.data.racers.filter(r => r.status === 'running').length;
        const finished = this.data.racers.filter(r => r.status === 'finished').length;
        const registered = this.data.racers.filter(r => r.status === 'registered').length;

        statsEl.innerHTML = `
            <div style="display: flex; gap: 20px;">
                <div class="stat-item"><span style="color: #888; font-size: 0.8rem;">ÖSSZES:</span> <strong style="color: white;">${total}</strong></div>
                <div class="stat-item"><span style="color: var(--accent-primary); font-size: 0.8rem;">FUTÓ:</span> <strong>${running}</strong></div>
                <div class="stat-item"><span style="color: #00ff88; font-size: 0.8rem;">CÉLBA ÉRT:</span> <strong>${finished}</strong></div>
                <div class="stat-item"><span style="color: var(--text-secondary); font-size: 0.8rem;">VÁRAKOZIK:</span> <strong>${registered}</strong></div>
            </div>
        `;
    }

    renderAdminControlButtons() {
        // --- 1. Tömegrajt ---
        const massContainer = document.getElementById('mass-start-ctrl');
        if (massContainer) {
            const isRunning = !!this.data.categories['MASS_START_ALL'];
            massContainer.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 8px; align-items: center; background: rgba(255, 77, 77, 0.05); padding: 12px; border-radius: 12px; border: 1px solid rgba(255, 77, 77, 0.15);">
                    <button onclick="window.startMass()" class="btn-primary" style="width: 100%; min-height: 54px; background: linear-gradient(135deg, #ff4d4d, #f00); font-weight: 800; font-size: clamp(0.75rem, 2.5vw, 1.05rem); box-shadow: 0 5px 15px rgba(255,0,0,0.3); border:none; padding: 10px 8px; white-space: normal; line-height: 1.2; margin: 0;" ${isRunning ? 'disabled' : ''}>
                        🚀 ÖSSZES INDÍTÁSA
                    </button>
                    ${isRunning ? `
                        <button onclick="window.stopCategory(null, null, 'MASS_START_ALL')" class="btn-stop" style="width: 100%; margin: 0; height: 40px; font-size: 0.8rem; border-radius: 8px;">
                            🛑 STOP
                        </button>
                    ` : ''}
                </div>
            `;
        }

        // --- 2. Távolság Rajt ---
        const distanceContainer = document.getElementById('distance-start-ctrl');
        if (distanceContainer) {
            distanceContainer.innerHTML = `
                <div style="display: grid; grid-template-columns: 1fr; gap: 10px;">
                    ${['4km', '11km', '22km'].map(dist => {
                        const isRunning = !!this.data.categories[`DISTANCE_${dist}`];
                        return `
                            <div style="display: flex; gap: 8px; align-items: center; background: rgba(0,228,255,0.05); padding: 8px; border-radius: 8px; border: 1px solid rgba(0,228,255,0.1);">
                                <button onclick="window.startDistance('${dist}')" class="btn-start" style="flex:2; height: 40px; font-size: 0.8rem; margin: 0; ${isRunning ? 'opacity:0.5; cursor:default;' : ''}" ${isRunning ? 'disabled' : ''}>
                                    ${dist} RAJT
                                </button>
                                ${isRunning ? `<button onclick="window.stopCategory(null, null, 'DISTANCE_${dist}')" class="btn-stop" style="flex:1; height: 40px; font-size: 0.7rem; margin: 0;">STOP</button>` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }

        // --- 3. Egyéni Rajt ---
        const individualContainer = document.getElementById('individual-start-ctrl');
        if (individualContainer) {
            individualContainer.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <input type="number" id="individual-bib-input" placeholder="000" style="flex: 2; height: 50px; background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border); color: white; border-radius: 8px; text-align: center; font-size: 1.8rem; font-weight: bold; margin-bottom:0; -moz-appearance: textfield; appearance: textfield;">
                        <button onclick="window.startIndividual(document.getElementById('individual-bib-input').value)" class="btn-primary" style="flex: 1; margin: 0; height: 50px; background: var(--accent-primary); border:none;">
                            RAJT
                        </button>
                    </div>
                </div>
            `;
        }

        // --- 4. Kategória Rajt (Dinamikusan generált) ---
        const groupContainer = document.getElementById('category-start-buttons');
        if (groupContainer) {
            groupContainer.innerHTML = '';
            
            // Összesítjük a megjelenítendő gombokat (Group-ok + Egyedi kategóriák)
            const availableStarts = [];

            // 1. Először a fix csoportok (ha van bennük regisztrált vagy épp futnak)
            Object.keys(this.groupMap).forEach(groupId => {
                const name = this.groupMap[groupId];
                const isRunning = !!this.data.categories[groupId];
                const hasRegistered = this.data.racers.some(r => r.status === 'registered' && this.belongsToGroup(r, groupId));
                
                if (isRunning || hasRegistered) {
                    availableStarts.push({ id: groupId, name: name.replace('Összes ', ''), type: 'group', isRunning });
                }
            });

            // 2. Másodszor az egyedi Kategória+Táv párosok (amik nem tartoznak a fenti csoportokba, de vannak benne emberek)
            const catDistPairs = {};
            this.data.racers.forEach(r => {
                if (r.status === 'registered') {
                    const key = `${r.category}_${r.distance}`;
                    // Ellenőrizzük, hogy ez a kategória beletartozik-e már valamelyik fenti csoportba
                    const alreadyInGroup = Object.keys(this.groupMap).some(groupId => this.belongsToGroup(r, groupId));
                    if (!alreadyInGroup) {
                        catDistPairs[key] = (catDistPairs[key] || 0) + 1;
                    }
                }
            });

            // Hozzáadjuk az egyedi kategóriákat a listához
            Object.keys(catDistPairs).forEach(key => {
                const isRunning = !!this.data.categories[key];
                availableStarts.push({ id: key, name: this.formatCategoryName(key), type: 'category', isRunning });
            });

            // Hozzáadjuk azokat is, amik már futnak, de nem csoportok (pl. egyedi indítás utáni timer)
            Object.keys(this.data.categories).forEach(catKey => {
                if (!catKey.startsWith('MASS_START_') && !catKey.startsWith('DISTANCE_') && !this.groupMap[catKey] && !availableStarts.find(s => s.id === catKey)) {
                    availableStarts.push({ id: catKey, name: this.formatCategoryName(catKey), type: 'category', isRunning: true });
                }
            });

            if (availableStarts.length === 0) {
                groupContainer.innerHTML = '<div class="empty-text" style="font-size: 0.8rem; text-align: center; color: var(--text-secondary); width: 100%;">Nincs indítható kategória</div>';
            } else {
                availableStarts.forEach(start => {
                    const div = document.createElement('div');
                    div.style.display = 'flex';
                    div.style.gap = '10px';
                    div.style.marginBottom = '12px';
                    div.style.background = 'rgba(18, 43, 68, 0.9)';
                    div.style.border = '1px solid var(--glass-border)';
                    div.style.color = 'var(--text-primary)';
                    div.style.padding = '10px';
                    div.style.borderRadius = '12px';

                    div.innerHTML = `
                        <button onclick="window.startCategory(null, null, '${start.id}')" class="btn-start" style="flex:2; text-align:left; font-size:0.85rem; font-weight:bold; padding:10px; margin-bottom:0; opacity: ${start.isRunning ? 0.5 : 1}; cursor: ${start.isRunning ? 'default' : 'pointer'}" ${start.isRunning ? 'disabled' : ''}>
                            ${start.name} RAJT
                        </button>
                        ${start.isRunning ? `
                            <button onclick="window.stopCategory(null, null, '${start.id}')" class="btn-stop" style="flex:1; padding:10px 5px; font-size: 0.8rem; margin-bottom:0; border-radius: 8px;">
                                STOP
                            </button>
                        ` : ''}
                    `;
                    groupContainer.appendChild(div);
                });
            }
        }
    }

    belongsToGroup(racer, groupId) {
        const cat = racer.category.toLowerCase();
        const dist = racer.distance;
        if (groupId === 'kajak_hosszu') return (cat.includes('kajak') || cat.includes('surfski')) && dist === '22km';
        if (groupId === 'kajak_rovid') return (cat.includes('kajak') || cat.includes('surfski')) && dist === '11km';
        if (groupId === 'kenu_hosszu') return (cat.includes('kenu') || cat.includes('outrigger')) && dist === '22km';
        if (groupId === 'kenu_rovid') return (cat.includes('kenu') || cat.includes('outrigger')) && dist === '11km';
        if (groupId === 'sup_4km') return cat.includes('sup') && dist === '4km';
        if (groupId === 'sarkanyhajo_11km') return (cat.includes('sárkányhajó') || cat.includes('sarkanyhajo')) && dist === '11km';
        return false;
    }


    renderRacersList() {
        const container = document.getElementById('results-tables-container');
        if (!container) return;
        container.innerHTML = '';

        if (!this.data.racers || this.data.racers.length === 0) {
            container.innerHTML = '<div style="text-align:center; color: var(--text-secondary); width:100%;">Nincsenek nevezett versenyzők</div>';
            return;
        }

        // 1. Group by Category + Distance
        const catGroups = {};
        this.data.racers.forEach(r => {
            const groupKey = `${r.category}_${r.distance}`;
            if (!catGroups[groupKey]) catGroups[groupKey] = [];
            catGroups[groupKey].push(r);
        });

        const sortedGroupKeys = Object.keys(catGroups).sort();

        // 2. Render Category Tables
        sortedGroupKeys.forEach(groupKey => {
            const racers = catGroups[groupKey];
            const hasFinishedOrRunning = racers.some(r => r.status === 'finished' || r.status === 'running');
            if (!hasFinishedOrRunning) return;

            const sortedRacers = racers.sort((a, b) => {
                if (a.status === 'finished' && b.status !== 'finished') return -1;
                if (a.status !== 'finished' && b.status === 'finished') return 1;
                if (a.status === 'finished' && b.status === 'finished') return a.total_time - b.total_time;
                if (a.status === 'running' && b.status !== 'running') return -1;
                if (a.status !== 'running' && b.status === 'running') return 1;
                return a.bib - b.bib;
            });

            this.createResultsTable(container, this.formatCategoryName(groupKey), sortedRacers, false);
        });

        // 3. Render Overall Distance Summaries
        const distances = [
            { id: '22km', title: 'hosszútáv sorrend' },
            { id: '11km', title: 'rövidtáv sorrend' },
            { id: '4km', title: '4 km sorrend' }
        ];

        distances.forEach(dist => {
            const distRacers = this.data.racers.filter(r => r.distance === dist.id && (r.status === 'finished' || r.status === 'running'));
            if (distRacers.length === 0) return;

            // Separate finished and running for sorting
            const sortedDistRacers = distRacers.sort((a, b) => {
                if (a.status === 'finished' && b.status !== 'finished') return -1;
                if (a.status !== 'finished' && b.status === 'finished') return 1;
                if (a.status === 'finished' && b.status === 'finished') return a.total_time - b.total_time;
                // For running, we don't necessarily sort by elapsed time here as it's dynamic, but let's keep consistency
                return (a.bib || 0) - (b.bib || 0);
            });

            // Add a visual separator
            const hr = document.createElement('hr');
            hr.style.margin = '3rem 0 1rem 0';
            hr.style.border = 'none';
            hr.style.height = '1px';
            hr.style.background = 'linear-gradient(to right, transparent, var(--accent-primary), transparent)';
            container.appendChild(hr);

            this.createResultsTable(container, dist.title, sortedDistRacers, true);
        });
    }

    /**
     * Helper to create a results table
     * @param {HTMLElement} container 
     * @param {string} title 
     * @param {Array} racers 
     * @param {boolean} showCategory 
     */
    createResultsTable(container, title, racers, showCategory = false) {
        const catWrapper = document.createElement('div');
        catWrapper.className = 'category-results-table';
        catWrapper.style.marginBottom = '2rem';

        const tableTitle = document.createElement('h4');
        tableTitle.textContent = title;
        tableTitle.className = 'category-title';
        if (showCategory) {
            tableTitle.style.color = 'var(--accent-secondary)';
            tableTitle.style.textTransform = 'uppercase';
            tableTitle.style.letterSpacing = '1px';
        }
        catWrapper.appendChild(tableTitle);

        const table = document.createElement('table');
        table.className = 'results-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th style="width: 80px;">Helyezés</th>
                    <th style="width: 80px;">Rajtszám</th>
                    <th>Név</th>
                    ${showCategory ? '<th>Kategória</th>' : ''}
                    <th style="text-align:right;">Időeredmény</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const tbody = table.querySelector('tbody');
        let rank = 1;

        racers.forEach(r => {
            if (!r || !r.status) return;

            const tr = document.createElement('tr');
            tr.className = `status-${r.status}`;
            tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';

            let timeDisplay = "folyamatban...";
            let dataStartAttr = "";
            let rankDisplay = "-";

            if (r.status === 'running') {
                const now = Date.now() + (this.serverTimeOffset || 0);
                timeDisplay = this.formatTime(now - (r.start_time || 0));
                dataStartAttr = `data-start="${r.start_time || 0}"`;
            }
            if (r.status === 'finished') {
                timeDisplay = this.formatTime(r.total_time || 0);
                rankDisplay = `${rank}.`;
                rank++;
            }

            const formattedBib = (r.bib || 0).toString().padStart(3, '0');
            let rowColor = 'inherit';
            if (r.status === 'finished') rowColor = '#00ff88';
            else if (r.status === 'running') rowColor = 'var(--accent-primary)';

            const memberNames = r.members ? r.members.map(m => m.name).join(', ') : (r.name || '-');
            const categoryName = this.categoryMap[r.category] || r.category;

            tr.innerHTML = `
                <td class="rank-col" style="color:${rowColor}; font-weight:bold;">${rankDisplay}</td>
                <td class="bib-col">#${formattedBib}</td>
                <td class="name-col">${memberNames}</td>
                ${showCategory ? `<td class="category-col" style="font-size: 0.8rem; color: #888;">${categoryName}</td>` : ''}
                <td class="time-col time" style="color:${rowColor}; font-family: 'Space Mono', monospace;" ${dataStartAttr}>${timeDisplay}</td>
            `;
            tbody.appendChild(tr);
        });

        catWrapper.appendChild(table);
        container.appendChild(catWrapper);
    }
}

// Instantiate
window.raceManager = new RaceManager();

// --- Simple Routing for Admin/Results (A fájl végén, hogy minden létezzen már) ---
const handleURLRouting = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const view = urlParams.get('view');
    console.log(`Global URL Routing check: view=${view}`);
    if (view && typeof window.switchTab === 'function') {
        setTimeout(() => {
            console.log(`Routing to ${view}...`);
            window.switchTab(view);
        }, 150);
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handleURLRouting);
} else {
    handleURLRouting();
}

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

// Display version on UI
document.addEventListener('DOMContentLoaded', () => {
    const versionEl = document.createElement('div');
    versionEl.style = "position:fixed; bottom:5px; left:5px; font-size:10px; color:#444; z-index:9999;";
    versionEl.textContent = `System v${APP_VERSION}`;
    document.body.appendChild(versionEl);
});

// --- Bind Events ---

document.getElementById('nevezesForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const kategoria = document.getElementById('kategoria').value;
    const tav = document.getElementById('versenytav').value;

    console.log("--- NEVEZÉS INDÍTÁSA ---");
    console.log("Kategória:", kategoria, "Táv:", tav);

    const email = document.getElementById('reg-email').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const contactName = document.getElementById('reg-name').value.trim();

    if (!email || !phone || !contactName) {
        showToast("Kérjük adja meg a kapcsolattartó nevét, e-mail címét és telefonszámát!", "error");
        return;
    }

    const memberEntries = document.querySelectorAll('.member-entry');
    const members = [];

    memberEntries.forEach((entry, idx) => {
        const name = entry.querySelector('.member-name').value.trim();
        const birth_date = entry.querySelector('.member-birth').value;
        const otprobaInp = entry.querySelector('.member-otproba');
        const otproba_id = otprobaInp.disabled ? "Nincs" : otprobaInp.value;

        if (!name || !birth_date) {
            showToast(`Kérjük adja meg a(z) ${idx + 1}. versenyző minden adatát!`, "error");
            throw new Error("Validation failed"); 
        }

        console.log(`Tag #${idx + 1}:`, { name, birth_date, otproba_id });
        members.push({ name, birth_date, otproba_id });
    });

    try {
        await raceManager.registerRacer(members, kategoria, tav, false, email, phone, contactName);
    } catch (err) {
        if (err.message !== "Validation failed") {
            showToast(err.message, "error");
        }
        return;
    }

    // Form reset
    document.getElementById('reg-name').value = '';
    document.getElementById('reg-email').value = '';
    document.getElementById('reg-phone').value = '';
    document.getElementById('versenytav').value = '';
    document.getElementById('kategoria').innerHTML = '<option value="" disabled selected>Előbb válassz távot...</option>';
    document.getElementById('members-container').innerHTML = `
        <div style="text-align: center; padding: 20px; color: #888; border: 1px dashed #444; border-radius: 8px; margin: 15px 0;">
            Válassz kategóriát a jelentkezési űrlap megjelenítéséhez.
        </div>
    `;
    document.getElementById('reg-name').focus();
});

// Dynamic Category Population
window.updateCategorySelect = () => {
    const dist = document.getElementById('versenytav').value;
    const catSelect = document.getElementById('kategoria');
    catSelect.innerHTML = '<option value="" disabled selected>Válassz kategóriát...</option>';

    const categories = {
        '11km': [
            { id: 'kajak_1_nyitott_11km', name: 'Kajak-1 nyitott' },
            { id: 'kajak_2_nyitott_11km', name: 'Kajak-2 nyitott' },
            { id: 'kenu_nyitott_11km', name: 'Kenu nyitott' },
            { id: 'rovid_kenu_11km', name: 'Rövid kenu' }
        ],
        '22km': [
            { id: 'versenykajak_noi_1_22km', name: 'Versenykajak női-1 (38 cm)' },
            { id: 'versenykajak_ferfi_1_22km', name: 'Versenykajak férfi-1 (38 cm)' },
            { id: 'turakajak_noi_1_22km', name: 'Túrakajak női-1 (42–51 cm)' },
            { id: 'turakajak_ferfi_1_22km', name: 'Túrakajak férfi-1 (42–51 cm)' },
            { id: 'turakajak_2_nyitott_22km', name: 'Túrakajak 2 (nyitott)' },
            { id: 'tengeri_kajak_noi_1_22km', name: 'Tengeri kajak női-1 (51 cm>)' },
            { id: 'tengeri_kajak_ferfi_1_22km', name: 'Tengeri kajak férfi-1 (51 cm>)' },
            { id: 'mk_1_fiu_22km', name: 'MK-1 fiú' },
            { id: 'mk_1_leany_22km', name: 'MK-1 leány' },
            { id: 'outrigger_noi_1_22km', name: 'Outrigger női-1' },
            { id: 'outrigger_ferfi_1_22km', name: 'Outrigger férfi-1' },
            { id: 'outrigger_2_nyitott_22km', name: 'Outrigger-2 (nyitott)' },
            { id: 'kenu_2_ferfi_22km', name: 'Kenu-2 férfi' },
            { id: 'kenu_2_vegyes_22km', name: 'Kenu-2 vegyes' },
            { id: 'kenu_3_nyitott_22km', name: 'Kenu-3 (nyitott)' },
            { id: 'kenu_4_nyitott_22km', name: 'Kenu-4 (nyitott)' },
            { id: 'sup_noi_1_22km', name: 'SUP női-1' },
            { id: 'sup_ferfi_1_22km', name: 'SUP férfi-1' }
        ],
        '4km': [
            { id: 'sup_noi_1_merev_39_alatt_4km', name: 'SUP női-1- merev deszka 39 év alatt' },
            { id: 'sup_noi_1_merev_40_felett_4km', name: 'SUP női-1- merev deszka 40 év felett' },
            { id: 'sup_ferfi_1_merev_39_alatt_4km', name: 'SUP férfi-1- merev deszka 39 év alatt' },
            { id: 'sup_ferfi_1_merev_40_felett_4km', name: 'SUP férfi-1- merev deszka 40 év felett' },
            { id: 'sup_noi_1_felfujhato_39_alatt_4km', name: 'SUP női-1- felfújható deszka 39 év alatt' },
            { id: 'sup_noi_1_felfujhato_40_felett_4km', name: 'SUP női-1- felfújható deszka 40 év felett' },
            { id: 'sup_ferfi_1_felfujhato_39_alatt_4km', name: 'SUP férfi-1- felfújható deszka 39 év alatt' },
            { id: 'sup_ferfi_1_felfujhato_40_felett_4km', name: 'SUP férfi-1- felfújható deszka 40 év felett' }
        ]
    };

    if (categories[dist]) {
        categories[dist].forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = cat.name;
            catSelect.appendChild(opt);
        });
    }
    
    // Reset members
    document.getElementById('members-container').innerHTML = `
        <div style="text-align: center; padding: 20px; color: #888; border: 1px dashed #444; border-radius: 8px; margin: 15px 0;">
            Válassz kategóriát a jelentkezési űrlap megjelenítéséhez.
        </div>
    `;
};

window.startCategory = (cat, dist, group) => raceManager.startCategory(cat, dist, group);
window.startIndividual = (bib) => raceManager.startIndividual(bib);
window.startMass = () => raceManager.startMass();
window.startDistance = (dist) => raceManager.startDistance(dist);
window.stopCategory = (cat, dist, group) => raceManager.stopCategory(cat, dist, group);
window.resetCategory = (cat, dist, group) => raceManager.resetCategory(cat, dist, group);
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

    const file = fileInput.files[0];
    const reader = new FileReader();

    // Use ArrayBuffer to handle encoding dynamically
    reader.onload = async (e) => {
        const buffer = e.target.result;
        
        let csvData = "";
        try {
            // 1. Try UTF-8 first
            const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
            csvData = utf8Decoder.decode(buffer);
            console.log("[CSV-UPLOAD] UTF-8 kódolás észlelve.");
        } catch (err) {
            // 2. Fallback to Windows-1250 (common for Hungarian Excel)
            const win1250Decoder = new TextDecoder('windows-1250');
            csvData = win1250Decoder.decode(buffer);
            console.log("[CSV-UPLOAD] Windows-1250 kódolás észlelve (UTF-8 hiba).");
        }

        console.log("[CSV-UPLOAD] Beolvasott adat eleje:", csvData.substring(0, 100));

        try {
            const response = await fetch(`${API_URL}/upload-csv`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...raceManager.getAuthHeader()
                },
                body: JSON.stringify({ csvData })
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
    };

    reader.readAsArrayBuffer(file);
}
window.uploadCsv = uploadCsv;

document.addEventListener('DOMContentLoaded', () => {
    const bibInput = document.getElementById('bib-input');
    if (bibInput) {
        bibInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') window.stopRacer();
        });
    }

    // Legacy category/distance interdependency removed in favor of new updateCategorySelect logic

    // Mobile Menu Toggle
    const menuToggle = document.getElementById('menuToggle');
    const mainNav = document.getElementById('main-nav');

    if (menuToggle && mainNav) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            menuToggle.classList.toggle('active');
            mainNav.classList.toggle('active');
            document.body.style.overflow = mainNav.classList.contains('active') ? 'hidden' : 'auto';
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!mainNav.contains(e.target) && !menuToggle.contains(e.target)) {
                menuToggle.classList.remove('active');
                mainNav.classList.remove('active');
                document.body.style.overflow = 'auto';
            }
        });

        // Close menu when clicking a link (button)
        mainNav.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                mainNav.classList.remove('active');
                document.body.style.overflow = 'auto';
            });
        });
    }
});



