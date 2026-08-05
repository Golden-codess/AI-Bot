/*
  ADS.JS
  Haqiqiy Adsgram Block ID'lar (siz bergan ma'lumotlarga ko'ra):
    Reward:       41159
    Interstitial: 41269
    Task:         "task-41270"
*/

const GoldenappAds = {
  blockIds: {
    reward: 41159,
    interstitial: 41269,
    task: 'task-41270',
  },

  get sdkReady() {
    return typeof window.Adsgram !== 'undefined' && typeof window.Adsgram.showRewardedVideo === 'function';
  },

  showReward(source, onSuccess, onFail) {
    if (!this.sdkReady) {
      console.warn('[Ads] SDK topilmadi yoki showRewardedVideo mavjud emas.');
      if (onFail) onFail(new Error('SDK not ready'));
      return;
    }
    window.Adsgram.showRewardedVideo({ blockId: this.blockIds.reward })
      .then(() => {
        console.log('[Ads] Reward video muvaffaqiyatli');
        Goldenapp.registerConfirmedAd(source);
        if (onSuccess) onSuccess();
      })
      .catch((err) => {
        console.warn('[Ads] Reward xato:', err);
        if (onFail) onFail(err);
      });
  },

  showTask(onSuccess, onFail) {
    if (!this.sdkReady) {
      if (onFail) onFail(new Error('SDK not ready'));
      return;
    }
    window.Adsgram.showRewardedVideo({ blockId: this.blockIds.reward })
      .then(() => {
        Goldenapp.registerConfirmedAd('task');
        if (onSuccess) onSuccess();
      })
      .catch((err) => {
        console.warn('[Ads] Task xato:', err);
        if (onFail) onFail(err);
      });
  },

  showInterstitial(onDone) {
    if (!this.sdkReady) {
      console.warn('[Ads] Interstitial SDK not ready');
      if (onDone) onDone();
      return;
    }
    window.Adsgram.showInterstitialAd({ blockId: this.blockIds.interstitial })
      .then(() => {
        if (onDone) onDone();
      })
      .catch((err) => {
        console.warn('[Ads] Interstitial xato:', err);
        if (onDone) onDone();
      });
  },
};
