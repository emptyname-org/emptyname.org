/* Resolve before stylesheet paint; storage may be unavailable. */
(()=>{let t;try{t=localStorage.getItem('emptyname-theme')}catch(_){}if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;})();
/* Reserve the enhanced layout before the body is painted. If enhancement
   cannot load promptly, expose the complete ordinary document instead. */
(()=>{
 const root=document.documentElement;
 if(!root.dataset.initialMode&&matchMedia('(max-width: 767px)').matches)root.dataset.initialMode='image';
 root.classList.add('boundary-boot');
 const boot=window.boundaryBoot={expired:false,complete:false};
 boot.timer=setTimeout(()=>{
  if(boot.complete)return;
  boot.expired=true;root.classList.remove('boundary-boot');
 },3000);
})();
