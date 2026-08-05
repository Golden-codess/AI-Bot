/*
  UI.JS
  Umumiy UI yordamchilari.
*/

const GoldenappUI = {
  _toastTimer: null,

  toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('toast--show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove('toast--show'), 2200);
  },

  fmt(n) {
    n = Math.floor(n);
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(2).replace(/\.00$/, '') + 'M';
    if (n >= 1_000) return n.toLocaleString('uz-UZ');
    return n.toString();
  },
};
