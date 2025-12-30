// ==========================================
// 1. DATABASE & CONFIG
// ==========================================
const ARTIFACT_DB = [
    { id: 'a1', name: 'Pena Emas', icon: '✒️', desc: 'Klik Power +20%', type: 'clickMult', val: 0.2 },
    { id: 'a2', name: 'Jam Pasir Rusak', icon: '⏳', desc: 'Auto Speed +10%', type: 'autoMult', val: 0.1 },
    { id: 'a3', name: 'Dompet Ajaib', icon: '👛', desc: 'Harga Jual +10%', type: 'sellMult', val: 0.1 },
    { id: 'a4', name: 'Tas Kulit', icon: '🎒', desc: 'Kapasitas Rak +50%', type: 'capMult', val: 0.5 },
    { id: 'a5', name: 'Kopi Abadi', icon: '☕', desc: 'Semua +5%', type: 'global', val: 0.05 }
];

const SKILL_DB = {
    // RED PATH (Active)
    's1': { name: 'Jari Kilat', cost: 1, req: null },
    's2': { name: 'Combo Master', cost: 1, req: 's1' },
    's3': { name: 'Flash Read', cost: 1, req: 's2' },
    // BLUE PATH (Idle)
    's4': { name: 'Mandor', cost: 1, req: null },
    's5': { name: 'Negosiasi', cost: 1, req: 's4' },
    's6': { name: 'Investasi', cost: 1, req: 's5' },
    // GREEN PATH (Luck)
    's7': { name: 'Pedagang', cost: 1, req: null },
    's8': { name: 'Lucky Charm', cost: 1, req: 's7' },
    's9': { name: 'Kurator', cost: 1, req: 's8' }
};

// Global Vars
let comboCount = 0;
let comboTimeout = null;
let nextBookIsGold = false; 
let flashReadCounter = 0;

// ==========================================
// 2. GAME DATA
// ==========================================
const defaultGameData = {
    know: 0, money: 0, level: 1, baseMax: 100,
    clickLvl: 0, autoLvl1: 0, autoLvl2: 0,
    tokens: 0, sp: 0,
    artifacts: [], skills: []
};
let game = {}; 

// UI REFERENCES
const ui = {
    know: document.getElementById('valKnowledge'),
    max: document.getElementById('valMax'),
    money: document.getElementById('valMoney'),
    level: document.getElementById('valLevel'),
    tokens: document.getElementById('valTokens'),
    sp: document.getElementById('valSP'),
    click: document.getElementById('valClick'),
    auto: document.getElementById('valAuto'),
    
    shelf: document.getElementById('shelfDisplay'),
    ascendArea: document.getElementById('ascend-area'),
    combo: document.getElementById('combo-display'),
    
    btnSell: document.getElementById('btnSell'),
    btnPull: document.getElementById('btnPull'),
    
    costClick: document.getElementById('costClick'),
    costAuto1: document.getElementById('costAuto1'),
    costAuto2: document.getElementById('costAuto2'),
    
    collectionList: document.getElementById('collectionList'),
    modalGacha: document.getElementById('gachaModal'),
    rewardDesc: document.getElementById('rewardDesc'),
    
    // Alert References
    modalAlert: document.getElementById('customAlert'),
    alertIcon: document.getElementById('alertIcon'),
    alertTitle: document.getElementById('alertTitle'),
    alertDesc: document.getElementById('alertDesc'),
    alertBtnContainer: document.getElementById('alertBtnContainer')
};

// ==========================================
// 3. HELPER FUNCTIONS
// ==========================================
function hasSkill(id) { return game.skills.includes(id); }

function getArtifactBonus(type) {
    let bonus = 0;
    let curatorMod = hasSkill('s9') ? 1.1 : 1.0; 
    
    game.artifacts.forEach(id => {
        let item = ARTIFACT_DB.find(x => x.id === id);
        if (item && (item.type === type || item.type === 'global')) {
            bonus += (item.val * curatorMod);
        }
    });
    return bonus;
}

function getClickPower() {
    let base = 1 + game.clickLvl;
    if (hasSkill('s1')) base += 2; 
    let mult = 1 + getArtifactBonus('clickMult');
    return Math.floor(base * mult);
}

