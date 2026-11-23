// Ads (Google AdMob through the @capacitor-community/admob plugin in the
// Android app):
//  - an interstitial between runs, every ADS.every-th game over
//  - a rewarded ad that lets the player keep going after a crash or arrest
//  - the Google consent form (UMP) where the law needs one (EU/UK)
// In the browser (no AdMob) a placeholder stands in, so the flow can be
// played and tested; the web version never shows real ads.
//
// IDs: these are Google's public TEST ids. Before release, replace them with
// your own ad unit ids from the AdMob console (and the app id in
// android/app/src/main/AndroidManifest.xml), and set testing to false.
export const ADS = {
  interstitial: 'ca-app-pub-3940256099942544/1033173712',   // Google test interstitial
  rewarded: 'ca-app-pub-3940256099942544/5224354917',       // Google test rewarded
  testing: true,
  every: 3,            // an interstitial after every 3rd run
};

const plugin = () => (window.Capacitor?.isNativePlatform?.() ? window.Capacitor.Plugins?.AdMob : null);

export class Ads {
  constructor() { this.runs = 0; this.ready = false; this.canAds = true; this._init = null; this.busy = false; }

  /** call once, early (after the first user tap is fine) */
  init() {
    if (this._init) return this._init;
    const A = plugin();
    this._init = (async () => {
      if (!A) { this.ready = true; return; }
      try {
        await A.initialize({ initializeForTesting: ADS.testing });
        // consent (GDPR): ask with Google's form where it is required
        const info = await A.requestConsentInfo();
        if (!info.canRequestAds && info.isConsentFormAvailable && info.status === 'REQUIRED') { const after = await A.showConsentForm(); this.canAds = after.canRequestAds; }
        else this.canAds = info.canRequestAds !== false;
        this.ready = true;
        this._preload();
      } catch (e) { console.warn('AdMob init failed', e); this.ready = true; this.canAds = false; }
    })();
    return this._init;
  }
  _preload() {
    const A = plugin(); if (!A || !this.canAds) return;
    A.prepareInterstitial({ adId: ADS.interstitial, isTesting: ADS.testing }).then(() => { this.intReady = true; }).catch(() => { this.intReady = false; });
    A.prepareRewardVideoAd({ adId: ADS.rewarded, isTesting: ADS.testing }).then(() => { this.rewReady = true; }).catch(() => { this.rewReady = false; });
  }
  /** privacy options (for the Settings screen, required where consent applies) */
  async privacyOptions() { const A = plugin(); if (A) try { await A.showPrivacyOptionsForm(); } catch {} }
  get native() { return !!plugin(); }

  /** a run ended: true if an interstitial is due before the next one */
  countRun() { this.runs++; return this.runs % ADS.every === 0; }
  async interstitial(onShow, onHide) {
    if (this.busy) return false; this.busy = true; onShow?.();
    try {
      const A = plugin();
      if (!A) await placeholder('interstitial');
      else if (this.canAds) {
        if (!this.intReady) await A.prepareInterstitial({ adId: ADS.interstitial, isTesting: ADS.testing });
        await new Promise((res) => { let h1, h2; const done = () => { h1?.remove(); h2?.remove(); res(); };
          A.addListener('interstitialAdDismissed', done).then((h) => { h1 = h; }); A.addListener('interstitialAdFailedToShow', done).then((h) => { h2 = h; });
          A.showInterstitial().catch(done); });
        this.intReady = false;
      }
    } catch (e) { console.warn('interstitial failed', e); }
    this.busy = false; onHide?.(); this._preload(); return true;
  }
  /** rewarded ad: resolves true if the player watched it to the end */
  async rewarded(onShow, onHide) {
    if (this.busy) return false; this.busy = true; onShow?.(); let ok = false;
    try {
      const A = plugin();
      if (!A) ok = await placeholder('rewarded');
      else if (this.canAds) {
        if (!this.rewReady) await A.prepareRewardVideoAd({ adId: ADS.rewarded, isTesting: ADS.testing });
        const item = await A.showRewardVideoAd(); ok = !!item; this.rewReady = false;
      }
    } catch (e) { console.warn('rewarded failed', e); ok = false; }
    this.busy = false; onHide?.(); this._preload(); return ok;
  }
}

// browser stand-in: a full-screen "ad" with a countdown (no network, no tracking)
function placeholder(kind) {
  return new Promise((res) => {
    const el = document.createElement('div'); el.className = 'adph';
    const secs = kind === 'rewarded' ? 5 : 3;
    el.innerHTML = `<div class="adph-box"><div class="tiny">${kind === 'rewarded' ? 'REWARDED AD' : 'AD'} · PLACEHOLDER</div><h2>Werbung</h2><p class="muted">In the Android app a Google AdMob ${kind === 'rewarded' ? 'rewarded video' : 'interstitial'} plays here.</p><button class="primary" disabled>${secs}</button>${kind === 'rewarded' ? '<button class="skip">Skip (no reward)</button>' : ''}</div>`;
    document.body.appendChild(el);
    const btn = el.querySelector('button.primary'); let t = secs;
    const iv = setInterval(() => { t--; if (t > 0) btn.textContent = t; else { clearInterval(iv); btn.disabled = false; btn.textContent = kind === 'rewarded' ? 'CLAIM REWARD' : 'CLOSE'; } }, 1000);
    btn.addEventListener('click', () => { el.remove(); res(true); });
    el.querySelector('.skip')?.addEventListener('click', () => { clearInterval(iv); el.remove(); res(false); });
  });
}
