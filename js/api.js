/*
  API.JS
  Backend manzili: Cores.uz hostingdagi haqiqiy api.php.
  DIQQAT: bu manzil sizning haqiqiy backend joylashuvingiz — o'zgartirmang,
  faqat backend domeni/papkasi o'zgarsa shu yerda yangilanadi.
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
      return { success: false };
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
      return { success: false };
    }
  },

  async loadUser() {
    const tgId = this._tgId();
    if (!tgId) return { success: false };
    return this._get({ action: 'getUser', tg_id: tgId });
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
    // Hozirgi backendda alohida "confirmAd" endpoint yo'q — kerak bo'lganda
    // shu yerga qo'shiladi. Hozircha reklama tasdiqlanishi tap/task/chest
    // oqimlari ichida hisoblanadi.
    return { success: true, source };
  },

  async getTasks() {
    const tgId = this._tgId();
    if (!tgId) return [];
    return this._get({ action: 'getTasks', tg_id: tgId });
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
