/*
  MAIN.JS
*/

document.addEventListener('DOMContentLoaded', async () => {

  // LocalStorage'dan ma'lumotlarni yuklash
  const hasSaved = Goldenapp.load();
  if (hasSaved) {
    console.log('[Main] Mahalliy ma\'lumotlar tiklandi');
  }

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

  document.getElementById('profileName').textContent = Goldenapp.user.firstName;
  document.getElementById('profileId').textContent = Goldenapp.user.telegramId || '—';
  document.getElementById('avatarInitial').textContent =
    (Goldenapp.user.firstName || '?').charAt(0).toUpperCase();

  // Backenddan foydalanuvchi holatini yuklash (agar mavjud bo'lsa)
  if (Goldenapp.user.telegramId) {
    try {
      const loaded = await GoldenappApi.loadUser();
      if (loaded && loaded.success !== false) {
        const coin = loaded.coin_balance ?? loaded.balance ?? loaded.coins ?? null;
        const stars = loaded.stars_balance ?? loaded.stars ?? null;
        const ads = loaded.ads_watched ?? loaded.ads ?? null;
        if (coin !== null) Goldenapp.user.coin = Number(coin);
        if (stars !== null) Goldenapp.user.starsBalance = Number(stars);
        if (ads !== null) Goldenapp.user.adsWatched = Number(ads);
        Goldenapp.notify();
        console.log('[Main] Backend ma\'lumotlari yuklandi');
      } else {
        console.log('[Main] Backend ma\'lumot qaytarmadi, mahalliy holat ishlatiladi.');
      }
    } catch (e) {
      console.warn('[Main] Backend ulanmadi:', e);
    }
  }

  // UI yangilash
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

  // Birinchi marta yuklanganda saqlash
  Goldenapp.save();
});
