/*
  GAME.JS
  Tanga bosish va vizual effektlar. Har bosishda backendga "tap" so'rovi
  yuboriladi (api.php: action=tap), lekin animatsiya darhol, kutmasdan ishlaydi
  (optimistic UI) — internet sekin bo'lsa ham o'yin "qotib qolmaydi".
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
    // Backend har bosishda so'rov qabul qiladi (kinobot-uslubi kodda shunday
    // ishlagan); tez-tez bosilganda so'rovlar navbatga tushmaydi, oxirgi
    // holat serverda coin_balance += 1 orqali izchil yig'iladi.
    const res = await GoldenappApi.tap();
    if (res && res.success && typeof res.new_balance === 'number') {
      // Server bilan aniqlashtirish (drift bo'lsa tuzatadi)
      Goldenapp.user.coin = res.new_balance;
      Goldenapp.notify();
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
