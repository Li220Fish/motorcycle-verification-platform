/* eslint-disable */
// @ts-nocheck
/**
 * 外觀檢查引導動畫 — ported verbatim from ride-buyer-inspection.html (the
 * ANIMS registry: each entry is SVG markup with __UID__/__IMG_n__ placeholders
 * plus a factory that drives it frame by frame). Kept as-is rather than
 * rewritten so the timing/paths stay identical to the approved design;
 * BuyerAppearanceCheck.vue mounts it through mountAppearanceAnim() below.
 */
import img0 from '@/assets/buyer-appearance/img-00.webp'
import img1 from '@/assets/buyer-appearance/img-01.webp'
import img2 from '@/assets/buyer-appearance/img-02.webp'
import img3 from '@/assets/buyer-appearance/img-03.webp'
import img4 from '@/assets/buyer-appearance/img-04.webp'
import img5 from '@/assets/buyer-appearance/img-05.webp'
import img6 from '@/assets/buyer-appearance/img-06.webp'
import img7 from '@/assets/buyer-appearance/img-07.webp'
import img8 from '@/assets/buyer-appearance/img-08.webp'
import img9 from '@/assets/buyer-appearance/img-09.webp'
import img10 from '@/assets/buyer-appearance/img-10.webp'
import img11 from '@/assets/buyer-appearance/img-11.webp'
import img12 from '@/assets/buyer-appearance/img-12.webp'
import img13 from '@/assets/buyer-appearance/img-13.png'
import img14 from '@/assets/buyer-appearance/img-14.png'
import img15 from '@/assets/buyer-appearance/img-15.png'
import img16 from '@/assets/buyer-appearance/img-16.webp'
import img17 from '@/assets/buyer-appearance/img-17.webp'

