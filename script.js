// script.js — Dynamic Dashboard & Faceit Integration

// Global State
let currentLang = 'tr';
let lastStats = null;
let lastProfile = null;
let lastFaceit = null;
let accordionState = { cat_general: false, cat_weapons: false, cat_maps: false };
let isSearching = false;

// Custom Event for Layout Updates
const layoutUpdateEvent = new Event('osaka-layout-update');

function requireFields(obj, fields) {
    for (const f of fields) {
        const v = obj[f];
        if (v === undefined) return false;
        if (v === null) return false;
        if (v === "") return false;
        if (Number.isNaN(v)) return false;
    }
    return true;
}

function clampNumber(v, min, max) {
    if (v < min) return min;
    if (v > max) return max;
    return v;
}

function min2(a, b) {
    return a < b ? a : b;
}

function absNumber(n) {
    return n < 0 ? -n : n;
}

function roundPx(n) {
    const adj = n < 0 ? (n - 0.5) : (n + 0.5);
    return adj | 0;
}

// --- Helper Functions ---
function getWeaponName(code) {
    const tr = {
        ak47: "AK-47", m4a1: "M4A1", m4a1_silencer: "M4A1-S", galilar: "Galil AR", famas: "FAMAS",
        aug: "AUG", sg556: "SG 553", awp: "AWP", ssg08: "SSG 08", g3sg1: "G3SG1", scar20: "SCAR-20",
        deagle: "Desert Eagle", elite: "Dual Berettas", fiveseven: "Five-SeveN", tec9: "Tec-9",
        hkp2000: "P2000", p250: "P250", cz75a: "CZ75-Auto", usp_silencer: "USP-S", glock: "Glock-18",
        mp5sd: "MP5-SD", mp7: "MP7", mp9: "MP9", mac10: "MAC-10", ump45: "UMP-45", p90: "P90", bizon: "PP-Bizon",
        nova: "Nova", xm1014: "XM1014", sawedoff: "Sawed-Off", mag7: "MAG-7",
        m249: "M249", negev: "Negev"
    };
    const en = tr;
    const ru = tr;
    const dict = currentLang === 'tr' ? tr : (currentLang === 'ru' ? ru : en);
    const v = dict[code];
    return v === undefined ? String(code).toUpperCase() : v;
}

function getMapName(code) {
    const tr = {
        de_mirage: "Mirage", de_inferno: "Inferno", de_nuke: "Nuke", de_overpass: "Overpass",
        de_dust2: "Dust II", de_ancient: "Ancient", de_anubis: "Anubis", de_vertigo: "Vertigo",
        de_cbble: "Cobblestone", de_train: "Train", cs_office: "Office", de_lake: "Lake",
        de_safehouse: "Safehouse", de_stmarc: "St. Marc", de_house: "House",
        ar_shoots: "Shoots", ar_baggage: "Baggage", ar_monastery: "Monastery"
    };
    const en = tr;
    const ru = tr;
    const dict = currentLang === 'tr' ? tr : (currentLang === 'ru' ? ru : en);
    const v = dict[code];
    return v === undefined ? String(code).toUpperCase() : v;
}

function resolveMapDisplay(code) {
    const raw = String(code);
    const n1 = getMapName(raw);
    if (n1 !== raw.toUpperCase()) return n1;
    const n2 = getMapName(`de_${raw}`);
    if (n2 !== `DE_${raw.toUpperCase()}`) return n2;
    const n3 = getMapName(`cs_${raw}`);
    return n3 !== `CS_${raw.toUpperCase()}` ? n3 : n1;
}

function localizeKey(key) {
    const kOrig = String(key);
    const k = kOrig.toLowerCase();
    const norm = k.replace(/[\s\.\-]+/g, '_');
    
    const lessonLabel = (() => {
        if (!/gi_?lesson/.test(norm)) return null;
        const has = (frag) => norm.includes(frag);
        const L = (tr, en, ru) => currentLang === 'tr' ? tr : (currentLang === 'ru' ? ru : en);
        if (has('buy') && has('menu')) return L("Oyun Öğretici: Satın Alma Menüsü", "Game Instructor: Buy Menu", "Инструктор: Меню покупок");
        if (has('plant') && has('bomb')) return L("Oyun Öğretici: Bombayı Kur", "Game Instructor: Plant Bomb", "Инструктор: Установить бомбу");
        if (has('bomb') && has('carrier')) return L("Oyun Öğretici: Bomba Taşıyıcı", "Game Instructor: Bomb Carrier", "Инструктор: Носитель бомбы");
        if (has('follow') && has('bomber')) return L("Oyun Öğretici: Bomba Taşıyanı Takip Et", "Game Instructor: Follow Bomber", "Инструктор: Следуй за бомбером");
        if (has('cycle') && (has('weapons') ? true : has('silahlar'))) return L("Oyun Öğretici: Silahlar Arası Geçiş", "Game Instructor: Cycle Weapons", "Инструктор: Переключение оружия");
        if (has('zoom')) return L("Oyun Öğretici: Yakınlaştırma", "Game Instructor: Zoom", "Инструктор: Зум");
        if (has('reload')) return L("Oyun Öğretici: Mermi Doldur", "Game Instructor: Reload", "Инструктор: Перезарядка");
        if (has('version') && has('number')) return L("Oyun Öğretici: Sürüm Numarası", "Game Instructor: Version Number", "Инструктор: Номер версии");
        return L("Oyun Öğretici", "Game Instructor", "Инструктор игры");
    })();
    if (lessonLabel) return lessonLabel;
    const weaponKill = norm.match(/^total_kills_(.+)$/);
    if (weaponKill) {
        const code = weaponKill[1];
        const allowed = new Set([
            'ak47','m4a1','m4a1_silencer','galilar','famas','aug','sg556',
            'awp','ssg08','g3sg1','scar20',
            'deagle','elite','fiveseven','tec9','hkp2000','p250','cz75a','usp_silencer','glock',
            'mp5sd','mp7','mp9','mac10','ump45','p90','bizon',
            'nova','xm1014','sawedoff','mag7',
            'm249','negev'
        ]);
        if (allowed.has(code)) {
            const w = getWeaponName(code);
            return currentLang === 'tr' ? `${w} Öldürme` : `${w} Kills`;
        } else {
            const tokenTR = {
                total: "Toplam", kills: "Öldürme", deaths: "Ölüm", headshot: "Kafadan Vuruş",
                damage: "Hasar", shots: "Mermi", fired: "Ateşlenen", hit: "İsabet", hits: "İsabetler",
                matches: "Maç", played: "Oynanan", won: "Kazanılan", time: "Süre", played_time: "Oyun Süresi",
                distance: "Mesafe", traveled: "Katedilen", money: "Para", earned: "Kazanılan", mvps: "MVP",
                round: "Tur", rounds: "Tur", contribution: "Katkı", score: "Puan", last: "Son", match: "Maç",
                wins: "Galibiyet", map: "Harita", cs: "CS", office: "Office", train: "Train", cbble: "Cobblestone",
                lake: "Lake", safehouse: "Safehouse", stmarc: "St. Marc", vertigo: "Vertigo", house: "House",
                ar: "Arms Race", monastery: "Monastery", shoots: "Shoots", baggage: "Baggage", enemy: "Düşman",
                blinded: "Kör", knife: "Bıçak", fight: "Dövüş", zoomed: "Zoomlu", sniper: "Nişancı",
                pistolround: "Pistol Raundu", donated: "Bağışlanan", weapons: "Silahlar", gun: "Gun",
                game: "Game", progressive: "Progressive", revenges: "İntikamlar", revenge: "İntikam", against: "Karşı"
            };
            const text = code.split('_').map(t => tokenTR[t] ? tokenTR[t] : t.toUpperCase()).join(' ');
            return currentLang === 'tr' ? `${text} Öldürme` : `${text} Kills`;
        }
    }
    const weaponDmg = norm.match(/^total_damage_(.+)$/);
    if (weaponDmg) {
        const w = getWeaponName(weaponDmg[1]);
        return currentLang === 'tr' ? `${w} Hasar` : `${w} Damage`;
    }
    const mapWin = norm.match(/^total_wins_map_(.+)$/);
    if (mapWin) {
        const m = mapWin[1];
        const mName = resolveMapDisplay(m);
        return currentLang === 'tr' ? `${mName} • Kazanılan Tur` : (currentLang === 'ru' ? `${mName} • Выигранные раунды` : `${mName} • Rounds Won`);
    }
    const mapRounds = norm.match(/^total_rounds_map_(.+)$/);
    if (mapRounds) {
        const m = mapRounds[1];
        const mName = resolveMapDisplay(m);
        return currentLang === 'tr' ? `${mName} • Oynanan Tur` : (currentLang === 'ru' ? `${mName} • Сыгранные раунды` : `${mName} • Rounds Played`);
    }
    const tokenTR = {
        total: "Toplam", kills: "Öldürme", deaths: "Ölüm", headshot: "Kafadan Vuruş",
        damage: "Hasar", shots: "Mermi", fired: "Ateşlenen", hit: "İsabet", hits: "İsabetler",
        matches: "Maç", played: "Oynanan", won: "Kazanılan", time: "Süre", played_time: "Oyun Süresi",
        distance: "Mesafe", traveled: "Katedilen", money: "Para", earned: "Kazanılan", mvps: "MVP",
        round: "Tur", rounds: "Tur", contribution: "Katkı", score: "Puan", last: "Son", match: "Maç",
        wins: "Galibiyet", map: "Harita", cs: "CS", office: "Office", train: "Train", cbble: "Cobblestone",
        lake: "Lake", safehouse: "Safehouse", stmarc: "St. Marc", vertigo: "Vertigo", house: "House",
        ar: "Arms Race", monastery: "Monastery", shoots: "Shoots", baggage: "Baggage", enemy: "Düşman",
        blinded: "Kör", knife: "Bıçak", fight: "Dövüş", zoomed: "Zoomlu", sniper: "Nişancı",
        pistolround: "Pistol Raundu", donated: "Bağışlanan", weapons: "Silahlar", gun: "Gun",
        game: "Game", progressive: "Progressive", revenges: "İntikamlar", revenge: "İntikam", against: "Karşı",
        mirage: "Mirage", inferno: "Inferno", nuke: "Nuke", overpass: "Overpass", ancient: "Ancient", dust2: "Dust II", anubis: "Anubis"
    };
    const tokens = norm.split('_').map(t => tokenTR[t] ? tokenTR[t] : t.toUpperCase());
    const text = tokens.join(' ');
    return currentLang === 'tr' ? text : kOrig.replace(/_/g, ' ').toUpperCase();
}

