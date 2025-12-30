// truckersmp.js - TruckersMP Integration Module
// Strict compliance with API rules: No abuse, rate-limiting, manual-only trigger.

const TruckersMP = {
    BASE_URL: 'https://api.truckersmp.com/v2/player/',
    CACHE_KEY_PREFIX: 'tmp_cache_',
    CACHE_DURATION: 60 * 1000, // 60 seconds (Rule: 30-60s)
    DEBOUNCE_TIME: 10000, // 10 seconds (Rule: 5-10s)
    lastFetchTime: 0,

    /**
     * Fetches player data from TruckersMP public API.
     * @param {string|number} steamID - The Steam64 ID of the user.
     * @returns {Promise<Object>} - The player data or error object.
     */
    async getPlayer(steamID) {
        if (!steamID) return { error: 'Steam ID gerekli.' };

        // 1. Debounce Check
        const now = Date.now();
        if (now - this.lastFetchTime < this.DEBOUNCE_TIME) {
             const remaining = Math.ceil((this.DEBOUNCE_TIME - (now - this.lastFetchTime)) / 1000);
             return { error: `Lütfen ${remaining} saniye bekleyin.` };
        }

        // 2. Cache Check (Client-side in-memory/sessionStorage)
        const cached = this.getFromCache(steamID);
        if (cached) {
            console.log('[TruckersMP] Serving from cache');
            return cached;
        }

        // 3. Manual Fetch
        this.lastFetchTime = Date.now();
        try {
            // Using Public API, No Auth required.
            const response = await fetch(`${this.BASE_URL}${steamID}`, {
                method: 'GET',
                mode: 'cors'
            });

            if (response.status === 404) {
                 return { error: 'Kullanıcı TruckersMP\'de bulunamadı.' };
            }
            
            if (response.status === 429) {
                return { error: 'Çok fazla istek. Lütfen daha sonra deneyin.' };
            }

            if (!response.ok) {
                return { error: 'TruckersMP verileri şu anda alınamıyor.' };
            }

            const data = await response.json();
            
            if (data.error) {
                 return { error: data.response || 'Bir hata oluştu.' };
            }

            // 4. Save to Cache
            this.saveToCache(steamID, data.response);
            return data.response;

        } catch (e) {
            console.error('[TruckersMP] Network Error:', e);
            return { error: 'Bağlantı hatası veya servis erişilemez durumda.' };
        }
    },

    getFromCache(steamID) {
        try {
            const record = sessionStorage.getItem(this.CACHE_KEY_PREFIX + steamID);
            if (!record) return null;
            const parsed = JSON.parse(record);
            if (Date.now() - parsed.timestamp < this.CACHE_DURATION) {
                return parsed.data;
            }
            // Expired
            sessionStorage.removeItem(this.CACHE_KEY_PREFIX + steamID);
            return null;
        } catch (e) {
            return null;
        }
    },

    saveToCache(steamID, data) {
        try {
            const record = {
                timestamp: Date.now(),
                data: data
            };
            sessionStorage.setItem(this.CACHE_KEY_PREFIX + steamID, JSON.stringify(record));
        } catch (e) {}
    },

    // UI Helper to render the card
    renderCard(data, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = ''; // Clear previous

        if (data.error) {
            container.innerHTML = `
                <div style="margin-top: 10px; padding: 10px; background: rgba(255, 68, 68, 0.1); border: 1px solid rgba(255, 68, 68, 0.3); border-radius: 8px; color: #ff8888; font-size: 0.9rem; text-align: center;">
                    <i class="fa-solid fa-triangle-exclamation"></i> ${data.error}
                </div>
            `;
            return;
        }

        const bannedClass = data.banned ? 'color: #ff4444;' : 'color: #4caf50;';
        const bannedText = data.banned ? `YASAKLI (Bitiş: ${data.bannedUntil ? data.bannedUntil : 'Sınırsız'})` : 'Yasak Yok';
        const groupName = data.groupName || 'Oyuncu';
        const joinDate = data.joinDate ? data.joinDate.split(' ')[0] : '-';

        container.innerHTML = `
            <div class="truckersmp-card liquid-glass" style="margin-top: 15px; padding: 15px; background: rgba(0,0,0,0.2); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); text-align: left;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                    <img src="${data.avatar}" alt="TMP Avatar" style="width: 48px; height: 48px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.1);">
                    <div>
                        <div style="font-weight: 800; color: #fff; font-size: 1.1rem;">${data.name}</div>
                        <div style="font-size: 0.8rem; color: #aaa;">ID: ${data.id}</div>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.9rem;">
                    <div><span style="color: #888;">Durum:</span> <br><span style="font-weight: bold; ${bannedClass}">${bannedText}</span></div>
                    <div><span style="color: #888;">Grup:</span> <br><span style="color: #fff;">${groupName}</span></div>
                    <div><span style="color: #888;">Kayıt:</span> <br><span style="color: #fff;">${joinDate}</span></div>
                </div>
            </div>
        `;
    }
};

// Expose to window
window.TruckersMP = TruckersMP;

// Initialize Event Listener
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btn-truckersmp');
    if(btn) {
        btn.addEventListener('click', async () => {
             // Access global lastProfile from script.js
             if (typeof lastProfile === 'undefined' || !lastProfile || !lastProfile.steamid) {
                 alert('Önce bir Steam profili aramalısınız.');
                 return;
             }
             
             btn.disabled = true;
             const originalText = btn.innerHTML;
             btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yükleniyor...';
             
             const data = await TruckersMP.getPlayer(lastProfile.steamid);
             TruckersMP.renderCard(data, 'truckersmp-result');
             
             btn.innerHTML = originalText;
             btn.disabled = false;
        });
    }
});
