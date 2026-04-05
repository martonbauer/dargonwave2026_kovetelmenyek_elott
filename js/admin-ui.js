/**
 * --- ADMINISZTRÁCIÓS FELÜLET RÉTEG (ADMIN UI LAYER) ---
 * Az adminisztrátori felület specifikus megjelenítési logikája, 
 * táblázatok és vezérlőgombok kezelése.
 */

/**
 * Adminisztrátori versenyzői táblázat kirajzolása
 */
export function renderAdminTable() {
    const tbody = document.getElementById('admin-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!window.raceManager || !window.raceManager.data.racers || window.raceManager.data.racers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;">Nincs rögzített adat</td></tr>';
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
        if (r.status === 'finished') statusColor = '#00FFCC';

        let timeStr = "00:00:00.000";
        if (r.status === 'running') {
            timeStr = formatTime(Date.now() + (window.raceManager.serverTimeOffset || 0) - (r.start_time || 0));
        } else if (r.status === 'finished') {
            timeStr = formatTime(r.total_time || 0);
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
}

/**
 * Adminisztrátori vezérlőgombok (Start/Stop) kirajzolása
 */
export function renderAdminControlButtons() {
    const rm = window.raceManager;
    if (!rm) return;

    // --- 1. Tömegrajt ---
    const massContainer = document.getElementById('mass-start-ctrl');
    if (massContainer) {
        const isRunning = !!rm.data.categories['MASS_START_ALL'];
        massContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 10px; align-items: center; background: rgba(255, 77, 77, 0.05); padding: 15px; border-radius: var(--border-radius-md); border: 1px solid rgba(255, 77, 77, 0.15);">
                <button onclick="window.startMass()" class="btn-primary" style="width: 100%; min-height: 54px; background: linear-gradient(135deg, #ff4444, #f00); box-shadow: 0 8px 25px rgba(255,0,0,0.3);" ${isRunning ? 'disabled' : ''}>
                    🚀 ÖSSZES INDÍTÁSA
                </button>
                ${isRunning ? `
                    <button onclick="window.stopCategory(null, null, 'MASS_START_ALL')" class="btn-stop" style="width: 100%; margin: 0; min-height: 42px; border-radius: 10px; font-weight: 700;">
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
            <div style="display: grid; grid-template-columns: 1fr; gap: 12px;">
                ${['4km', '11km', '22km'].map(dist => {
                    const isRunning = !!rm.data.categories[`DISTANCE_${dist}`];
                    return `
                        <div style="display: flex; gap: 10px; align-items: center; background: rgba(0,228,255,0.03); padding: 10px; border-radius: var(--border-radius-md); border: 1px solid rgba(0,228,255,0.1);">
                            <button onclick="window.startDistance('${dist}')" class="btn-start" style="flex:2; height: 45px; font-weight: 700; ${isRunning ? 'opacity:0.4;' : ''}" ${isRunning ? 'disabled' : ''}>
                                ${dist} RAJT
                            </button>
                            ${isRunning ? `<button onclick="window.stopCategory(null, null, 'DISTANCE_${dist}')" class="btn-stop" style="flex:1; height: 45px; font-weight: 700; border-radius: 10px;">STOP</button>` : ''}
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
            <div style="display: flex; flex-direction: column; gap: 12px;">
                <input type="number" id="individual-bib-input" placeholder="000" style="width: 100%; height: 60px; background: rgba(0,0,0,0.3); border: 2px solid var(--accent-primary); color: white; border-radius: 12px; text-align: center; font-size: 2rem; font-weight: 800; margin-bottom:0; box-shadow: inset 0 2px 10px rgba(0,0,0,0.5);">
                <button onclick="window.startIndividual(document.getElementById('individual-bib-input').value)" class="btn-primary" style="width: 100%; min-height: 50px; background: var(--accent-primary); color: #0B192C; border:none; font-weight: 800; letter-spacing: 1px;">
                    🎯 RAJT INDÍTÁSA
                </button>
            </div>
        `;
    }

    // --- 4. Kategória Rajt ---
    const groupContainer = document.getElementById('category-start-buttons');
    if (groupContainer) {
        groupContainer.innerHTML = '';
        const availableStarts = [];

        Object.keys(rm.groupMap).forEach(groupId => {
            const isRunning = !!rm.data.categories[groupId];
            availableStarts.push({ id: groupId, name: rm.groupMap[groupId].replace('Összes ', ''), type: 'group', isRunning });
        });

        Object.keys(rm.categoryMap).forEach(catId => {
            ['11km', '22km', '4km'].forEach(dist => {
                const key = `${catId}_${dist}`;
                const isSup = catId.includes('sup');
                const isSarkany = catId.includes('sarkany');
                const hasDistSuffix = catId.endsWith(`_${dist}`);
                const hasOtherDistSuffix = (dist !== '11km' && catId.endsWith('_11km')) || 
                                           (dist !== '22km' && catId.endsWith('_22km')) || 
                                           (dist !== '4km' && catId.endsWith('_4km'));
                
                let isDistanceMatch = false;
                if (hasDistSuffix) isDistanceMatch = true;
                else if (hasOtherDistSuffix) isDistanceMatch = false;
                else if (isSup) isDistanceMatch = (dist === '4km' || dist === '22km' || dist === '11km'); // SUP can be multiple
                else if (isSarkany) isDistanceMatch = (dist === '11km');
                else isDistanceMatch = (dist === '11km' || dist === '22km');

                if (isDistanceMatch) {
                    const isRunning = !!rm.data.categories[key];
                    const inExistingGroup = availableStarts.some(s => s.type === 'group' && rm.belongsToGroup({category: catId, distance: dist}, s.id));
                    if (!inExistingGroup) {
                        availableStarts.push({ id: key, name: rm.formatCategoryName(key), type: 'category', isRunning });
                    }
                }
            });
        });

        if (availableStarts.length === 0) {
            groupContainer.innerHTML = '<div class="empty-text">Nincs indítható kategória</div>';
        } else {
            groupContainer.style.maxHeight = '400px';
            groupContainer.style.overflowY = 'auto';
            availableStarts.forEach(start => {
                const div = document.createElement('div');
                div.style = 'display:flex; gap:10px; margin-bottom:10px; background:rgba(0,228,255,0.03); padding:8px; border-radius:10px; border:1px solid rgba(0,228,255,0.08);';
                div.innerHTML = `
                    <button onclick="window.startCategory(null, null, '${start.id}')" class="btn-start" style="flex:2; text-align:left; font-weight:700; font-size:0.8rem; padding:10px; margin-bottom:0; opacity: ${start.isRunning ? 0.4 : 1};" ${start.isRunning ? 'disabled' : ''}>
                        ${start.name} RAJT
                    </button>
                    ${start.isRunning ? `<button onclick="window.stopCategory(null, null, '${start.id}')" class="btn-stop" style="flex:1; padding:8px; font-weight:700; margin-bottom:0; font-size:0.75rem;">STOP</button>` : ''}
                `;
                groupContainer.appendChild(div);
            });
        }
    }
}

/**
 * Eredmények exportálása Excel fájlba
 */
export function exportResultsToExcel() {
    const rm = window.raceManager;
    if (!rm || !rm.data.racers || rm.data.racers.length === 0) {
        showToast('Nincs menthető adat!', 'error');
        return;
    }

    const allRacers = [...rm.data.racers].sort((a, b) => a.bib - b.bib);
    const wb = XLSX.utils.book_new();

    const summaryRows = [["Rajtszám", "Név (Egység tagjai)", "Születési dátumok", "Ötpróba ID-k", "Kategória", "Táv", "Sorozat", "Státusz", "Időeredmény"]];
    allRacers.forEach(r => {
        summaryRows.push([
            r.bib,
            r.members ? r.members.map(m => m.name).join(', ') : (r.name || '-'),
            r.members ? r.members.map(m => m.birth_date || '').filter(d => d).join(', ') : '-',
            r.members ? r.members.map(m => m.otproba_id || '').filter(id => id).join(', ') : (r.otproba_id || '-'),
            rm.formatCategoryName(r.category),
            r.distance,
            r.is_series ? 'Igen' : 'Nem',
            r.status,
            r.status === 'finished' ? formatTime(r.total_time) : (r.status === 'running' ? 'Folyamatban' : 'Regisztrálva')
        ]);
    });

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), "Összesített_Lista");

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

        const catRows = [["Helyezés", "Rajtszám", "Név (Csapattagok)", "Születési dátumok", "Ötpróba ID-k", "Táv", "Sorozat", "Státusz", "Időeredmény"]];
        let rank = 1;
        sorted.forEach(r => {
            catRows.push([
                r.status === 'finished' ? rank++ : '-',
                r.bib,
                r.members ? r.members.map(m => m.name).join(', ') : (r.name || '-'),
                r.members ? r.members.map(m => m.birth_date || '').filter(d => d).join(', ') : '-',
                r.members ? r.members.map(m => m.otproba_id || '').filter(id => id).join(', ') : (r.otproba_id || '-'),
                r.distance, r.is_series ? 'Igen' : 'Nem', r.status,
                r.status === 'finished' ? formatTime(r.total_time) : (r.status === 'running' ? 'Folyamatban' : 'Regisztrálva')
            ]);
        });

        let sheetName = rm.formatCategoryName(cat).replace(/[\\/?*\[\]]/g, '').substring(0, 31);
        let finalSheetName = sheetName;
        let counter = 1;
        while (wb.SheetNames.includes(finalSheetName)) {
            finalSheetName = sheetName.substring(0, 28) + `_${counter++}`;
        }
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(catRows), finalSheetName);
    });

    XLSX.writeFile(wb, `Eredmenyek_DragonWave_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('Excel sikeresen exportálva!', 'success');
}