function getInfoTextForStat(name) {
    const k = String(name).toLowerCase().replace(/\s+/g,'_');
    if (k === 'total_time_played') {
        return getTranslation('info_time_active');
    }
    if (/^total_wins_map_/.test(k)) {
        return getTranslation('info_map_wins');
    }
    if (/^total_rounds_map_/.test(k)) {
        return getTranslation('info_map_rounds');
    }
    return '';
}

function getTranslation(key) {
    const dict = window.translations && window.translations[currentLang];
    if (dict && dict[key]) return dict[key];
    if (typeof key !== 'string') return String(key);
    return localizeKey(key);
}

function formatNumber(num) {
    if (num === null) return "";
    if (num === undefined) return "";
    if (Number.isNaN(num)) return "";
    return Number(num).toLocaleString(currentLang === 'tr' ? 'tr-TR' : (currentLang === 'en' ? 'en-US' : 'ru-RU'));
}

function formatDuration(seconds) {
    if (seconds === null) return "";
    if (seconds === undefined) return "";
    if (Number.isNaN(seconds)) return "";
    return formatNumber(seconds);
}

function formatDistance(cm) {
    if (cm === null) return "";
    if (cm === undefined) return "";
    if (Number.isNaN(cm)) return "";
    return formatNumber(cm);
}

function analyzePerformance(stats, profile) {
    return "";
}

function updateActiveLangButton(lang) {
    const container = document.querySelector('.lang-selector');
    const track = container ? container.querySelector('.lang-track') : null;
    const btns = Array.from(track ? track.querySelectorAll('button') : []);

    btns.forEach(btn => btn.classList.remove('active'));

    const activeBtn = track ? track.querySelector(`button[data-lang="${lang}"]`) : null;
    if (activeBtn) activeBtn.classList.add('active');

    // Trigger global layout update to fix lens position
    window.dispatchEvent(layoutUpdateEvent);
}

window.downloadPDF = function() {
    const btnContainer = document.getElementById('pdf-container');
    if (btnContainer) btnContainer.style.display = 'none';
    window.print();
    setTimeout(() => { if (btnContainer) btnContainer.style.display = 'flex'; }, 300);
};

window.shareLink = async function() {
    const baseUrl = new URL('index.html', window.location.href);
    let q = null;
    if (lastProfile && lastProfile.steamid) q = lastProfile.steamid;
    const inputEl = document.querySelector('.search-box input');
    if (!q && inputEl && inputEl.value.trim()) q = inputEl.value.trim();
    if (!q) {
        showNotification(getTranslation('data_waiting'), "error");
        return;
    }
    baseUrl.searchParams.set('query', q);
    baseUrl.searchParams.set('lang', currentLang);
    const url = baseUrl.toString();
    try {
        await navigator.clipboard.writeText(url);
        showNotification(url, "info");
    } catch (e) {
        showNotification(url, "info");
    }
};

