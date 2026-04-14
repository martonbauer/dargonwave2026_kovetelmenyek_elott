import { apiCall, API_URL, socketAdmin } from './api.js';
import { showToast, formatTime } from './ui-utils.js';

/**
 * --- KÖZPONTI LOGIKAI RÉTEG (MANAGER LAYER) ---
 * RaceManager - A verseny lebonyolításáért, az adatok kezeléséért 
 * és a szinkronizációért felelős központi üzleti logika.
 */
export class RaceManager {
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
            'sarkanyhajo_11km': '🐉 SÁRKÁNYHAJÓ (11 km)'
        };
        this.init();
    }

    // --- 1. INICIALIZÁLÁS ÉS ADATBETÖLTÉS (INITIALIZATION) ---
    async init() {
        await this.checkConnectivity();
        await this.loadData();
        this.renderUI();
        this.startTickLoop();
        this.setupRealtimeSync();
    }

    setupRealtimeSync() {
        if (socketAdmin) {
            socketAdmin.on('dataUpdated', (msg) => {
                console.log('Real-time frissítés érkezett:', msg);
                this.refreshUI();
            });
            socketAdmin.on('notify_event', (data) => {
                if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                    new Notification(data.title, { body: data.body, icon: 'admin_landingpage_4_0_png.png' });
                }
            });
        }
        
        if (this.adminPassword && typeof Notification !== 'undefined') {
            if (Notification.permission === 'default') {
                Notification.requestPermission();
            }
        }
    }

    async checkConnectivity() {
        try {
            const response = await fetch(`${API_URL}/health`);
            const result = await response.json();
            if (response.ok && result.database === 'connected') {
                console.log("Adatbázis kapcsolat ellenőrizve.");
            } else {
                throw new Error(result.error || "Adatbázis nem elérhető");
            }
        } catch (err) {
            console.error("Connectivity check failed:", err);
            showToast("Hiba: Nincs adatbázis kapcsolat! Ellenőrizd a szervert.", "error");
        }
    }

    getAuthHeader() {
        return { 'Authorization': `Bearer ${this.adminPassword}` };
    }

    async refreshUI() {
        await this.loadData();
        this.renderUI();
    }

    async loadData() {
        try {
            console.log(`Adatok lekérése: ${API_URL}/data`);
            const response = await fetch(`${API_URL}/data`);

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Szerver hiba:", errorData);
                throw new Error(errorData.error || `HTTP hiba! státusz: ${response.status}`);
            }

            const result = await response.json();
            this.data = result;
            
            if (result.serverNow) {
                this.serverTimeOffset = result.serverNow - Date.now();
                console.log(`Idő szinkronizáció: eltolás ${this.serverTimeOffset}ms`);
            }
            
            console.log("Adatok sikeresen betöltve:", this.data);
        } catch (err) {
            console.error("KRITIKUS: Nem sikerült betölteni az adatokat:", err);
            showToast("Szerver hiba az adatok betöltésekor!", "error");
        }
    }

    // --- 2. VERSENY VEZÉRLÉSI LOGIKA (RACE CONTROL LOGIC) ---
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
                    contact_name: contactName 
                })
            });

            if (response.status === 401 || response.status === 403) {
                const errorData = await response.json();
                showToast(`Hitelesítési hiba: ${errorData.error}`, "error");
                if (response.status === 403) sessionStorage.removeItem('dragonAdminPassword');
                return;
            }

            if (response.ok) {
                const result = await response.json();
                await this.loadData();
                this.renderUI();

                if (result.isDuplicate) {
                    showToast(`FIGYELEM: Te már neveztél! A nevezésedet rögzítettük 'Függő Duplikáció' állapotban. Az Adminisztrátor fogja jóváhagyni.`, 'info');
                } else {
                    showToast(`Sikeres nevezés! Rajtszám: ${result.bib.toString().padStart(3, '0')}`, 'success');
                }

                setTimeout(() => {
                    window.location.href = "https://sarkanyhajozz.hu/termek/dunakeszi-futam-elonevezes/";
                }, 3000);

                return result.bib;
            } else {
                const errorData = await response.json();
                showToast(errorData.error || "Hiba a regisztráció során!", "error");
            }
        } catch (err) {
            showToast("Hiba a regisztráció során!", "error");
        }
    }

    async startCategory(categoryName, distance, groupId) {
        const startKey = groupId || `${categoryName}_${distance}`;
        if (this.data.categories[startKey]) {
            showToast(`Ez a futam (${this.formatCategoryName(startKey)}) már elindult!`, 'error');
            return;
        }
        try {
            const response = await apiCall('start-category', 'POST', { categoryName, distance, groupId }, this.adminPassword);
            if (!response) return;
            const result = await response.json();
            if (response.ok) {
                await this.refreshUI();
                showToast(`START: ${this.formatCategoryName(startKey)} (${result.startedCount || result.count} versenyző)`, 'success');
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
                const response = await apiCall('stop-category', 'POST', { categoryName, distance, groupId }, this.adminPassword);
                if (!response) return;
                const result = await response.json();
                await this.refreshUI();
                this.updateLiveTimers();
                showToast(`STOP: ${this.formatCategoryName(startKey)} leállítva. (${result.count} versenyző beérkezett)`, 'success');
            } catch (err) {
                showToast("Hiba a megállítás során!", "error");
            }
        }
    }

    async resetCategory(categoryName, distance, groupId) {
        const startKey = groupId || `${categoryName}_${distance}`;
        if (confirm(`Biztosan törlöd a(z) ${this.formatCategoryName(startKey)} időmérőjét?\n(A futó óra leáll, de a versenyzők státusza nem változik!)`)) {
            try {
                const response = await apiCall('reset-category', 'POST', { categoryName, distance, groupId }, this.adminPassword);
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

    async stopRacer(bibInput) {
        const bib = parseInt(bibInput, 10);
        try {
            const response = await apiCall('stop-racer', 'POST', { bib }, this.adminPassword);
            if (!response) return;
            const result = await response.json();
            if (response.ok) {
                await this.refreshUI();
                const names = result.racer.name;
                showToast(`CÉL: #${bib} ${names} - ${formatTime(result.racer.total_time)}`, 'success');
                const bibInputEl = document.getElementById('bib-input');
                if (bibInputEl) { bibInputEl.value = ''; bibInputEl.focus(); }
            } else {
                showToast(result.error, 'error');
            }
        } catch (err) {
            showToast("Hiba a célba érkezés rögzítésekor!", "error");
        }
    }

    async startIndividual(bib) {
        if (!bib) { showToast("Kérlek adj meg egy rajtszámot!", "error"); return; }
        try {
            const response = await apiCall('start-individual', 'POST', { bib }, this.adminPassword);
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
            const response = await apiCall('start-mass', 'POST', {}, this.adminPassword);
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
            const response = await apiCall('start-distance', 'POST', { distance }, this.adminPassword);
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

    async deleteRacer(id, bib) {
        if (!confirm(`Biztosan törlöd ezt a versenyzőt?${bib ? ' (Rajtszám: #' + bib + ')' : ''}`)) return;
        
        try {
            const response = await fetch(`${API_URL}/racer/${id}`, { 
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.adminPassword}` }
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
        if (!this.data || !this.data.racers) return;
        const racer = this.data.racers.find(r => r.id === id);
        if (!racer) return;

        document.getElementById('edit-id').value = racer.id;
        document.getElementById('edit-bib').value = racer.bib || '';
        document.getElementById('edit-status').value = racer.status || 'registered';
        document.getElementById('edit-category').value = racer.category || '';
        document.getElementById('edit-distance').value = racer.distance || '11km';
        document.getElementById('edit-email').value = racer.email || '';
        document.getElementById('edit-phone').value = racer.phone || '';
        document.getElementById('edit-is_series').checked = !!racer.is_series;

        const container = document.getElementById('edit-members-container');
        if (container) {
            container.innerHTML = '';
            (racer.members || []).forEach(m => {
                const row = document.createElement('div');
                row.className = 'member-edit-row';
                let birth = m.birth_date || '';
                if (birth && birth.includes('.')) {
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
            const response = await apiCall(`racer/${id}`, 'PUT', data, this.adminPassword);
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
            showToast("Hiba a szerver kapcsolatban!", "error");
        }
    }

    async resetAll() {
        if (confirm('Biztosan törölsz MINDEN ADATOT?')) {
            try {
                const response = await apiCall('reset', 'POST', {}, this.adminPassword);
                if (!response) return;
                if (response.ok) {
                    await this.refreshUI();
                    showToast("Minden adat törölve!", 'error');
                }
            } catch (err) {
                showToast("Hiba a törlés során!", "error");
            }
        }
    }

    async resetTimes() {
        if (confirm('BIZTOSAN NULLÁZOD AZ ÖSSZES IDŐT ÉS EREDMÉNYT?')) {
            try {
                const response = await apiCall('reset-times', 'POST', {}, this.adminPassword);
                if (!response) return;
                if (response.ok) {
                    await this.refreshUI();
                    showToast("Minden időeredmény nullázva!", 'success');
                }
            } catch (err) {
                showToast("Hálózati hiba a nullázás során!", "error");
            }
        }
    }

    // --- 3. SEGÉDFUNKCIÓK ÉS IDŐMÉRÉS (HELPERS & TIMING) ---
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
                const catName = this.categoryMap[catId] || catId;
                if (catId.includes('sarkany')) return `🐉 SÁRKÁNYHAJÓ (${dist})`;
                return `${catName} (${dist})`;
            }
        }
        if (id.includes('sarkany')) return `🐉 SÁRKÁNYHAJÓ`;
        return this.categoryMap[id] || id;
    }

    startTickLoop() {
        if (this.tickInterval) clearInterval(this.tickInterval);
        this.tickInterval = setInterval(() => {
            this.updateTick();
        }, 50); // Minta időzítő, nem áll meg mikor a tab inaktív
    }

    updateTick() {
        const timestamp = Date.now() + (this.serverTimeOffset || 0);
        const now = new Date(timestamp);
        const localTimeEl = document.getElementById('local-time-display');
        const localDateEl = document.getElementById('local-date-display');

        if (!this._lastClockUpdate || Date.now() - this._lastClockUpdate > 500) {
            if (localTimeEl) localTimeEl.textContent = now.toLocaleTimeString('hu-HU');
            if (localDateEl) {
                const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                localDateEl.textContent = now.toLocaleDateString('hu-HU', options);
            }
            this._lastClockUpdate = Date.now();
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
                <div style="margin-top: 15px;">
                    <label>Ötpróba azonosító (opcionális)</label>
                    <div style="display: flex; gap: 0; align-items: center;">
                        <span style="background: rgba(0, 145, 255, 0.1); color: var(--accent-primary); padding: 8px 12px; border: 1px solid var(--accent-primary); border-right: none; border-radius: 4px 0 0 4px; font-family: 'Space Mono', monospace; font-weight: bold;">5P</span>
                        <input type="text" class="member-otproba" placeholder="123456" pattern="[0-9]{6}" title="6 darab számjegy" maxlength="6" style="flex: 2; border-radius: 0 4px 4px 0;">
                        <label style="flex: 1; display: flex; align-items: center; gap: 5px; font-size: 0.75rem; cursor: pointer; border: 1px solid var(--glass-border); padding: 5px; border-radius: 4px; margin-left: 10px;">
                            <input type="checkbox" onchange="const inp=this.parentElement.parentElement.querySelector('.member-otproba'); inp.disabled=this.checked; if(this.checked) inp.value='';"> Nincs
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
                            ${isAdmin ? `<button onclick="window.stopCategory(null, null, '${cat.id}')" style="margin-top:10px; padding:5px 10px; font-size:0.7rem; background:rgba(255,68,68,0.2); color:#ff4444; border:1px solid #ff4444; border-radius:4px; cursor:pointer; width:100%;">AZONNALI LEÁLLÍTÁS (CÉL)</button>` : ''}
                        `;
                        container.appendChild(div);
                    });
                }
                activeCategories.forEach(cat => {
                    const timeEl = document.getElementById(`${container.id}-timer-${cat.id}`);
                    if (timeEl) {
                        const now = Date.now() + (this.serverTimeOffset || 0);
                        timeEl.textContent = formatTime(now - cat.start);
                    }
                });
            } else {
                if (container.children.length === 0 || container.querySelector('.cat-timer') !== null) {
                    container.innerHTML = '<div style="text-align:center; color: var(--text-secondary); width:100%; padding:20px;">Még nincs aktív futam</div>';
                }
            }
        });

        const runningElements = document.querySelectorAll('tr.status-running .time');
        runningElements.forEach(el => {
            const startStr = el.getAttribute('data-start');
            if (startStr) {
                const now = Date.now() + (this.serverTimeOffset || 0);
                el.textContent = formatTime(now - parseInt(startStr, 10));
            }
        });
    }

    async updateRacerBib(id, newBib) {
        if (!newBib || isNaN(newBib)) {
            showToast('Kérlek adj meg egy érvényes rajtszámot!', 'error');
            return;
        }

        const bibNum = parseInt(newBib);
        
        // Helyi duplikáció ellenőrzés
        const existing = this.data.racers.find(r => r.bib === bibNum && r.id !== id);
        if (existing) {
            showToast(`A #${bibNum} rajtszám már foglalt!`, 'error');
            return;
        }

        // Tagok neveinek lekérése a történethez
        const racer = this.data.racers.find(r => r.id === id);
        const originalBib = racer ? racer.bib : '?';
        const racerName = racer && racer.members && racer.members.length > 0 
            ? racer.members.map(m => m.name).join(', ') 
            : 'Ismeretlen';

        try {
            const response = await fetch(`${API_URL}/racer/${id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.adminPassword}`
                },
                body: JSON.stringify({ 
                    bib: bibNum,
                    oldBib: originalBib,
                    racerName: racerName
                })
            });

            const data = await response.json();
            if (response.ok && data.success) {
                showToast(`Rajtszám sikeresen módosítva: #${originalBib} ➔ #${bibNum}`, 'success');
                await this.loadData();
                return true;
            } else {
                showToast(data.error || 'Hiba a módosításkor!', 'error');
                return false;
            }
        } catch (err) {
            console.error('Bib update error:', err);
            showToast('Kapcsolódási hiba!', 'error');
            return false;
        }
    }

    // --- 4. MEGJELENÍTÉSI LOGIKA (UI RENDERING) ---
    renderUI() {
        this.renderRacersList();
        this.renderAdminStats();
        if (typeof window.renderAdminTable === 'function') window.renderAdminTable();
        if (typeof window.renderAdminCharts === 'function') window.renderAdminCharts();
        this.renderAdminControlButtons();
        this.renderWaitingListCards();
        this.renderRunningListCards();
    }

    renderAdminStats() {
        const statsContainers = document.querySelectorAll('.admin-stats');
        if (statsContainers.length === 0) return;

        const total = this.data.racers.length;
        const running = this.data.racers.filter(r => r.status === 'running').length;
        const finished = this.data.racers.filter(r => r.status === 'finished').length;
        const registered = this.data.racers.filter(r => r.status === 'registered').length;

        const statsHtml = `
            <div style="display: flex; gap: 20px;">
                <div class="stat-item"><span style="color: #888; font-size: 0.8rem;">ÖSSZES:</span> <strong style="color: white;">${total}</strong></div>
                <div class="stat-item" style="cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s;" onmouseover="this.style.borderColor='var(--text-secondary)'; this.style.background='rgba(255,255,255,0.1)';" onmouseout="this.style.borderColor='transparent'; this.style.background='rgba(0, 145, 255, 0.1)';" onclick="window.toggleRunningListCards(true)">
                    <span style="color: var(--accent-primary); font-size: 0.8rem;">FUTÓ:</span> <strong>${running}</strong>
                </div>
                <div class="stat-item"><span style="color: #00ff88; font-size: 0.8rem;">CÉLBA ÉRT:</span> <strong>${finished}</strong></div>
                <div class="stat-item" style="cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s;" onmouseover="this.style.borderColor='var(--text-secondary)'; this.style.background='rgba(255,255,255,0.1)';" onmouseout="this.style.borderColor='transparent'; this.style.background='rgba(0, 145, 255, 0.1)';" onclick="window.toggleWaitingListCards(true)">
                    <span style="color: var(--text-secondary); font-size: 0.8rem;">VÁRAKOZIK:</span> <strong>${registered}</strong>
                </div>
            </div>
        `;

        statsContainers.forEach(container => {
            container.innerHTML = statsHtml;
        });
    }

    renderWaitingListCards() {
        const containers = [
            { content: document.getElementById('waiting-list-content-starts'), card: document.getElementById('waiting-list-container-starts') },
            { content: document.getElementById('waiting-list-content-live'), card: document.getElementById('waiting-list-container-live') }
        ].filter(item => item.content && item.card && !item.card.classList.contains('hidden'));

        if (containers.length === 0) return;

        const registered = this.data.racers.filter(r => r.status === 'registered');
        
        let html = '';
        if (registered.length === 0) {
            html = '<div style="text-align: center; padding: 20px; color: var(--text-secondary); opacity: 0.7;">Jelenleg nincs várakozó versenyző.</div>';
        } else {
            html = `
                <div class="table-responsive">
                    <table class="results-table" style="font-size: 0.85rem;">
                        <thead>
                            <tr>
                                <th style="width: 80px;">Rajtszám</th>
                                <th>Egység Tagjai</th>
                                <th>Kategória</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${registered.sort((a,b) => (a.bib || 0) - (b.bib || 0)).map(r => `
                                <tr>
                                    <td><strong style="color: var(--accent-primary);">#${(r.bib || 0).toString().padStart(3, '0')}</strong></td>
                                    <td>${r.members ? r.members.map(m => m.name).join(', ') : (r.name || '-')}</td>
                                    <td style="font-size: 0.75rem; color: var(--text-secondary);">${this.formatCategoryName(r.category)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        containers.forEach(item => { item.content.innerHTML = html; });
    }

    renderRunningListCards() {
        const containers = [
            { content: document.getElementById('running-list-content-starts'), card: document.getElementById('running-list-container-starts') },
            { content: document.getElementById('running-list-content-live'), card: document.getElementById('running-list-container-live') }
        ].filter(item => item.content && item.card && !item.card.classList.contains('hidden'));

        if (containers.length === 0) return;

        const runningRacers = this.data.racers.filter(r => r.status === 'running');
        
        let html = '';
        if (runningRacers.length === 0) {
            html = '<div style="text-align: center; padding: 20px; color: var(--text-secondary); opacity: 0.7;">Jelenleg nincs futó versenyző.</div>';
        } else {
            html = `
                <div class="table-responsive">
                    <table class="results-table" style="font-size: 0.85rem;">
                        <thead>
                            <tr>
                                <th style="width: 80px;">Rajtszám</th>
                                <th>Egység Tagjai</th>
                                <th>Kategória</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${runningRacers.sort((a,b) => (a.bib || 0) - (b.bib || 0)).map(r => `
                                <tr>
                                    <td><strong style="color: var(--accent-primary);">#${(r.bib || 0).toString().padStart(3, '0')}</strong></td>
                                    <td>${r.members ? r.members.map(m => m.name).join(', ') : (r.name || '-')}</td>
                                    <td style="font-size: 0.75rem; color: var(--text-secondary);">${this.formatCategoryName(r.category)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        containers.forEach(item => { item.content.innerHTML = html; });
    }

    renderAdminControlButtons() {
        // Implementation moved to separate admin-ui.js logic but called from here
        if (typeof window.renderAdminControlButtons === 'function') {
            window.renderAdminControlButtons();
        }
    }

    belongsToGroup(racer, groupId) {
        const cat = racer.category.toLowerCase();
        const dist = racer.distance;
        if (groupId === 'kajak_hosszu') return (cat.includes('kajak') || cat.includes('surfski') || cat.includes('mk_1')) && dist === '22km';
        if (groupId === 'kajak_rovid') return (cat.includes('kajak') || cat.includes('surfski')) && dist === '11km';
        if (groupId === 'kenu_hosszu') return (cat.includes('kenu') || cat.includes('outrigger') || cat.includes('sup')) && dist === '22km';
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

        const catGroups = {};
        this.data.racers.forEach(r => {
            const groupKey = `${r.category}_${r.distance}`;
            if (!catGroups[groupKey]) catGroups[groupKey] = [];
            catGroups[groupKey].push(r);
        });

        Object.keys(catGroups).sort().forEach(groupKey => {
            const racers = catGroups[groupKey];
            if (!racers.some(r => r.status === 'finished' || r.status === 'running')) return;
            const sortedRacers = racers.sort((a, b) => {
                if (a.status === 'finished' && b.status !== 'finished') return -1;
                if (a.status !== 'finished' && b.status === 'finished') return 1;
                if (a.status === 'finished' && b.status === 'finished') return a.total_time - b.total_time;
                return a.bib - b.bib;
            });
            this.createResultsTable(container, this.formatCategoryName(groupKey), sortedRacers, false);
        });

        [{ id: '22km', title: 'hosszútáv sorrend' }, { id: '11km', title: 'rövidtáv sorrend' }, { id: '4km', title: '4 km sorrend' }].forEach(dist => {
            const distRacers = this.data.racers.filter(r => r.distance === dist.id && (r.status === 'finished' || r.status === 'running'));
            if (distRacers.length === 0) return;
            const sortedDistRacers = distRacers.sort((a, b) => {
                if (a.status === 'finished' && b.status !== 'finished') return -1;
                if (a.status !== 'finished' && b.status === 'finished') return 1;
                if (a.status === 'finished' && b.status === 'finished') return a.total_time - b.total_time;
                return a.bib - b.bib;
            });
            const hr = document.createElement('hr');
            hr.style = 'margin: 3rem 0 1rem 0; border: none; height: 1px; background: linear-gradient(to right, transparent, var(--accent-primary), transparent);';
            container.appendChild(hr);
            this.createResultsTable(container, dist.title, sortedDistRacers, true);
        });
    }

    createResultsTable(container, title, racers, showCategory = false) {
        const catWrapper = document.createElement('div');
        catWrapper.className = 'category-results-table';
        catWrapper.style.marginBottom = '2rem';
        catWrapper.innerHTML = `<h4 class="category-title">${title}</h4><table class="results-table"><thead><tr><th style="width: 80px;">Helyezés</th><th style="width: 80px;">Rajtszám</th><th>Név</th>${showCategory ? '<th>Kategória</th>' : ''}<th style="text-align:right;">Időeredmény</th></tr></thead><tbody></tbody></table>`;
        const tbody = catWrapper.querySelector('tbody');
        let rank = 1;
        racers.forEach(r => {
            const tr = document.createElement('tr');
            tr.className = `status-${r.status}`;
            let timeDisplay = "folyamatban...", dataStartAttr = "", rankDisplay = "-";
            if (r.status === 'running') {
                const now = Date.now() + (this.serverTimeOffset || 0);
                timeDisplay = formatTime(now - (r.start_time || 0));
                dataStartAttr = `data-start="${r.start_time || 0}"`;
            } else if (r.status === 'finished') {
                timeDisplay = formatTime(r.total_time || 0);
                rankDisplay = `${rank++}.`;
            }
            const rowColor = r.status === 'finished' ? '#00ff88' : (r.status === 'running' ? 'var(--accent-primary)' : 'inherit');
            tr.innerHTML = `<td style="color:${rowColor}; font-weight:bold;">${rankDisplay}</td><td>#${(r.bib || 0).toString().padStart(3, '0')}</td><td>${r.members ? r.members.map(m => m.name).join(', ') : (r.name || '-')}</td>${showCategory ? `<td style="font-size: 0.8rem; color: #888;">${this.categoryMap[r.category] || r.category}</td>` : ''}<td class="time" style="color:${rowColor}; font-family: 'Space Mono', monospace;" ${dataStartAttr}>${timeDisplay}</td>`;
            tbody.appendChild(tr);
        });
        container.appendChild(catWrapper);
    }
}
