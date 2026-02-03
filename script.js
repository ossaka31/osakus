// script.js - Central Logic for Osaka Project
// Handles Settings, Navigation, Search, and Global State

// Global State for other modules (e.g. truckersmp.js)
window.lastProfile = null;

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. GLOBAL VARIABLES & SETUP ---
    const body = document.body;
    const settingsFab = document.getElementById('settings-fab');
    const settingsPanel = document.querySelector('.settings-panel');
    const gpuToggle = document.getElementById('gpu-toggle');

    // --- 2. THEME & GPU LOGIC ---

    // Initialize Theme
    const initTheme = () => {
        const savedTheme = localStorage.getItem('osaka_theme') || 'system';
        applyTheme(savedTheme);

        // Update active button state
        const themeBtns = document.querySelectorAll('.theme-btn');
        themeBtns.forEach(btn => {
            if(btn.dataset.theme === savedTheme) btn.classList.add('active');
            else btn.classList.remove('active');

            btn.addEventListener('click', () => {
                themeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                applyTheme(btn.dataset.theme);
            });
        });
    };

    const applyTheme = (theme) => {
        localStorage.setItem('osaka_theme', theme);
        body.classList.remove('theme-light', 'theme-dark', 'theme-amoled');

        if (theme === 'system') {
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
                body.classList.add('theme-light');
            } else {
                body.classList.add('theme-dark'); // Default to dark for system
            }
        } else {
            body.classList.add(`theme-${theme}`);
        }
    };

    // Initialize GPU
    const initGPU = () => {
        const savedGPU = localStorage.getItem('osaka_gpu') === 'true';
        if (savedGPU) body.classList.add('gpu-on');

        if (gpuToggle) {
            gpuToggle.innerText = savedGPU ? (window.translations?.[window.__osaka_preferred_lang]?.gpu_on_label || 'Açık') : (window.translations?.[window.__osaka_preferred_lang]?.gpu_off_label || 'Kapalı');

            gpuToggle.addEventListener('click', () => {
                const isOn = body.classList.toggle('gpu-on');
                localStorage.setItem('osaka_gpu', isOn);
                gpuToggle.innerText = isOn ? (window.translations?.[window.__osaka_preferred_lang]?.gpu_on_label || 'Açık') : (window.translations?.[window.__osaka_preferred_lang]?.gpu_off_label || 'Kapalı');
            });
        }
    };

    initTheme();
    initGPU();

    // --- 3. SETTINGS FAB DELEGATION ---
    // Req: Event delegation for Settings FAB
    document.body.addEventListener('click', (e) => {
        const fab = e.target.closest('#settings-fab');

        // Toggle Panel
        if (fab) {
            e.stopPropagation();
            if (settingsPanel) {
                settingsPanel.classList.toggle('open');
            }
        }

        // Close if clicked outside
        if (settingsPanel && settingsPanel.classList.contains('open')) {
            if (!e.target.closest('.settings-panel') && !fab) {
                settingsPanel.classList.remove('open');
            }
        }
    });

    // --- 4. LANGUAGE SELECTOR (RACE CONDITION FIX) ---
    const initLangSelector = () => {
        const langTrack = document.querySelector('.lang-track');
        if (!langTrack) return;

        const lens = langTrack.querySelector('.lang-lens');
        const buttons = langTrack.querySelectorAll('button');

        const updateLens = () => {
            const activeBtn = langTrack.querySelector('button.active');
            if (activeBtn && lens) {
                lens.style.width = `${activeBtn.offsetWidth}px`;
                lens.style.transform = `translateX(${activeBtn.offsetLeft}px)`;
            }
        };

        // Req: Wait for fonts to be ready
        document.fonts.ready.then(() => {
            updateLens();
            // Also update on resize
            window.addEventListener('resize', updateLens);
        });

        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update Lens
                updateLens();

                // Save Preference & Reload/Update
                const lang = btn.dataset.lang;
                localStorage.setItem('osaka_lang', lang);
                document.documentElement.setAttribute('lang', lang);

                // Simple reload to apply translations effectively or just reload page
                location.reload();
            });
        });

        // Set initial active state
        const currentLang = localStorage.getItem('osaka_lang') || 'tr';
        const activeBtn = langTrack.querySelector(`button[data-lang="${currentLang}"]`);
        if (activeBtn) {
             buttons.forEach(b => b.classList.remove('active'));
             activeBtn.classList.add('active');
        }

        // Immediate update try, then font-ready will fix it
        updateLens();
    };
    initLangSelector();

    // --- 5. NAVBAR LENS SYSTEM ---
    const initNavLens = () => {
        const navTrack = document.querySelector('.nav-track');
        if (!navTrack) return;

        const lens = navTrack.querySelector('.nav-lens');
        const links = navTrack.querySelectorAll('a');
        const activeLink = navTrack.querySelector('a.active');

        const moveLens = (target) => {
            if (!target || !lens) return;
            lens.style.opacity = '1';
            lens.style.width = `${target.offsetWidth}px`;
            lens.style.transform = `translateX(${target.offsetLeft}px)`;
        };

        links.forEach(link => {
            link.addEventListener('mouseenter', () => moveLens(link));
        });

        navTrack.addEventListener('mouseleave', () => {
            if (activeLink) {
                moveLens(activeLink);
            } else {
                if(lens) lens.style.opacity = '0';
            }
        });

        // Initialize position
        document.fonts.ready.then(() => {
            if (activeLink) moveLens(activeLink);
            window.addEventListener('resize', () => {
                const currentActive = navTrack.querySelector('a.active');
                if(currentActive) moveLens(currentActive);
            });
        });
    };
    initNavLens();

    // --- 6. SEARCH & PROFILE LOGIC ---
    const searchInput = document.querySelector('.search-box input');

    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const val = searchInput.value.trim();
                if (val) {
                    window.lastProfile = { steamid: val, id: val, name: val }; // Populate global

                    // UI Toggle
                    const welcomeCard = document.getElementById('welcome-card');
                    const profileSection = document.getElementById('profile-section');

                    if (welcomeCard) welcomeCard.style.display = 'none';
                    if (profileSection) {
                        profileSection.style.display = 'flex';
                        const pName = document.getElementById('profile-name');
                        if(pName) pName.innerText = val;

                        // Show TruckersMP Container if exists
                        const tmpContainer = document.getElementById('truckersmp-container');
                        if(tmpContainer) tmpContainer.style.display = 'block';

                         // Update TruckersMP avatar/name placeholder if specific page
                        const pAvatar = document.getElementById('profile-avatar');
                        if(pAvatar) {
                            pAvatar.style.display = 'block';
                            // Placeholder avatar
                            pAvatar.src = 'https://ui-avatars.com/api/?name=' + val + '&background=random';
                        }
                    }

                    // Trigger custom event if needed for other scripts
                    window.dispatchEvent(new CustomEvent('osaka-search', { detail: val }));
                }
            }
        });
    }
});