function updateStaticUIText() {
    document.title = getTranslation('page_title');

    // Navbar
    const navHome = document.getElementById('nav-home');
    if (navHome) navHome.textContent = getTranslation('nav_home');
    const navDownload = document.getElementById('nav-download');
    if (navDownload) navDownload.textContent = getTranslation('nav_download');

    // Footer
    const footer = document.getElementById('main-footer');
    if (footer) footer.textContent = getTranslation('footer_signature');

    // Dashboard Specific
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) searchInput.placeholder = getTranslation('search_placeholder');

    const pdfBtnText = document.getElementById('pdf-btn-text');
    if (pdfBtnText) pdfBtnText.textContent = getTranslation('download_pdf');
    const shareBtnText = document.getElementById('share-btn-text');
    if (shareBtnText) shareBtnText.textContent = getTranslation('share_link');

    const insightTitle = document.getElementById('insight-title-text');
    if (insightTitle) insightTitle.textContent = getTranslation('insight_title');
    const analyzeBtn = document.getElementById('run-analysis-btn');
    if (analyzeBtn) analyzeBtn.textContent = getTranslation('analyze_button');

    const profileStatus = document.getElementById('profile-status');
    if (profileStatus && !lastProfile) profileStatus.textContent = getTranslation('data_waiting');
    else if (profileStatus && lastProfile) profileStatus.textContent = getTranslation('osaka_verified');

    // Welcome box - use page-specific keys if available
    const welcomeTitle = document.getElementById('welcome-title');
    const welcomeDesc = document.getElementById('welcome-desc');

    // Detect which page we're on by checking for page-specific IDs
    const isValorantPage = !!document.getElementById('profile-tag');
    const isTruckersMPPage = !!document.getElementById('profile-id') && !isValorantPage;

    if (welcomeTitle) {
        if (isValorantPage) {
            welcomeTitle.textContent = getTranslation('valorant_welcome_title');
        } else if (isTruckersMPPage) {
            welcomeTitle.textContent = getTranslation('truckersmp_welcome_title');
        } else {
            welcomeTitle.textContent = getTranslation('welcome_title');
        }
    }
    if (welcomeDesc) {
        if (isValorantPage) {
            welcomeDesc.textContent = getTranslation('valorant_welcome_desc');
        } else if (isTruckersMPPage) {
            welcomeDesc.textContent = getTranslation('truckersmp_welcome_desc');
        } else {
            welcomeDesc.textContent = getTranslation('welcome_desc');
        }
    }

    // Download Page Specific
    const dlTitle = document.getElementById('download-title');
    if (dlTitle) dlTitle.textContent = getTranslation('download_title');

    const dlDesc = document.getElementById('download-desc');
    if (dlDesc) dlDesc.textContent = getTranslation('download_desc');

    const dlMeta = document.getElementById('download-meta');
    if (dlMeta) dlMeta.textContent = getTranslation('download_meta');

    const dlBtnText = document.getElementById('download-btn-text');
    if (dlBtnText) dlBtnText.textContent = getTranslation('download_btn');

    const dlNote = document.getElementById('download-note');
    if (dlNote) dlNote.textContent = getTranslation('download_note');

    const gpuToggleBtns = Array.from(document.querySelectorAll('#gpu-toggle'));
    if (gpuToggleBtns.length) {
        let isOn = document.body.classList.contains('gpu-on') || ((typeof localStorage !== 'undefined') && localStorage.getItem('gpu_accel') === '1');
        gpuToggleBtns.forEach(btn => { btn.textContent = isOn ? getTranslation('gpu_on_label') : getTranslation('gpu_off_label'); });
    }
    const settingsGpu = document.getElementById('settings-gpu-label');
    if (settingsGpu) settingsGpu.textContent = getTranslation('settings_gpu');
    const settingsTheme = document.getElementById('settings-theme-label');
    if (settingsTheme) settingsTheme.textContent = getTranslation('settings_theme');
    const themeSystemBtn = document.getElementById('theme-system');
    if (themeSystemBtn) themeSystemBtn.textContent = getTranslation('theme_system');
    const themeLightBtn = document.getElementById('theme-light');
    if (themeLightBtn) themeLightBtn.textContent = getTranslation('theme_light');
    const themeDarkBtn = document.getElementById('theme-dark');
    if (themeDarkBtn) themeDarkBtn.textContent = getTranslation('theme_dark');
    const themeAmoledBtn = document.getElementById('theme-amoled');
    if (themeAmoledBtn) themeAmoledBtn.textContent = getTranslation('theme_amoled');

    updateActiveLangButton(currentLang);
}

function generateLiquidGlassMap(n = 200) {
    const c = document.createElement('canvas');
    c.width = n; c.height = n;
    const ctx = c.getContext('2d');
    const cx = n / 2;
    const cy = n / 2;
    const s = n / 2;
    const img = ctx.createImageData(n, n);
    for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
            const nx = (x - cx) / s;
            const ny = (y - cy) / s;
            const ax = absNumber(nx);
            const ay = absNumber(ny);
            const ax2 = ax * ax;
            const ay2 = ay * ay;
            const f = (ax2 * ax2) + (ay2 * ay2);
            const edge = clampNumber(f, 0, 1);
            const strength = clampNumber(1 - edge, 0, 1);
            const dx = nx * strength * 0.5;
            const dy = ny * strength * 0.5;
            const rShift = clampNumber(roundPx(dx * 255), -127, 127);
            const gShift = clampNumber(roundPx(dy * 255), -127, 127);
            const r = 128 + rShift;
            const g = 128 + gShift;
            const i = (y * n + x) * 4;
            img.data[i] = r;
            img.data[i + 1] = g;
            img.data[i + 2] = 128;
            img.data[i + 3] = 255;
        }
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL('image/png');
}

function initLiquidGlass() {
    const el = document.getElementById('lg-map');
    if (!el) return;
    const url = generateLiquidGlassMap(200);
    el.setAttribute('href', url);
    el.setAttributeNS('http://www.w3.org/1999/xlink', 'href', url);
}

function showNotification(msg, type = "info") {
  if (!toast) return;
  if (!msgSpan) return;
  msgSpan.innerText = msg === null ? "" : (msg === undefined ? "" : msg);

  if (headerSpan) {
    headerSpan.style.color = 'var(--gear-color)';
  }
  toast.style.borderColor = type === "error" ? "#ff4444" : "#ffae00";
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 4000);
}

// Helper to create card HTML
function createStatCard(name, value, icon = "📊") {
    if (!requireFields({ name, value }, ['name', 'value'])) {
        const msg = document.createElement('div');
        msg.className = 'stat-unavailable';
        msg.textContent = 'Bu veri API tarafından sağlanmıyor.';
        return msg;
    }
    const card = document.createElement('div');
    card.className = 'stat-card-modern liquid-glass';
    // Check translation
    let translatedName = getTranslation(name);
    const infoText = getInfoTextForStat(name);

    card.innerHTML = `
        <div class="stat-header">
            <span class="stat-icon">${icon}</span>
            <span class="stat-name">${translatedName}</span>
            ${infoText ? `<span class="stat-info" title="${infoText}">i</span>` : ``}
        </div>
        <div class="stat-value-container">
            <span class="stat-value">${value}</span>
        </div>
    `;
    card.style.marginBottom = '12px';
    return card;
}

function showSkeletons(n = 8) {
    const grid = document.getElementById('dashboard-grid');
    if (!grid) return;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < n; i++) {
        const s = document.createElement('div');
        s.className = 'stat-card-skeleton liquid-glass';
        const l1 = document.createElement('div');
        l1.className = 'skeleton-line';
        const l2 = document.createElement('div');
        l2.className = 'skeleton-line';
        const l3 = document.createElement('div');
        l3.className = 'skeleton-line short';
        s.appendChild(l1);
        s.appendChild(l2);
        s.appendChild(l3);
        frag.appendChild(s);
    }
    grid.innerHTML = '';
    grid.appendChild(frag);
}

function clearSkeletons() {
    const grid = document.getElementById('dashboard-grid');
    if (!grid) return;
    const nodes = Array.from(grid.querySelectorAll('.stat-card-skeleton'));
    nodes.forEach(n => n.remove());
}

