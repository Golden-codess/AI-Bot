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

  // Profil UI
  document.getElementById('profileName').textContent = Goldenapp.user.firstName;
  document.getElementById('profileId').textContent = Goldenapp.user.telegramId || '—';
  document.getElementById('avatarInitial').textContent =
    (Goldenapp.user.firstName || '?').charAt(0).toUpperCase();

  // Backenddan foydalanuvchi holatini yuklash
  if (Goldenapp.user.telegramId) {
    try {
      const loaded = await GoldenappApi.loadUser();
      // loaded obyekti turli formatda bo'lishi mumkin
      if (loaded && loaded.success !== false) {
        // maydonlarni topish
        const coin = loaded.coin_balance ?? loaded.balance ?? loaded.coins ?? 0;
        const stars = loaded.stars_balance ?? loaded.stars ?? 0;
        const ads = loaded.ads_watched ?? loaded.ads ?? 0;
        Goldenapp.user.coin = Number(coin);
        Goldenapp.user.starsBalance = Number(stars);
        Goldenapp.user.adsWatched = Number(ads);
        Goldenapp.notify();
      } else {
        console.warn('[main] Backend ma\'lumot qaytarmadi, mahalliy holat saqlanadi.');
      }
    } catch (e) {
      console.warn('[main] Backend ulanmadi:', e);
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
