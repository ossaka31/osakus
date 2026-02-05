// script.js - Core Logic for Osaka Project
// Handles Theme, Language, Navbar Lens, Settings, and Search Logic

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNavbarLens();
    initLangSelector();
    initSettingsPanel();
    initSearch();

    // Global Event Delegation for dynamic elements
    document.body.addEventListener('click', (e) => {
        // Handle Settings FAB Click via Delegation (Requirement 2)
        if (e.target.closest('#settings-fab')) {
            toggleSettings();
        }

        // Handle PDF Button (if exists)
        if (e.target.closest('#pdf-btn')) {
            // Placeholder for PDF logic
            alert('PDF İndirme özelliği hazırlanıyor...');
        }
    });
});

/* --- 1. THEME MANAGER --- */
function initTheme() {
    const savedTheme = localStorage.getItem('osaka_theme') || 'theme-dark';
    document.body.className = savedTheme; // Reset and set

    // If GPU was on, restore it (independent of theme)
    if (localStorage.getItem('osaka_gpu') === 'true') {
        document.body.classList.add('gpu-on');
    }

    // Update Settings Panel UI if it exists
    updateThemeUI(savedTheme);
}

function setTheme(themeName) {
    // Remove existing themes
    document.body.classList.remove('theme-light', 'theme-dark', 'theme-amoled');
    document.body.classList.add(themeName);
    localStorage.setItem('osaka_theme', themeName);
    updateThemeUI(themeName);
}

function updateThemeUI(activeTheme) {
    const btns = document.querySelectorAll('.theme-btn');
    btns.forEach(btn => {
        if (btn.dataset.theme === activeTheme) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function toggleGPU() {
    document.body.classList.toggle('gpu-on');
    const isOnt = document.body.classList.contains('gpu-on');
    localStorage.setItem('osaka_gpu', isOnt);

    const gpuBtn = document.getElementById('gpu-toggle-btn');
    if (gpuBtn) gpuBtn.innerText = isOnt ? 'AÇIK' : 'KAPALI';
}

/* --- 2. NAVBAR LENS SYSTEM --- */
function initNavbarLens() {
    const track = document.querySelector('.nav-track');
    const lens = document.querySelector('.nav-lens');
    if (!track || !lens) return;

    function moveLens(target) {
        if (!target) return;
        // Calculate relative position
        const trackRect = track.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();

        const left = targetRect.left - trackRect.left;
        const width = targetRect.width;

        lens.style.width = `${width}px`;
        lens.style.transform = `translateX(${left}px)`;
        lens.style.opacity = '1';
    }

    const links = track.querySelectorAll('a');
    const activeLink = track.querySelector('a.active');

    // Initial Position
    if (activeLink) {
        // Wait a tick for layout
        setTimeout(() => moveLens(activeLink), 50);
    }

    links.forEach(link => {
        link.addEventListener('mouseenter', () => moveLens(link));
    });

    track.addEventListener('mouseleave', () => {
        if (activeLink) moveLens(activeLink);
        else lens.style.opacity = '0';
    });
}

/* --- 3. LANGUAGE SELECTOR (Requirement 3) --- */
function initLangSelector() {
    const track = document.querySelector('.lang-track');
    const lens = document.querySelector('.lang-lens');
    if (!track || !lens) return;

    function updateLens() {
        const activeBtn = track.querySelector('button.active') || track.querySelector('button[data-lang="tr"]');
        if (!activeBtn) return;

        // Ensure font is loaded before calculating (Req 3: Race Condition Fix)
        const left = activeBtn.offsetLeft;
        const width = activeBtn.offsetWidth;

        lens.style.transform = `translateX(${left}px)`;
        lens.style.width = `${width}px`;
    }

    // Wait for fonts to be ready (Critical Fix)
    document.fonts.ready.then(() => {
        updateLens();
        // Run again after a short delay to ensure rendering is settled
        setTimeout(updateLens, 100);
    });

    // Handle Clicks
    track.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            track.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const lang = btn.dataset.lang;
            localStorage.setItem('osaka_lang', lang);
            document.documentElement.setAttribute('lang', lang);
            window.__osaka_preferred_lang = lang; // Global state

            updateLens();
            // In a real app, this would trigger translation updates
            if (typeof updateTranslations === 'function') updateTranslations();
        });
    });

    // Set initial active state based on localStorage
    const savedLang = localStorage.getItem('osaka_lang') || 'tr';
    const initialBtn = track.querySelector(`button[data-lang="${savedLang}"]`);
    if (initialBtn) {
        track.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        initialBtn.classList.add('active');
    }
}

