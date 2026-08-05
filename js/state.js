/*
  STATE.JS
*/

const TG = (() => {
  try {
    if (window.Telegram && window.Telegram.WebApp) {
      return window.Telegram.WebApp;
    }
  } catch (e) { }
  return null;
})();

const STORAGE_KEY = 'goldenapp_data';

const Goldenapp = {

  config: {
    starPriceUsd: 0.013,
    adRevenueUsd: 0.002,
    userSharePercent: 40,
    coinsPerAd: 300,

    get adsPerStar() {
      return this.starPriceUsd / (this.adRevenueUsd * (this.userSharePercent / 100));
    },
    get coinsPerStar() {
      return this.adsPerStar * this.coinsPerAd;
    },

    withdrawFixedAmounts: [15, 25],
    withdrawOpenRangeMin: 50,
  },

  user: {
    telegramId: null,
    firstName: 'Foydalanuvchi',
    username: null,
    coin: 0,
    adsWatched: 0,
    starsBalance: 0,
    dailyTasks: [],
    _dailyTaskDate: null,
  },

  listeners: [],

  // LocalStorage'ga saqlash
  save() {
    try {
      const data = {
        coin: this.user.coin,
        adsWatched: this.user.adsWatched,
        starsBalance: this.user.starsBalance,
        dailyTasks: this.user.dailyTasks,
        _dailyTaskDate: this.user._dailyTaskDate,
        firstName: this.user.firstName,
        telegramId: this.user.telegramId,
        username: this.user.username,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[Storage] Saqlash xatosi:', e);
    }
  },

  // LocalStorage'dan yuklash
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (data.coin !== undefined) this.user.coin = data.coin;
      if (data.adsWatched !== undefined) this.user.adsWatched = data.adsWatched;
      if (data.starsBalance !== undefined) this.user.starsBalance = data.starsBalance;
      if (data.dailyTasks) this.user.dailyTasks = data.dailyTasks;
      if (data._dailyTaskDate) this.user._dailyTaskDate = data._dailyTaskDate;
      if (data.firstName) this.user.firstName = data.firstName;
      if (data.telegramId) this.user.telegramId = data.telegramId;
      if (data.username) this.user.username = data.username;
      return true;
    } catch (e) {
      console.warn('[Storage] Yuklash xatosi:', e);
      return false;
    }
  },

  onChange(fn) { this.listeners.push(fn); },

  notify() {
    this.save(); // Har o'zgarishda saqlash
    this.listeners.forEach(fn => fn(this.user));
  },

  addCoin(amount) {
    this.user.coin += amount;
    this.notify();
  },

  spendCoin(amount) {
    if (this.user.coin < amount) return false;
    this.user.coin -= amount;
    this.notify();
    return true;
  },

  registerConfirmedAd(source) {
    this.user.adsWatched += 1;
    this.notify();
    GoldenappApi.confirmAd(source);
  },

  isValidWithdrawAmount(amount) {
    if (this.config.withdrawFixedAmounts.includes(amount)) return true;
    if (amount >= this.config.withdrawOpenRangeMin) return true;
    return false;
  },

  requiredAdsForStars(stars) {
    return Math.ceil(stars * this.config.adsPerStar);
  },
};
