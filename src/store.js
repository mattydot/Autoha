// In-app purchase: "remove ads" (Google Play Billing via @capgo/native-purchases).
// Create a one-time (non-consumable) in-app product with this id in the Play
// Console: Monetise → Products → In-app products.
export const REMOVE_ADS = 'remove_ads';
const plugin = () => (window.Capacitor?.isNativePlatform?.() ? window.Capacitor.Plugins?.NativePurchases : null);

export class Store {
  constructor() { this.price = null; this.available = false; }
  get native() { return !!plugin(); }
  /** find out if billing works, the price, and whether the player already owns it */
  async init() {
    const P = plugin(); if (!P) return false;
    try {
      const { isBillingSupported } = await P.isBillingSupported(); if (!isBillingSupported) return false;
      const { products } = await P.getProducts({ productIdentifiers: [REMOVE_ADS], productType: 'inapp' });
      this.price = products?.[0]?.priceString || null; this.available = !!products?.length;
      return await this.owned();
    } catch (e) { console.warn('billing init failed', e); return false; }
  }
  async owned() {
    const P = plugin(); if (!P) return false;
    try { const { purchases } = await P.getPurchases({ productType: 'inapp' }); return (purchases || []).some((t) => t.productIdentifier === REMOVE_ADS && (t.purchaseState === undefined || t.purchaseState === '1')); }
    catch { return false; }
  }
  /** resolves true when the purchase went through */
  async buy() {
    const P = plugin(); if (!P) return false;
    try { const t = await P.purchaseProduct({ productIdentifier: REMOVE_ADS, productType: 'inapp', quantity: 1 }); return !!t && (t.purchaseState === undefined || t.purchaseState === '1'); }
    catch (e) { console.warn('purchase failed', e); return false; }
  }
  async restore() { const P = plugin(); if (!P) return false; try { await P.restorePurchases(); } catch {} return this.owned(); }
}
