// Osaka - Core Logic (Refactored)

// Global State
window.lastProfile = null;
let currentLang = localStorage.getItem('osaka_lang') || 'tr';

document.addEventListener('DOMContentLoaded', () => {
    initLangSelector();
    initNavbarLens();
    initSettings(); // This will inject the panel
    initSearch();
    applyStoredTheme();
});

// --- 1. LANGUAGE SELECTOR (Race Condition Fix) ---
function initLangSelector() {
    const track = document.querySelector('.lang-track');
    if (!track) return;

    const lens = track.querySelector('.lang-lens');
    const buttons = track.querySelectorAll('button');

    function updateLens(btn) {
        if (!btn) return;
        const rect = btn.getBoundingClientRect();
        const trackRect = track.getBoundingClientRect();

        // Calculate relative position
        const left = rect.left - trackRect.left;
        const width = rect.width;

        lens.style.width = `${width}px`;
        lens.style.transform = `translateX(${left}px)`;
    }

    // REQ 3: Wait for fonts to ensure correct width
    document.fonts.ready.then(() => {
        const activeBtn = track.querySelector(`button[data-lang="${currentLang}"]`) || buttons[0];

        // Force active class
        buttons.forEach(b => b.classList.remove('active'));
        activeBtn.classList.add('active');

        updateLens(activeBtn);
        updateTexts(currentLang);
    });

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.dataset.lang;
            currentLang = lang;
            localStorage.setItem('osaka_lang', lang);

            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            updateLens(btn);
            updateTexts(lang);
        });
    });
}

function updateTexts(lang) {
    if (!window.translations || !window.translations[lang]) return;
    const t = window.translations[lang];

    // Update simple elements with matching IDs or specific logic
    // Mapping ID to translation key
    const mapping = {
        'nav-home': 'nav_home',
        'nav-valorant': 'nav_valorant', // Assuming existence or fallback
        'nav-truckersmp': 'nav_truckersmp',
        'nav-download': 'nav_download',
        'welcome-title': 'welcome_title',
        'welcome-desc': 'welcome_desc',
        'analysis-title': 'analysis_title',
        'analysis-close': 'close',
    };

    for (const [id, key] of Object.entries(mapping)) {
        const el = document.getElementById(id);
        if (el && t[key]) el.textContent = t[key];
    }

    // Specific updates
    const input = document.querySelector('.search-box input');
    if (input && t.search_placeholder) input.placeholder = t.search_placeholder;

    const settingsLabel = document.querySelector('.settings-row .label'); // First label
    // More robust approach for settings needed if we want full translation
}

// --- 2. NAVBAR LENS ---
function initNavbarLens() {
    const navTrack = document.querySelector('.nav-track');
    if (!navTrack) return;

    const navLens = navTrack.querySelector('.nav-lens');
    const links = navTrack.querySelectorAll('a');

    function moveLens(el) {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const trackRect = navTrack.getBoundingClientRect();

        const left = rect.left - trackRect.left;
        const width = rect.width;

        navLens.style.opacity = '1';
        navLens.style.width = `${width}px`;
        navLens.style.transform = `translateX(${left}px)`;
    }

    // Initial position
    const activeLink = navTrack.querySelector('.active');
    if (activeLink) {
         // Wait for fonts for navbar too
         document.fonts.ready.then(() => moveLens(activeLink));
    }

    links.forEach(link => {
        link.addEventListener('mouseenter', () => moveLens(link));
    });

    navTrack.addEventListener('mouseleave', () => {
        const active = navTrack.querySelector('.active');
        if (active) moveLens(active);
        else navLens.style.opacity = '0';
    });
}

