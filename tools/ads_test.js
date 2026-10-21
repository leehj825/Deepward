const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1100,height:700}});const e=[];pg.on('pageerror',x=>e.push(x.message));
await pg.goto('file://'+require('path').resolve(__dirname,'..','index.html')+'');await pg.waitForTimeout(800);
const r=await pg.evaluate(()=>{document.body.classList.add('playing');const s=document.getElementById('adSlot');const o={hiddenDefault:s.style.display==='none'&&!document.body.classList.contains('has-ad')};
const y0=document.getElementById('waveBox').getBoundingClientRect().top;Ads.show(true);s.innerHTML='<div style="width:320px;height:50px;background:#444"></div>';
const y1=document.getElementById('waveBox').getBoundingClientRect().top;const ar=s.getBoundingClientRect();o.belowAd=y1>=ar.bottom-1&&y0<y1;o.centred=Math.abs(ar.left+ar.width/2-550)<2;return o});
console.log(JSON.stringify(r),e);await b.close()})()