/* --- 4. SETTINGS PANEL --- */
function initSettingsPanel() {
    // Create the panel HTML dynamically if it doesn't exist to ensure consistency?
    // Or assume it exists in HTML. The requirements imply HTML fixes, so likely it's in HTML.
    // However, for safety, I will rely on the HTML structure being correct.

    // Bind Theme Buttons
    const themeBtns = document.querySelectorAll('.theme-btn');
    themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            setTheme(btn.dataset.theme);
        });
    });

    // Bind GPU Toggle
    const gpuBtn = document.getElementById('gpu-toggle-btn');
    if (gpuBtn) {
        gpuBtn.addEventListener('click', toggleGPU);
        // Set initial text
        gpuBtn.innerText = document.body.classList.contains('gpu-on') ? 'AÇIK' : 'KAPALI';
    }
}

function toggleSettings() {
    const panel = document.querySelector('.settings-panel');
    if (panel) {
        panel.classList.toggle('open');
    } else {
        createSettingsPanel(); // Fallback if missing
    }
}

function createSettingsPanel() {
    const panel = document.createElement('div');
    panel.className = 'settings-panel liquid-glass';
    panel.innerHTML = `
        <div class="settings-row">
            <span class="label">Tema</span>
            <div class="theme-segment">
                <button class="theme-btn" data-theme="theme-light">Light</button>
                <button class="theme-btn" data-theme="theme-dark">Dark</button>
                <button class="theme-btn" data-theme="theme-amoled">Amoled</button>
            </div>
        </div>
        <div class="settings-row">
            <span class="label">Donanım Hızlandırma</span>
            <button id="gpu-toggle-btn" class="toggle-btn">KAPALI</button>
        </div>
    `;
    document.body.appendChild(panel);

    // Re-bind
    initSettingsPanel();

    // Open immediately
    setTimeout(() => panel.classList.add('open'), 10);
}

/* --- 5. SEARCH & PROFILE LOGIC --- */
function initSearch() {
    const searchInputs = document.querySelectorAll('.search-box input');

    searchInputs.forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const val = input.value.trim();
                if (val) {
                    performSearch(val);
                }
            }
        });
    });
}

function performSearch(query) {
    console.log('Searching for:', query);

    // 1. Set Global State (Critical for truckersmp.js)
    window.lastProfile = {
        steamid: query, // Assuming input is SteamID for now
        name: "Kullanıcı", // Mock data
        avatar: "https://via.placeholder.com/80"
    };

    // 2. Update UI
    const welcome = document.getElementById('welcome-card');
    const profile = document.getElementById('profile-section');
    const grid = document.getElementById('dashboard-grid');
    const toast = document.getElementById('osaka-toast');

    if (welcome) welcome.style.display = 'none';
    if (profile) {
        profile.style.display = 'flex';
        // Update Mock Profile Data
        const nameEl = document.getElementById('profile-name');
        const idEl = document.getElementById('profile-id') || document.getElementById('profile-tag');
        if (nameEl) nameEl.innerText = window.lastProfile.name;
        if (idEl) idEl.innerText = window.lastProfile.steamid;
    }

    // Show Toast
    if (toast) {
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // 3. Clear Grid (Reset)
    if (grid) grid.innerHTML = '';

    // 4. Trigger specific page logic if needed
    // (Actual API calls would happen here)
}
