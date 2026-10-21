// Deepward - the ad slot: a small banner at the top centre, above the name of the place. It is hidden until an ad has really
// arrived, so without a publisher id, without a network, or when no ad is filled, nothing shows and the place name keeps its spot.
// Fill in client (ca-pub-...) and slot (the ad unit's id) from the AdSense account to switch it on. AdSense serves web pages; the
// Android app's WebView needs AdMob (a native plugin) instead - this slot only reacts to what ends up inside it.
const Ads = (() => {
  const CONF = { client: '', slot: '', width: 320, height: 50 };
  let el = null;
  const show = on => { document.body.classList.toggle('has-ad', !!on); if (el) el.style.display = on ? 'block' : 'none'; };
  function init() {
    el = document.getElementById('adSlot');
    if (!el) return;
    show(false);
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