const IMG = [img0, img1, img2, img3, img4, img5, img6, img7, img8, img9, img10, img11, img12, img13, img14, img15, img16, img17]
const ease=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
const clamp=x=>Math.min(1,Math.max(0,x));
export const ANIMS = {};
ANIMS["steer"]={markup:"<svg viewBox=\"0 0 900 800\" role=\"img\" aria-label=\"龍頭向右、向左轉到底的引導動畫\"><defs>\n<marker id=\"g__UID__\" viewBox=\"0 0 10 10\" refX=\"6\" refY=\"5\" markerWidth=\"3.2\" markerHeight=\"3.2\" orient=\"auto-start-reverse\"><path d=\"M0,0 L10,5 L0,10 z\" fill=\"var(--guide)\"/></marker>\n<marker id=\"d__UID__\" viewBox=\"0 0 10 10\" refX=\"8\" refY=\"5\" markerWidth=\"3.6\" markerHeight=\"3.6\" orient=\"auto-start-reverse\"><path d=\"M0,0 L10,5 L0,10 z\" fill=\"var(--dim)\"/></marker></defs>\n<g id=\"layers__UID__\"><image href=\"__IMG_0__\" width=\"900\" height=\"800\"/>\n<g id=\"pivot__UID__\"><image id=\"bC__UID__\" href=\"__IMG_1__\" width=\"900\" height=\"800\"/></g>\n<g id=\"gR__UID__\"><image id=\"bR__UID__\" href=\"__IMG_2__\" width=\"900\" height=\"800\" opacity=\"0\"/></g>\n<g id=\"gL__UID__\"><image id=\"bL__UID__\" href=\"__IMG_3__\" width=\"900\" height=\"800\" opacity=\"0\"/></g></g>\n<image id=\"fC__UID__\" href=\"__IMG_4__\" width=\"900\" height=\"800\"/>\n<image id=\"fR__UID__\" href=\"__IMG_5__\" width=\"900\" height=\"800\" opacity=\"0\"/>\n<image id=\"fL__UID__\" href=\"__IMG_6__\" width=\"900\" height=\"800\" opacity=\"0\"/>\n<g id=\"arcR__UID__\" opacity=\"0\"><path class=\"arc\" marker-end=\"url(#g__UID__)\"/><path class=\"arc\" marker-end=\"url(#g__UID__)\"/></g>\n<g id=\"arcL__UID__\" opacity=\"0\"><path class=\"arc\" marker-end=\"url(#g__UID__)\"/><path class=\"arc\" marker-end=\"url(#g__UID__)\"/></g>\n<line id=\"dimR__UID__\" class=\"dimline\" x1=\"814\" y1=\"640\" x2=\"814\" y2=\"640\" marker-start=\"url(#d__UID__)\" marker-end=\"url(#d__UID__)\" opacity=\"0\"/>\n<line id=\"dimL__UID__\" class=\"dimline\" x1=\"82\" y1=\"635\" x2=\"82\" y2=\"635\" marker-start=\"url(#d__UID__)\" marker-end=\"url(#d__UID__)\" opacity=\"0\"/></svg>",factory:function(root,UID){

const $=id=>document.getElementById(id+UID);
const PX=447.8, PY=438.2, ANG=25, R=385;
const arc=(a0,a1)=>{ const p=a=>[PX+R*Math.cos(a*Math.PI/180),PY+R*Math.sin(a*Math.PI/180)]; const [x0,y0]=p(a0),[x1,y1]=p(a1);
  return `M${x0.toFixed(1)},${y0.toFixed(1)} A${R},${R} 0 0 ${a1>a0?1:0} ${x1.toFixed(1)},${y1.toFixed(1)}`; };
const aR=$('arcR').children, aL=$('arcL').children;
aR[0].setAttribute('d',arc(6,30)); aR[1].setAttribute('d',arc(186,210));
aL[0].setAttribute('d',arc(-6,-30)); aL[1].setAttribute('d',arc(174,150));
const DIM={R:{el:$('dimR'),x1:814,x2:670},L:{el:$('dimL'),x1:82,x2:232}};
function draw(th){
  $('pivot').setAttribute('transform',`rotate(${th} ${PX} ${PY})`);
  $('gR').setAttribute('transform',`rotate(${th-ANG} ${PX} ${PY})`);
  $('gL').setAttribute('transform',`rotate(${th+ANG} ${PX} ${PY})`);
  const t=Math.min(Math.abs(th)/ANG,1);
  $('bC').setAttribute('opacity',1-t); $('bR').setAttribute('opacity',th>0?t:0); $('bL').setAttribute('opacity',th<0?t:0);
  const near=g=>Math.max(0,1-Math.abs(th-g)/1.5); const nC=near(0),nR=near(ANG),nL=near(-ANG);
  $('layers').setAttribute('opacity',1-Math.max(nC,nR,nL));
  $('fC').setAttribute('opacity',nC); $('fR').setAttribute('opacity',nR); $('fL').setAttribute('opacity',nL);
}
function dim(s,p){ const d=DIM[s]; d.el.setAttribute('opacity',p>0?1:0); d.el.setAttribute('x2',d.x1+(d.x2-d.x1)*ease(p)); }
const SEG=5.6;
function side(t,dir){
  const g=dir>0?$('arcR'):$('arcL'), s=dir>0?'R':'L'; let th=0;
  if(t<0.6) th=0; else if(t<1.9) th=ease((t-0.6)/1.3)*ANG; else if(t<4.1) th=ANG; else if(t<5.2) th=(1-ease((t-4.1)/1.1))*ANG;
  draw(dir*th);
  g.setAttribute('opacity', t<0.6?clamp(t/0.4): t<1.9?1 : t<2.3?1-0.4*clamp((t-1.9)/0.4) : t<5.2?.6 : .6*(1-clamp((t-5.2)/0.3)));
  dim(s, t>=2.1&&t<4.1 ? clamp((t-2.1)/0.5) : 0);
}
function frame(t){
  if(t<SEG){ $('arcL').setAttribute('opacity',0); dim('L',0); side(t,1); }
  else     { $('arcR').setAttribute('opacity',0); dim('R',0); side(t-SEG,-1); }
}

return {T:SEG*2, end:SEG+2.6, frame, still(){ draw(-ANG); $('arcR').setAttribute('opacity',0); dim('R',0); $('arcL').setAttribute('opacity',.6); dim('L',1); }};
}};
ANIMS["barend"]={markup:"<svg id=\"stage__UID__\" viewBox=\"0 230 896 965\" role=\"img\" aria-label=\"放大把手端子與拉桿尾端，檢查刮傷與倒地痕跡的引導動畫\">\n  <defs>\n    <marker id=\"ah__UID__\" viewBox=\"0 0 10 10\" refX=\"6\" refY=\"5\" markerWidth=\"3.2\" markerHeight=\"3.2\" orient=\"auto\">\n      <path d=\"M0,0 L10,5 L0,10 z\" fill=\"var(--guide)\"/>\n    </marker>\n    <clipPath id=\"clipCap__UID__\"><path d=\"M597,326 L626,323.5 L626,361 L599,360 Q596.5,343 597,326 Z\"/><ellipse cx=\"625.6\" cy=\"342.4\" rx=\"5.6\" ry=\"17.6\"/></clipPath>\n    <clipPath id=\"clipBall__UID__\"><circle cx=\"617.6\" cy=\"383.6\" r=\"10\"/></clipPath>\n  </defs>\n\n  <image id=\"imgMain__UID__\" href=\"__IMG_7__\" x=\"0\" y=\"0\" width=\"896\" height=\"1195\"/>\n  <image id=\"imgClose__UID__\" href=\"__IMG_8__\" x=\"539.2\" y=\"285.7\" width=\"160.2\" height=\"152.8\" opacity=\"0\"/>\n\n  <!-- 全景：指向把手末端 -->\n  <g id=\"ovFar__UID__\" opacity=\"0\">\n    <circle id=\"ring__UID__\" cx=\"613\" cy=\"360\" r=\"58\" fill=\"none\" stroke=\"var(--guide)\" stroke-width=\"5\"/>\n    <path d=\"M800,560 Q760,430 664,396\" fill=\"none\" stroke=\"var(--guide)\" stroke-width=\"9\" stroke-linecap=\"round\" marker-end=\"url(#ah__UID__)\"/>\n  </g>\n\n  <!-- 放大：刮痕 -->\n  <g id=\"scuffCap__UID__\" clip-path=\"url(#clipCap__UID__)\"></g>\n  <g id=\"scuffBall__UID__\" clip-path=\"url(#clipBall__UID__)\"></g>\n\n  <!-- 放大：箭頭與傷痕圈 -->\n  <g id=\"ovNear__UID__\" opacity=\"0\">\n    <path d=\"M676,306 Q660,322 641,334\" fill=\"none\" stroke=\"var(--guide)\" stroke-width=\"1.5\" stroke-linecap=\"round\" marker-end=\"url(#ah__UID__)\"/>\n    <path d=\"M676,410 Q660,398 638,390\" fill=\"none\" stroke=\"var(--guide)\" stroke-width=\"1.5\" stroke-linecap=\"round\" marker-end=\"url(#ah__UID__)\"/>\n  </g>\n</svg>",factory:function(root,UID){

const $=id=>document.getElementById(id+UID);
const NS='http://www.w3.org/2000/svg';
const svg=$('stage');

// ---- 產生刮痕（固定亂數種子，每次長一樣）----
let seed=7; const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
const strokes=[];
function scratchGroup(g,{x0,x1,y0,y1,n,ang,len,patch}){
  if(patch){ // 磨損底色
    const p=document.createElementNS(NS,'path');
    p.setAttribute('d',patch); p.setAttribute('fill','var(--scratch)'); p.setAttribute('opacity','0');
    p.dataset.patch=1; g.appendChild(p); strokes.push(p);
  }
  for(let i=0;i<n;i++){
    const x=x0+rnd()*(x1-x0), y=y0+rnd()*(y1-y0);
    const L=len[0]+rnd()*(len[1]-len[0]), a=(ang+(rnd()-.5)*18)*Math.PI/180;
    // 微折線，讓刮痕不那麼工整
    const mx=x+Math.cos(a)*L*.5+(rnd()-.5)*.6, my=y+Math.sin(a)*L*.5+(rnd()-.5)*.6;
    const ex=x+Math.cos(a)*L, ey=y+Math.sin(a)*L;
    const p=document.createElementNS(NS,'path');
    p.setAttribute('d',`M${x.toFixed(2)},${y.toFixed(2)} L${mx.toFixed(2)},${my.toFixed(2)} L${ex.toFixed(2)},${ey.toFixed(2)}`);
    p.setAttribute('fill','none'); p.setAttribute('stroke','var(--scratch)');
    p.setAttribute('stroke-width',(.35+rnd()*.5).toFixed(2)); p.setAttribute('stroke-linecap','round');
    const len2=L*1.1; p.setAttribute('stroke-dasharray',len2); p.setAttribute('stroke-dashoffset',len2);
    p.dataset.len=len2; p.dataset.op=(.55+rnd()*.45).toFixed(2);
    g.appendChild(p); strokes.push(p);
  }
}
scratchGroup($('scuffCap'),{x0:608,x1:628,y0:328,y1:356,n:34,ang:-28,len:[3,9],
  patch:'M618,331 Q627,330 630,338 Q631,350 626,357 Q616,356 614,349 Q612,338 618,331Z'});
scratchGroup($('scuffBall'),{x0:613,x1:627,y0:375,y1:392,n:22,ang:-35,len:[2.5,7],
  patch:'M619,376 Q627,377 628,384 Q627,391 621,392 Q616,388 616,382 Q616,377 619,376Z'});
const capN=35; // 前 35 個屬於端子

// ---- 鏡頭 ----
const FAR=[0,230,896,965];
const NEAR=[541,279.5,150,161.5];
function cam(z){ // z: 0=全景 1=放大；寬度以對數內插，縮放速度均勻
  const w=FAR[2]*Math.pow(NEAR[2]/FAR[2],z);
  const k=(FAR[2]-w)/(FAR[2]-NEAR[2]);
  const x=FAR[0]+(NEAR[0]-FAR[0])*k, y=FAR[1]+(NEAR[1]-FAR[1])*k, h=w*FAR[3]/FAR[2];
  svg.setAttribute('viewBox',`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`);
  const c=clamp((k-.35)/.3);          // 放大到後段才換成特寫圖
  $('imgClose').setAttribute('opacity',c);
  $('imgMain').setAttribute('opacity',1-c);
}
const ease=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
const clamp=x=>Math.min(1,Math.max(0,x));

function scratches(p,fade){ // p: 0→1 繪製進度
  strokes.forEach((s,i)=>{
    const start=(i<capN? i/capN*.6 : .55+(i-capN)/(strokes.length-capN)*.4);
    const q=clamp((p-start)/.12);
    if(s.dataset.patch){ s.setAttribute('opacity',(q*.28*fade).toFixed(3)); return; }
    s.setAttribute('stroke-dashoffset',(s.dataset.len*(1-q)).toFixed(2));
    s.setAttribute('opacity',(s.dataset.op*fade).toFixed(3));
  });
}

// 時間軸（秒）
// 0–0.4 全景｜0.4–1.4 箭頭指向把手末端｜1.4–2.9 放大｜2.9–3.4 箭頭指端子、拉桿球頭
// 3.4–5.2 刮痕出現｜5.2–7.2 停留｜7.2–7.7 淡出｜7.7–9.0 縮回｜9.0–9.5 停頓
const T=9.5;
function frame(t){
  let z=0;
  if(t>=1.4&&t<2.9) z=ease((t-1.4)/1.5); else if(t>=2.9&&t<7.7) z=1; else if(t>=7.7&&t<9.0) z=1-ease((t-7.7)/1.3);
  cam(z);
  $('ovFar').setAttribute('opacity', t<0.4?0 : t<0.8?(t-.4)/.4 : t<1.4?1 : t<1.8?1-(t-1.4)/.4 : 0);
  const r=$('ring'); const ph=((t*1.6)%1); r.setAttribute('r',(46+ph*20).toFixed(1)); r.setAttribute('opacity',(1-ph).toFixed(2));
  $('ovNear').setAttribute('opacity', t<2.9?0 : t<3.3?(t-2.9)/.4 : t<5.2?1 : t<5.6?1-(t-5.2)/.4 : 0);
  const fade= t<7.2?1 : t<7.7?1-(t-7.2)/.5 : 0;
  scratches(t<3.4?0:clamp((t-3.4)/1.8), fade);
}


return {T, end:5.15, frame, still(){ frame(5.15); }};
}};
ANIMS["peg"]={markup:"<svg id=\"stage__UID__\" viewBox=\"0 0 896 1196\" role=\"img\" aria-label=\"放大腳踏桿與打檔桿末端，檢查刮傷與倒地痕跡的引導動畫\">\n  <defs>\n    <marker id=\"ah__UID__\" viewBox=\"0 0 10 10\" refX=\"6\" refY=\"5\" markerWidth=\"3.2\" markerHeight=\"3.2\" orient=\"auto\">\n      <path d=\"M0,0 L10,5 L0,10 z\" fill=\"var(--guide)\" stroke=\"var(--bg)\" stroke-width=\"1\"/>\n    </marker>\n    <clipPath id=\"clipA__UID__\"><ellipse cx=\"739\" cy=\"640\" rx=\"22.5\" ry=\"45\"/></clipPath>\n    <clipPath id=\"clipB__UID__\"><ellipse cx=\"374\" cy=\"987.5\" rx=\"13\" ry=\"26\"/></clipPath>\n  </defs>\n\n  <image href=\"__IMG_9__\" x=\"0\" y=\"0\" width=\"896\" height=\"1196\"/>\n\n  <!-- 刮痕 -->\n  <g id=\"scA__UID__\" clip-path=\"url(#clipA__UID__)\"></g>\n  <g id=\"scB__UID__\" clip-path=\"url(#clipB__UID__)\"></g>\n\n  <!-- 全景箭頭 -->\n  <g id=\"farA__UID__\" opacity=\"0\">\n    <circle class=\"ring\" cx=\"739\" cy=\"640\" r=\"60\" fill=\"none\" stroke=\"var(--guide)\" stroke-width=\"5\"/>\n    <path class=\"halo\" stroke-width=\"17\" d=\"M872,460 Q850,560 790,606\"/>\n    <path class=\"arw\" stroke-width=\"9\" marker-end=\"url(#ah__UID__)\" d=\"M872,460 Q850,560 790,606\"/>\n  </g>\n  <g id=\"farB__UID__\" opacity=\"0\">\n    <circle class=\"ring\" cx=\"374\" cy=\"987\" r=\"48\" fill=\"none\" stroke=\"var(--guide)\" stroke-width=\"5\"/>\n    <path class=\"halo\" stroke-width=\"17\" d=\"M500,1140 Q460,1060 410,1018\"/>\n    <path class=\"arw\" stroke-width=\"9\" marker-end=\"url(#ah__UID__)\" d=\"M500,1140 Q460,1060 410,1018\"/>\n  </g>\n\n  <!-- 放大後箭頭 -->\n  <g id=\"nearA__UID__\" opacity=\"0\">\n    <path class=\"halo\" stroke-width=\"3.4\" d=\"M812,560 Q800,590 772,606\"/>\n    <path class=\"arw\" stroke-width=\"1.8\" marker-end=\"url(#ah__UID__)\" d=\"M812,560 Q800,590 772,606\"/>\n    <path class=\"halo\" stroke-width=\"3.4\" d=\"M812,730 Q796,705 770,688\"/>\n    <path class=\"arw\" stroke-width=\"1.8\" marker-end=\"url(#ah__UID__)\" d=\"M812,730 Q796,705 770,688\"/>\n  </g>\n  <g id=\"nearB__UID__\" opacity=\"0\">\n    <path class=\"halo\" stroke-width=\"3\" d=\"M438,915 Q420,940 396,958\"/>\n    <path class=\"arw\" stroke-width=\"1.6\" marker-end=\"url(#ah__UID__)\" d=\"M438,915 Q420,940 396,958\"/>\n    <path class=\"halo\" stroke-width=\"3\" d=\"M438,1062 Q420,1036 396,1020\"/>\n    <path class=\"arw\" stroke-width=\"1.6\" marker-end=\"url(#ah__UID__)\" d=\"M438,1062 Q420,1036 396,1020\"/>\n  </g>\n</svg>",factory:function(root,UID){

const $=id=>document.getElementById(id+UID);
const NS='http://www.w3.org/2000/svg';
const svg=$('stage');
const clamp=x=>Math.min(1,Math.max(0,x));
const ease=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;

// ---- 刮痕（固定種子）----
let seed=11; const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
function makeScratches(g,{x0,x1,y0,y1,n,ang,len,w,patch}){
  const list=[];
  const pa=document.createElementNS(NS,'path');
  pa.setAttribute('d',patch); pa.setAttribute('fill','var(--scratch)'); pa.setAttribute('opacity',0);
  g.appendChild(pa);
  for(let i=0;i<n;i++){
    const x=x0+rnd()*(x1-x0), y=y0+rnd()*(y1-y0);
    const L=len[0]+rnd()*(len[1]-len[0]), a=(ang+(rnd()-.5)*20)*Math.PI/180;
    const mx=x+Math.cos(a)*L*.5+(rnd()-.5)*w*2, my=y+Math.sin(a)*L*.5+(rnd()-.5)*w*2;
    const ex=x+Math.cos(a)*L, ey=y+Math.sin(a)*L;
    const p=document.createElementNS(NS,'path');
    p.setAttribute('d',`M${x.toFixed(2)},${y.toFixed(2)} L${mx.toFixed(2)},${my.toFixed(2)} L${ex.toFixed(2)},${ey.toFixed(2)}`);
    p.setAttribute('fill','none'); p.setAttribute('stroke','var(--scratch)'); p.setAttribute('stroke-linecap','round');
    p.setAttribute('stroke-width',(w*(.6+rnd()*.9)).toFixed(2));
    const l2=L*1.15; p.setAttribute('stroke-dasharray',l2); p.setAttribute('stroke-dashoffset',l2);
    p.dataset.len=l2; p.dataset.op=(.55+rnd()*.45).toFixed(2);
    g.appendChild(p); list.push(p);
  }
  return {patch:pa,list};
}
const SC={
  A:makeScratches($('scA'),{x0:728,x1:764,y0:604,y1:684,n:40,ang:-62,len:[5,14],w:.55,
    patch:'M744,606 Q760,618 762,640 Q762,668 750,684 Q738,680 736,660 Q734,630 744,606Z'}),
  B:makeScratches($('scB'),{x0:366,x1:389,y0:964,y1:1012,n:46,ang:-60,len:[4,11],w:.55,
    patch:'M378,964 Q388,972 388,988 Q387,1006 380,1012 Q372,1006 371,990 Q371,972 378,964Z'})
};
function drawScratches(s,p,fade){
  s.patch.setAttribute('opacity',(clamp(p/.3)*.26*fade).toFixed(3));
  s.list.forEach((el,i)=>{
    const q=clamp((p-i/s.list.length*.75)/.15);
    el.setAttribute('stroke-dashoffset',(el.dataset.len*(1-q)).toFixed(2));
    el.setAttribute('opacity',(el.dataset.op*fade).toFixed(3));
  });
}

// ---- 鏡頭 ----
const FAR=[0,0,896,1196];
const WIN={A:[652,524,170,227], B:[299,887,150,200]};
function cam(z,W){
  const w=FAR[2]*Math.pow(W[2]/FAR[2],z);
  const k=(FAR[2]-w)/(FAR[2]-W[2]);
  const x=FAR[0]+(W[0]-FAR[0])*k, y=FAR[1]+(W[1]-FAR[1])*k, h=w*FAR[3]/FAR[2];
  svg.setAttribute('viewBox',`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`);
}

// 單一部位時間軸（秒）
// 0–0.4 全景｜0.4–1.3 箭頭指向｜1.3–2.7 放大｜2.7–3.1 近距箭頭｜3.1–4.7 刮痕出現
// 4.7–6.0 停留｜6.0–6.4 淡出｜6.4–7.6 縮回｜7.6–8.0 停頓
const SEG=8.0;
function part(t,id){
  let z=0;
  if(t>=1.3&&t<2.7) z=ease((t-1.3)/1.4); else if(t>=2.7&&t<6.4) z=1; else if(t>=6.4&&t<7.6) z=1-ease((t-6.4)/1.2);
  cam(z,WIN[id]);
  const far=$('far'+id);
  far.setAttribute('opacity', t<0.4?0 : t<0.8?(t-.4)/.4 : t<1.3?1 : t<1.7?1-(t-1.3)/.4 : 0);
  const ph=(t*1.5)%1, ring=far.querySelector('.ring'), r0=id==='A'?52:40;
  ring.setAttribute('r',(r0+ph*22).toFixed(1)); ring.setAttribute('opacity',(1-ph).toFixed(2));
  $('near'+id).setAttribute('opacity', t<2.7?0 : t<3.1?(t-2.7)/.4 : t<4.7?1 : t<5.1?1-(t-4.7)/.4 : 0);
  const fade=t<6.0?1 : t<6.4?1-(t-6.0)/.4 : 0;
  drawScratches(SC[id], t<3.1?0:clamp((t-3.1)/1.6), fade);
}
function reset(id){
  $('far'+id).setAttribute('opacity',0); $('near'+id).setAttribute('opacity',0); drawScratches(SC[id],0,0);
}


const NT=[0,.15,.45,.95,1.1,1.6,1.9,2.0,2.4].map(x=>x*4.5/2.4), OT=[0,.4,1.3,2.7,3.1,4.7,6.0,6.4,7.6];
const map=t=>{ for(let i=1;i<NT.length;i++) if(t<=NT[i]) return OT[i-1]+(t-NT[i-1])/(NT[i]-NT[i-1])*(OT[i]-OT[i-1]); return OT[OT.length-1]; };
const P=NT[NT.length-1];
function frame(t){ if(t<P){ reset('B'); part(map(t),'A'); } else { reset('A'); part(map(t-P),'B'); } }
function still(){
  svg.setAttribute('viewBox','300 560 520 520');
  drawScratches(SC.A,1,1); drawScratches(SC.B,1,1);
  ['A','B'].forEach(id=>{ $('near'+id).setAttribute('opacity',0); const f=$('far'+id); f.setAttribute('opacity',1); f.querySelector('.ring').setAttribute('opacity',0); });
}

return {T:P*2, end:P*2, frame, still};
}};
ANIMS["fork"]={markup:"<svg id=\"stage__UID__\" viewBox=\"0 0 896 1196\" role=\"img\" aria-label=\"放大避震器下座，檢查下方刮傷與倒地痕跡的引導動畫\">\n  <defs>\n    <marker id=\"ah__UID__\" viewBox=\"0 0 10 10\" refX=\"6\" refY=\"5\" markerWidth=\"3.2\" markerHeight=\"3.2\" orient=\"auto\">\n      <path d=\"M0,0 L10,5 L0,10 z\" fill=\"var(--guide)\" stroke=\"var(--bg)\" stroke-width=\"1\"/>\n    </marker>\n    <mask id=\"m1__UID__\" maskUnits=\"userSpaceOnUse\" x=\"380\" y=\"560\" width=\"240\" height=\"220\">\n      <polygon points=\"452,604 585,662 546,740 428,690\" fill=\"#fff\"/>\n      <ellipse cx=\"449\" cy=\"647\" rx=\"31\" ry=\"43\" fill=\"#fff\"/>\n      <ellipse cx=\"443.5\" cy=\"650\" rx=\"22\" ry=\"36\" fill=\"#000\"/>\n    </mask>\n    <clipPath id=\"c2__UID__\"><polygon points=\"640,739 684,735 724,702 731,713 687,750 640,755\"/></clipPath>\n    <clipPath id=\"c3__UID__\"><polygon points=\"466,803 563,746 575,756 476,815\"/></clipPath>\n  </defs>\n\n  <image href=\"__IMG_10__\" x=\"0\" y=\"0\" width=\"896\" height=\"1196\"/>\n\n  <g id=\"s1__UID__\" mask=\"url(#m1__UID__)\"></g>\n  <g id=\"s2__UID__\" clip-path=\"url(#c2__UID__)\"></g>\n  <g id=\"s3__UID__\" clip-path=\"url(#c3__UID__)\"></g>\n\n  <!-- 全景：指向下座 -->\n  <g id=\"far__UID__\" opacity=\"0\">\n    <ellipse id=\"ring__UID__\" cx=\"575\" cy=\"690\" rx=\"170\" ry=\"140\" fill=\"none\" stroke=\"var(--guide)\" stroke-width=\"5\"/>\n    <path class=\"halo\" stroke-width=\"17\" d=\"M250,1080 Q330,900 470,830\"/>\n    <path class=\"arw\" stroke-width=\"9\" marker-end=\"url(#ah__UID__)\" d=\"M250,1080 Q330,900 470,830\"/>\n  </g>\n\n  <!-- 放大：指向三處下緣 -->\n  <g id=\"near__UID__\" opacity=\"0\">\n    <path class=\"halo\" stroke-width=\"6\" d=\"M372,760 Q404,746 432,712\"/>\n    <path class=\"arw\" stroke-width=\"3.2\" marker-end=\"url(#ah__UID__)\" d=\"M372,760 Q404,746 432,712\"/>\n    <path class=\"halo\" stroke-width=\"6\" d=\"M498,890 Q508,856 512,822\"/>\n    <path class=\"arw\" stroke-width=\"3.2\" marker-end=\"url(#ah__UID__)\" d=\"M498,890 Q508,856 512,822\"/>\n    <path class=\"halo\" stroke-width=\"6\" d=\"M712,860 Q702,820 692,766\"/>\n    <path class=\"arw\" stroke-width=\"3.2\" marker-end=\"url(#ah__UID__)\" d=\"M712,860 Q702,820 692,766\"/>\n  </g>\n</svg>",factory:function(root,UID){

const $=id=>document.getElementById(id+UID);
const NS='http://www.w3.org/2000/svg';
const svg=$('stage');
const clamp=x=>Math.min(1,Math.max(0,x));
const ease=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;

// ---- 刮痕（固定種子）----
let seed=23; const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
function makeScratches(g,{x0,x1,y0,y1,n,ang,len,w,patch}){
  const pa=document.createElementNS(NS,'path');
  pa.setAttribute('d',patch); pa.setAttribute('fill','var(--scratch)'); pa.setAttribute('opacity',0); g.appendChild(pa);
  const list=[];
  for(let i=0;i<n;i++){
    const x=x0+rnd()*(x1-x0), y=y0+rnd()*(y1-y0);
    const L=len[0]+rnd()*(len[1]-len[0]), a=(ang+(rnd()-.5)*20)*Math.PI/180;
    const mx=x+Math.cos(a)*L*.5+(rnd()-.5)*w*2, my=y+Math.sin(a)*L*.5+(rnd()-.5)*w*2;
    const ex=x+Math.cos(a)*L, ey=y+Math.sin(a)*L;
    const p=document.createElementNS(NS,'path');
    p.setAttribute('d',`M${x.toFixed(2)},${y.toFixed(2)} L${mx.toFixed(2)},${my.toFixed(2)} L${ex.toFixed(2)},${ey.toFixed(2)}`);
    p.setAttribute('fill','none'); p.setAttribute('stroke','var(--scratch)'); p.setAttribute('stroke-linecap','round');
    p.setAttribute('stroke-width',(w*(.6+rnd()*.9)).toFixed(2));
    const l2=L*1.15; p.setAttribute('stroke-dasharray',l2); p.setAttribute('stroke-dashoffset',l2);
    p.dataset.len=l2; p.dataset.op=(.55+rnd()*.45).toFixed(2);
    g.appendChild(p); list.push(p);
  }
  return {patch:pa,list};
}
const SC=[
  makeScratches($('s1'),{x0:420,x1:556,y0:660,y1:744,n:48,ang:27,len:[10,26],w:1.0,
    patch:'M422,668 Q440,694 470,708 L550,742 L560,722 L478,686 Q452,676 440,652 Z'}),
  makeScratches($('s2'),{x0:636,x1:732,y0:698,y1:756,n:46,ang:-35,len:[8,20],w:1.0,
    patch:'M642,742 L686,738 L726,705 L730,713 L688,750 L642,754Z'}),
  makeScratches($('s3'),{x0:462,x1:578,y0:744,y1:818,n:40,ang:-30,len:[8,20],w:1.0,
    patch:'M468,805 L564,749 L574,756 L476,813Z'})
];
function drawScratches(p,fade){
  SC.forEach((s,k)=>{
    const pk=clamp((p-k*.25)/.5);            // 三處依序出現
    s.patch.setAttribute('opacity',(clamp(pk/.3)*.24*fade).toFixed(3));
    s.list.forEach((el,i)=>{
      const q=clamp((pk-i/s.list.length*.75)/.15);
      el.setAttribute('stroke-dashoffset',(el.dataset.len*(1-q)).toFixed(2));
      el.setAttribute('opacity',(el.dataset.op*fade).toFixed(3));
    });
  });
}

// ---- 鏡頭 ----
const FAR=[0,0,896,1196];
const WIN=[405,460,340,454];
function cam(z){
  const w=FAR[2]*Math.pow(WIN[2]/FAR[2],z);
  const k=(FAR[2]-w)/(FAR[2]-WIN[2]);
  const x=FAR[0]+(WIN[0]-FAR[0])*k, y=FAR[1]+(WIN[1]-FAR[1])*k, h=w*FAR[3]/FAR[2];
  svg.setAttribute('viewBox',`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`);
}

// 時間軸（秒），一輪 6.2 秒
// 0–0.3 全景｜0.3–1.0 箭頭指向下座｜1.0–2.0 放大｜2.0–2.3 近距箭頭
// 2.3–3.8 三處刮痕依序出現｜3.8–4.8 停留｜4.8–5.1 淡出｜5.1–5.9 縮回｜5.9–6.2 停頓
const T=6.2;
function frame(t){
  let z=0;
  if(t>=1.0&&t<2.0) z=ease((t-1.0)/1.0); else if(t>=2.0&&t<5.1) z=1; else if(t>=5.1&&t<5.9) z=1-ease((t-5.1)/.8);
  cam(z);
  $('far').setAttribute('opacity', t<0.3?0 : t<0.6?(t-.3)/.3 : t<1.0?1 : t<1.3?1-(t-1.0)/.3 : 0);
  const ph=(t*1.5)%1; $('ring').setAttribute('rx',(150+ph*30).toFixed(1)); $('ring').setAttribute('ry',(124+ph*25).toFixed(1));
  $('ring').setAttribute('opacity',(1-ph).toFixed(2));
  $('near').setAttribute('opacity', t<2.0?0 : t<2.3?(t-2.0)/.3 : t<3.8?1 : t<4.1?1-(t-3.8)/.3 : 0);
  const fade=t<4.8?1 : t<5.1?1-(t-4.8)/.3 : 0;
  drawScratches(t<2.3?0:clamp((t-2.3)/1.5), fade);
}


return {T, end:3.78, frame, still(){ frame(3.78); }};
}};
ANIMS["clamp"]={markup:"<div class=\"stage\" role=\"img\" aria-label=\"放大車頭下方的下三角台，檢查擋點是否完整的引導動畫\">\n  <!-- 前視全景 -->\n  <svg id=\"front__UID__\" viewBox=\"0 0 896 1196\" preserveAspectRatio=\"xMidYMid slice\">\n    <defs>\n      <marker id=\"ah1__UID__\" viewBox=\"0 0 10 10\" refX=\"6\" refY=\"5\" markerWidth=\"3.2\" markerHeight=\"3.2\" orient=\"auto\">\n        <path d=\"M0,0 L10,5 L0,10 z\" fill=\"var(--guide)\" stroke=\"var(--bg)\" stroke-width=\"1\"/>\n      </marker>\n    </defs>\n    <image href=\"__IMG_11__\" width=\"896\" height=\"1196\"/>\n    <g id=\"far__UID__\" opacity=\"0\">\n      <ellipse id=\"ring__UID__\" cx=\"440\" cy=\"722\" rx=\"150\" ry=\"52\" fill=\"none\" stroke=\"var(--guide)\" stroke-width=\"5\"/>\n      <path class=\"halo\" stroke-width=\"17\" d=\"M150,1080 Q230,840 392,742\"/>\n      <path class=\"arw\" stroke-width=\"9\" marker-end=\"url(#ah1__UID__)\" d=\"M150,1080 Q230,840 392,742\"/>\n    </g>\n  </svg>\n\n  <!-- 下三角台特寫 -->\n  <svg id=\"close__UID__\" viewBox=\"0 0 1379 1839\" preserveAspectRatio=\"xMidYMid slice\" opacity=\"0\">\n    <defs>\n      <marker id=\"ah2__UID__\" viewBox=\"0 0 10 10\" refX=\"6\" refY=\"5\" markerWidth=\"3.2\" markerHeight=\"3.2\" orient=\"auto\">\n        <path d=\"M0,0 L10,5 L0,10 z\" fill=\"var(--guide)\" stroke=\"var(--bg)\" stroke-width=\"1\"/>\n      </marker>\n    </defs>\n    <rect width=\"1379\" height=\"1839\" fill=\"var(--bg)\"/>\n    <image href=\"__IMG_12__\" width=\"1379\" height=\"1839\"/>\n\n    <!-- 擋點高亮 -->\n    <image id=\"glow__UID__\" href=\"__IMG_13__\" x=\"480\" y=\"500\" width=\"560\" height=\"150\" opacity=\"0\"/>\n\n    <!-- 損傷：缺角 + 裂痕 + 掉落碎片 -->\n    <g id=\"dmg__UID__\" opacity=\"0\">\n      <image href=\"__IMG_14__\" x=\"930\" y=\"530\" width=\"90\" height=\"110\"/>\n      <path id=\"crack__UID__\" d=\"M950,548 L942,566 L950,580 L938,596 L944,614\" fill=\"none\" stroke=\"var(--bg)\" stroke-width=\"4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n    </g>\n    <g id=\"fall__UID__\" opacity=\"0\"><image href=\"__IMG_15__\" x=\"930\" y=\"530\" width=\"90\" height=\"110\"/></g>\n\n    <g id=\"near__UID__\" opacity=\"0\">\n      <path class=\"halo\" stroke-width=\"24\" d=\"M440,330 Q520,400 548,500\"/>\n      <path class=\"arw\" stroke-width=\"13\" marker-end=\"url(#ah2__UID__)\" d=\"M440,330 Q520,400 548,500\"/>\n      <path class=\"halo\" stroke-width=\"24\" d=\"M1080,350 Q990,420 952,534\"/>\n      <path class=\"arw\" stroke-width=\"13\" marker-end=\"url(#ah2__UID__)\" d=\"M1080,350 Q990,420 952,534\"/>\n    </g>\n  </svg>\n</div>",factory:function(root,UID){

const $=id=>document.getElementById(id+UID);
const clamp=x=>Math.min(1,Math.max(0,x));
const ease=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
const front=$('front'), close=$('close');

const FAR=[0,0,896,1196], WIN=[270,505,340,454];
function camFront(z){
  const w=FAR[2]*Math.pow(WIN[2]/FAR[2],z), k=(FAR[2]-w)/(FAR[2]-WIN[2]);
  const x=WIN[0]*k, y=WIN[1]*k, h=w*FAR[3]/FAR[2];
  front.setAttribute('viewBox',`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`);
}
// 特寫：先由略大的視野推近到完整畫面（p），再推近到兩個擋點（q）
const CW=[0,0,1379,1839], CZ=[405,150,700,933.5];
function camClose(p,q){
  const s=1.35-0.35*p, W=1379*s, H=1839*s;
  let v=[689.5-W/2, 700-H*700/1839, W, H];
  const wq=CW[2]*Math.pow(CZ[2]/CW[2],q), k=(CW[2]-wq)/(CW[2]-CZ[2]);
  if(q>0) v=[CZ[0]*k, CZ[1]*k, wq, wq*CW[3]/CW[2]];
  close.setAttribute('viewBox',v.map(n=>n.toFixed(1)).join(' '));
}

// 時間軸（秒），一輪 8 秒
// 0–0.3 全景｜0.3–1.0 箭頭指向車頭下方｜1.0–2.0 放大｜1.6–2.3 轉入特寫｜2.5–3.2 推近擋點
// 3.2–3.5 箭頭指向兩個擋點｜3.5–4.3 擋點高亮｜4.3–5.0 擋點崩角、碎片掉落
// 5.0–6.1 停留｜6.1–6.4 復原｜6.4–7.0 淡出特寫｜6.6–7.6 退回全景｜7.6–8.0 停頓
const T=8.0;
function frame(t){
  let z = t<1.0?0 : t<2.0?ease(t-1.0) : t<6.6?1 : t<7.6?1-ease((t-6.6)/1.0) : 0;
  camFront(z);
  $('far').setAttribute('opacity', t<0.3?0 : t<0.6?(t-.3)/.3 : t<1.0?1 : t<1.3?1-(t-1.0)/.3 : 0);
  const ph=(t*1.5)%1; $('ring').setAttribute('rx',(132+ph*30).toFixed(1)); $('ring').setAttribute('ry',(44+ph*14).toFixed(1));
  $('ring').setAttribute('opacity',(1-ph).toFixed(2));
  const co = t<1.6?0 : t<2.3?ease((t-1.6)/.7) : t<6.4?1 : t<7.0?1-ease((t-6.4)/.6) : 0;
  close.setAttribute('opacity',co.toFixed(3));
  const p = t<1.6?0 : t<2.5?ease((t-1.6)/.9) : 1;
  const q = t<2.5?0 : t<3.2?ease((t-2.5)/.7) : t<6.4?1 : t<7.0?1-ease((t-6.4)/.6) : 0;
  camClose(p,q);
  $('near').setAttribute('opacity', t<3.2?0 : t<3.5?(t-3.2)/.3 : t<5.0?1 : t<5.4?1-(t-5.0)/.4 : 0);
  const gl = t<3.5?0 : t<4.3?.25+.35*Math.abs(Math.sin((t-3.5)*Math.PI*2.5)) : t<6.1?.35 : t<6.4?.35*(1-(t-6.1)/.3) : 0;
  $('glow').setAttribute('opacity',gl.toFixed(3));
  const d = t<4.3?0 : t<6.1?1 : t<6.4?1-(t-6.1)/.3 : 0;
  $('dmg').setAttribute('opacity',d.toFixed(2));
  const cr=$('crack'); const cl=cr.getTotalLength(); cr.style.strokeDasharray=cl;
  cr.style.strokeDashoffset=(cl*(1-clamp((t-4.3)/.3))).toFixed(1);
  const f=clamp((t-4.6)/.6);
  $('fall').setAttribute('opacity', t<4.3?0 : t<4.6?1 : (1-f).toFixed(2));
  $('fall').setAttribute('transform',`translate(${(f*28).toFixed(1)} ${(f*f*140).toFixed(1)}) rotate(${(f*35).toFixed(1)} 985 575)`);
}


return {T, end:4.99, frame, still(){ frame(4.99); }};
}};
ANIMS["exhaust"]={markup:"<svg id=\"stage__UID__\" viewBox=\"0 0 896 1196\" role=\"img\" aria-label=\"放大排氣管下緣，檢查刮傷與倒地痕跡的引導動畫\">\n  <defs>\n    <marker id=\"ah__UID__\" viewBox=\"0 0 10 10\" refX=\"6\" refY=\"5\" markerWidth=\"3.2\" markerHeight=\"3.2\" orient=\"auto\">\n      <path d=\"M0,0 L10,5 L0,10 z\" fill=\"var(--guide)\" stroke=\"var(--bg)\" stroke-width=\"1\"/>\n    </marker>\n    <!-- 圈選範圍 -->\n    <clipPath id=\"zone__UID__\"><ellipse cx=\"332\" cy=\"861\" rx=\"352\" ry=\"44\" transform=\"rotate(-21.3 332 861)\"/></clipPath>\n    <!-- 排氣管本體（尾段＋中段） -->\n    <clipPath id=\"pipe__UID__\">\n      <polygon points=\"224,846 585,645 628,652 652,735 265,905\"/>\n      <polygon points=\"0,942 198,857 224,846 265,905 250,926 0,1006\"/>\n    </clipPath>\n  </defs>\n\n  <image href=\"__IMG_16__\" width=\"896\" height=\"1196\"/>\n\n  <g clip-path=\"url(#zone__UID__)\"><g id=\"sc__UID__\" clip-path=\"url(#pipe__UID__)\"></g></g>\n\n  <g id=\"far__UID__\" opacity=\"0\">\n    <path class=\"halo\" stroke-width=\"17\" d=\"M560,1130 Q520,1010 430,880\"/>\n    <path class=\"arw\" stroke-width=\"9\" marker-end=\"url(#ah__UID__)\" d=\"M560,1130 Q520,1010 430,880\"/>\n  </g>\n\n  <g id=\"near__UID__\" opacity=\"0\">\n    <path class=\"halo\" stroke-width=\"7\" d=\"M640,980 Q620,880 572,800\"/>\n    <path class=\"arw\" stroke-width=\"4\" marker-end=\"url(#ah__UID__)\" d=\"M640,980 Q620,880 572,800\"/>\n  </g>\n</svg>",factory:function(root,UID){

const $=id=>document.getElementById(id+UID);
const NS='http://www.w3.org/2000/svg';
const svg=$('stage');
const clamp=x=>Math.min(1,Math.max(0,x));
const ease=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;

// ---- 刮痕：沿排氣管下緣，方向與管身平行 ----
let seed=31; const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
const A=-21.3*Math.PI/180, ux=Math.cos(A), uy=Math.sin(A), nx=-uy, ny=ux;   // 管軸方向與法向
const CX=332, CY=861;
const g=$('sc'), list=[];
// 磨損底色：沿下緣的長條
const patch=document.createElementNS(NS,'path');
const P=(s,o)=>[(CX+ux*s+nx*o).toFixed(1),(CY+uy*s+ny*o).toFixed(1)].join(',');
patch.setAttribute('d',`M${P(-350,-28)} L${P(330,-28)} L${P(330,24)} L${P(-350,24)} Z`);
patch.setAttribute('fill','var(--scratch)'); patch.setAttribute('opacity',0); g.appendChild(patch);
for(let i=0;i<150;i++){
  const s=-350+rnd()*680;                 // 沿管軸位置
  const o=22-Math.pow(rnd(),.7)*50;        // 越靠下緣越密
  const L=8+rnd()*26, a=A+(rnd()-.5)*.16;
  const x=CX+ux*s+nx*o, y=CY+uy*s+ny*o;
  const mx=x+Math.cos(a)*L*.5+(rnd()-.5)*1.4, my=y+Math.sin(a)*L*.5+(rnd()-.5)*1.4;
  const ex=x+Math.cos(a)*L, ey=y+Math.sin(a)*L;
  const p=document.createElementNS(NS,'path');
  p.setAttribute('d',`M${x.toFixed(1)},${y.toFixed(1)} L${mx.toFixed(1)},${my.toFixed(1)} L${ex.toFixed(1)},${ey.toFixed(1)}`);
  p.setAttribute('fill','none'); p.setAttribute('stroke','var(--scratch)'); p.setAttribute('stroke-linecap','round');
  p.setAttribute('stroke-width',(.7+rnd()*1.3).toFixed(2));
  const l2=L*1.15; p.setAttribute('stroke-dasharray',l2); p.setAttribute('stroke-dashoffset',l2);
  p.dataset.len=l2; p.dataset.s=s; p.dataset.op=(.5+rnd()*.5).toFixed(2);
  g.appendChild(p); list.push(p);
}
// 由右（尾段）往左（中段）依序出現，跟著鏡頭平移
function scratches(front,fade){         // front: 目前畫到的管軸位置
  patch.setAttribute('opacity',(clamp((330-front)/200)*.2*fade).toFixed(3));
  list.forEach(el=>{
    const q=clamp((+el.dataset.s-front)/40);
    el.setAttribute('stroke-dashoffset',(el.dataset.len*(1-q)).toFixed(1));
    el.setAttribute('opacity',q>0?(el.dataset.op*fade).toFixed(2):0);
  });
}

// ---- 鏡頭 ----
const FAR=[0,0,896,1196];
const WA=[350,560,360,480.5];   // 尾段下緣
const WB=[0,700,360,480.5];     // 中段
function view(v){ svg.setAttribute('viewBox',v.map(n=>n.toFixed(1)).join(' ')); }
function zoomTo(W,z){
  const w=FAR[2]*Math.pow(W[2]/FAR[2],z), k=(FAR[2]-w)/(FAR[2]-W[2]);
  view([W[0]*k, W[1]*k, w, w*FAR[3]/FAR[2]]);
}

// 時間軸（秒），一輪 8.4 秒
// 0–0.3 全景｜0.3–1.0 圈出範圍＋箭頭｜1.0–2.0 放大到尾段下緣｜2.0–2.4 近距箭頭
// 2.4–5.2 鏡頭沿管身往前平移，刮痕依序出現｜5.2–6.4 停留｜6.4–6.8 淡出｜6.8–8.0 縮回｜8.0–8.4 停頓
const T=8.4;
function frame(t){
  if(t<1.0) view(FAR);
  else if(t<2.0) zoomTo(WA,ease(t-1.0));
  else if(t<2.4) view(WA);
  else if(t<5.2){ const k=ease((t-2.4)/2.8); view(WA.map((a,i)=>a+(WB[i]-a)*k)); }
  else if(t<6.8) view(WB);
  else if(t<8.0) zoomTo(WB,1-ease((t-6.8)/1.2));
  else view(FAR);
  $('far').setAttribute('opacity', t<0.3?0 : t<0.6?(t-.3)/.3 : t<1.0?1 : t<1.3?1-(t-1.0)/.3 : 0);
  $('near').setAttribute('opacity', t<2.0?0 : t<2.3?(t-2.0)/.3 : t<2.8?1 : t<3.1?1-(t-2.8)/.3 : 0);
  const front = t<2.4?400 : t<5.2?330-ease((t-2.4)/2.8)*720 : -400;
  const fade = t<6.4?1 : t<6.8?1-(t-6.4)/.4 : 0;
  scratches(front, fade);
}


return {T, end:5.3, frame, still(){ frame(5.3); }};
}};
ANIMS["engine"]={markup:"<svg id=\"stage__UID__\" viewBox=\"0 0 896 1196\" role=\"img\" aria-label=\"放大引擎左側外蓋下緣，檢查刮傷與倒地痕跡的引導動畫\">\n  <defs>\n    <marker id=\"ah__UID__\" viewBox=\"0 0 10 10\" refX=\"6\" refY=\"5\" markerWidth=\"3.2\" markerHeight=\"3.2\" orient=\"auto\">\n      <path d=\"M0,0 L10,5 L0,10 z\" fill=\"var(--guide)\" stroke=\"var(--bg)\" stroke-width=\"1\"/>\n    </marker>\n    <clipPath id=\"z1__UID__\"><ellipse cx=\"430\" cy=\"917\" rx=\"70\" ry=\"52\" transform=\"rotate(-6 430 917)\"/></clipPath>\n    <clipPath id=\"z2__UID__\"><ellipse cx=\"563\" cy=\"977\" rx=\"72\" ry=\"54\" transform=\"rotate(5 563 977)\"/></clipPath>\n    <clipPath id=\"cov1__UID__\"><circle cx=\"432\" cy=\"861\" r=\"92\"/></clipPath>\n    <clipPath id=\"cov2__UID__\"><circle cx=\"553\" cy=\"932\" r=\"54\"/></clipPath>\n  </defs>\n\n  <image href=\"__IMG_17__\" width=\"896\" height=\"1196\"/>\n\n  <g clip-path=\"url(#z1__UID__)\"><g id=\"s1__UID__\" clip-path=\"url(#cov1__UID__)\"></g></g>\n  <g clip-path=\"url(#z2__UID__)\"><g id=\"s2__UID__\" clip-path=\"url(#cov2__UID__)\"></g></g>\n\n  <g id=\"far__UID__\" opacity=\"0\">\n    <path class=\"halo\" stroke-width=\"17\" d=\"M260,1150 Q300,1040 372,968\"/>\n    <path class=\"arw\" stroke-width=\"9\" marker-end=\"url(#ah__UID__)\" d=\"M260,1150 Q300,1040 372,968\"/>\n    <path class=\"halo\" stroke-width=\"17\" d=\"M720,1150 Q680,1080 622,1030\"/>\n    <path class=\"arw\" stroke-width=\"9\" marker-end=\"url(#ah__UID__)\" d=\"M720,1150 Q680,1080 622,1030\"/>\n  </g>\n\n  <g id=\"near__UID__\" opacity=\"0\">\n    <path class=\"halo\" stroke-width=\"6.5\" d=\"M360,1060 Q372,1010 394,975\"/>\n    <path class=\"arw\" stroke-width=\"3.6\" marker-end=\"url(#ah__UID__)\" d=\"M360,1060 Q372,1010 394,975\"/>\n    <path class=\"halo\" stroke-width=\"6.5\" d=\"M630,1100 Q610,1050 586,1000\"/>\n    <path class=\"arw\" stroke-width=\"3.6\" marker-end=\"url(#ah__UID__)\" d=\"M630,1100 Q610,1050 586,1000\"/>\n  </g>\n</svg>",factory:function(root,UID){

const $=id=>document.getElementById(id+UID);
const NS='http://www.w3.org/2000/svg';
const svg=$('stage');
const clamp=x=>Math.min(1,Math.max(0,x));
const ease=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;

// ---- 刮痕：外蓋下緣，倒地拖行方向（近水平）----
let seed=41; const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
function makeScratches(g,{cx,cy,r,from,to,n,len,w}){
  const pa=document.createElementNS(NS,'path');
  // 磨損底色：外蓋下緣的弧形帶
  const a0=from*Math.PI/180, a1=to*Math.PI/180, ri=r*.72;
  const P=(rr,a)=>`${(cx+rr*Math.cos(a)).toFixed(1)},${(cy+rr*Math.sin(a)).toFixed(1)}`;
  pa.setAttribute('d',`M${P(r+4,a0)} A${r+4},${r+4} 0 0 1 ${P(r+4,a1)} L${P(ri,a1)} A${ri},${ri} 0 0 0 ${P(ri,a0)} Z`);
  pa.setAttribute('fill','var(--scratch)'); pa.setAttribute('opacity',0); g.appendChild(pa);
  const list=[];
  for(let i=0;i<n;i++){
    const a=(from+rnd()*(to-from))*Math.PI/180;
    const rr=r*(1.02-Math.pow(rnd(),.6)*.32);          // 越靠外緣越密
    const x=cx+rr*Math.cos(a), y=cy+rr*Math.sin(a);
    const L=len[0]+rnd()*(len[1]-len[0]);
    const d=(rnd()-.5)*24*Math.PI/180 + (rnd()<.5?0:Math.PI);   // 近水平、左右皆有
    const mx=x+Math.cos(d)*L*.5+(rnd()-.5)*w*2, my=y+Math.sin(d)*L*.5+(rnd()-.5)*w*2;
    const ex=x+Math.cos(d)*L, ey=y+Math.sin(d)*L;
    const p=document.createElementNS(NS,'path');
    p.setAttribute('d',`M${x.toFixed(1)},${y.toFixed(1)} L${mx.toFixed(1)},${my.toFixed(1)} L${ex.toFixed(1)},${ey.toFixed(1)}`);
    p.setAttribute('fill','none'); p.setAttribute('stroke','var(--scratch)'); p.setAttribute('stroke-linecap','round');
    p.setAttribute('stroke-width',(w*(.6+rnd()*.9)).toFixed(2));
    const l2=L*1.15; p.setAttribute('stroke-dasharray',l2); p.setAttribute('stroke-dashoffset',l2);
    p.dataset.len=l2; p.dataset.op=(.5+rnd()*.5).toFixed(2);
    g.appendChild(p); list.push(p);
  }
  return {patch:pa,list};
}
const SC=[
  makeScratches($('s1'),{cx:432,cy:861,r:92,from:30,to:150,n:90,len:[6,18],w:.9}),
  makeScratches($('s2'),{cx:553,cy:932,r:54,from:20,to:160,n:70,len:[5,14],w:.8})
];
function drawScratches(p,fade){
  SC.forEach((s,k)=>{
    const pk=clamp((p-k*.45)/.55);
    s.patch.setAttribute('opacity',(clamp(pk/.3)*.22*fade).toFixed(3));
    s.list.forEach((el,i)=>{
      const q=clamp((pk-i/s.list.length*.75)/.15);
      el.setAttribute('stroke-dashoffset',(el.dataset.len*(1-q)).toFixed(1));
      el.setAttribute('opacity',q>0?(el.dataset.op*fade).toFixed(2):0);
    });
  });
}

// ---- 鏡頭 ----
const FAR=[0,0,896,1196], WIN=[335,735,320,427];
function zoom(z){
  const w=FAR[2]*Math.pow(WIN[2]/FAR[2],z), k=(FAR[2]-w)/(FAR[2]-WIN[2]);
  svg.setAttribute('viewBox',[WIN[0]*k, WIN[1]*k, w, w*FAR[3]/FAR[2]].map(n=>n.toFixed(1)).join(' '));
}

// 時間軸（秒），一輪 7.6 秒
// 0–0.3 全景｜0.3–1.0 圈出兩處＋箭頭｜1.0–2.1 放大｜2.1–2.5 近距箭頭
// 2.5–4.3 兩處刮痕依序出現｜4.3–5.6 停留｜5.6–6.0 淡出｜6.0–7.2 縮回｜7.2–7.6 停頓
const T=7.6;
function frame(t){
  zoom(t<1.0?0 : t<2.1?ease((t-1.0)/1.1) : t<6.0?1 : t<7.2?1-ease((t-6.0)/1.2) : 0);
  $('far').setAttribute('opacity', t<0.3?0 : t<0.6?(t-.3)/.3 : t<1.0?1 : t<1.3?1-(t-1.0)/.3 : 0);
  const ph=(t*1.5)%1;
  root.querySelectorAll('.ring').forEach(r=>{ r.setAttribute('stroke-opacity',(1-ph*.7).toFixed(2)); r.setAttribute('stroke-width',(6+ph*6).toFixed(1)); });
  $('near').setAttribute('opacity', t<2.1?0 : t<2.4?(t-2.1)/.3 : t<4.3?1 : t<4.7?1-(t-4.3)/.4 : 0);
  const fade=t<5.6?1 : t<6.0?1-(t-5.6)/.4 : 0;
  drawScratches(t<2.5?0:clamp((t-2.5)/1.8), fade);
}


return {T, end:4.28, frame, still(){ frame(4.28); }};
}};


