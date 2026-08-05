/*
  API.JS
  Backend manzili: Cores.uz hostingdagi haqiqiy api.php.
*/

const GoldenappApi = {
  baseUrl: 'https://c4285.coresuz1.ru/Earnstars/api.php',

  _tgId() {
    return (Goldenapp.user && Goldenapp.user.telegramId) || null;
  },

  async _get(params) {
    const url = new URL(this.baseUrl);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    try {
      const res = await fetch(url.toString());
      return await res.json();
    } catch (e) {
      console.warn('[Api] GET xato:', e);
      return { success: false, error: e.message };
    }
  },

  async _post(payload) {
    try {
      const res = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (e) {
      console.warn('[Api] POST xato:', e);
      return { success: false, error: e.message };
    }
  },

  async loadUser() {
    const tgId = this._tgId();
    if (!tgId) return { success: false, error: 'No tg_id' };
    const data = await this._get({ action: 'getUser', tg_id: tgId });
    // Backend turli formatda javob qaytarishi mumkin
    if (data && data.success !== false) {
      // Agar ma'lumotlar to'g'ridan-to'g'ri data ichida bo'lsa
      if (data.coin_balance !== undefined) return data;
      // Agar 'user' obyekti ichida bo'lsa
      if (data.user) return data.user;
      // Agar 'balance' yoki 'coins' bo'lsa
      if (data.balance !== undefined) {
        return { coin_balance: data.balance, stars_balance: data.stars || 0, ads_watched: data.ads || 0 };
      }
    }
    return data; // fallback
  },

  async tap() {
    const tgId = this._tgId();
    if (!tgId) return { success: false };
    return this._post({ action: 'tap', tg_id: tgId });
  },

  async startChest() {
    const tgId = this._tgId();
    if (!tgId) return { success: false };
    return this._get({ action: 'startChest', tg_id: tgId });
  },

  async finishChest(sessionId, starsWon, adsWatched) {
    const tgId = this._tgId();
    if (!tgId) return { success: false };
    return this._post({
      action: 'finishChest', tg_id: tgId,
      session_id: sessionId, stars_won: starsWon, ads_watched: adsWatched,
    });
  },

  async confirmAd(source) {
    // Hozircha backendda maxsus endpoint yo'q, lekin saqlab qo'yamiz
    return { success: true, source };
  },

  async getTasks() {
    const tgId = this._tgId();
    if (!tgId) return [];
    const data = await this._get({ action: 'getTasks', tg_id: tgId });
    return Array.isArray(data) ? data : (data.tasks || []);
  },

  async completeTask(taskId) {
    const tgId = this._tgId();
    if (!tgId) return { success: false };
    return this._post({ action: 'completeTask', tg_id: tgId, task_id: taskId });
  },

  async exchange(stars) {
    const tgId = this._tgId();
    if (!tgId) return { success: false };
    return this._post({ action: 'exchange', tg_id: tgId, stars });
  },

  async withdraw(stars) {
    const tgId = this._tgId();
    if (!tgId) return { success: false };
    return this._post({ action: 'withdraw', tg_id: tgId, stars });
  },
};
