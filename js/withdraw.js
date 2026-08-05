/*
  WITHDRAW.JS
*/

const GoldenappWithdraw = {
  selected: null,

  init() {
    document.querySelectorAll('#withdrawChips .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#withdrawChips .chip').forEach(c => c.classList.remove('chip--active'));
        chip.classList.add('chip--active');
        this.selected = parseInt(chip.dataset.amount, 10);
        document.getElementById('withdrawCustom').value = '';
        this._render();
      });
    });

    document.getElementById('withdrawCustom').addEventListener('input', (e) => {
      document.querySelectorAll('#withdrawChips .chip').forEach(c => c.classList.remove('chip--active'));
      this.selected = parseInt(e.target.value, 10) || null;
      this._render();
    });

    document.getElementById('withdrawBtn').addEventListener('click', () => this._submit());

    Goldenapp.onChange(() => this._render());
    this._render();
  },

  _render() {
    const amount = this.selected || Goldenapp.config.withdrawFixedAmounts[0];
    const requiredAds = Goldenapp.requiredAdsForStars(amount);

    document.getElementById('wdStarsLine').textContent =
      `${Goldenapp.user.starsBalance.toFixed(2)} / ${amount}`;
    document.getElementById('wdAdsLine').textContent =
      `${Goldenapp.user.adsWatched} / ${requiredAds}`;

    const valid = this.selected && Goldenapp.isValidWithdrawAmount(this.selected)
      && Goldenapp.user.starsBalance >= this.selected;
    document.getElementById('withdrawBtn').disabled = !valid;
  },

  async _submit() {
    const feedback = document.getElementById('withdrawFeedback');
    const amount = this.selected;

    if (!amount || !Goldenapp.isValidWithdrawAmount(amount)) {
      feedback.className = 'feedback feedback--error';
      feedback.textContent = 'Miqdor faqat 15, 25 yoki 50 va undan yuqori bo\'lishi mumkin.';
      return;
    }

    // Mahalliy tekshiruv
    if (Goldenapp.user.starsBalance < amount) {
      feedback.className = 'feedback feedback--error';
      feedback.textContent = `Sizda yetarli Stars yo'q. Balans: ${Goldenapp.user.starsBalance.toFixed(2)} ⭐`;
      return;
    }
    const requiredAds = Goldenapp.requiredAdsForStars(amount);
    if (Goldenapp.user.adsWatched < requiredAds) {
      feedback.className = 'feedback feedback--error';
      feedback.textContent = `Yetarli reklama ko'rilmagan. Kerak: ${requiredAds} ta, sizda: ${Goldenapp.user.adsWatched}`;
      return;
    }

    const res = await GoldenappApi.withdraw(amount);

    if (!res || res.success === false) {
      feedback.className = 'feedback feedback--error';
      feedback.textContent = (res && res.message) || 'So\'rov yuborilmadi.';
      return;
    }

    feedback.className = 'feedback feedback--ok';
    feedback.textContent = res.message || 'So\'rov qabul qilindi!';

    // Balansni yangilash
    if (res.stars_balance !== undefined) Goldenapp.user.starsBalance = res.stars_balance;
    Goldenapp.notify();

    GoldenappAds.showInterstitial(() => {});
  },
};
