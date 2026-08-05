/*
  STATE.JS
  MUHIM: window.Telegram har doim ham mavjud bo'lmasligi mumkin (masalan
  test paytida oddiy brauzerda ochilganda). Shuning uchun BUTUN ilova
  davomida window.Telegram.WebApp ga to'g'ridan-to'g'ri murojaat qilinmaydi —
  faqat quyidagi TG obyekti orqali, xavfsiz tekshirish bilan.
*/

const TG = (() => {
  try {
    if (window.Telegram && window.Telegram.WebApp) {
      return window.Telegram.WebApp;
    }
  } catch (e) { /* jim, fallback quyida */ }
  return null; // Telegram tashqarisida ochilgan bo'lsa
})();

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
  onChange(fn) { this.listeners.push(fn); },
  notify() { this.listeners.forEach(fn => fn(this.user)); },

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
