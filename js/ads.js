/*
  ADS.JS
*/

const GoldenappAds = {
  blockIds: {
    reward: 41159,
    interstitial: 41269,
    task: 'task-41270',
  },

  _sdkReady: false,
  _sdkCheckCount: 0,

  get sdkReady() {
    if (typeof window.Adsgram !== 'undefined' && typeof window.Adsgram.showRewardedVideo === 'function') {
      this._sdkReady = true;
      return true;
    }
    return false;
  },

  // SDK tayyor bo'lguncha kutish
  _waitForSDK(callback, timeout = 5000) {
    const start = Date.now();
    const check = () => {
      if (this.sdkReady) {
        callback(true);
        return;
      }
      if (Date.now() - start > timeout) {
        console.warn('[Ads] SDK yuklash vaqti tugadi');
        callback(false);
        return;
      }
      setTimeout(check, 200);
    };
    check();
  },

  showReward(source, onSuccess, onFail) {
    this._waitForSDK((ready) => {
      if (!ready) {
        GoldenappUI.toast('Reklama SDK tayyor emas');
        if (onFail) onFail(new Error('SDK not ready'));
        return;
      }
      window.Adsgram.showRewardedVideo({ blockId: this.blockIds.reward })
        .then(() => {
          Goldenapp.registerConfirmedAd(source);
          if (onSuccess) onSuccess();
        })
        .catch((err) => {
          console.warn('[Ads] Reward xato:', err);
          if (onFail) onFail(err);
        });
    });
  },

  showTask(onSuccess, onFail) {
    this._waitForSDK((ready) => {
      if (!ready) {
        GoldenappUI.toast('Reklama SDK tayyor emas');
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
    });
  },

  showInterstitial(onDone) {
    this._waitForSDK((ready) => {
      if (!ready) {
        console.warn('[Ads] Interstitial SDK not ready');
        if (onDone) onDone();
        return;
      }
      window.Adsgram.showInterstitialAd({ blockId: this.blockIds.interstitial })
        .then(() => { if (onDone) onDone(); })
        .catch(() => { if (onDone) onDone(); });
    });
  },
};
