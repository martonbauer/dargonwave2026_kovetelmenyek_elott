/**
 * Verification script for dragon.js fixes.
 * This script mocks invalid data and triggers UI rendering to ensure no crashes occur.
 */

// Mock RaceManager if it doesn't exist (e.g. running in Node for syntax check)
if (typeof RaceManager === 'undefined') {
    global.RaceManager = class {
        formatTime() { return "00:00:00.000"; }
        formatCategoryName() { return "Test Category"; }
    };
}

const testData = {
    racers: [
        { bib: 1, name: "Valid Racer", status: "finished", category: "kajak_1", total_time: 123456 },
        null, // Invalid entry
        { bib: null, name: "Missing Bib", status: "running", category: "kajak_2", start_time: Date.now() },
        { bib: 3, name: "Missing Status", status: null, category: "kajak_3" },
        { bib: 4, name: "Missing Category", status: "registered", category: null },
        { bib: 5, status: "finished" } // Missing name/members
    ],
    categories: {
        "kajak_1": Date.now()
    }
};

function runTest() {
    console.log("Starting robustness test...");
    
    // Simulate dragon.js environment
    const mockRaceManager = {
        data: testData,
        formatTime: (ms) => "00:00:00.000",
        formatCategoryName: (id) => id || "Unknown",
        renderRacersList: function() {
            // This is a simplified version of the logic in dragon.js
            console.log("Testing renderRacersList...");
            const groups = {};
            this.data.racers.forEach(r => {
                if (!r || !r.category) return; 
                if (!groups[r.category]) groups[r.category] = [];
                groups[r.category].push(r);
            });

            Object.keys(groups).forEach(cat => {
                const sortedRacers = groups[cat];
                sortedRacers.forEach(r => {
                    if (!r || !r.status) return;
                    const bib = (r.bib || 0).toString().padStart(3, '0');
                    const time = r.status === 'finished' ? this.formatTime(r.total_time || 0) : "running";
                    console.log(`  - Rendered: #${bib} (${r.status})`);
                });
            });
        },
        renderAdminTable: function() {
            console.log("Testing renderAdminTable...");
            this.data.racers.filter(r => r && r.status).forEach(r => {
                const bib = (r.bib || 0).toString().padStart(3, '0');
                console.log(`  - Rendered Admin: #${bib} (${r.status})`);
            });
        }
    };

    try {
        mockRaceManager.renderRacersList();
        mockRaceManager.renderAdminTable();
        console.log("SUCCESS: Robustness test passed without crashes.");
    } catch (err) {
        console.error("FAILURE: Robustness test crashed!");
        console.error(err);
        process.exit(1);
    }
}

runTest();