function getAutoRate() {
    let base = (game.autoLvl1 * 1) + (game.autoLvl2 * 5);
    let mult = 1 + getArtifactBonus('autoMult');
    if (hasSkill('s4')) mult += 0.1; 
    return Math.floor(base * mult);
}

function getMaxCapacity() {
    let base = game.baseMax * game.level; 
    let mult = 1 + getArtifactBonus('capMult');
    return Math.floor(base * mult);
}

function getSellPrice() {
    let basePrice = 1; 
    let mult = 1 + getArtifactBonus('sellMult');
    if (hasSkill('s7')) mult += 0.2; 
    return 1 * mult;
}

function getDiscount() { return hasSkill('s5') ? 0.9 : 1.0; }

function getCostClick() { return Math.floor(5 * Math.pow(1.5, game.clickLvl) * getDiscount()); }
function getCostAuto1() { return Math.floor(20 * Math.pow(1.4, game.autoLvl1) * getDiscount()); }
function getCostAuto2() { return Math.floor(100 * Math.pow(1.4, game.autoLvl2) * getDiscount()); }

// ==========================================
// 4. ALERT SYSTEM (PENTING!)
// ==========================================
function showAlert(type, title, message) {
    ui.alertTitle.innerText = title;
    ui.alertDesc.innerHTML = message;
    ui.alertBtnContainer.innerHTML = '';

    if (type === 'ascend') {
        ui.alertIcon.innerText = "🪙";
        ui.alertBtnContainer.innerHTML = `
            <button class="btn-purple-outline" onclick="closeAlert()">OK</button>
            <button class="btn-purple" onclick="closeAlertAndGacha()">GACHA ➤</button>
        `;
    } else if (type === 'error') {
        ui.alertIcon.innerText = "🚫";
        ui.alertBtnContainer.innerHTML = `<button class="btn-purple-outline" onclick="closeAlert()">MENGERTI</button>`;
    } else if (type === 'success') {
         ui.alertIcon.innerText = "✅";
         ui.alertBtnContainer.innerHTML = `<button class="btn-purple" onclick="closeAlert()">OK</button>`;
    }
    ui.modalAlert.style.display = 'flex';
}

function closeAlert() { document.getElementById('customAlert').style.display = 'none'; }
function closeAlertAndGacha() { document.getElementById('customAlert').style.display = 'none'; openTab('gacha'); }
function closeModal() { document.getElementById('gachaModal').style.display = 'none'; }

// ==========================================
// 5. ACTIONS
// ==========================================
function addKnowledge(amount) {
    let max = getMaxCapacity();
    if (game.know >= max) return;
    game.know += amount;
    if (game.know > max) game.know = max;
    updateUI();
}

function clickBook() { 
    comboCount++;
    if (comboTimeout) clearTimeout(comboTimeout);
    let duration = hasSkill('s2') ? 3000 : 1200;
    comboTimeout = setTimeout(() => { comboCount = 0; updateComboUI(); }, duration); 

    let comboMult = 1;
    if (comboCount >= 10) comboMult = 1 + (Math.floor(comboCount / 10) * 2);

    let critMult = 1;
    if (Math.random() < 0.05) { critMult = 10; nextBookIsGold = true; }

    if (hasSkill('s3')) {
        flashReadCounter++;
        if (flashReadCounter >= 50) {
            flashReadCounter = 0; game.money += 10;
        }
    }

    addKnowledge(getClickPower() * comboMult * critMult);
    updateComboUI();
}

function updateComboUI() {
    if (ui.combo) {
        if (comboCount > 1) {
            let cm = 1 + (Math.floor(comboCount / 10) * 2);
            ui.combo.innerText = `🔥 COMBO x${comboCount} (Bonus x${cm})`;
            ui.combo.style.color = (comboCount % 10 === 0) ? 'red' : '#e67e22';
            ui.combo.style.opacity = 1;
        } else {
            ui.combo.innerText = "COMBO x0";
            ui.combo.style.opacity = 0;
        }
    }
}

