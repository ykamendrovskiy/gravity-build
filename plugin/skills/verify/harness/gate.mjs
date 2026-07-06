// gate.mjs — in-page invariants, self-contained for injection.
// Both functions run inside the page (Playwright page.evaluate OR MCP preview_eval).
// gateDom  = width-independent checks (run once at a reference width).
// gateLayout = width-dependent checks (run per breakpoint in the sweep).

export function gateDom() {
  function parse(str){ if(!str) return null; var m=str.match(/rgba?\(([^)]+)\)/); if(!m) return null; var p=m[1].split(',').map(function(x){return parseFloat(x.trim());}); return [p[0],p[1],p[2],p.length>3?p[3]:1]; }
  // effective background = composite the ACTUAL visual stack under the text's center point
  // (elementsFromPoint), not just DOM ancestors — page-constructor/cards paint their surface on a
  // positioned background layer that is NOT an ancestor of the text (else → white-on-white false positive).
  function effBg(el){
    var r=el.getBoundingClientRect();
    var cx=Math.min(Math.max(r.left+r.width/2,1),window.innerWidth-1);
    var cy=Math.min(Math.max(r.top+r.height/2,1),window.innerHeight-1);
    var layers=null;
    try{ var st=document.elementsFromPoint(cx,cy); var idx=st.indexOf(el); if(idx>=0) layers=st.slice(idx); }catch(e){}
    if(!layers||!layers.length){ layers=[]; var e2=el; while(e2){ layers.push(e2); e2=e2.parentElement; } } // fallback: ancestor walk (offscreen)
    var base=[255,255,255];
    function comp(c){ if(c&&c[3]>0) base=[c[0]*c[3]+base[0]*(1-c[3]), c[1]*c[3]+base[1]*(1-c[3]), c[2]*c[3]+base[2]*(1-c[3])]; }
    // per layer, back-to-front: fold in ::before fill (uikit buttons paint their surface there) then the element's own bg
    for(var i=layers.length-1;i>=0;i--){ var L=layers[i]; comp(parse(getComputedStyle(L,'::before').backgroundColor)); comp(parse(getComputedStyle(L).backgroundColor)); }
    return base;
  }
  function lin(v){ return Math.pow(v/255.0,2.4); }
  function sRGBtoY(c){ return 0.2126729*lin(c[0])+0.7151522*lin(c[1])+0.0721750*lin(c[2]); }
  function APCA(txt,bg){ var blkThrs=0.022,blkClmp=1.414,deltaYmin=0.0005,loClip=0.1,normBG=0.56,normTXT=0.57,revTXT=0.62,revBG=0.65,scaleBoW=1.14,scaleWoB=1.14,loBoWoffset=0.027,loWoBoffset=0.027; var ty=sRGBtoY(txt),by=sRGBtoY(bg); ty=ty>blkThrs?ty:ty+Math.pow(blkThrs-ty,blkClmp); by=by>blkThrs?by:by+Math.pow(blkThrs-by,blkClmp); if(Math.abs(by-ty)<deltaYmin) return 0.0; var out; if(by>ty){ var s1=(Math.pow(by,normBG)-Math.pow(ty,normTXT))*scaleBoW; out=s1<loClip?0.0:s1-loBoWoffset; } else { var s2=(Math.pow(by,revBG)-Math.pow(ty,revTXT))*scaleWoB; out=s2>-loClip?0.0:s2+loWoBoffset; } return out*100.0; }
  function visible(el){ var r=el.getBoundingClientRect(); if(r.width<1||r.height<1) return false; var s=getComputedStyle(el); return s.display!=='none'&&s.visibility!=='hidden'&&parseFloat(s.opacity)>0.05; }
  function directText(el){ for(var i=0;i<el.childNodes.length;i++){ var n=el.childNodes[i]; if(n.nodeType===3&&n.textContent.trim().length>0) return n.textContent.trim(); } return null; }
  function sel(el){ var s=el.tagName.toLowerCase(); if(el.className&&typeof el.className==='string'){ var c=el.className.split(/\s+/).filter(function(x){return x&&(x.indexOf('g-')===0||x.indexOf('pc-')===0);}).slice(0,2).join('.'); if(c) s+='.'+c; } return s; }

  var out={contrast:[],contrastChecked:0,brokenImages:[],buttonIconLeak:[],controlRowMismatch:[],objectObject:[],zeroFillSvg:[],emptySlot:[],tableUnderfill:[]};

  // contrast (APCA) + literal [object Object] in one pass over text nodes
  var els=document.querySelectorAll('body *');
  for(var i=0;i<els.length;i++){ var el=els[i]; var t=directText(el); if(!t||!visible(el)) continue;
    var col=parse(getComputedStyle(el).color); if(col){ var lc=APCA([col[0],col[1],col[2]],effBg(el)); out.contrastChecked++; if(Math.abs(lc)<30) out.contrast.push({sel:sel(el),text:t.slice(0,30),Lc:Math.round(lc*10)/10,severity:Math.abs(lc)<15?'invisible':'poor'}); }
    if(t.indexOf('[object Object]')>=0) out.objectObject.push({sel:sel(el),text:t.slice(0,30)});
  }
  out.contrast.sort(function(a,b){return Math.abs(a.Lc)-Math.abs(b.Lc);}); out.contrast=out.contrast.slice(0,20);

  // broken images (bad src / btoa blank / XML-escape)
  // ProseMirror-separator: служебный srcless-img prosemirror-view (курсор/линии contenteditable, создаётся
  // библиотекой — prosemirror-view/dist/index.js «dom.className="ProseMirror-separator"»); не контент —
  // FP-класс markdown-editor-сборок (S3 figma-naive), спец-кейс как pc-storage|background у emptySlot.
  var imgs=document.querySelectorAll('img'); for(var j=0;j<imgs.length;j++){ if(/(^|\s)ProseMirror-separator(\s|$)/.test(imgs[j].className||'')) continue; if(imgs[j].complete&&imgs[j].naturalWidth===0) out.brokenImages.push({src:(imgs[j].getAttribute('src')||'').slice(0,50)}); }

  // icon+text Button with icon leaked into text slot (Fragment)
  var btns=document.querySelectorAll('.g-button'); for(var k=0;k<btns.length;k++){ var b=btns[k]; if(b.querySelector('svg')&&b.textContent.trim()&&!b.querySelector('[class*="g-button__icon"]')) out.buttonIconLeak.push({text:b.textContent.trim().slice(0,25)}); }

  // control-row size mismatch (button vs input/select in one row)
  var ctrls=[]; ['.g-button','.g-text-input','.g-select','.g-text-area'].forEach(function(s){ document.querySelectorAll(s).forEach(function(e){ if(!visible(e)) return;
    // кнопка ВНУТРИ контрола (стрелки NumberInput, clear, календарь-триггер) — служебный виджет, не участник «ряда»:
    // пэйрилась и со СВОИМ инпутом, и с СОСЕДНИМ (от/до) — FP-класс fanout-01 ESC-1
    if(s==='.g-button'&&e.parentElement&&e.parentElement.closest('.g-text-input,.g-select,.g-text-area')) return;
    var r=e.getBoundingClientRect(); ctrls.push({kind:s,el:e,top:r.top,bottom:r.bottom,left:r.left,right:r.right,h:Math.round(r.height)}); }); });
  function sameRow(a,b){ var ov=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top); return ov>0.4*Math.min(a.h,b.h); }
  function adj(a,b){ var g=a.left<b.left?b.left-a.right:a.left-b.right; return g>-4&&g<48; }
  var seen={}; for(var x=0;x<ctrls.length;x++) for(var y=x+1;y<ctrls.length;y++){ var A=ctrls[x],B=ctrls[y]; if(A.kind===B.kind) continue; if(!(A.kind==='.g-button'||B.kind==='.g-button')) continue;
    if(A.el.contains(B.el)||B.el.contains(A.el)) continue; // на всякий: вложенные пары не сравниваем
    if(sameRow(A,B)&&adj(A,B)&&Math.abs(A.h-B.h)>4){ var key=Math.round(Math.min(A.top,B.top))+A.kind+B.kind; if(seen[key]) continue; seen[key]=1; out.controlRowMismatch.push({a:A.kind+'('+A.h+')',b:B.kind+'('+B.h+')',delta:Math.abs(A.h-B.h)}); } }

  // illustration-scale svg with no visible fill/stroke (invisible illustration)
  document.querySelectorAll('svg').forEach(function(svg){ var r=svg.getBoundingClientRect(); if(r.width<40||r.height<40) return; var ps=svg.querySelectorAll('path,rect,circle,ellipse,polygon'); if(!ps.length) return; var vis=false; for(var p=0;p<ps.length;p++){ var fc=parse(getComputedStyle(ps[p]).fill),sc=parse(getComputedStyle(ps[p]).stroke); if((fc&&fc[3]>0.05&&!(fc[0]===255&&fc[1]===255&&fc[2]===255))||(sc&&sc[3]>0.05)){ vis=true; break; } } if(!vis) out.zeroFillSvg.push({size:Math.round(r.width)+'x'+Math.round(r.height)}); });

  // reserved-but-empty named slot: an element NAMED for content (image/logo/avatar/media/cover/picture/thumb),
  // sized like a real slot, that paints NOTHING (no working img, no svg, no text, no background-image).
  // The reserved box is the tell that content was expected but is missing.
  var NAMED=/image|logo|avatar|media|cover|picture|thumb/i, matched=[];
  document.querySelectorAll('[class]').forEach(function(el){
    if(typeof el.className!=='string'||!NAMED.test(el.className)) return;
    if(/storage|background/i.test(el.className)) return; // page-constructor's optional positioned bg layer — empty by design, not a content slot
    if(el.tagName==='IMG'&&el.naturalWidth>0) return; // a LOADED img is content, not an empty slot (class merely names it); broken imgs are the brokenImages lane's job
    if(!visible(el)) return;
    var r=el.getBoundingClientRect(); if(r.width<40||r.height<40) return;
    for(var mi=0;mi<matched.length;mi++){ if(matched[mi].contains(el)) return; } // outermost only
    var im=el.querySelector('img'); if(im&&im.naturalWidth>0) return;
    if(el.querySelector('svg')) return;
    if((el.textContent||'').trim().length>0) return;
    if(getComputedStyle(el).backgroundImage!=='none') return;
    var ds=el.querySelectorAll('*'), hasBg=false; for(var di=0;di<ds.length;di++){ if(getComputedStyle(ds[di]).backgroundImage!=='none'){ hasBg=true; break; } } if(hasBg) return;
    matched.push(el); out.emptySlot.push({sel:sel(el), size:Math.round(r.width)+'x'+Math.round(r.height)});
  });

  // R16: uikit Table left at width:auto inside a bounded column → inner table shrinks under its wrapper
  // (header action then dangles far right of the table). Registry default for list pages = width="max".
  document.querySelectorAll('table.g-table__table_width_auto').forEach(function(t){
    if(!visible(t)) return; var wrapEl=t.closest('.g-table'); if(!wrapEl) return;
    var tw=t.getBoundingClientRect().width, ww=wrapEl.getBoundingClientRect().width;
    if(ww-tw>100) out.tableUnderfill.push({tablePx:Math.round(tw), wrapPx:Math.round(ww), gapPx:Math.round(ww-tw)});
  });

  return out;
}

export function gateLayout() {
  var w=window.innerWidth, ov=document.documentElement.scrollWidth-w;
  var worst=null,maxR=0; [].slice.call(document.querySelectorAll('body *')).forEach(function(e){ var r=e.getBoundingClientRect(); if(r.right>maxR){maxR=r.right;worst=e;} });
  function cls(el){ return el&&el.className&&typeof el.className==='string'?el.className.split(/\s+/).slice(0,2).join('.'):(el?el.tagName:null); }
  function stat(s){ var cs=[].slice.call(document.querySelectorAll(s)).filter(function(c){var r=c.getBoundingClientRect();return r.width>1&&r.height>1;}); if(!cs.length) return null; var rows={}; cs.forEach(function(c){var t=Math.round(c.getBoundingClientRect().top/12)*12;rows[t]=(rows[t]||0)+1;}); var pr=Object.keys(rows).sort(function(a,b){return a-b;}).map(function(k){return rows[k];}); return {n:cs.length,cols:Math.max.apply(null,pr),dist:pr,minW:Math.min.apply(null,cs.map(function(c){return Math.round(c.getBoundingClientRect().width);}))}; }
  return { width:w, overflowPx:ov, widest: ov>1?cls(worst):null, price: stat('.pc-price-card') };
}
