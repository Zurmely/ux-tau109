(function(){
  'use strict';
  var W=1920,H=1080;
  var deck=document.getElementById('deck'),stage=document.getElementById('stage');
  var slides=[].slice.call(document.querySelectorAll('.slide'));
  var counter=document.getElementById('counter');
  var notes=document.getElementById('notes'),notesText=document.getElementById('notes-text');
  var cur=-1,busy=null;
  var rm=window.matchMedia('(prefers-reduced-motion: reduce)');

  function fit(){
    var vw=window.innerWidth,vh=window.innerHeight;
    var nh=notes.hidden?0:notes.offsetHeight;
    var ah=Math.max(120,vh-nh);
    var scale=Math.min(vw/W,ah/H);
    var x=(vw-W*scale)/2,y=(ah-H*scale)/2;
    stage.style.transform='translate('+x+'px,'+y+'px) scale('+scale+')';
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
    // Plain slide change: the 200ms ease-out dissolve used by every slide link in Figma
    prev.classList.remove('is-current');prev.classList.add('is-leaving');
    activate(next);updateUI(i);
    var anim=next.animate([{opacity:0},{opacity:1}],{duration:200,easing:'ease-out'});
    var done=function(){prev.classList.remove('is-leaving','is-anim');if(busy===done)busy=null;};
    busy=function(){try{anim.cancel();}catch(e){}done();};
    anim.finished.then(done,function(){});
  }
  function next(){go(cur+1);}function prevS(){go(cur-1);}

  // Prototype "Change to" interactions (e.g. heart button): toggle variant, 200ms ease-out
  function likeOf(t){return t&&t.closest?t.closest('[data-like]'):null;}
  function toggleLike(b){var on=!b.classList.contains('is-on');b.classList.toggle('is-on',on);b.setAttribute('aria-pressed',on?'true':'false');}
  document.addEventListener('keydown',function(e){
    if(e.metaKey||e.ctrlKey||e.altKey)return;
    var k=e.key;
    var lb=likeOf(e.target);
    if(lb&&(k===' '||k==='Enter')){e.preventDefault();toggleLike(lb);return;}
    if(k==='ArrowRight'||k==='ArrowDown'||k==='PageDown'||(k===' '&&!e.shiftKey)||k==='Enter'){e.preventDefault();next();}
    else if(k==='ArrowLeft'||k==='ArrowUp'||k==='PageUp'||(k===' '&&e.shiftKey)||k==='Backspace'){e.preventDefault();prevS();}
    else if(k==='Home'){e.preventDefault();go(0);}
    else if(k==='End'){e.preventDefault();go(slides.length-1);}
    else if(k==='n'||k==='N'){notes.hidden=!notes.hidden;fit();}
  });
  // click / tap zones: left third = back, rest = forward
  deck.addEventListener('click',function(e){
    if(Date.now()-lastSwipe<400)return;
    var lb=likeOf(e.target);if(lb){toggleLike(lb);return;}
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
