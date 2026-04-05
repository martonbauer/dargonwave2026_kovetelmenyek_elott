/**
 * DragonWave - Fő belépési pont (Entry Point)
 * v2.2.1 modularizált verzió
 */

import { RaceManager } from './js/RaceManager.js';
import { switchTab, showToast, formatTime } from './js/ui-utils.js';
import { renderAdminTable, renderAdminControlButtons, exportResultsToExcel } from './js/admin-ui.js';
import { API_URL, APP_VERSION } from './js/api.js';

// --- Globális hatókör biztosítása a HTML onclick eseményekhez ---
window.switchTab = switchTab;
window.showToast = showToast;
window.formatTime = formatTime;
window.renderAdminTable = renderAdminTable;
window.renderAdminControlButtons = renderAdminControlButtons;
window.exportResultsToExcel = exportResultsToExcel;

// Inicializálás
window.raceManager = new RaceManager();

// --- Adminisztrációs Funkciók (Bejelentkezés / Kijelentkezés) ---
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
            
            // Alapértelmezett nézet beállítása
            window.showAdminLanding();
            
            window.renderAdminTable();
            window.raceManager.renderUI();
            showToast('Sikeres belépés!', 'success');
        } else {
            showToast(result.error || 'Hibás jelszó!', 'error');
        }
    } catch (err) {
        showToast("Hiba a belépés során!", "error");
    }
};

window.logoutAdmin = () => {
    sessionStorage.removeItem('dragonAdminPassword');
    if (window.raceManager) window.raceManager.adminPassword = '';
    document.getElementById('admin-login-panel').classList.remove('hidden');
    document.getElementById('admin-dashboard-panel').classList.add('hidden');
    document.getElementById('admin-pass').value = '';
    
    // Minden al-szekció elrejtése
    document.querySelectorAll('.admin-sub-section').forEach(s => s.classList.add('hidden'));
    document.getElementById('admin-landing-view').classList.remove('hidden');
    
    showToast('Sikeres kijelentkezés', 'info');
};

