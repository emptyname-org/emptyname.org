/* Native progressive enhancement. Source content and all image links exist without JS. */
(()=>{
 'use strict';
 const q=(s,root=document)=>root.querySelector(s),qa=(s,root=document)=>[...root.querySelectorAll(s)];
 const root=document.documentElement,body=document.body;
 if(window.boundaryBoot?.expired)return;
 const finishBoot=()=>{if(window.boundaryBoot){window.boundaryBoot.complete=true;clearTimeout(window.boundaryBoot.timer)}root.classList.remove('boundary-boot')};
 const ui=JSON.parse(q('#boundary-i18n')?.textContent||'{}');
 body.classList.add('js-ready');
 const os=matchMedia('(prefers-color-scheme: dark)'),theme=q('.theme-toggle');
 const resolved=()=>root.dataset.theme||(os.matches?'dark':'light');
 const reflect=()=>theme?.setAttribute('aria-pressed',String(resolved()==='dark'));
 reflect();os.addEventListener('change',reflect);
 theme?.addEventListener('click',()=>{const value=resolved()==='dark'?'light':'dark';root.dataset.theme=value;try{localStorage.setItem('emptyname-theme',value)}catch(_){}reflect()});
 addEventListener('storage',e=>{if(e.key==='emptyname-theme'){if(e.newValue==='light'||e.newValue==='dark')root.dataset.theme=e.newValue;else delete root.dataset.theme;reflect()}});
 const index=q('.index');
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&index?.open){index.open=false;q('summary',index).focus()}});
 document.addEventListener('click',e=>{if(index?.open&&!index.contains(e.target))index.open=false});
 const surface=q('.surface'),text=q('.text-pane'),pane=q('.painting-pane'),mount=q('.painting'),split=q('.splitter');
 if(!surface||!text||!mount){finishBoot();return;}
 const phone=matchMedia('(max-width: 767px)');
 if(root.dataset.initialMode==='text'||root.dataset.initialMode==='image')surface.dataset.mode=root.dataset.initialMode;
 // Keep original content ordering; move only the presentation of the media.
 const collection=body.dataset.kind==='home'||body.dataset.kind==='term'||body.dataset.kind==='section';
 const groupNav=q('.score-nav'),compositionGroups=qa('.composition-group',text);
 const nodes=qa('.gallery-full,.lead-image img,.artwork-full img,.artwork-embed img,.home-entry-image img,.artwork-card img,.post-content video,.special-score',text);
 const items=nodes.map(node=>{
   const video=node.tagName==='VIDEO',anchor=node.closest('a'),figure=node.closest('figure');
   const navigate=!!anchor&&!anchor.hasAttribute('data-lightbox')&&!node.classList.contains('gallery-full');
   const original=node.dataset.original||anchor?.dataset.full||node.getAttribute('src');
   const group=node.dataset.group||'';
   const width=Number(node.dataset.viewWidth||node.getAttribute('width')),height=Number(node.dataset.viewHeight||node.getAttribute('height'));
   return {node,video,navigate,group,width,height,src:node.dataset.view||node.getAttribute('src'),srcset:node.dataset.viewset||node.getAttribute('srcset')||'',original,thumb:node.dataset.thumb||node.getAttribute('src'),caption:node.dataset.caption||anchor?.dataset.caption||figure?.querySelector('figcaption')?.textContent||'',alt:node.alt||'',href:anchor?.getAttribute('href')};
 });
 if(!items.length){finishBoot();return;}
 pane.hidden=false;split.hidden=false;surface.classList.add('has-media');q('.modes').hidden=false;
 q('.arrows').hidden=items.length<2;
 let selected=0,revision=0,playbackRevision=0,currentVideo=null,currentRecording=null,previousFocus=null,inspectionIndex=0;
 const playbackControl=q('.continuous-playback',text);
 let continuous=false,pendingPlayback=null;
 function cancelPlaybackAdvance(){
   ++playbackRevision;
   if(pendingPlayback){const audio=pendingPlayback.audio;pendingPlayback=null;audio.pause();if(currentRecording===audio)currentRecording=null;}
 }
 function setContinuous(enabled){
   continuous=enabled&&surface.dataset.mode==='text';
   if(!continuous)cancelPlaybackAdvance();
   if(playbackControl){playbackControl.setAttribute('aria-pressed',String(continuous));q('.playback-state',playbackControl).textContent=continuous?playbackControl.dataset.on:playbackControl.dataset.off;}
 }
 playbackControl?.addEventListener('click',()=>setContinuous(!continuous));
 const dialog=q('.lightbox'),dialogBody=q('.lightbox-body');
 const stopMedia=()=>{if(currentVideo)currentVideo.pause()};
 function syncCompositions(){
   const all=surface.dataset.mode==='text',selectedGroup=items[selected].group;
   if(playbackControl){playbackControl.hidden=!all;if(!all)setContinuous(false);}
   compositionGroups.forEach(group=>{
     group.hidden=!all&&group.dataset.group!==selectedGroup;
     if(group.hidden)qa('audio',group).forEach(audio=>{audio.pause();if(currentRecording===audio)currentRecording=null});
   });
 }
 function errorPanel(container,retry,original,valid){
   if(!valid())return;
   const error=document.createElement('div');error.className='media-error';error.setAttribute('role','status');
   const p=document.createElement('p');p.textContent=ui.error;error.append(p);
   const button=document.createElement('button');button.type='button';button.textContent=ui.retry;button.addEventListener('click',retry);error.append(button);
   if(original){const a=document.createElement('a');a.href=original;a.textContent=ui.original;error.append(a)}
   container.append(error);
 }
 function prepareImage(image,valid,onError){
   // Retain accessible alt text and reserved geometry without painting the
   // browser's fallback text while the image is loading or decoding.
   image.classList.add('media-loading');
   let decoding=0;
   image.addEventListener('error',()=>{if(valid())onError()},{once:true});
   image.addEventListener('load',()=>{
     const version=++decoding,source=image.currentSrc;
     const current=()=>valid()&&version===decoding&&source===image.currentSrc;
     image.decode().then(()=>{if(current())image.classList.remove('media-loading')})
       .catch(()=>{if(current()&&image.complete)onError()});
   });
 }
 function inspect(item){
   if(item.video||item.navigate)return;
   if(!dialog.open)previousFocus=document.activeElement;
   inspectionIndex=items.indexOf(item);
   q('.inspection-caption').textContent=item.caption;
   qa('.inspection-controls button').forEach(b=>b.disabled=items.filter(i=>!i.video&&!i.navigate).length<2);
   dialogBody.replaceChildren();q('.original-link').href=item.original;
   const image=new Image();image.alt=item.alt;image.className='lightbox-image';
   const valid=()=>dialog.open&&dialogBody.contains(image);
   prepareImage(image,valid,()=>errorPanel(dialogBody,()=>inspect(item),item.original,valid));
   dialogBody.append(image);image.src=item.original;
   if(!dialog.open)dialog.showModal();
 }
 function nextInspection(direction){
   let index=inspectionIndex;
   for(let i=0;i<items.length;i++){index=(index+direction+items.length)%items.length;if(!items[index].video&&!items[index].navigate){select(index);inspect(items[index]);return}}
 }
 q('.lightbox-previous')?.addEventListener('click',()=>nextInspection(-1));
 q('.lightbox-next')?.addEventListener('click',()=>nextInspection(1));
 qa('[data-inspect-group]',text).forEach(link=>link.addEventListener('click',event=>{
   if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
   const index=items.findIndex(item=>item.group===link.dataset.inspectGroup);
   if(index<0)return;
   event.preventDefault();select(index);inspect(items[index]);
 }));
 dialog?.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();nextInspection(e.key==='ArrowLeft'?-1:1)}});
 function close(){dialog.close()}
 q('.lightbox-close')?.addEventListener('click',close);
 dialog?.addEventListener('click',e=>{if(e.target===dialog)close()});
 dialog?.addEventListener('close',()=>{dialogBody.replaceChildren();(previousFocus?.isConnected?previousFocus:q('.painting>button'))?.focus()});
 function select(n,retry=false){
   const next=(n+items.length)%items.length;
   if(!retry&&next===selected&&mount.childElementCount)return;
   const token=++revision;cancelPlaybackAdvance();selected=next;stopMedia();currentVideo=null;mount.replaceChildren();
   const item=items[selected];
   // Reserve the selected geometry before requesting its image. Unknown media
   // keeps a stable fallback; load/error callbacks never resize the stage.
   mount.style.setProperty('--media-ratio',item.width>0&&item.height>0?String(item.width/item.height):'1');
   if(item.group){
     syncCompositions();
     if(groupNav)qa('a',groupNav).forEach(link=>{const url=new URL(link.href);url.hash='group-'+item.group;link.href=url.href});
     if(compositionGroups.length&&surface.dataset.mode!=='text')text.scrollTop=0;
   }
   if(collection)items.forEach((entry,i)=>{const card=entry.node.closest('.home-entry,.artwork-card');if(card)card.dataset.current=String(i===selected)});
   if(item.video){item.node.hidden=false;mount.append(item.node);currentVideo=item.node;}
   else {
     const navigate=item.navigate&&item.href;
     const button=document.createElement(navigate?'a':'button');
     if(navigate)button.href=item.href;
     else {button.type='button';button.setAttribute('aria-label',ui.inspect);button.addEventListener('click',()=>inspect(item));}
     const img=new Image();img.alt=item.alt;img.decoding='async';img.sizes='(max-width: 767px) 100vw, 65vw';
     if(item.width>0&&item.height>0){img.width=item.width;img.height=item.height;}
     const valid=()=>token===revision&&mount.contains(img);
     prepareImage(img,valid,()=>errorPanel(mount,()=>select(selected,true),item.original,valid));
     button.append(img);mount.append(button);
     if(item.srcset)img.srcset=item.srcset;img.src=item.src;
   }
   const name=q('.plate-name'),captionURL=item.node.dataset.artworkUrl||(item.href!==item.original?item.href:'');name.replaceChildren();
   if(item.caption&&captionURL&&!item.video){const a=document.createElement('a');a.href=captionURL;a.textContent=item.caption;name.append(a)}else name.textContent=item.caption;
   q('.selected-number').textContent=String(selected+1);q('.total').textContent='/ '+String(items.length);
   qa('.thumb').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===selected)));
 }
 let pendingIndex=null;
 function alignIndex(){
   if(!pendingIndex||surface.dataset.mode==='image')return;
   const card=pendingIndex;pendingIndex=null;
   if(phone.matches){card.scrollIntoView({block:'start',behavior:'instant'});return;}
   const top=text.scrollTop+card.getBoundingClientRect().top-text.getBoundingClientRect().top-parseFloat(getComputedStyle(text).paddingTop);
   text.scrollTo({top,behavior:'instant'});
 }
 function selectFromControl(n){
   select(n);
   if(body.dataset.kind==='home'){pendingIndex=items[selected].node.closest('.home-entry');alignIndex();}
 }
 const thumbs=q('.thumbs');
 items.forEach((item,i)=>{
   const button=document.createElement('button');button.type='button';button.className='thumb';button.setAttribute('aria-label',item.caption||ui.image+' '+(i+1));button.setAttribute('aria-pressed',String(i===0));
   if(!item.video){const img=new Image();img.src=item.thumb;img.alt='';img.loading='lazy';button.append(img)}else button.textContent='▶';
   button.addEventListener('click',()=>selectFromControl(i));thumbs.append(button);
   if(collection){const card=item.node.closest('.home-entry,.artwork-card');card?.addEventListener('pointerenter',()=>{if(selected!==i)select(i)});card?.addEventListener('focusin',()=>{if(selected!==i)select(i)})}
   else if(!item.video){const source=item.node.closest('.gallery,.lead-image,.artwork-full')||item.node;source.classList.add('enhanced-source')}
 });
 qa('[data-step]').forEach(b=>b.addEventListener('click',()=>selectFromControl(selected+Number(b.dataset.step))));
 let swipeStart=null;
 mount.addEventListener('touchstart',event=>{
   if(!phone.matches||surface.dataset.mode!=='image'||items.length<2||items[selected].video||event.touches.length!==1||event.target.closest('.media-error')){swipeStart=null;return;}
   const touch=event.touches[0];
   swipeStart={id:touch.identifier,x:touch.clientX,y:touch.clientY};
 },{passive:true});
 mount.addEventListener('touchend',event=>{
   if(!swipeStart)return;
   const touch=Array.from(event.changedTouches).find(t=>t.identifier===swipeStart.id);
   if(!touch)return;
   const dx=touch.clientX-swipeStart.x,dy=touch.clientY-swipeStart.y;
   swipeStart=null;
   if(!phone.matches||surface.dataset.mode!=='image'||Math.abs(dx)<48||Math.abs(dx)<=Math.abs(dy)*1.3)return;
   event.preventDefault();
   selectFromControl(selected+(dx<0?1:-1));
 },{passive:false});
 mount.addEventListener('touchcancel',()=>{swipeStart=null});
 function setMode(mode){
   if(phone.matches&&mode==='together')mode='image';
   swipeStart=null;
   cancelDrag();surface.dataset.mode=mode;
   syncCompositions();
   qa('.mode').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
   if(mode==='text')stopMedia();
   if(mode==='image'){++playbackRevision;currentRecording=null;qa('audio,video',text).forEach(media=>media.pause());}
   pane.inert=mode==='text';text.inert=mode==='image';
   alignIndex();
 }
 qa('.mode').forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.mode)));
 phone.addEventListener('change',()=>{if(phone.matches&&surface.dataset.mode==='together')setMode('image')});
 if(compositionGroups.length){
   const recordings=qa('audio',text);
   text.addEventListener('play',event=>{
     const audio=event.target;
     if(audio.tagName!=='AUDIO')return;
     if(surface.dataset.mode==='image'||audio.closest('.composition-group')?.hidden){audio.pause();return;}
     if(pendingPlayback&&pendingPlayback.audio!==audio)cancelPlaybackAdvance();
     if(surface.dataset.mode==='text'){
       const index=items.findIndex(item=>item.group===audio.closest('.composition-group')?.dataset.group);
       if(index>=0)select(index);
     }
     currentRecording=audio;
     recordings.forEach(other=>{if(other!==audio)other.pause()});
   },true);
   const advance=audio=>{
     const current=recordings.indexOf(audio);
     if(!continuous||current<0||currentRecording!==audio||surface.dataset.mode!=='text')return;
     const next=recordings[current+1];
     if(!next){currentRecording=null;setContinuous(false);return;}
     const group=next.closest('.composition-group').dataset.group;
     const index=items.findIndex(item=>item.group===group);
     if(index<0)return;
     select(index);
     const requestRevision=++playbackRevision;
     const request={audio:next};pendingPlayback=request;
     currentRecording=next;
     const fail=()=>{if(pendingPlayback===request){pendingPlayback=null;if(currentRecording===next)currentRecording=null;setContinuous(false);next.focus({preventScroll:true})}};
     try{
       next.currentTime=0;
       Promise.resolve(next.play()).then(()=>{
         if(pendingPlayback===request)pendingPlayback=null;
         if((requestRevision!==playbackRevision||!continuous||surface.dataset.mode!=='text')&&currentRecording!==next)next.pause();
       }).catch(fail);
     }catch(_){fail()}
   };
   recordings.forEach(audio=>audio.addEventListener('ended',()=>advance(audio)));
 }
 function revealHash(){
   let id;try{id=decodeURIComponent(location.hash.slice(1))}catch(_){return}
   const target=id?document.getElementById(id):null;
   const group=id.startsWith('group-')?id.slice(6):target?.closest('.composition-group')?.dataset.group;
   if(group){const index=items.findIndex(item=>item.group===group);if(index>=0){select(index);if(surface.dataset.mode==='image'&&(!phone.matches||!id.startsWith('group-')))setMode(phone.matches?'text':'together');return;}}
   if(target&&text.contains(target)&&surface.dataset.mode==='image'){setMode(phone.matches?'text':'together');target.scrollIntoView()}
 }
 addEventListener('hashchange',revealHash);
 let dragging=null,frame=0,pending=null,share=Number(body.dataset.imageShare)||64;
 function setShare(value){share=Math.max(28,Math.min(78,value));surface.style.setProperty('--share',share+'%');split.setAttribute('aria-valuenow',String(Math.round(share)));split.setAttribute('aria-valuetext',ui.share.replace('{value}',String(Math.round(share))))}
 function flush(){frame=0;if(pending!==null){setShare(pending);pending=null}}
 function cancelDrag(){if(frame)cancelAnimationFrame(frame);frame=0;pending=null;const id=dragging;dragging=null;body.classList.remove('dragging');if(id!==null&&split.hasPointerCapture(id))split.releasePointerCapture(id)}
 split.addEventListener('pointerdown',e=>{if(e.button!==0||surface.dataset.mode!=='together')return;dragging=e.pointerId;split.setPointerCapture(e.pointerId);body.classList.add('dragging');e.preventDefault()});
 split.addEventListener('pointermove',e=>{if(e.pointerId!==dragging)return;const r=surface.getBoundingClientRect();pending=(e.clientX-r.left)/r.width*100;if(!frame)frame=requestAnimationFrame(flush)});
 split.addEventListener('pointerup',e=>{if(e.pointerId===dragging){flush();cancelDrag()}});
 split.addEventListener('pointercancel',cancelDrag);split.addEventListener('lostpointercapture',cancelDrag);
 split.addEventListener('keydown',e=>{const values={ArrowLeft:share-4,ArrowRight:share+4,Home:28,End:78};if(e.key in values){e.preventDefault();setShare(values[e.key])}});
 addEventListener('pagehide',()=>{swipeStart=null;setContinuous(false);currentRecording=null;cancelDrag();stopMedia();qa('audio,video').forEach(m=>m.pause())});
 addEventListener('blur',()=>{swipeStart=null;cancelDrag()});
 setShare(share);setMode(surface.dataset.mode);select(0);revealHash();finishBoot();
})();