export interface AppearanceAnimInstance {
  loop(onTick?: (elapsed: number, total: number) => void): void
  playOnce(done?: () => void): void
  still(): void
  stop(): void
}

let uid = 0
/** Same as the original page's mount(): 'meet' = full animation screen,
 *  'fill' = the freeze-frame header above the check sheet. */
export function mountAppearanceAnim(host, key, mode) {
  const A = ANIMS[key], u = '_' + (++uid)
  host.innerHTML = A.markup.replaceAll('__UID__', u).replace(/__IMG_(\d+)__/g, (_m, n) => IMG[Number(n)])
  host.querySelectorAll(':scope > svg, :scope > .stage > svg').forEach((s) =>
    s.setAttribute('preserveAspectRatio', mode === 'fill' && key !== 'steer' ? 'xMidYMid slice' : 'xMidYMid meet'))
  if (key === 'clamp') host.querySelectorAll('.stage > svg').forEach((s) => s.setAttribute('preserveAspectRatio', 'xMidYMid slice'))
  const api = A.factory(host, u)
  let raf = 0
  return {
    loop(onTick) { cancelAnimationFrame(raf); const t0 = performance.now()
      const f = (now) => { const el = (now - t0) / 1000; api.frame(el % api.T); onTick && onTick(el, api.T); raf = requestAnimationFrame(f) }; raf = requestAnimationFrame(f) },
    playOnce(done) { cancelAnimationFrame(raf); const t0 = performance.now(), END = api.end
      const f = (now) => { const el = (now - t0) / 1000; if (el >= END) { api.still(); done && done(); return } api.frame(el); raf = requestAnimationFrame(f) }; raf = requestAnimationFrame(f) },
    still() { cancelAnimationFrame(raf); api.still() },
    stop() { cancelAnimationFrame(raf); host.innerHTML = '' },
  }
}
