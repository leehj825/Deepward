// Deepward - the ad banner. In the Android app it is a Google AdMob banner (the Capacitor plugin @capacitor-community/admob) at the top
// centre: 320 x 50, not the whole width, drawn over the game by the system. The banner unit is Deepward's own. `testing` makes
// it ask for Google's TEST ads from that unit (the safe way to develop: AdMob bans accounts that click their own live ads); turn it
// off for the build that goes to the store. The app id is in the manifest (tools/android_patch.js). On the web it is an AdSense slot (below).
// The web slot: a small banner at the top centre, above the name of the place. It is hidden until an ad has really
// arrived, so without a publisher id, without a network, or when no ad is filled, nothing shows and the place name keeps its spot.
// Fill in client (ca-pub-...) and slot (the ad unit's id) from the AdSense account to switch it on. AdSense serves web pages; the
// Android app's WebView needs AdMob (a native plugin) instead - this slot only reacts to what ends up inside it.
const Ads = (() => {
  const CONF = { client: '', slot: '', width: 320, height: 50, admob: { banner: 'ca-app-pub-4400173019354346/4461123131', testing: true } };
  let el = null;
  const show = on => { document.body.classList.toggle('has-ad', !!on); if (el) el.style.display = on ? 'block' : 'none'; };
  const native = () => !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform() && Capacitor.Plugins && Capacitor.Plugins.AdMob);
  // The app: initialise AdMob, show the banner at the top centre; the HUD makes room only once an ad has really loaded
  async function nativeBanner() {
    const A = Capacitor.Plugins.AdMob;
    try {
      await A.initialize({ initializeForTesting: !!CONF.admob.testing });
      A.addListener('bannerAdLoaded', () => document.body.classList.add('has-ad'));
      A.addListener('bannerAdFailedToLoad', () => document.body.classList.remove('has-ad'));
      await A.showBanner({ adId: CONF.admob.banner, adSize: 'BANNER', position: 'TOP_CENTER', margin: 0, isTesting: !!CONF.admob.testing });
    } catch (e) { document.body.classList.remove('has-ad'); }
  }
  function init() {
    el = document.getElementById('adSlot');
    if (!el) return;
    show(false);
    if (native()) return nativeBanner();
    if (!CONF.client || !CONF.slot || !navigator.onLine) return;
    if (window.Settings && Settings.get('ads') === false) return;
    const ins = document.createElement('ins');
    ins.className = 'adsbygoogle'; ins.style.cssText = `display:inline-block;width:${CONF.width}px;height:${CONF.height}px`;
    ins.setAttribute('data-ad-client', CONF.client); ins.setAttribute('data-ad-slot', CONF.slot);
    el.appendChild(ins);
    // The slot is shown only once the ad network marks it filled
    new MutationObserver(() => show(ins.getAttribute('data-ad-status') === 'filled' && ins.clientHeight > 10)).observe(ins, { attributes: true, attributeFilter: ['data-ad-status'] });
    const s = document.createElement('script');
    s.async = true; s.crossOrigin = 'anonymous'; s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(CONF.client);
    s.onload = () => { try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { show(false); } };
    s.onerror = () => show(false);
    document.head.appendChild(s);
  }
  return { init, CONF, show };
})();
