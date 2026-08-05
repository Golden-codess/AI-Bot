/*
  EXCHANGE.JS
*/

const GoldenappExchange = {
  init() {
    document.getElementById('exchangeBtn').addEventListener('click', () => this._submit());
    Goldenapp.onChange(() => this._render());
    this._render();
  },

  _render() {
    document.getElementById('rateValue').textContent =
      Math.round(Goldenapp.config.coinsPerStar).toLocaleString('uz-UZ') + ' 🪙';
    document.getElementById('exCoinBalance').textContent =
      GoldenappUI.fmt(Goldenapp.user.coin) + ' 🪙';
  },

  async _submit() {
    const input = document.getElementById('exchangeInput');
    const feedback = document.getElementById('exchangeFeedback');
    const stars = parseInt(input.value, 10);

    if (!stars || stars < 1) {
      feedback.className = 'feedback feedback--error';
      feedback.textContent = 'Iltimos, 1 yoki undan ko\'p Stars kiriting.';
      return;
    }

    // Mahalliy tekshiruv: yetarli coin bormi?
    const neededCoins = Math.round(stars * Goldenapp.config.coinsPerStar);
    if (Goldenapp.user.coin < neededCoins) {
      feedback.className = 'feedback feedback--error';
      feedback.textContent = `Sizda yetarli tanga yo'q. Kerak: ${neededCoins.toLocaleString('uz-UZ')} 🪙`;
      return;
    }

    const res = await GoldenappApi.exchange(stars);

    if (!res || res.success === false) {
      feedback.className = 'feedback feedback--error';
      feedback.textContent = (res && res.message) || 'Xatolik yuz berdi.';
      return;
    }

    feedback.className = 'feedback feedback--ok';
    feedback.textContent = res.message || 'Muvaffaqiyatli almashtirildi!';
    input.value = '';

    // Balansni yangilash (agar backend yangilangan qiymatlarni qaytarsa)
    if (res.coin_balance !== undefined) Goldenapp.user.coin = res.coin_balance;
    if (res.stars_balance !== undefined) Goldenapp.user.starsBalance = res.stars_balance;
    Goldenapp.notify();

    GoldenappAds.showInterstitial(() => {});
  },
};
