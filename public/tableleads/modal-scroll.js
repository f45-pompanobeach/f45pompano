(()=>{
let locked=false,scrollY=0;
function anyOpen(){return [...document.querySelectorAll('.sheetback')].some(el=>el.classList.contains('show'))}
function sync(){
  const open=anyOpen();
  if(open&&!locked){
    scrollY=window.scrollY||document.documentElement.scrollTop||0;
    document.body.style.top=`-${scrollY}px`;
    document.body.classList.add('modal-open');
    locked=true;
  }else if(!open&&locked){
    document.body.classList.remove('modal-open');
    document.body.style.top='';
    window.scrollTo(0,scrollY);
    locked=false;
  }
}
const observer=new MutationObserver(sync);
document.querySelectorAll('.sheetback').forEach(el=>observer.observe(el,{attributes:true,attributeFilter:['class']}));
window.addEventListener('pageshow',sync);
sync();
})();
