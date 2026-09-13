(()=>{
  const back=document.getElementById('sheetback');
  const notes=document.getElementById('notes');
  const noteBtn=document.getElementById('saveNotes');
  const prizeBtn=document.getElementById('saveLeadPrize')||document.getElementById('savePrize');
  const prizeWrap=document.getElementById('leadPrizes')||document.getElementById('prizes');
  const customInput=document.getElementById('leadCustomPrize')||document.getElementById('customPrize');
  const toast=document.getElementById('toast');
  if(!back||!notes||!noteBtn)return;

  let active=false,noteBaseline='',prizeBaseline='';

  function selectedPrizeState(){
    if(!prizeWrap)return '';
    const selected=prizeWrap.querySelector('.prizebtn.selected');
    if(!selected)return '';
    const value=selected.dataset.p??selected.dataset.prize??'';
    return value==='__CUSTOM__'?`${value}\n${customInput?.value||''}`:value;
  }
  function updateNote(){noteBtn.classList.toggle('dirty',active&&notes.value!==noteBaseline)}
  function updatePrize(){if(prizeBtn)prizeBtn.classList.toggle('dirty',active&&selectedPrizeState()!==prizeBaseline)}
  function clearStates(){active=false;noteBtn.classList.remove('dirty');prizeBtn?.classList.remove('dirty')}
  function captureBaselines(){
    requestAnimationFrame(()=>{
      noteBaseline=notes.value;
      prizeBaseline=selectedPrizeState();
      active=true;
      updateNote();
      updatePrize();
    });
  }

  notes.addEventListener('input',updateNote);
  prizeWrap?.addEventListener('click',()=>setTimeout(updatePrize,0));
  customInput?.addEventListener('input',updatePrize);

  new MutationObserver(()=>{
    if(back.classList.contains('show'))captureBaselines();
    else clearStates();
  }).observe(back,{attributes:true,attributeFilter:['class']});

  if(prizeWrap)new MutationObserver(()=>{
    if(active){prizeBaseline=selectedPrizeState();updatePrize()}
  }).observe(prizeWrap,{childList:true,subtree:true});

  if(toast)new MutationObserver(()=>{
    const text=toast.textContent.trim();
    if(text==='Notes saved.'||text==='Notes cleared.'){
      noteBaseline=notes.value;
      updateNote();
    }
  }).observe(toast,{childList:true,characterData:true,subtree:true});
})();
