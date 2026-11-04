/* Opt-in lead form interactions. Only /sarpinos/ receives this script.
 * No form inputs are intercepted, saved or sent; the original submit handler
 * continues to validate, save the lead and unlock checkout. */
(function(){
  'use strict';
  var navEntry=performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
  var isReload=(navEntry&&navEntry.type==='reload')||
    (performance.navigation&&performance.navigation.type===1);
  if(isReload){
    try{history.scrollRestoration='manual';}catch(e){}
    var interacted=false;
    ['touchstart','pointerdown','wheel','keydown'].forEach(function(k){
      window.addEventListener(k,function(){interacted=true;},{once:true,passive:true,capture:true});
    });
    function reset(){
      if(interacted)return;
      document.documentElement.style.scrollBehavior='auto';
      window.scrollTo({top:0,left:0,behavior:'instant'});
    }
    reset();
    window.addEventListener('pageshow',function(){
      reset();
      requestAnimationFrame(reset);
      setTimeout(reset,140);
      setTimeout(reset,370);
    },{once:true});
  }
  function start(){
    var desktop=document.querySelector('.lead-pilot-nav-book');
    var bar=document.querySelector('.lead-pilot-mobile-bar');
    var mobileButton=document.querySelector('.lead-pilot-mobile-book');
    var nav=document.querySelector('.fixed-top-header .screenshot-nav');
    var form=document.getElementById('partnerLeadForm');
    var claim=document.getElementById('claim-form');
    var success=document.getElementById('claimSuccess');
    var media=window.matchMedia('(max-width:930px)');
    if(!desktop||!bar||!mobileButton||!nav||!claim||!form||!success)return;
    var scheduled=false,extraHeight=64;

    function currentButton(){
      return (success.classList.contains('is-visible')
        ?success.querySelector('.screenshot-cta')
        :document.querySelector('#partnerLeadForm .claim-submit'))||null;
    }
    function refresh(){
      scheduled=false;
      var completed=success.classList.contains('is-visible');
      desktop.textContent=completed?'Finish Booking':'Unlock Trial';
      mobileButton.textContent=completed?'↑ Finish Booking':'↑ Unlock Trial';
      if(!media.matches){
        bar.hidden=true;
        document.body.classList.remove('lead-pilot-bar-visible');
        return;
      }
      var button=currentButton();
      if(!button){
        bar.hidden=true;
        document.body.classList.remove('lead-pilot-bar-visible');
        return;
      }
      var open=!bar.hidden, bottom=button.getBoundingClientRect().bottom-(open?extraHeight:0);
      var navBottom=nav.getBoundingClientRect().bottom;
      var passed=window.scrollY>40 && bottom<=navBottom+1;
      if(open!==passed){
        bar.hidden=!passed;
        document.body.classList.toggle('lead-pilot-bar-visible',passed);
      }
    }
    function schedule(){
      if(scheduled)return;
      scheduled=true;
      requestAnimationFrame(refresh);
    }
    function jumpToStep(){
      var target=success.classList.contains('is-visible')?success:form;
      bar.hidden=true;
      document.body.classList.remove('lead-pilot-bar-visible');
      var navHeight=nav.getBoundingClientRect().height;
      var top=window.scrollY+target.getBoundingClientRect().top-navHeight-18;
      window.scrollTo({top:Math.max(0,top),left:0,behavior:'smooth'});
      schedule();
    }
    desktop.addEventListener('click',jumpToStep);
    mobileButton.addEventListener('click',jumpToStep);
    window.addEventListener('scroll',schedule,{passive:true});
    window.addEventListener('resize',schedule,{passive:true});
    window.addEventListener('pageshow',schedule);
    // Existing showSuccessBox removes the submitted form; observe only to
    // update navigation state, never to change or resubmit the lead.
    var observer=new MutationObserver(schedule);
    observer.observe(claim,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    refresh();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
