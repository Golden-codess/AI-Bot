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
    return typeof window.Adsgram !== 'undefined';
  },

  showReward(source, onSuccess, onFail) {
    if (!this.sdkReady) {
      console.warn('[Ads] SDK topilmadi — test rejimi simulyatsiyasi');
      setTimeout(() => onSuccess && onSuccess(), 500);
      return;
    }
    window.Adsgram.showRewardedVideo({ blockId: this.blockIds.reward })
      .then(() => {
        Goldenapp.registerConfirmedAd(source);
        onSuccess && onSuccess();
      })
      .catch((err) => {
        console.warn('[Ads] Reward xato:', err);
        onFail && onFail(err);
      });
  },

  showTask(onSuccess, onFail) {
    if (!this.sdkReady) {
      setTimeout(() => onSuccess && onSuccess(), 500);
      return;
    }
    window.Adsgram.showRewardedVideo({ blockId: this.blockIds.reward })
      .then(() => {
        Goldenapp.registerConfirmedAd('task');
        onSuccess && onSuccess();
      })
      .catch((err) => onFail && onFail(err));
  },

  showInterstitial(onDone) {
    if (!this.sdkReady) { onDone && onDone(); return; }
    window.Adsgram.showInterstitialAd({ blockId: this.blockIds.interstitial })
      .then(() => { onDone && onDone(); })
      .catch(() => { onDone && onDone(); });
  },
};