function sellKnowledge() {
    if (game.know >= 10) {
        let packs = Math.floor(game.know / 10);
        game.know -= (packs * 10);
        game.money += packs * getSellPrice();
        resetVisuals(); updateUI(); saveGame();
    }
}

function buyClickUpgrade() {
    let cost = getCostClick();
    if (game.money >= cost) {
        game.money -= cost; game.clickLvl++; updateUI(); saveGame();
    }
}

function buyAutoUpgrade(type) {
    let cost = (type === 1) ? getCostAuto1() : getCostAuto2();
    if (game.money >= cost) {
        game.money -= cost; 
        if(type==1) game.autoLvl1++; else game.autoLvl2++; 
        updateUI(); saveGame();
    }
}

// ==========================================
// 6. SKILL TREE LOGIC
// ==========================================
function buySkill(id) {
    if (hasSkill(id)) return;
    let skill = SKILL_DB[id];
    
    if (skill.req && !hasSkill(skill.req)) {
        showAlert('error', 'Terkunci!', `Buka skill <b>${SKILL_DB[skill.req].name}</b> dulu.`);
        return;
    }
    
    if (game.sp >= skill.cost) {
        game.sp -= skill.cost;
        game.skills.push(id);
        updateSkillTreeUI(); updateUI(); saveGame();
        showAlert('success', 'Skill Terbuka!', `Anda mempelajari <b>${skill.name}</b>.`);
    } else {
        showAlert('error', 'SP Kurang!', 'Pindah Perpustakaan (Ascend) untuk dapat Skill Point.');
    }
}

function resetSkills() {
    if (game.skills.length === 0) return;
    if (game.tokens >= 1) {
        if (confirm("Reset Skill? Biaya: 1 Token.")) {
            game.tokens--;
            game.sp += game.skills.length;
            game.skills = [];
            updateSkillTreeUI(); updateUI(); saveGame();
        }
    } else {
        showAlert('error', 'Token Kurang!', 'Butuh 1 Token untuk reset skill.');
    }
}

function updateSkillTreeUI() {
    for (let id in SKILL_DB) {
        let el = document.getElementById('skill-' + id);
        if (el) {
            el.className = 'skill-node'; 
            if (['s1','s2','s3'].includes(id)) el.classList.add('red');
            else if (['s4','s5','s6'].includes(id)) el.classList.add('blue');
            else el.classList.add('green');
            
            if (hasSkill(id)) el.classList.add('purchased');
            else if (SKILL_DB[id].req && !hasSkill(SKILL_DB[id].req)) el.classList.add('locked');
        }
    }
}

// ==========================================
// 7. ASCEND & GACHA
// ==========================================
function ascendLibrary() {
    if (game.know >= getMaxCapacity()) {
        game.tokens++; 
        game.sp++; 

        let baseChance = 0.15;
        if (hasSkill('s8')) baseChance += 0.05;

        let foundArtifact = null;
        if (Math.random() < baseChance) {
            let item = ARTIFACT_DB[Math.floor(Math.random() * ARTIFACT_DB.length)];
            game.artifacts.push(item.id);
            foundArtifact = item;
        }

        // RESET
        game.level++; game.know = 0; game.money = 0; 
        game.clickLvl = 0; game.autoLvl1 = 0; game.autoLvl2 = 0;

        resetVisuals(); ui.ascendArea.style.display = 'none';
        saveGame(); updateUI(); renderCollection();
        
        if (foundArtifact) {
            document.querySelector('.modal-icon').innerText = "🎉";
            ui.rewardDesc.innerHTML = `<b>DOUBLE REWARD!</b><br>Dapat <b>1 Token</b> & <b>1 SP</b><br>Plus Artifact: <b style="color:#d35400">${foundArtifact.name}</b>`;
            document.getElementById('gachaModal').style.display = 'flex';
        } else {
            showAlert('ascend', 'Ascend Sukses!', `Level Naik!<br>Anda dapat <b>1 Token</b> & <b>1 SP</b>.`);
        }
    }
}

