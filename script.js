// script.js - Main Logic Module
// Handles Navbar, Settings, Language, Theme, and Search logic.

(function() {
    'use strict';

    // Global State
    window.lastProfile = null; // Required for truckersmp.js

    // --- 1. LANGUAGE SELECTOR (CRITICAL FIX: RACE CONDITION) ---
    async function initLangSelector() {
        // Fix Race Condition: Wait for fonts to load before calculating layout
        await document.fonts.ready;

        const buttons = document.querySelectorAll('.lang-track button');
        const track = document.querySelector('.lang-track');
        const lens = document.querySelector('.lang-lens');

        if (!track || !lens) return;

        function updateLens(targetBtn) {
            if (!targetBtn) return;

            // Calculate position relative to track
            const trackRect = track.getBoundingClientRect();
            const btnRect = targetBtn.getBoundingClientRect();

            const left = btnRect.left - trackRect.left;
            const width = btnRect.width;

            // Apply to lens
            lens.style.transform = `translateX(${left}px)`;
            lens.style.width = `${width}px`;

            // Update active state
            buttons.forEach(btn => btn.classList.remove('active'));
            targetBtn.classList.add('active');

            // Trigger visual update (color is handled by CSS)
        }

        function setLanguage(lang) {
            localStorage.setItem('osaka_lang', lang);
            document.documentElement.setAttribute('lang', lang);
            window.__osaka_preferred_lang = lang;

            // Update UI texts from translations.js if available
            if (window.translations && window.translations[lang]) {
                const t = window.translations[lang];

                // Navbar
                setTxt('nav-home', t.nav_home);
                setTxt('nav-download', t.nav_download);

                // Search placeholder
                const searchInput = document.querySelector('.search-box input');
                if (searchInput) searchInput.placeholder = t.search_placeholder || '...';

                // Welcome texts
                setTxt('welcome-title', t.welcome_title || t.valorant_welcome_title || t.truckersmp_welcome_title);
                setTxt('welcome-desc', t.welcome_desc || t.valorant_welcome_desc || t.truckersmp_welcome_desc);

                // Settings
                setTxt('settings-title', t.settings_title);
                setTxt('settings-gpu', t.settings_gpu);
                setTxt('settings-theme', t.settings_theme);
                setTxt('lbl-gpu-on', t.gpu_on_label);
                setTxt('lbl-gpu-off', t.gpu_off_label);
            }
        }

        function setTxt(id, text) {
            const el = document.getElementById(id);
            if (el && text) el.textContent = text;
        }

        // Event Listeners
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const lang = btn.dataset.lang;
                setLanguage(lang);
                updateLens(btn);
            });
        });

        // Initialize
        const currentLang = localStorage.getItem('osaka_lang') || 'tr';
        const activeBtn = document.querySelector(`.lang-track button[data-lang="${currentLang}"]`) || buttons[0];
        setLanguage(currentLang);
        // Small delay to ensure layout is stable even after fonts.ready
        setTimeout(() => updateLens(activeBtn), 50);

        // Handle Resize
        window.addEventListener('resize', () => {
             const curr = document.querySelector('.lang-track button.active');
             if (curr) updateLens(curr);
        });
    }

    // --- 2. SETTINGS FAB (CRITICAL FIX: EVENT DELEGATION) ---
    function initSettings() {
        // Event Delegation on Body
        document.body.addEventListener('click', (e) => {
            const fab = e.target.closest('#settings-fab');
            const panel = document.querySelector('.settings-panel');

            if (fab) {
                // Toggle Panel
                if (panel) {
                    panel.classList.toggle('open');
                }
                return;
            }

            // Close if clicking outside
            if (panel && panel.classList.contains('open')) {
                if (!e.target.closest('.settings-panel')) {
                    panel.classList.remove('open');
                }
            }
        });

        // GPU Toggle
        const gpuBtn = document.querySelector('.gpu-toggle');
        if (gpuBtn) {
            gpuBtn.addEventListener('click', () => {
                document.body.classList.toggle('gpu-on');
                const isOn = document.body.classList.contains('gpu-on');
                localStorage.setItem('osaka_gpu', isOn ? 'true' : 'false');
                showToast(isOn ? 'Donanım Hızlandırma Açık' : 'Donanım Hızlandırma Kapalı');
            });

            // Load GPU State
            if (localStorage.getItem('osaka_gpu') === 'true') {
                document.body.classList.add('gpu-on');
            }
        }

        // Theme Toggles
        const themeBtns = document.querySelectorAll('.theme-btn');
        themeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const theme = btn.dataset.theme;
                setTheme(theme);
            });
        });

        // Load Theme
        const savedTheme = localStorage.getItem('osaka_theme') || 'system';
        setTheme(savedTheme);
    }

    function setTheme(theme) {
        document.body.classList.remove('theme-light', 'theme-dark', 'theme-amoled');
        const themeBtns = document.querySelectorAll('.theme-btn');
        themeBtns.forEach(b => b.classList.remove('active'));

        const targetBtn = document.querySelector(`.theme-btn[data-theme="${theme}"]`);
        if (targetBtn) targetBtn.classList.add('active');

        localStorage.setItem('osaka_theme', theme);

        if (theme === 'system') {
             if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
                 document.body.classList.add('theme-light');
             } else {
                 document.body.classList.add('theme-dark');
             }
        } else {
            document.body.classList.add(`theme-${theme}`);
        }
    }

    // --- 3. NAVBAR LENS (CRITICAL FIX: SKELETON CONSISTENCY) ---
    function initNavbar() {
        const track = document.querySelector('.nav-track');
        const lens = document.querySelector('.nav-lens');
        const links = document.querySelectorAll('.nav-track a');

        if (!track || !lens) return;

        function moveLens(target) {
            if (!target) return;
            const trackRect = track.getBoundingClientRect();
            const targetRect = target.getBoundingClientRect();

            const left = targetRect.left - trackRect.left;
            const width = targetRect.width;

            lens.style.width = `${width}px`;
            lens.style.transform = `translateX(${left}px)`;
            lens.style.opacity = '1';
        }

        const activeLink = document.querySelector('.nav-track a.active');

        // Initial Position
        if (activeLink) {
             // Wait a tick for layout
             setTimeout(() => moveLens(activeLink), 50);
        } else {
            lens.style.opacity = '0';
        }

        // Hover Effects
        links.forEach(link => {
            link.addEventListener('mouseenter', () => moveLens(link));
        });

        track.addEventListener('mouseleave', () => {
            const currentActive = document.querySelector('.nav-track a.active');
            if (currentActive) {
                moveLens(currentActive);
            } else {
                lens.style.opacity = '0';
            }
        });

        // Window Resize
        window.addEventListener('resize', () => {
             const currentActive = document.querySelector('.nav-track a.active');
             if (currentActive) moveLens(currentActive);
        });
    }

    // --- 4. SEARCH & PROFILE (DEPENDENCY SUPPORT) ---
    function initSearch() {
        const searchInput = document.querySelector('.search-box input');

        if (searchInput) {
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const query = searchInput.value.trim();
                    if (!query) return;

                    // Mock Profile Data for Demo/TruckersMP
                    window.lastProfile = {
                        steamid: query.match(/^\d+$/) ? query : '76561198027202565', // fallback/mock
                        name: query,
                        avatar: 'https://via.placeholder.com/150'
                    };

                    showToast('Profil aranıyor: ' + query);

                    // Simulate Loading
                    const profileSection = document.getElementById('profile-section');
                    const welcomeCard = document.getElementById('welcome-card');
                    const profileName = document.getElementById('profile-name');

                    if (welcomeCard) welcomeCard.style.display = 'none';
                    if (profileSection) {
                        profileSection.style.display = 'flex';
                        if (profileName) profileName.textContent = query;

                        // Show TruckersMP button if exists
                        const tmpContainer = document.getElementById('truckersmp-container');
                        if (tmpContainer) tmpContainer.style.display = 'block';
                    }

                    // If on TruckersMP page, show avatar
                    const avatar = document.getElementById('profile-avatar');
                    if(avatar) {
                        avatar.src = 'https://ui-avatars.com/api/?name=' + query;
                        avatar.style.display = 'block';
                    }
                }
            });
        }
    }

    // --- 5. TOAST NOTIFICATION ---
    function showToast(msg) {
        const toast = document.getElementById('osaka-toast');
        const msgEl = document.getElementById('toast-message');
        if (!toast || !msgEl) return;

        msgEl.textContent = msg;
        toast.classList.add('show');
        toast.style.visibility = 'visible'; // Force visibility
        toast.style.opacity = '1';

        setTimeout(() => {
            toast.classList.remove('show');
            toast.style.opacity = '0';
            setTimeout(() => toast.style.visibility = 'hidden', 300);
        }, 3000);
    }

    // Expose toast globally
    window.showToast = showToast;

    // --- INITIALIZATION ---
    document.addEventListener('DOMContentLoaded', () => {
        initLangSelector();
        initSettings();
        initNavbar();
        initSearch();
    });

})();
