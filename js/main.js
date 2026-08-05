/*
  MAIN.JS

  MUHIM TUZATISH (avvalgi muammo sababi):
  Eski kodda `const tg = window.Telegram.WebApp;` to'g'ridan-to'g'ri yozilgan edi.
  Agar sahifa Telegram tashqarisida ochilsa (masalan brauzerda test qilishda),
  `window.Telegram` mavjud emas va bu qator DARHOL xato berib, undan keyingi
  BUTUN skript ishlamay to'xtaydi (shu sababli hech qanday alert/funksiya
  ishlamagan edi).

  Bu yerda esa TG obyekti (state.js da) xavfsiz tekshirilgan holda olinadi,
  va agar u mavjud bo'lmasa, ilova baribir yiqilmasdan davom etadi.
*/

document.addEventListener('DOMContentLoaded', async () => {

  if (TG) {
    try {
      TG.ready();
      TG.expand();
    } catch (e) { console.warn('[main] TG.ready/expand xato:', e); }

    const tgUser = TG.initDataUnsafe && TG.initDataUnsafe.user;
    if (tgUser) {
      Goldenapp.user.telegramId = tgUser.id;
      Goldenapp.user.firstName = tgUser.first_name || 'Foydalanuvchi';
      Goldenapp.user.username = tgUser.username || null;
    }
  } else {
    console.warn('[main] Telegram WebApp topilmadi — ilova mustaqil rejimda ishlamoqda.');
  }

  // Profil UI (mavjud ma'lumot bilan darhol to'ldiriladi)
  document.getElementById('profileName').textContent = Goldenapp.user.firstName;
  document.getElementById('profileId').textContent = Goldenapp.user.telegramId || '—';
  document.getElementById('avatarInitial').textContent =
    (Goldenapp.user.firstName || '?').charAt(0).toUpperCase();

  // Backenddan foydalanuvchi holatini yuklash
  if (Goldenapp.user.telegramId) {
    try {
      const loaded = await GoldenappApi.loadUser();
      if (loaded && loaded.coin_balance !== undefined) {
        Goldenapp.user.coin = Number(loaded.coin_balance) || 0;
        Goldenapp.user.starsBalance = Number(loaded.stars_balance) || 0;
        Goldenapp.user.adsWatched = Number(loaded.ads_watched) || 0;
        Goldenapp.notify();
      }
    } catch (e) {
      console.warn('[main] Backend hozircha ulanmadi:', e);
    }
  }

  document.getElementById('statCoins').textContent = GoldenappUI.fmt(Goldenapp.user.coin);
  document.getElementById('statAds').textContent = Goldenapp.user.adsWatched;

  Goldenapp.onChange((user) => {
    document.getElementById('statCoins').textContent = GoldenappUI.fmt(user.coin);
    document.getElementById('statAds').textContent = user.adsWatched;
  });

  // Modullarni ishga tushirish
  GoldenappGame.init();
  GoldenappChest.init();
  GoldenappExchange.init();
  GoldenappWithdraw.init();
  GoldenappNav.init();
});
