/*
  GAME.JS
*/

const GoldenappGame = {
  _pendingSync: 0,

  init() {
    document.getElementById('coinBtn').addEventListener('click', (e) => this._onTap(e));
    Goldenapp.onChange(() => this._render());
    this._render();
  },

  _onTap(e) {
    Goldenapp.addCoin(1);
    this._spawnNumber();
    this._spawnSparks();
    this._syncTap();
  },

  async _syncTap() {
    const res = await GoldenappApi.tap();
    if (res && res.success !== false) {
      let newBal = res.new_balance ?? res.coin_balance ?? res.balance ?? res.coins;
      if (typeof newBal === 'number') {
        Goldenapp.user.coin = newBal;
        Goldenapp.notify();
      }
    }
  },

  _spawnNumber() {
    const layer = document.getElementById('fxLayer');
    const el = document.createElement('span');
    el.className = 'fx-num';
    el.textContent = '+1';
    el.style.left = (48 + Math.random() * 8) + '%';
    el.style.top = '42%';
    layer.appendChild(el);
    setTimeout(() => el.remove(), 900);
  },

  _spawnSparks() {
    const layer = document.getElementById('fxLayer');
    for (let i = 0; i < 5; i++) {
      const s = document.createElement('span');
      s.className = 'fx-spark';
      const angle = Math.random() * Math.PI * 2;
      const dist = 34 + Math.random() * 26;
      s.style.setProperty('--sx', Math.cos(angle) * dist + 'px');
      s.style.setProperty('--sy', Math.sin(angle) * dist + 'px');
      s.style.left = '50%';
      s.style.top = '48%';
      layer.appendChild(s);
      setTimeout(() => s.remove(), 600);
    }
  },

  _render() {
    document.getElementById('hudCoin').textContent = GoldenappUI.fmt(Goldenapp.user.coin);
    document.getElementById('hudStars').textContent = Goldenapp.user.starsBalance.toFixed(2);
    document.getElementById('hudAds').textContent = Goldenapp.user.adsWatched;
  },
};
