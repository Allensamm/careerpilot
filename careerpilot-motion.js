/* CareerPilot / progressive motion: content remains accessible without JavaScript or CDNs */
(() => {
  'use strict';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 820px)');
  const menu = document.getElementById('menu-toggle');
  const nav = document.getElementById('mobile-nav');
  function setMenu(open) {
    if (!menu || !nav) return;
    nav.hidden = !open;
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  if (menu && nav) {
    setMenu(false);
    menu.addEventListener('click', () => setMenu(nav.hidden));
    nav.addEventListener('click', event => { if (event.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') setMenu(false); });
    document.addEventListener('click', event => { if (!nav.hidden && !nav.contains(event.target) && !menu.contains(event.target)) setMenu(false); });
    window.addEventListener('resize', () => { if (!mobile.matches) setMenu(false); }, { passive:true });
  }

  const examples = {
    cv: {
      before: 'Responsible for customer enquiries, reports and daily operational tasks.',
      after: 'Coordinated customer enquiries, maintained operational reporting and supported daily service delivery across the team.',
      note: 'Illustrative wording only. Specific achievements should be verified with the client.'
    },
    linkedin: {
      before: 'Hardworking professional looking for new opportunities.',
      after: 'Operations and customer support professional | Service coordination, stakeholder communication and process improvement.',
      note: 'An illustrative headline. The right keywords depend on actual experience and target roles.'
    },
    bio: {
      before: 'I have worked in different roles and I am passionate about my career.',
      after: 'I bring experience in customer-facing operations, with a focus on clear communication, reliable service and collaborative problem-solving.',
      note: 'An illustrative biography. CareerPilot does not invent qualifications or results.'
    }
  };
  const before = document.getElementById('example-before');
  const after = document.getElementById('example-after');
  const note = document.getElementById('example-note');
  const tabs = [...document.querySelectorAll('[data-example]')];
  function showExample(key) {
    const data = examples[key];
    if (!data || !before || !after || !note) return;
    before.textContent = data.before;
    after.textContent = data.after;
    note.textContent = data.note;
    tabs.forEach(tab => {
      const active = tab.dataset.example === key;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => showExample(tab.dataset.example));
    tab.addEventListener('keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      const delta = event.key === 'ArrowRight' ? 1 : -1;
      const next = tabs[(index + delta + tabs.length) % tabs.length];
      next.focus();
      showExample(next.dataset.example);
    });
  });
  showExample('cv');

  let gsapCleanup = null;
  function setupMotion() {
    if (gsapCleanup) { gsapCleanup(); gsapCleanup = null; }
    if (reduceMotion.matches || !window.gsap || !window.ScrollTrigger) return;
    const gsap = window.gsap;
    const ST = window.ScrollTrigger;
    gsap.registerPlugin(ST);
    const context = gsap.context(() => {
      // Hero: sequenced entrance, no hidden content before the engine loads.
      gsap.from('.hero .kicker', { y: 15, opacity: 0, duration: .6, ease: 'power2.out' });
      gsap.from('.hero h1', { y: 28, opacity: 0, duration: .85, delay: .12, ease: 'power3.out' });
      gsap.from('.hero-copy>p:not(.kicker), .hero-actions', { y: 15, opacity: 0, duration: .65, stagger: .11, delay: .3 });
      gsap.from('.dashboard', { y: 35, rotateX: 5, opacity: 0, duration: 1, delay: .15, ease: 'power3.out' });
      gsap.from('.dash-card', { y: 16, opacity: 0, stagger: .13, duration: .45, delay: .7 });
      gsap.to('.meter b', { width: (_, el) => el.dataset.width || '75%', duration: 1.1, delay: 1.2, stagger: .15, ease: 'power2.out' });
      // Problem: quote draws in, supporting cards reveal later.
      gsap.from('.problem-quote', { clipPath: 'inset(0 100% 0 0)', duration: .9, ease:'power2.out', scrollTrigger:{trigger:'#problem',start:'top 76%',once:true} });
      gsap.from('.problem-points article', { x: -17, opacity:0, stagger:.14, duration:.6, scrollTrigger:{trigger:'.problem-points',start:'top 84%',once:true} });
      // Platform: individual analysis rows enter from opposing directions.
      gsap.from('.platform-line', { x: (i)=>i%2===0?-24:24, opacity:0, stagger:.17, duration:.65, scrollTrigger:{trigger:'#platform',start:'top 68%',once:true} });
      // Process: top rules draw across while steps appear.
      gsap.from('.step', { y: 30, opacity:0, stagger:.18, duration:.65, scrollTrigger:{trigger:'#how-it-works',start:'top 73%',once:true} });
      // Educational comparison: visual transition from weak to clearer wording.
      gsap.from('.example-card.after', { clipPath:'inset(0 0 100% 0)', duration:.9, ease:'power2.out', scrollTrigger:{trigger:'#examples',start:'top 66%',once:true} });
      // Deliverables: card cascade, distinct from process row.
      gsap.from('.deliverable', { scale:.94, opacity:0, stagger:.09, duration:.55, scrollTrigger:{trigger:'#deliverables',start:'top 73%',once:true} });
      // Technology: process diagram unfolds.
      gsap.from('.tech-node', { clipPath:'inset(0 100% 0 0)', stagger:.2, duration:.7, scrollTrigger:{trigger:'#technology',start:'top 72%',once:true} });
      // Privacy: bullet by bullet to emphasize practical controls.
      gsap.from('.trust-list li', { x:25, opacity:0, stagger:.1, duration:.5, scrollTrigger:{trigger:'#privacy',start:'top 70%',once:true} });
      // Price: border-led arrival, no flashing or fake urgency.
      gsap.from('.price-card', { y:30, opacity:0, duration:.75, scrollTrigger:{trigger:'#pricing',start:'top 70%',once:true} });
      gsap.from('.final h2', { y:20, opacity:0, duration:.75, scrollTrigger:{trigger:'#final',start:'top 78%',once:true} });
    });
    gsapCleanup = () => { context.revert(); ST.getAll().forEach(t => t.kill()); };
  }
  // Wait until optional motion libraries have loaded.
  if (document.readyState === 'complete') setupMotion();
  else window.addEventListener('load', setupMotion, { once:true });
  reduceMotion.addEventListener('change', setupMotion);

  // Lightweight, decorative-only 3D graph. The page is complete if Three.js fails to load.
  let threeCleanup = null;
  function setupThree() {
    if (threeCleanup) { threeCleanup(); threeCleanup = null; }
    const canvas = document.getElementById('platform-canvas');
    if (!canvas || !window.THREE || reduceMotion.matches || mobile.matches) return;
    const THREE = window.THREE;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha:true, antialias:false, powerPreference:'low-power' });
    } catch (_) { return; }
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, 1, .1, 100);
    camera.position.z = 6;
    const points = new Float32Array([
      -2.2,-.6,0, -1.1,.65,.4, 0,-.1,.3, 1.1,.75,-.2, 2.15,-.35,0,
      -1.6,-1.15,-.4, .5,-1.05,.5, 1.8,1.25,-.5
    ]);
    const edges = [0,1,1,2,2,3,3,4,0,5,5,6,6,4,1,7,7,3,2,6];
    const linePositions = new Float32Array(edges.flatMap(i => Array.from(points.slice(i*3,i*3+3))));
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(linePositions,3));
    const line = new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:0x8291a3,transparent:true,opacity:.48}));
    scene.add(line);
    const nodes = new THREE.BufferGeometry();
    nodes.setAttribute('position',new THREE.BufferAttribute(points,3));
    scene.add(new THREE.Points(nodes,new THREE.PointsMaterial({color:0xf07845,size:.12,sizeAttenuation:true})));
    let frame=0, raf=0, visible=true;
    const resize = () => {
      const w=canvas.clientWidth,h=canvas.clientHeight;
      if (!w || !h) return;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,1.5));
      renderer.setSize(w,h,false);
      camera.aspect=w/h;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting??false;},{threshold:0});
    observer.observe(canvas);
    const render=()=>{
      raf=requestAnimationFrame(render);
      if(!visible)return;
      frame+=.003;
      line.rotation.y=Math.sin(frame)*.16;
      scene.children[1].rotation.y=line.rotation.y;
      renderer.render(scene,camera);
    };
    render();
    window.addEventListener('resize',resize,{passive:true});
    threeCleanup=()=>{cancelAnimationFrame(raf);observer.disconnect();window.removeEventListener('resize',resize);geometry.dispose();nodes.dispose();scene.traverse(o=>{if(o.material)o.material.dispose();});renderer.dispose();};
  }
  window.addEventListener('load',setupThree,{once:true});
  reduceMotion.addEventListener('change',setupThree);
  mobile.addEventListener('change',setupThree);
  window.addEventListener('pagehide',()=>{if(threeCleanup)threeCleanup();if(gsapCleanup)gsapCleanup();},{once:true});
})();