function pullGacha() {
    if (game.tokens >= 1) {
        game.tokens--; 
        let item = ARTIFACT_DB[Math.floor(Math.random() * ARTIFACT_DB.length)];
        game.artifacts.push(item.id);
        saveGame(); updateUI(); renderCollection();
        
        document.querySelector('.modal-icon').innerText = item.icon;
        ui.rewardDesc.innerHTML = `Dapat: <b style="color:#d35400">${item.name}</b><br><small>${item.desc}</small>`;
        document.getElementById('gachaModal').style.display = 'flex';
    } else {
        showAlert('error', 'Token Habis!', 'Ascend dulu untuk cari Token.');
    }
}

// ==========================================
// 8. VISUAL & INIT
// ==========================================
function resetVisuals() { ui.shelf.innerHTML = ''; }
function createBookDiv() {
    let div = document.createElement('div');
    div.className = 'book';
    if (nextBookIsGold) { div.classList.add('gold'); nextBookIsGold = false; } 
    else {
        const c = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22'];
        div.style.backgroundColor = c[Math.floor(Math.random() * c.length)];
    }
    ui.shelf.appendChild(div);
    ui.shelf.scrollTop = ui.shelf.scrollHeight;
}

function updateUI() {
    let max = getMaxCapacity();
    ui.know.innerText = Math.floor(game.know);
    ui.max.innerText = max;
    ui.money.innerText = game.money.toFixed(1); 
    ui.level.innerText = game.level;
    ui.tokens.innerText = game.tokens; 
    ui.sp.innerText = game.sp;

    ui.click.innerText = getClickPower();
    ui.auto.innerText = getAutoRate();
    ui.costClick.innerText = getCostClick();
    ui.costAuto1.innerText = getCostAuto1();
    ui.costAuto2.innerText = getCostAuto2();

    document.getElementById('btnUpClick').disabled = game.money < getCostClick();
    document.getElementById('btnBuyAuto1').disabled = game.money < getCostAuto1();
    document.getElementById('btnBuyAuto2').disabled = game.money < getCostAuto2();
    ui.btnSell.disabled = game.know < 10;
    ui.btnPull.disabled = game.tokens < 1;
    ui.btnPull.innerText = game.tokens < 1 ? "Butuh 1 Token" : "Buka Kotak (1 🪙)";

    let booksNeeded = Math.floor(game.know / (max/40 || 1));
    let currentRendered = ui.shelf.childElementCount;
    if (booksNeeded > currentRendered) {
        for(let i=0; i<booksNeeded-currentRendered; i++) createBookDiv();
    } else if (booksNeeded < currentRendered) {
        resetVisuals(); 
    }

    ui.ascendArea.style.display = (game.know >= max) ? 'block' : 'none';
}

function renderCollection() {
    ui.collectionList.innerHTML = '';
    if (game.artifacts.length === 0) { ui.collectionList.innerHTML = '<p class="empty-msg">Kosong</p>'; return; }
    let counts = {};
    game.artifacts.forEach(x => { counts[x] = (counts[x] || 0) + 1; });
    for (let [id, count] of Object.entries(counts)) {
        let item = ARTIFACT_DB.find(x => x.id === id);
        let div = document.createElement('div');
        div.className = 'artifact-card';
        div.innerHTML = `<div class="artifact-icon">${item.icon}</div><div><h4>${item.name} x${count}</h4><p>${item.desc}</p></div>`;
        ui.collectionList.appendChild(div);
    }
}

function loadGame() {
    let saved = localStorage.getItem('librarianSaveV10'); 
    if (saved) {
        game = JSON.parse(saved);
        if (game.sp === undefined) game.sp = 0;
        if (!game.skills) game.skills = [];
    } else {
        game = Object.assign({}, defaultGameData);
    }
    updateSkillTreeUI(); updateUI(); renderCollection();
}

function hardReset() {
    if(confirm("Hapus semua?")) { localStorage.removeItem('librarianSaveV10'); location.reload(); }
}

function openTab(name) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-'+name).classList.add('active');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
}

loadGame();
setInterval(() => { 
    if (getAutoRate() > 0) addKnowledge(getAutoRate()); 
    if (hasSkill('s6')) game.money += 1;
}, 1000);
setInterval(saveGame, 10000);
