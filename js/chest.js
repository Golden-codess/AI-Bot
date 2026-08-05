/**
 * ============================================================================
 *  CHEST.JS — GOLDENAPP SIRLI SANDIQ MODULI
 * ============================================================================
 *  Loyiha qoidasi: real moliyaviy qiymatga ega birlik (Telegram Stars)
 *  HECH QACHON tasodifiy miqdorda berilmaydi — faqat aniq, oldindan
 *  belgilangan (deterministik) formula bilan. Tasodifiylik faqat COIN
 *  miqdorida bo'lishi mumkin (real pulga aylanmaydigan, cheksiz resurs).
 * ============================================================================
 */

const GoldenappChest = {

  REWARD_TABLE: {
    normal: { adsRequired: 3, finalCoin: 2500 },
    big:    { adsRequired: 5, finalCoin: 15000, triggerEveryNChests: 4 },
  },

  state: {
    mode: 'normal',
    adsInChest: 0,
    normalOpened: 0,
    sessionId: null,
  },

  init() {
    document.getElementById('chestOrb').addEventListener('click', () => this.open());
    document.getElementById('chestScrim').addEventListener('click', () => this.close());
    document.getElementById('chestCloseBtn').addEventListener('click', () => this.close());
    document.getElementById('chestWatchBtn').addEventListener('click', () => this._watch());

    // Sandiq ochilganlar sonini localStorage'dan tiklash
    try {
      const saved = localStorage.getItem('chest_normalOpened');
      if (saved) this.state.normalOpened = parseInt(saved, 10) || 0;
    } catch (e) { /* ignore */ }
  },

  _cfg() {
    return this.state.mode === 'big' ? this.REWARD_TABLE.big : this.REWARD_TABLE.normal;
  },

  _saveState() {
    try {
      localStorage.setItem('chest_normalOpened', String(this.state.normalOpened));
    } catch (e) { /* ignore */ }
  },

  async open() {
    const trigger = this.REWARD_TABLE.big.triggerEveryNChests;
    const isBig = this.state.normalOpened > 0 && this.state.normalOpened % trigger === 0;
    this.state.mode = isBig ? 'big' : 'normal';
    this.state.adsInChest = 0;

    const res = await GoldenappApi.startChest();
    this.state.sessionId = (res && res.session_id) || null;

    const sheet = document.getElementById('chestSheet');
    sheet.classList.add('chest-sheet--open');
    document.getElementById('chestVisual').className = 'chest-visual';
    document.getElementById('chestRewardCallout').hidden = true;
    document.getElementById('chestWatchBtn').hidden = false;
    document.getElementById('chestWatchBtn').disabled = false;

    this._updateUI();
  },

  close() {
    document.getElementById('chestSheet').classList.remove('chest-sheet--open');
  },

  _updateUI() {
    const cfg = this._cfg();
    const pct = Math.min(100, (this.state.adsInChest / cfg.adsRequired) * 100);
    document.getElementById('chestTrackFill').style.width = pct + '%';
    document.getElementById('chestCaption').textContent =
      `${this.state.adsInChest} / ${cfg.adsRequired} reklama ko'rildi`;
    document.getElementById('chestTitle').textContent =
      this.state.mode === 'big' ? '🌟 Katta mukofot sandig\'i!' : 'Sirli sandiq';
  },

  _watch() {
    const btn = document.getElementById('chestWatchBtn');
    btn.disabled = true;
    GoldenappAds.showReward('chest', 
      () => this._onConfirmed(), 
      (err) => {
        btn.disabled = false;
        const msg = err?.message || 'Reklama ko\'rsatilmadi';
        GoldenappUI.toast(msg);
        console.error('[Chest] Reklama xatosi:', err);
      }
    );
  },

  _onConfirmed() {
    const cfg = this._cfg();
    this.state.adsInChest += 1;

    const visual = document.getElementById('chestVisual');
    visual.classList.add('chest-visual--shake');
    setTimeout(() => visual.classList.remove('chest-visual--shake'), 450);

    this._updateUI();

    if (this.state.mode === 'big') {
      if (this.state.adsInChest === Math.ceil(cfg.adsRequired / 2)) {
        this._flashCaption('Yarmidan o\'tdingiz — davom eting!');
      } else if (this.state.adsInChest === cfg.adsRequired - 1) {
        this._flashCaption('Yana bittasi qoldi!');
      }
    }

    if (this.state.adsInChest >= cfg.adsRequired) {
      this._grantReward();
    } else {
      document.getElementById('chestWatchBtn').disabled = false;
    }
  },

  _flashCaption(text) {
    const el = document.getElementById('chestCaption');
    const original = el.textContent;
    el.textContent = text;
    setTimeout(() => { el.textContent = original; }, 1300);
  },

  async _grantReward() {
    const cfg = this._cfg();

    document.getElementById('chestVisual').classList.add('chest-visual--open');
    document.getElementById('chestWatchBtn').hidden = true;

    Goldenapp.addCoin(cfg.finalCoin);

    await GoldenappApi.finishChest(this.state.sessionId, 0, this.state.adsInChest);

    const box = document.getElementById('chestRewardCallout');
    box.hidden = false;
    document.getElementById('chestRewardValue').textContent =
      `+${cfg.finalCoin.toLocaleString('uz-UZ')} 🪙`;

    if (this.state.mode === 'normal') {
      this.state.normalOpened += 1;
      this._saveState();
    }
    this.state.adsInChest = 0;
  },
};
