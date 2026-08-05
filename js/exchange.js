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

    const res = await GoldenappApi.exchange(stars);

    if (!res || !res.success) {
      feedback.className = 'feedback feedback--error';
      feedback.textContent = (res && res.message) || 'Xatolik yuz berdi.';
      return;
    }

    feedback.className = 'feedback feedback--ok';
    feedback.textContent = res.message || 'Muvaffaqiyatli almashtirildi!';
    input.value = '';

    GoldenappAds.showInterstitial(() => {});
  },
};
