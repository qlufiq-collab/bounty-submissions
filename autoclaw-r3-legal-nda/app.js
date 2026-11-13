
(()=>{const rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
const io=new IntersectionObserver(es=>es.forEach((e,i)=>{if(e.isIntersecting){setTimeout(()=>e.target.classList.add('in'),rm?0:i*70);io.unobserve(e.target)}}),{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
document.querySelectorAll('[data-count]').forEach(el=>{const to=+el.dataset.count,suf=el.dataset.suffix||'';
 if(rm||to===0){el.textContent=to+suf;return}const t0=performance.now(),d=1200;
 const step=t=>{const p=Math.min(1,(t-t0)/d);el.textContent=Math.round(to*(1-Math.pow(1-p,3)))+suf;if(p<1)requestAnimationFrame(step);else el.classList.add('flash')};requestAnimationFrame(step)});
document.querySelectorAll('.shot img').forEach(img=>{const done=()=>{img.classList.add('loaded');img.parentElement.classList.add('done')};if(img.complete&&img.naturalWidth)done();else img.addEventListener('load',done)});
document.querySelectorAll('[data-copy]').forEach(b=>b.addEventListener('click',async()=>{const t=document.querySelector(b.dataset.copy).textContent;try{await navigator.clipboard.writeText(t);b.textContent='Copied ✓'}catch(e){b.textContent='Select & copy'}setTimeout(()=>b.textContent='Copy prompt',1800)}));
})();