function isValidSteamQuery(q) {
    if (!q) return false;
    const s = String(q).trim();
    if (!s) return false;
    if (/#/.test(s)) return true;
    if (/steamcommunity\.com/.test(s)) return true;
    if (/^\d{17}$/.test(s)) return true;
    if (/^\d+$/.test(s)) return true;
    if (s.length >= 3) return true;
    return false;
}

function runDeepAnalysis(statsArray) {
    return { good: [], improve: [], overuse: [], missing: [], solutions: [] };
}

function openAnalysisModal(result) {
    const modal = document.getElementById('analysis-modal');
    const body = document.getElementById('analysis-body');
    const titleEl = document.getElementById('analysis-title');
    if (!modal) return;
    if (!body) return;
    body.textContent = 'Bu veri API tarafından sağlanmıyor.';
    if (titleEl) titleEl.textContent = getTranslation('analysis_title');
    modal.classList.add('open');
}

function renderHighlights(statsArray) {
    const grid = document.getElementById('dashboard-grid');
    if (!grid) return;
    if (!Array.isArray(statsArray)) return;
    if (window.innerWidth <= 768) return; // Only desktop
    const allowedWeapons = [
        'ak47','m4a1','m4a1_silencer','galilar','famas','aug','sg556',
        'awp','ssg08','g3sg1','scar20',
        'deagle','elite','fiveseven','tec9','hkp2000','p250','cz75a','usp_silencer','glock',
        'mp5sd','mp7','mp9','mac10','ump45','p90','bizon',
        'nova','xm1014','sawedoff','mag7',
        'm249','negev'
    ];
    const weaponRegex = new RegExp(`^(${allowedWeapons.join('|')})$`, 'i');
    const weaponKills = statsArray
        .filter(s => /^total_kills_/.test(s.name))
        .map(s => ({ weapon: s.name.replace('total_kills_', ''), value: s.value }))
        .filter(w => weaponRegex.test(w.weapon) && typeof w.value === 'number');
    const topKillWeapon = weaponKills.sort((a,b) => b.value - a.value)[0];
    let weaponDamage = statsArray
        .filter(s => /^total_damage_/.test(s.name))
        .map(s => ({ weapon: s.name.replace('total_damage_', ''), value: s.value }))
        .filter(w => weaponRegex.test(w.weapon) && typeof w.value === 'number');
    const topDamageWeapon = weaponDamage.sort((a,b) => b.value - a.value)[0];
    // Wins by map: derive via regex
    const winsByMap = [];
    statsArray.forEach(s => {
        const m = String(s.name).toLowerCase().match(/^total_wins_map_(.+)$/);
        if (m && typeof s.value === 'number') winsByMap.push({ map: m[1], value: s.value });
    });
    const topWinMap = winsByMap.sort((a,b) => b.value - a.value)[0];
    // Create highlight cards
    const highlightContainer = document.createElement('div');
    highlightContainer.className = 'highlights-grid';
    const notProvided = 'Bu veri API tarafından sağlanmıyor.';
    const card1 = createStatCard(getTranslation('best_kill_weapon'), topKillWeapon ? `${getWeaponName(topKillWeapon.weapon)} • ${formatNumber(topKillWeapon.value)}` : notProvided, "🔫");
    let damageDisplay = notProvided;
    if (topDamageWeapon) {
        damageDisplay = `${getWeaponName(topDamageWeapon.weapon)} • ${formatNumber(topDamageWeapon.value)}`;
    }
    const card2 = createStatCard(getTranslation('best_damage_weapon'), damageDisplay, "💥");
    const card3 = createStatCard(getTranslation('best_win_map'), topWinMap ? `${getMapName(topWinMap.map)} • ${formatNumber(topWinMap.value)}` : notProvided, "🗺️");
    if (card1) highlightContainer.appendChild(card1);
    if (card2) highlightContainer.appendChild(card2);
    if (card3) {
        const note = document.createElement('div');
        note.className = 'stat-note';
        note.textContent = getTranslation('info_map_wins');
        card3.appendChild(note);
        highlightContainer.appendChild(card3);
    }
    grid.prepend(highlightContainer);
}

function renderMobileAccordion(statsArray) {
    const grid = document.getElementById('dashboard-grid');
    if (!grid) return;
    const allowedWeapons = [
        'ak47','m4a1','m4a1_silencer','galilar','famas','aug','sg556',
        'awp','ssg08','g3sg1','scar20',
        'deagle','elite','fiveseven','tec9','hkp2000','p250','cz75a','usp_silencer','glock',
        'mp5sd','mp7','mp9','mac10','ump45','p90','bizon',
        'nova','xm1014','sawedoff','mag7',
        'm249','negev'
    ];
    const weaponRegex = new RegExp(`^(${allowedWeapons.join('|')})$`, 'i');
    const weaponKills = statsArray
        .filter(s => /^total_kills_/.test(s.name))
        .map(s => ({ weapon: s.name.replace('total_kills_', ''), value: s.value }))
        .filter(w => weaponRegex.test(w.weapon) && typeof w.value === 'number');
    const topKillWeapon = weaponKills.sort((a,b) => b.value - a.value)[0];
    let weaponDamage = statsArray
        .filter(s => /^total_damage_/.test(s.name))
        .map(s => ({ weapon: s.name.replace('total_damage_', ''), value: s.value }))
        .filter(w => weaponRegex.test(w.weapon) && typeof w.value === 'number');
    const topDamageWeapon = weaponDamage.sort((a,b) => b.value - a.value)[0];
    const winsByMap = [];
    statsArray.forEach(s => {
        const m = String(s.name).toLowerCase().match(/^total_wins_map_(.+)$/);
        if (m && typeof s.value === 'number') winsByMap.push({ map: m[1], value: s.value });
    });
    const topWinMap = winsByMap.sort((a,b) => b.value - a.value)[0];
    const highlightContainer = document.createElement('div');
    highlightContainer.className = 'highlights-grid';
    const notProvided = 'Bu veri API tarafından sağlanmıyor.';
    const card1 = createStatCard(getTranslation('best_kill_weapon'), topKillWeapon ? `${getWeaponName(topKillWeapon.weapon)} • ${formatNumber(topKillWeapon.value)}` : notProvided, "🔫");
    let damageDisplay = notProvided;
    if (topDamageWeapon) {
        damageDisplay = `${getWeaponName(topDamageWeapon.weapon)} • ${formatNumber(topDamageWeapon.value)}`;
    }
    const card2 = createStatCard(getTranslation('best_damage_weapon'), damageDisplay, "💥");
    const card3 = createStatCard(getTranslation('best_win_map'), topWinMap ? `${getMapName(topWinMap.map)} • ${formatNumber(topWinMap.value)}` : notProvided, "🗺️");
    if (card1) highlightContainer.appendChild(card1);
    if (card2) highlightContainer.appendChild(card2);
    if (card3) {
        const note = document.createElement('div');
        note.className = 'stat-note';
        note.textContent = getTranslation('info_map_wins');
        card3.appendChild(note);
        highlightContainer.appendChild(card3);
    }
    grid.prepend(highlightContainer);
    const container = document.createElement('div');
    container.id = 'mobile-accordion';
    // Categories
    const general = statsArray.filter(s => /^total_/.test(s.name) && !/_/.test(s.name.replace(/^total_/, ''))); // simple totals
    const weapons = statsArray.filter(s => /^total_kills_/.test(s.name) ? true : /^total_damage_/.test(s.name));
    const maps = statsArray.filter(s => /(de_|anubis|mirage|inferno|nuke|overpass|vertigo|ancient|dust2)/i.test(s.name));
    const makeSection = (title, items) => {
        const sec = document.createElement('div');
        sec.className = 'accordion-section';
        sec.innerHTML = `
          <button class="accordion-header">${getTranslation(title)}</button>
          <div class="accordion-content"></div>
        `;
        const content = sec.querySelector('.accordion-content');
        items.slice(0, 50).forEach(s => {
            if (!requireFields(s, ['name', 'value'])) return;
            if (typeof s.value !== 'number') return;
            const row = document.createElement('div');
            row.className = 'accordion-row';
            const displayVal = s.name.includes('time') ? formatDuration(s.value)
                : s.name.includes('distance') ? formatDistance(s.value)
                : formatNumber(s.value);
            const infoText = getInfoTextForStat(s.name);
            const infoIcon = infoText ? `<span class="row-info" title="${infoText}">i</span>` : '';
            row.innerHTML = `<span class="row-name">${getTranslation(s.name)}${infoIcon}</span><span class="row-value">${displayVal}</span>`;
            content.appendChild(row);
        });
        // Restore previous open state
        if (accordionState[title]) {
            sec.classList.add('open');
        }
        sec.querySelector('.accordion-header').addEventListener('click', () => {
            const willOpen = !sec.classList.contains('open');
            sec.classList.toggle('open', willOpen);
            accordionState[title] = willOpen;
        });
        return sec;
    };
    container.appendChild(makeSection('cat_general', general));
    container.appendChild(makeSection('cat_weapons', weapons));
    container.appendChild(makeSection('cat_maps', maps));
    grid.appendChild(container);
}

function renderFaceitCard(data) {
    const grid = document.getElementById('dashboard-grid');

    // Remove existing Faceit cards
    const existingFaceit = document.querySelectorAll('.faceit-card');
    existingFaceit.forEach(el => el.remove());

    // Create Container for Pro Card
    const card = document.createElement('div');
    card.className = 'stat-card-modern liquid-glass faceit-card';
    // Faceit Card layout
    card.style.justifyContent = 'flex-start';
    card.style.minHeight = '160px';

    if (!data) {
        card.style.marginBottom = '12px';
        card.innerHTML = `
            <div class="stat-header">
                <span class="stat-icon"><i class="fas fa-user-slash"></i></span>
                <span class="stat-name">FACEIT PRO</span>
            </div>
            <div class="stat-value-container">
                <span class="stat-value">${getTranslation('not_connected')}</span>
            </div>
        `;
        grid.prepend(card);
        return;
    }
    if (data.error) {
        card.style.marginBottom = '12px';
        card.innerHTML = `
            <div class="stat-header">
                <span class="stat-icon"><i class="fas fa-user-slash"></i></span>
                <span class="stat-name">FACEIT PRO</span>
            </div>
            <div class="stat-value-container">
                <span class="stat-value">${getTranslation('faceit_api_nodata')}</span>
            </div>
        `;
        grid.prepend(card);
        return;
    }
    if (data.found !== true) {
        card.style.marginBottom = '12px';
        card.innerHTML = `
            <div class="stat-header">
                <span class="stat-icon"><i class="fas fa-user-slash"></i></span>
                <span class="stat-name">FACEIT PRO</span>
            </div>
            <div class="stat-value-container">
                <span class="stat-value">${getTranslation('not_connected')}</span>
            </div>
        `;
        grid.prepend(card);
        return;
    }

    if (!requireFields(data, ['level', 'elo'])) {
        card.style.marginBottom = '12px';
        card.innerHTML = `
            <div class="stat-header">
                <span class="stat-icon"><i class="fas fa-user-slash"></i></span>
                <span class="stat-name">FACEIT PRO</span>
            </div>
            <div class="stat-value-container">
                <span class="stat-value">${getTranslation('faceit_api_nodata')}</span>
            </div>
        `;
        grid.prepend(card);
        return;
    }

    const level = data.level;
    const elo = data.elo;

    // Faceit Level Icon (Official Assets Pattern)
    const levelIconUrl = `https://cdn-frontend.faceit.com/web/common/assets/images/skill-icons/skill_level_${level}_svg.svg`;

    card.innerHTML = `
        <div class="stat-header">
            <span class="stat-icon"><i class="fas fa-medal"></i></span>
            <span class="stat-name">FACEIT</span>
        </div>
        <div class="stat-value-container" style="display:flex; align-items:center; gap:12px;">
            <img src="${levelIconUrl}" alt="Lvl ${level}" style="width:40px; height:40px; filter: drop-shadow(0 0 6px rgba(255,85,0,0.3));" onerror="this.style.display='none'">
            <span class="stat-value">${elo} • Lv${level}</span>
        </div>
    `;
    card.style.marginBottom = '12px';

    grid.prepend(card);
}

async function getFaceitStats(steamId) {
  try {
    const response = await fetch(`/api?provider=faceit&steamid=${encodeURIComponent(steamId)}`);
    if (!response.ok) {
      renderFaceitCard({ error: 'DATA_UNAVAILABLE', found: false });
      return;
    }
    const data = await response.json();
    lastFaceit = data;
    renderFaceitCard(data);
  } catch (error) {
    const msg = (error && error.message) ? error.message : String(error);
    renderFaceitCard({ error: msg, found: false });
  }
}

// --- Main Render Function ---
function renderDashboard(statsArray, profileData) {
    const grid = document.getElementById('dashboard-grid');
    grid.innerHTML = ''; // Clear grid

    // 1. Update Profile Header
    const profileSection = document.getElementById('profile-section');
    const nameEl = document.getElementById('profile-name');
    const statusEl = document.getElementById('profile-status');
    const avatarImg = document.getElementById('profile-avatar');
    const profileIcon = document.getElementById('profile-icon');
    const insightBox = document.getElementById('gamer-insight');
    const insightContent = document.getElementById('insight-content');
    const pdfBtnContainer = document.getElementById('pdf-container');
    const welcomeCard = document.getElementById('welcome-card');

    profileSection.style.display = 'flex';
    const tmpContainer = document.getElementById('truckersmp-container');
    if (tmpContainer) {
         tmpContainer.style.display = 'block';
         // Reset previous results
         const res = document.getElementById('truckersmp-result');
         if(res) res.innerHTML = '';
    }
    if (insightBox) insightBox.style.display = 'none';
    if (pdfBtnContainer) pdfBtnContainer.style.display = 'flex';
    if (welcomeCard) welcomeCard.style.display = 'none';

    if (profileData && requireFields(profileData, ['personaname'])) {
        nameEl.textContent = profileData.personaname;
        avatarImg.src = profileData.avatarfull === undefined ? "" : profileData.avatarfull;
        avatarImg.style.display = "block";
        if (profileIcon) profileIcon.style.display = "none";
        statusEl.textContent = getTranslation('osaka_verified');
        statusEl.style.color = "#00ff00";
    } else {
        profileSection.style.display = 'none';
    }

    if (!statsArray) {
        grid.innerHTML = `<p style="text-align:center; width:100%; color:#aaa;">${getTranslation('data_waiting')}</p>`;
        return;
    }
    if (insightContent) insightContent.innerHTML = "";

    const totalKillsStat = statsArray.find(s => s.name === 'total_kills');
    const totalWinsStat = statsArray.find(s => s.name === 'total_matches_won');
    const priority = [];
    if (totalKillsStat && typeof totalKillsStat.value === 'number') priority.push({ name: 'total_kills', value: totalKillsStat.value, icon: '💀' });
    if (totalWinsStat && typeof totalWinsStat.value === 'number') priority.push({ name: 'total_matches_won', value: totalWinsStat.value, icon: '🏆' });
    if (priority.length === 0) {
        const msg = document.createElement('div');
        msg.className = 'stat-unavailable';
        msg.textContent = 'Bu veri API tarafından sağlanmıyor.';
        grid.appendChild(msg);
        return;
    }
    priority.forEach(p => {
        const card = createStatCard(p.name, formatNumber(p.value), p.icon);
        if (card) grid.appendChild(card);
    });

    renderHighlights(statsArray);

    // 4. Render All Other Stats
    statsArray.forEach(stat => {
        // Skip duplicates of priority stats if desired
        if (stat.name === 'total_kills') return;
        if (stat.name === 'total_matches_won') return;
        if (!requireFields(stat, ['name', 'value'])) return;
        if (typeof stat.value !== 'number') return;

        const finalValue = formatNumber(stat.value);
        const card = createStatCard(stat.name, finalValue, "📊");
        if (!card) return;
        grid.appendChild(card);
    });

    // Mobile accordion override
    if (window.innerWidth <= 768) {
        renderMobileAccordion(statsArray);
    }
}

async function executeSearch(userInput) {
    showSkeletons(8);
    try {
      const response = await fetch(`/api?provider=steam&q=${encodeURIComponent(userInput)}`);

      if (!response.ok) {
          let errorMsg = currentLang === 'tr' ? 'Veri alınamadı.' : (currentLang === 'ru' ? 'Данные недоступны.' : 'Data unavailable.');
          try { await response.json(); } catch (e) {}

          showNotification(errorMsg, "error");
          const gridEl = document.getElementById('dashboard-grid');
          if (gridEl) {
            const p = document.createElement('p');
            p.style.textAlign = 'center';
            p.style.color = '#ff4444';
            p.textContent = errorMsg.toString();
            gridEl.innerHTML = '';
            gridEl.appendChild(p);
          }
          return;
      }

      const data = await response.json();

      if (data && data.error) {
        const msg = currentLang === 'tr' ? 'Veri alınamadı.' : (currentLang === 'ru' ? 'Данные недоступны.' : 'Data unavailable.');
        showNotification(msg, "error");
        const gridEl = document.getElementById('dashboard-grid');
        if (gridEl) {
          const p = document.createElement('p');
          p.style.textAlign = 'center';
          p.style.color = '#ff4444';
          p.textContent = msg;
          gridEl.innerHTML = '';
          gridEl.appendChild(p);
        }
      } else {
        let statsArray = [];
        if (Array.isArray(data.stats)) {
            statsArray = data.stats;
        } else {
            statsArray = null;
        }
        lastStats = statsArray;
        lastProfile = data.profile;
        lastFaceit = null;
        renderDashboard(statsArray, data.profile);
        showNotification(getTranslation('success'), "info");
        try {
            localStorage.setItem('last_query', String(userInput));
        } catch (e) {}
        if (data.profile && data.profile.steamid) {
            getFaceitStats(data.profile.steamid);
        }
      }
    } catch (error) {
      showNotification(currentLang === 'tr' ? 'Veri alınamadı.' : (currentLang === 'ru' ? 'Данные недоступны.' : 'Data unavailable.'), "error");
    } finally {
      clearSkeletons();
      isSearching = false;
    }
}

// --- Main Script ---
document.addEventListener("DOMContentLoaded", () => {
    const toast = document.getElementById("osaka-toast");
    const msgSpan = document.getElementById("toast-message");
    const headerSpan = document.querySelector(".toast-header");
    
    // Check LocalStorage or pre-injected preferred language
    const savedLang = window.__osaka_preferred_lang ? window.__osaka_preferred_lang : localStorage.getItem('osaka_lang');
    if (savedLang && ['tr', 'en', 'ru'].includes(savedLang)) {
        currentLang = savedLang;
    }

    // Initial UI Update for default/saved Lang
    updateStaticUIText();
    updateActiveLangButton(currentLang);
    initLiquidGlass();
    let lastRenderWidth = window.innerWidth;

    // --- SETTINGS PANEL: CENTRALIZED STATE & CONTROLS ---
    window.isSettingsOpen = false;
    let settingsPanelElement = null;
    let settingsListenersAttached = false;

    function createSettingsPanel() {
        if (settingsPanelElement) return settingsPanelElement;
        
        const panel = document.createElement('div');
        panel.id = 'settings-panel';
        panel.className = 'settings-panel liquid-glass';
        panel.innerHTML = `
          <div class="settings-row">
            <span id="settings-gpu-label" class="label">Donanım Hızlandırma</span>
            <button id="gpu-toggle" class="toggle-btn">Donanım Hızlandırma: Kapalı</button>
          </div>
          <div class="settings-row">
            <span id="settings-theme-label" class="label">Tema</span>
            <div class="theme-segment" role="tablist">
              <button class="theme-btn" id="theme-system" data-theme="system">Sistem</button>
              <button class="theme-btn" id="theme-light" data-theme="light">Açık</button>
              <button class="theme-btn" id="theme-dark" data-theme="dark">Koyu</button>
              <button class="theme-btn" id="theme-amoled" data-theme="amoled">Amoled</button>
            </div>
          </div>
        `;
        
        settingsPanelElement = panel;
        try {
            // Ensure panel appears above all other stacking contexts
            panel.style.setProperty('z-index', '2147483647', 'important');
        } catch (e) {}
        return panel;
    }

    function mountSettingsPanel() {
        if (!settingsPanelElement) createSettingsPanel();
        if (document.getElementById('settings-panel')) return; // Already mounted
        document.body.appendChild(settingsPanelElement);
        
        if (!settingsListenersAttached) {
            attachSettingsPanelListeners();
            settingsListenersAttached = true;
        }
        
        updateStaticUIText(); // Update translations
    }

    function unmountSettingsPanel() {
        if (settingsPanelElement && settingsPanelElement.parentNode) {
            settingsPanelElement.parentNode.removeChild(settingsPanelElement);
        }
    }

    function attachSettingsPanelListeners() {
        const gpuToggles = Array.from(document.querySelectorAll('#gpu-toggle'));
        if (gpuToggles.length) {
            const applyGPU = (on) => {
                document.body.classList.toggle('gpu-on', !!on);
                try { localStorage.setItem('gpu_accel', on ? '1' : '0'); } catch (e) {}
                gpuToggles.forEach(gt => { gt.textContent = on ? getTranslation('gpu_on_label') : getTranslation('gpu_off_label'); });
            };
            const saved = (typeof localStorage !== 'undefined') ? localStorage.getItem('gpu_accel') : null;
            applyGPU(saved === '1');
            gpuToggles.forEach(gt => {
                gt.removeEventListener('click', gt._gpuHandler);
                gt._gpuHandler = () => {
                    const nowOn = !document.body.classList.contains('gpu-on');
                    applyGPU(nowOn);
                };
                gt.addEventListener('click', gt._gpuHandler);
            });
        }
        
        const themeButtons = Array.from(document.querySelectorAll('.theme-btn'));
        themeButtons.forEach(b => {
            b.removeEventListener('click', b._themeHandler);
            b._themeHandler = () => {
                const attr = b.getAttribute('data-theme');
                const th = attr ? attr : 'system';
                applyTheme(th);
                try { closeSettings(); } catch (e) {}
            };
            b.addEventListener('click', b._themeHandler);
        });
    }

    function setSettingsOpen(open) {
        window.isSettingsOpen = !!open;
        const settingsFab = document.getElementById('settings-fab');
        
        if (window.isSettingsOpen) {
            mountSettingsPanel();
            const panel = document.getElementById('settings-panel');
            if (panel) panel.classList.add('open');
        } else {
            const panel = document.getElementById('settings-panel');
            if (panel) panel.classList.remove('open');
            setTimeout(() => unmountSettingsPanel(), 300); // Allow animation before removing
        }
        
        if (settingsFab) {
            settingsFab.setAttribute('aria-pressed', window.isSettingsOpen ? 'true' : 'false');
        }
        try { syncBottomActions(); } catch (e) {}
    }

    function openSettings() { setSettingsOpen(true); }
    function closeSettings() { setSettingsOpen(false); }
    function toggleSettings() { setSettingsOpen(!window.isSettingsOpen); }

    // Ensure settings panel is closed on initial load
    closeSettings();

    // Attach settings-fab toggles (works across pages)
    (function bindSettingsFabs() {
        const nodes = Array.from(document.querySelectorAll('.settings-fab, #settings-fab'));
        nodes.forEach(fab => {
            if (!fab) return;
            if (fab.dataset._settingsBound) return;
            try { fab.setAttribute('role', 'button'); } catch(e) {}
            try { fab.setAttribute('aria-pressed', 'false'); } catch(e) {}
            try { fab.style.cursor = 'pointer'; } catch(e) {}

            const handler = (ev) => {
                try { ev.stopPropagation(); } catch (err) {}
                try { fab.animate([{ transform: 'scale(1)' }, { transform: 'scale(0.96)' }, { transform: 'scale(1)' }], { duration: 220, easing: 'cubic-bezier(.2,.9,.2,1)' }); } catch (err) {}
                toggleSettings();
            };

            fab.addEventListener('click', handler);
            fab.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    handler(ev);
                }
            });
            fab.dataset._settingsBound = '1';
        });
    })();

    // Close settings on route/hash/popstate
    window.addEventListener('popstate', closeSettings);
    window.addEventListener('hashchange', closeSettings);
    window.addEventListener('routechange', closeSettings);

    (function() {
        try {
            const _push = history.pushState;
            const _replace = history.replaceState;
            history.pushState = function() {
                const res = _push.apply(this, arguments);
                try { window.dispatchEvent(new Event('routechange')); } catch(e) {}
                return res;
            };
            history.replaceState = function() {
                const res = _replace.apply(this, arguments);
                try { window.dispatchEvent(new Event('routechange')); } catch(e) {}
                return res;
            };
        } catch (e) {}
    })();
    
    const params = new URLSearchParams(window.location.search);
    const langParam = params.get('lang');
    if (langParam && ['tr','en','ru'].includes(langParam)) {
        changeLanguage(langParam);
    }
    const queryParam = params.get('query');
    if (queryParam) {
        const inputPre = document.querySelector('.search-box input');
        if (inputPre) inputPre.value = queryParam;
        executeSearch(queryParam);
    } else {
        const inputPre = document.querySelector('.search-box input');
        try {
            const q = localStorage.getItem('last_query');
            if (inputPre && q) inputPre.value = q;
        } catch (e) {}
    }
    
    function initLangSelector() {
        const selector = document.querySelector('.lang-selector');
        if (!selector) return;
        const track = selector.querySelector('.lang-track');
        const lens = track && track.querySelector('.lang-lens');
        const btns = Array.from(track ? track.querySelectorAll('button') : []);
        if (!track || !lens || btns.length === 0) return;

        // Smooth sliding setup
        lens.style.transition = 'transform 200ms cubic-bezier(0.2, 0.9, 0.2, 1), width 200ms cubic-bezier(0.2, 0.9, 0.2, 1)';

        const bias = 0;
        let centers = [];
        let stableLensWidth = 0;
        let minX = 0;
        let maxX = 0;

        function layout() {
            const rectTrack = track.getBoundingClientRect();
            // Safety check if track is hidden
            if (rectTrack.width === 0) return;

            centers = btns.map(b => {
                const r = b.getBoundingClientRect();
                return { x: r.left - rectTrack.left + r.width / 2, w: r.width, h: r.height, left: r.left - rectTrack.left };
            });
            try {
                const widths = centers.map(c => c.w || 0);
                const maxW = widths.length ? widths.reduce((a,b)=> Math.max(a,b), 0) : 0;
                if (maxW > stableLensWidth) stableLensWidth = maxW;
            } catch (e) {}

            let activeBtn = track.querySelector('button.active');
            if (!activeBtn) activeBtn = btns[0];

            // Highlight logic
            const idx = btns.indexOf(activeBtn);
            if (idx === -1) return;
            const c = centers[idx];
            if (!c) return;

            const btnRect = activeBtn.getBoundingClientRect();
            const h = btnRect.height;
            const cap = roundPx(h * 1.15);
            const lensWraw = min2(btnRect.width, cap);
            const stableUsed = stableLensWidth ? Math.min(stableLensWidth, cap) : 0;
            const lensW = Math.max(h, Math.max(lensWraw, stableUsed));

            lens.style.width = lensW + 'px';
            lens.style.height = h + 'px';
            lens.style.top = (btnRect.top - rectTrack.top) + 'px';

            // Calculate precise target X
            const lensX = c.x - (lensW / 2) + bias;
            lens.style.transform = 'translateX(' + roundPx(lensX) + 'px)';

            minX = centers[0].x - (lensW / 2) + bias;
            maxX = centers[centers.length - 1].x - (lensW / 2) + bias;

            // Parallax effect prop
            const denom = (maxX - minX);
            const safeDenom = denom > 1 ? denom : 1;
            const ratio = (lensX - minX) / safeDenom;
            lens.style.setProperty('--lx', String(ratio));
        }

        // Listen for global layout update request
        window.addEventListener('osaka-layout-update', layout);

        // RACE CONDITION FIX: Do not calculate until fonts are ready
        // We do NOT call layout() immediately here.
        if (document.fonts) {
            document.fonts.ready.then(() => {
                layout();
                setTimeout(layout, 150);
            });
        } else {
            window.addEventListener('load', () => {
                layout();
                setTimeout(layout, 150);
            });
        }

        // Also observe resizing
        if (window.ResizeObserver) {
            const ro = new ResizeObserver(() => layout());
            ro.observe(track);
        }
        window.addEventListener('resize', layout);

        btns.forEach((btn, i) => {
            btn.addEventListener('click', () => {
                btns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Immediately calculate new position for smooth slide
                layout();

                const lang = btn.getAttribute('data-lang');
                if (lang) changeLanguage(lang);
            });
        });
    }
    initLangSelector();

    function initNavSelector() {
        const track = document.querySelector('.nav-track');
        if (!track) return;
        const lens = track.querySelector('.nav-lens');
        const links = Array.from(track.querySelectorAll('a'));
        if (!lens || links.length === 0) return;

        const bias = 0;
        let centers = [];
        let stableNavLensWidth = 0;

        function layout() {
            const rectTrack = track.getBoundingClientRect();
             if (rectTrack.width === 0) return;

            centers = links.map(a => {
                const r = a.getBoundingClientRect();
                return { x: r.left - rectTrack.left + r.width / 2, w: r.width, h: r.height, left: r.left - rectTrack.left };
            });
            try {
                const widths = centers.map(c => c.w || 0);
                const maxW = widths.length ? widths.reduce((a,b)=> Math.max(a,b), 0) : 0;
                if (maxW > stableNavLensWidth) stableNavLensWidth = maxW;
            } catch (e) {}
            let active = track.querySelector('a.active');
            if (!active) active = links[0];
            links.forEach(l => l.classList.remove('active'));
            active.classList.add('active');
            const idx = links.indexOf(active);
            if (idx === -1) return;

            const c = centers[idx];
            if (!c) return;
            const r = active.getBoundingClientRect();
            const h = r.height;
            const lensW = min2(r.width, roundPx(h * 1.3));
            const cap = roundPx(h * 1.3);
            const lensWraw = min2(r.width, cap);
            const finalLensW = Math.max(lensWraw, stableNavLensWidth || lensWraw);

            lens.style.width = finalLensW + 'px';
            lens.style.height = h + 'px';
            lens.style.top = (r.top - rectTrack.top) + 'px';

            const lensX = c.x - (finalLensW / 2) + bias;
            lens.style.transform = 'translateX(' + roundPx(lensX) + 'px)';
            lens.style.opacity = '1';
        }

        // Apply same race condition fix
        if (document.fonts) {
            document.fonts.ready.then(() => {
                layout();
                setTimeout(layout, 150);
            });
        } else {
             window.addEventListener('load', () => {
                layout();
                setTimeout(layout, 150);
             });
        }

        if (window.ResizeObserver) {
            const ro2 = new ResizeObserver(() => layout());
            ro2.observe(track);
        }
        window.addEventListener('resize', layout);
    }
    initNavSelector();

    // Ensure settings-fab always has top z-index and global delegated click handling
    document.body.addEventListener('click', function(e) {
        // SETTINGS FAB DELEGATION - STRICT CHECK
        const fab = e.target.closest && e.target.closest('#settings-fab, .settings-fab');
        if (fab) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof toggleSettings === 'function') {
                toggleSettings();
            }
            return;
        }
    }, true);

    window.changeLanguage = function(lang) {
        try { closeSettings(); } catch (e) {}
        currentLang = lang;
        localStorage.setItem('osaka_lang', lang);
        document.documentElement.setAttribute('lang', lang);
        updateActiveLangButton(lang);
        updateStaticUIText();
        const shouldRerender = lastStats !== null ? true : (lastProfile !== null);
        if (shouldRerender) {
            renderDashboard(lastStats, lastProfile);
            if (lastFaceit) renderFaceitCard(lastFaceit);
        }
    };

    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
      searchInput.addEventListener('keypress', async function (e) {
        if (e.key !== 'Enter') return;
        if (isSearching) return;
        const userInput = this.value.trim();
        if (!userInput) return;
        const invalidMsg = currentLang === 'tr' ? 'Geçersiz giriş' : (currentLang === 'ru' ? 'Неверный ввод' : 'Invalid input');
        if (!isValidSteamQuery(userInput)) {
            showNotification(invalidMsg, "error");
            return;
        }
        if (/#/.test(userInput)) {
            window.location.href = `valorant.html?query=${encodeURIComponent(userInput)}`;
            return;
        }
        const originalPlaceholder = this.placeholder;
        this.value = "";
        this.placeholder = getTranslation('searching');
        this.disabled = true;
        isSearching = true;
        showNotification(getTranslation('fetching'), "info");
        try {
          await executeSearch(userInput);
        } finally {
          this.disabled = false;
          this.placeholder = getTranslation('search_placeholder');
          isSearching = false;
        }
      });
    }
    const analyzeBtn = document.getElementById('run-analysis-btn');
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', () => {
            showNotification('Bu veri API tarafından sağlanmıyor.', "error");
        });
        const closeBtn = document.getElementById('analysis-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                const modal = document.getElementById('analysis-modal');
                if (modal) modal.classList.remove('open');
            });
        }
        const modal = document.getElementById('analysis-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.remove('open');
            });
        }
    }
    window.addEventListener('resize', () => {
        const hasStats = lastStats !== null;
        const hasProfile = lastProfile !== null;
        if (!hasStats) {
            if (!hasProfile) return;
        }
        const w = window.innerWidth;
        const a = (lastRenderWidth <= 768 && w > 768);
        const b = (lastRenderWidth > 768 && w <= 768);
        const crossed = a ? true : b;
        if (!crossed) return;
        renderDashboard(lastStats, lastProfile);
        if (lastFaceit) renderFaceitCard(lastFaceit);
        lastRenderWidth = w;
    });

    const settingsFab = document.getElementById('settings-fab');
    let bottomActions = document.getElementById('bottom-actions');
    function isMobileUI() {
        if (window.innerWidth > 768) return false;
        if (!window.matchMedia) return true;
        return window.matchMedia('(pointer: coarse)').matches;
    }
    function isIndexPage() {
        if (!window.location) return false;
        const pathname = window.location.pathname;
        const p = pathname === undefined ? '' : String(pathname);
        if (p.endsWith('/')) return true;
        return /(^|\/)index\.html?$/.test(p);
    }
    function ensureBottomActions() {
        if (bottomActions) return bottomActions;
        if (!isIndexPage()) return null;
        const el = document.createElement('div');
        el.id = 'bottom-actions';
        el.className = 'liquid-glass';
        el.hidden = true;
        el.innerHTML = `
          <a href="index.html" id="ba-home"><i class="fas fa-home icon"></i></a>
          <a href="download.html" id="ba-download"><i class="fas fa-download icon"></i></a>
          <button id="ba-search"><i class="fas fa-search icon"></i></button>
          <button id="ba-settings"><i class="fas fa-gear icon"></i></button>
          <button id="ba-lang"><i class="fas fa-globe icon"></i></button>
        `;
        document.body.appendChild(el);
        bottomActions = el;
        const baSearch = el.querySelector('#ba-search');
        if (baSearch) {
            baSearch.addEventListener('click', () => {
                const input = document.querySelector('.search-box input');
                const visible = input && input.offsetParent !== null && getComputedStyle(input).visibility !== 'hidden';
                if (visible) {
                    input.focus();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    window.location.href = 'index.html#search';
                }
            });
        }
        const baLang = el.querySelector('#ba-lang');
        if (baLang) {
            baLang.addEventListener('click', () => {
                const sel = document.querySelector('.lang-selector');
                if (sel) sel.scrollIntoView({ behavior: 'smooth', block: 'end' });
            });
        }
        const baSettings = el.querySelector('#ba-settings');
        if (baSettings) {
            baSettings.addEventListener('click', () => {
                try { toggleSettings(); } catch (e) {
                    if (settingsPanelElement) settingsPanelElement.classList.toggle('open');
                }
                syncBottomActions();
            });
        }
        return el;
    }
    function syncBottomActions() {
        const ba = ensureBottomActions();
        if (!ba) return;
        const mobileUI = isMobileUI();
        if (!mobileUI) {
            ba.hidden = true;
            return;
        }
        if (!settingsPanelElement) {
            ba.hidden = true;
            return;
        }
        ba.hidden = window.isSettingsOpen ? false : true;
    }
    if (settingsFab) {
        settingsFab.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSettings();
        });
    }
    document.addEventListener('click', (e) => {
        if (!window.isSettingsOpen) return;
        const t = e.target;
        let inside = false;
        if (settingsFab && settingsFab.contains(t)) inside = true;
        const panel = document.getElementById('settings-panel');
        if (panel && panel.contains(t)) inside = true;
        const ba = document.getElementById('bottom-actions');
        if (!inside && ba && ba.contains(t)) inside = true;
        if (!inside) {
            closeSettings();
        }
    });
    syncBottomActions();
    window.addEventListener('resize', () => {
        syncBottomActions();
    });
    function applyTheme(theme) {
        let decided = theme;
        if (theme === 'system') {
            decided = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        document.body.classList.remove('theme-light','theme-dark','theme-amoled');
        if (decided === 'light') document.body.classList.add('theme-light');
        else if (decided === 'amoled') document.body.classList.add('theme-amoled');
        else document.body.classList.add('theme-dark');
        try { localStorage.setItem('osaka_theme', theme); } catch (e) {}
        const buttons = document.querySelectorAll('.theme-btn');
        buttons.forEach(b => b.classList.remove('active'));
        const active = document.querySelector(`.theme-btn[data-theme="${theme}"]`);
        if (active) active.classList.add('active');
    }
    (function initTheme() {
        const saved = (typeof localStorage !== 'undefined') ? localStorage.getItem('osaka_theme') : null;
        applyTheme(saved ? saved : 'system');
        const buttons = document.querySelectorAll('.theme-btn');
        buttons.forEach(b => b.addEventListener('click', () => {
            const attr = b.getAttribute('data-theme');
            const th = attr ? attr : 'system';
            applyTheme(th);
            try { closeSettings(); } catch (e) {}
        }));
        if (window.matchMedia) {
            const mq = window.matchMedia('(prefers-color-scheme: dark)');
            mq.addEventListener && mq.addEventListener('change', () => {
                const savedTheme = localStorage.getItem('osaka_theme');
                if (savedTheme === 'system') applyTheme('system');
            });
        }
    })();
    (function removeLegacyBars() {
        const legacyToolbar = document.getElementById('settings-toolbar');
        if (legacyToolbar) legacyToolbar.remove();
        const els = Array.from(document.querySelectorAll('.mobile-bottom-bar'));
        els.forEach(el => el.remove());
    })();
    if (window.location && window.location.hash === '#search') {
        const si = document.querySelector('.search-box input');
        if (si) {
            si.focus();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
});