// --- 3. SETTINGS FAB & PANEL ---
function initSettings() {
    // Inject Panel HTML if not exists
    if (!document.querySelector('.settings-panel')) {
        const panelHTML = `
        <div class="settings-panel liquid-glass" id="settings-panel">
            <div class="settings-row">
                <div class="label">Tema</div>
                <div class="theme-segment">
                     <button class="theme-btn" data-theme="system">Sistem</button>
                     <button class="theme-btn" data-theme="light">Açık</button>
                     <button class="theme-btn" data-theme="dark">Koyu</button>
                     <button class="theme-btn" data-theme="amoled">Amoled</button>
                </div>
            </div>
            <div class="settings-row">
                <div class="label">Donanım Hızlandırma</div>
                <button id="gpu-toggle" class="toggle-btn">KAPALI</button>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', panelHTML);
    }

    const panel = document.querySelector('.settings-panel');
    const gpuBtn = document.getElementById('gpu-toggle');
    const themeBtns = document.querySelectorAll('.theme-btn');

    // FAB Click - Event Delegation (REQ 2)
    document.body.addEventListener('click', (e) => {
        // Check if clicked element or parent is FAB
        const fab = e.target.closest('#settings-fab');
        if (fab) {
            e.stopPropagation();
            panel.classList.toggle('open');
        } else {
            // Close if clicked outside
            if (panel.classList.contains('open') && !e.target.closest('.settings-panel')) {
                panel.classList.remove('open');
            }
        }
    });

    // Theme Logic
    themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.theme;
            setTheme(theme);
        });
    });

    // GPU Toggle
    if (gpuBtn) {
        const gpuEnabled = localStorage.getItem('osaka_gpu') === 'true';
        updateGpuState(gpuEnabled);

        gpuBtn.addEventListener('click', () => {
             const newState = !document.body.classList.contains('gpu-on');
             updateGpuState(newState);
        });
    }

    function updateGpuState(enabled) {
        if (enabled) {
            document.body.classList.add('gpu-on');
            gpuBtn.textContent = 'AÇIK';
            gpuBtn.style.color = 'var(--accent)';
            localStorage.setItem('osaka_gpu', 'true');
        } else {
            document.body.classList.remove('gpu-on');
            gpuBtn.textContent = 'KAPALI';
            gpuBtn.style.color = '#fff';
            localStorage.setItem('osaka_gpu', 'false');
        }
    }
}

function setTheme(theme) {
    document.body.classList.remove('theme-light', 'theme-dark', 'theme-amoled');

    // Reset active buttons
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.theme-btn[data-theme="${theme}"]`)?.classList.add('active');

    if (theme === 'system') {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.body.classList.add('theme-dark');
        } else {
            document.body.classList.add('theme-light');
        }
    } else {
        document.body.classList.add(`theme-${theme}`);
    }
    localStorage.setItem('osaka_theme', theme);
}

function applyStoredTheme() {
    const theme = localStorage.getItem('osaka_theme') || 'system';
    setTheme(theme);
}

// --- 4. SEARCH / DATA MOCK ---
function initSearch() {
    const input = document.querySelector('.search-box input');
    if (!input) return;

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const val = input.value.trim();
            if (!val) return;

            // Simple Parsing for ID (Mock)
            // Allow numbers as SteamID
            let steamid = val.match(/^\d+$/) ? val : '76561198027202111'; // Fallback for testing

            window.lastProfile = {
                steamid: steamid,
                name: val,
                avatar: 'https://avatars.akamai.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg' // Mock
            };

            showToast('Profil Bulundu: ' + val);

            // Show Profile Section
            const pSection = document.getElementById('profile-section');
            if (pSection) {
                pSection.style.display = 'flex';
                const nameEl = document.getElementById('profile-name');
                if (nameEl) nameEl.textContent = val;

                const avatarEl = document.getElementById('profile-avatar');
                if (avatarEl) {
                    avatarEl.src = window.lastProfile.avatar;
                    avatarEl.style.display = 'block';
                }

                // If on TruckersMP page, show the container
                const tmpContainer = document.getElementById('truckersmp-container');
                if (tmpContainer) tmpContainer.style.display = 'block';
            }

            // Hide welcome
            const welcome = document.getElementById('welcome-card');
            if (welcome) welcome.style.display = 'none';
        }
    });
}

function showToast(msg) {
    const toast = document.getElementById('osaka-toast');
    if (!toast) return;

    const msgEl = toast.querySelector('#toast-message');
    if (msgEl) msgEl.textContent = msg;

    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