// --- Admin Navigációs Logika ---
window.showAdminSection = (sectionId) => {
    // Elrejtjük a landing oldalt és az összes többi szekciót
    document.getElementById('admin-landing-view').classList.add('hidden');
    document.querySelectorAll('.admin-sub-section').forEach(s => s.classList.add('hidden'));
    
    // Megjelenítjük a kért szekciót
    const target = document.getElementById(sectionId);
    if (target) target.classList.remove('hidden');
    
    // Ha az adatkezelés szekcióba lépünk, frissítsük a táblázatot
    if (sectionId === 'admin-section-data') {
        window.renderAdminTable();
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.showAdminLanding = () => {
    // Elrejtünk minden al-szekciót
    document.querySelectorAll('.admin-sub-section').forEach(s => s.classList.add('hidden'));
    // Megjelenítjük a landing view-t
    document.getElementById('admin-landing-view').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// --- Eseménykezelő Wrapper-ek ---
window.startCategory = (cat, dist, group) => window.raceManager.startCategory(cat, dist, group);
window.startIndividual = (bib) => window.raceManager.startIndividual(bib);
window.startMass = () => window.raceManager.startMass();
window.startDistance = (dist) => window.raceManager.startDistance(dist);
window.stopCategory = (cat, dist, group) => window.raceManager.stopCategory(cat, dist, group);
window.resetCategory = (cat, dist, group) => window.raceManager.resetCategory(cat, dist, group);
window.stopRacer = () => {
    const input = document.getElementById('bib-input');
    if (input && input.value) {
        window.raceManager.stopRacer(input.value);
        input.value = '';
        input.focus();
    } else {
        showToast("Kérem adja meg a rajtszámot!", 'error');
    }
};

// --- CSV Importálás ---
window.uploadCsv = async () => {
    const fileInput = document.getElementById('csv-upload');
    if (!fileInput || fileInput.files.length === 0) {
        showToast("Válasszon ki egy CSV fájlt!", "error");
        return;
    }
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = async (e) => {
        const buffer = e.target.result;
        let csvData = "";
        try {
            const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
            csvData = utf8Decoder.decode(buffer);
        } catch (err) {
            const win1250Decoder = new TextDecoder('windows-1250');
            csvData = win1250Decoder.decode(buffer);
        }
        try {
            const response = await fetch(`${API_URL}/upload-csv`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...window.raceManager.getAuthHeader()
                },
                body: JSON.stringify({ csvData })
            });
            const result = await response.json();
            if (response.ok) {
                showToast(`Sikeres importálás: ${result.importedCount} versenyző`, "success");
                await window.raceManager.loadData();
                window.raceManager.renderUI();
                fileInput.value = '';
            } else {
                showToast(result.error, "error");
            }
        } catch (err) {
            showToast("Hiba a feltöltés során!", "error");
        }
    };
    reader.readAsArrayBuffer(file);
};

// --- Alkalmazás Indítása és Globális Események ---
document.addEventListener('DOMContentLoaded', () => {
    // Verzió megjelenítése
    const versionEl = document.createElement('div');
    versionEl.style = "position:fixed; bottom:5px; left:5px; font-size:10px; color:#444; z-index:9999;";
    versionEl.textContent = `System v${APP_VERSION}`;
    document.body.appendChild(versionEl);

    // Kategória választó frissítése
    window.updateCategorySelect = () => {
        const dist = document.getElementById('versenytav').value;
        const catSelect = document.getElementById('kategoria');
        catSelect.innerHTML = '<option value="" disabled selected>Válassz kategóriát...</option>';

        const categories = {
            '11km': [
                { id: 'kajak_1_nyitott_11km', name: 'Kajak-1 nyitott' },
                { id: 'kajak_2_nyitott_11km', name: 'Kajak-2 nyitott' },
                { id: 'kenu_nyitott_11km', name: 'Kenu nyitott' },
                { id: 'rovid_kenu_11km', name: 'Rövid kenu' },
                { id: 'sarkanyhajo_otproba', name: 'Sárkányhajó' }
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
        document.getElementById('members-container').innerHTML = '<div style="text-align: center; padding: 20px; color: #888; border: 1px dashed #444; border-radius: 8px; margin: 15px 0;">Válassz kategóriát...</div>';
    };

    // Registration Form Submit
    document.getElementById('nevezesForm').addEventListener('submit', async function (e) {
        e.preventDefault();
        const kategoria = document.getElementById('kategoria').value;
        const tav = document.getElementById('versenytav').value;
        const email = document.getElementById('reg-email').value.trim();
        const phone = document.getElementById('reg-phone').value.trim();
        const contactName = document.getElementById('reg-name').value.trim();

        if (!email || !phone || !contactName) {
            showToast("Kérjük adja meg az összes kapcsolattartói adatot!", "error");
            return;
        }

        const members = [];
        try {
            document.querySelectorAll('.member-entry').forEach((entry, idx) => {
                const name = entry.querySelector('.member-name').value.trim();
                const birth_date = entry.querySelector('.member-birth').value;
                const otprobaInp = entry.querySelector('.member-otproba');
                const otproba_id = otprobaInp.disabled ? "Nincs" : otprobaInp.value;
                if (!name || !birth_date) throw new Error(`Kérjük adja meg a(z) ${idx + 1}. versenyző minden adatát!`);
                members.push({ name, birth_date, otproba_id });
            });
            await window.raceManager.registerRacer(members, kategoria, tav, false, email, phone, contactName);
            this.reset();
            window.updateCategorySelect();
        } catch (err) {
            showToast(err.message, "error");
        }
    });

    // Enter gomb a rajtszám rögzítéshez
    const bibInput = document.getElementById('bib-input');
    if (bibInput) bibInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') window.stopRacer(); });

    // Mobil menü kezelés
    const menuToggle = document.getElementById('menuToggle');
    const mainNav = document.getElementById('main-nav');
    if (menuToggle && mainNav) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            menuToggle.classList.toggle('active');
            mainNav.classList.toggle('active');
        });
        document.addEventListener('click', () => {
            menuToggle.classList.remove('active');
            mainNav.classList.remove('active');
        });
    }

    // Routing kezelése
    const handleURLRouting = () => {
        const view = new URLSearchParams(window.location.search).get('view');
        if (view) setTimeout(() => window.switchTab(view), 200);
    };
    handleURLRouting();
});
