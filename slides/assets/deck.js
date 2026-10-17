(function(){
  'use strict';
  var W=1920,H=1080;
  var deck=document.getElementById('deck'),stage=document.getElementById('stage');
  var slides=[].slice.call(document.querySelectorAll('.slide'));
  var counter=document.getElementById('counter');
  var notes=document.getElementById('notes'),notesText=document.getElementById('notes-text');
  var cur=-1,scale=1,busy=null;
  var rm=window.matchMedia('(prefers-reduced-motion: reduce)');

  function fit(){
    var vw=window.innerWidth,vh=window.innerHeight;
    var nh=notes.hidden?0:notes.offsetHeight;
    var ah=Math.max(120,vh-nh);
    scale=Math.min(vw/W,ah/H);
    var x=(vw-W*scale)/2,y=(ah-H*scale)/2;
    stage.style.transform='translate('+x+'px,'+y+'px) scale('+scale+')';
  }

  function keyMap(slide){
    var m=new Map(),dup=new Set();
    var root=slide.querySelector('.frame > *');
    slide.querySelectorAll('[data-node-id]').forEach(function(el){
      if(el===root)return;
      var k=el.getAttribute('data-name');
      if(!k&&(el.tagName==='P'||el.tagName==='SPAN'))k='t:'+el.textContent.trim();
      if(!k||k==='t:')return;
      k=el.tagName+'|'+k;
      if(m.has(k))dup.add(k);else m.set(k,el);
    });
    dup.forEach(function(k){m.delete(k);});
    return m;
  }
  function pairs(a,b){
    var ma=keyMap(a),mb=keyMap(b),out=[],set=new Set();
    mb.forEach(function(el,k){if(ma.has(k)){out.push([ma.get(k),el]);set.add(el);}});
    // keep outermost matched elements only
    return out.filter(function(p){
      for(var n=p[1].parentElement;n&&n!==b;n=n.parentElement){if(set.has(n))return false;}
      return true;
    }).slice(0,40);
  }

  function setHash(i){var h='#'+(i+1);if(location.hash!==h)history.replaceState(null,'',h);}
  function updateUI(i){
    counter.textContent=(i+1)+' / '+slides.length;
    var t=slides[i].querySelector('template.notes');
    notesText.textContent=t?t.content.textContent||t.innerHTML:'';
    document.title=slides[i].getAttribute('aria-label').replace(/^\d+ — /,'')+' — TAU109';
    setHash(i);
  }
  function activate(s){s.classList.add('is-current');s.classList.remove('is-anim');void s.offsetWidth;s.classList.add('is-anim');}

  function go(i,opts){
    i=Math.max(0,Math.min(slides.length-1,i));
    if(i===cur)return;
    var prev=cur>=0?slides[cur]:null,next=slides[i];
    if(busy){busy();busy=null;}
    cur=i;
    var instant=!prev||rm.matches||(opts&&opts.instant);
    if(instant){
      if(prev)prev.classList.remove('is-current','is-anim','is-leaving');
      activate(next);updateUI(i);return;
    }
    var ps=pairs(prev,next);
    if(document.startViewTransition){
      ps.forEach(function(p,n){p[0].style.viewTransitionName='m'+n;});
      var vt=document.startViewTransition(function(){
        ps.forEach(function(p,n){p[0].style.viewTransitionName='';p[1].style.viewTransitionName='m'+n;});
        prev.classList.remove('is-current','is-anim');
        activate(next);updateUI(i);
      });
      var clear=function(){ps.forEach(function(p){p[0].style.viewTransitionName='';p[1].style.viewTransitionName='';});};
      vt.finished.then(clear,clear);
      if(vt.ready)vt.ready.catch(function(){});
      if(vt.updateCallbackDone)vt.updateCallbackDone.catch(function(){});
      return;
    }
    // Fallback: dissolve (200ms ease-out) + FLIP for layers with the same name
    var first=ps.map(function(p){return p[0].getBoundingClientRect();});
    prev.classList.remove('is-current');prev.classList.add('is-leaving');
    activate(next);updateUI(i);
    var anims=[];
    anims.push(next.animate([{opacity:0},{opacity:1}],{duration:200,easing:'ease-out'}));
    ps.forEach(function(p,n){
      var a=first[n],b=p[1].getBoundingClientRect();
      if(!b.width||!b.height)return;
      var dx=(a.left-b.left)/scale,dy=(a.top-b.top)/scale,sx=a.width/b.width,sy=a.height/b.height;
      if(Math.abs(dx)<.5&&Math.abs(dy)<.5&&Math.abs(sx-1)<.01&&Math.abs(sy-1)<.01)return;
      p[0].style.visibility='hidden';
      anims.push(p[1].animate([{transformOrigin:'0 0',translate:dx+'px '+dy+'px',scale:sx+' '+sy,opacity:1},{transformOrigin:'0 0',translate:'0 0',scale:'1 1',opacity:1}],{duration:300,easing:'ease-out',composite:'add'}));
    });
    var done=function(){
      prev.classList.remove('is-leaving','is-anim');
      ps.forEach(function(p){p[0].style.visibility='';});
      anims.forEach(function(a){try{a.cancel();}catch(e){}});
      if(busy===done)busy=null;
    };
    busy=done;
    Promise.all(anims.map(function(a){return a.finished;})).then(done,function(){});
  }
  function next(){go(cur+1);}function prevS(){go(cur-1);}

  document.addEventListener('keydown',function(e){
    if(e.metaKey||e.ctrlKey||e.altKey)return;
    var k=e.key;
    if(k==='ArrowRight'||k==='ArrowDown'||k==='PageDown'||(k===' '&&!e.shiftKey)||k==='Enter'){e.preventDefault();next();}
    else if(k==='ArrowLeft'||k==='ArrowUp'||k==='PageUp'||(k===' '&&e.shiftKey)||k==='Backspace'){e.preventDefault();prevS();}
    else if(k==='Home'){e.preventDefault();go(0);}
    else if(k==='End'){e.preventDefault();go(slides.length-1);}
    else if(k==='n'||k==='N'){notes.hidden=!notes.hidden;fit();}
  });
  // click / tap zones: left third = back, rest = forward
  deck.addEventListener('click',function(e){
    if(Date.now()-lastSwipe<400)return;
    if(e.clientX<window.innerWidth/3)prevS();else next();
  });
  var sx=0,sy=0,st=0,lastSwipe=0;
  deck.addEventListener('touchstart',function(e){var t=e.changedTouches[0];sx=t.clientX;sy=t.clientY;st=Date.now();},{passive:true});
  deck.addEventListener('touchend',function(e){
    var t=e.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy;
    if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)*1.2&&Date.now()-st<800){lastSwipe=Date.now();if(dx<0)next();else prevS();}
  },{passive:true});
  function fromHash(){var m=/^#\/?(\d+)/.exec(location.hash);return m?parseInt(m[1],10)-1:0;}
  window.addEventListener('hashchange',function(){var i=fromHash();if(i!==cur)go(i);});
  window.addEventListener('resize',fit);
  if(window.ResizeObserver)new ResizeObserver(fit).observe(notes);
  fit();go(fromHash(),{instant:true});
})();
