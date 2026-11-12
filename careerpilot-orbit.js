/* CareerPilot conceptual information graph — lightweight Three.js enhancement.
 * Decoration only. Never represents real customer data or proprietary processing.
 */
import * as THREE from "three";

const holder = document.getElementById("tech-canvas");
const media = window.matchMedia("(prefers-reduced-motion: reduce)");
const mobile = window.matchMedia("(max-width: 960px)");
const webglSupported = (() => {
  try { const canvas=document.createElement("canvas"); return !!(canvas.getContext("webgl2") || canvas.getContext("webgl")); }
  catch { return false; }
})();
if (holder && !media.matches && !mobile.matches && webglSupported) {
  let scene, camera, renderer, graph, frame = 0, observer, resizeObserver;
  let isVisible = false;
  let isActive = true;

  function setup() {
    try {
      const width = holder.clientWidth || 480;
      const height = holder.clientHeight || 380;
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
      camera.position.set(0, 0, 11.9);
      renderer = new THREE.WebGLRenderer({ alpha:true, antialias:true, powerPreference:"low-power" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(width,height,false);
      renderer.setClearColor(0x14243a,0);
      renderer.domElement.setAttribute("aria-hidden","true");
      holder.appendChild(renderer.domElement);
      graph = new THREE.Group();
      scene.add(graph);
      const nodes = [
        [-2.9,.4,.2],[-1.3,2.2,-1],[1.1,2.45,.9],[2.9,.75,-.35],
        [2.05,-1.6,.8],[-.2,-2.2,-1.2],[-2.25,-1.5,.8],
        [-.3,.25,1.5],[1.05,.55,-1.3],[-1.1,-.75,-.3],[.9,-1.25,1.4]
      ];
      const connections = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,0],[0,7],[1,7],[2,8],[3,8],[4,10],[5,10],[6,9],[7,8],[7,9],[8,10],[9,10],[1,9],[2,7]];
      const lines=[];
      for(const [a,b] of connections){lines.push(...nodes[a],...nodes[b]);}
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute("position",new THREE.Float32BufferAttribute(lines,3));
      graph.add(new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({ color:0x637a94,transparent:true,opacity:.46 })));
      const orb = new THREE.IcosahedronGeometry(.085,1);
      nodes.forEach((pos,i) => {
        const mat=new THREE.MeshBasicMaterial({color:(i===0||i===3||i===8)?0xF07845:0xB1C1D1});
        const mesh=new THREE.Mesh(orb,mat);
        mesh.position.set(...pos);
        if(i===7)mesh.scale.setScalar(1.6);
        graph.add(mesh);
      });
      const ring=new THREE.TorusGeometry(2.05,.007,3,110);
      const rim=new THREE.Mesh(ring,new THREE.MeshBasicMaterial({color:0x9AAAC1,transparent:true,opacity:.25}));
      rim.rotation.set(.5,.55,.19);graph.add(rim);

      const svg=holder.querySelector("svg");
      if(svg)svg.hidden=true;
      resizeObserver=new ResizeObserver(() => {
        if(!renderer)return;
        const w=holder.clientWidth,h=holder.clientHeight;
        if(w<1||h<1)return;
        renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
      });
      resizeObserver.observe(holder);

      observer=new IntersectionObserver(entries => {
        isVisible=entries[0]?.isIntersecting || false;
        if(isVisible && frame===0)tick();
      },{threshold:.03});
      observer.observe(holder);
      document.addEventListener("visibilitychange",visibilityChanged);
      media.addEventListener?.("change",motionChanged);
      mobile.addEventListener?.("change",motionChanged);
    }catch(e){cleanup();/* The static SVG remains as an accessible fallback. */ }
  }

  function tick() {
    if(!isVisible || document.hidden || !isActive){frame=0;return;}
    frame=requestAnimationFrame(tick);
    if(graph){graph.rotation.y+=.0015;graph.rotation.x=Math.sin(performance.now()/9000)*.12;}
    renderer?.render(scene,camera);
  }

  function visibilityChanged(){if(!document.hidden&&isVisible&&frame===0)tick();}
  function motionChanged(){if(media.matches||mobile.matches){cleanup();} }
  function cleanup(){
    isActive=false;
    if(frame)cancelAnimationFrame(frame);
    frame=0;
    observer?.disconnect();resizeObserver?.disconnect();
    document.removeEventListener("visibilitychange",visibilityChanged);
    media.removeEventListener?.("change",motionChanged);
    mobile.removeEventListener?.("change",motionChanged);
    if(graph){
      graph.traverse(x => {
        x.geometry?.dispose?.();
        if(Array.isArray(x.material))x.material.forEach(m=>m.dispose?.());
        else x.material?.dispose?.();
      });
      scene?.remove(graph);
    }
    renderer?.dispose();
    renderer?.domElement?.remove();
    const svg=holder?.querySelector("svg");
    if(svg)svg.hidden=false;
  }

  const gate=new IntersectionObserver(entries=>{
    if(entries[0]?.isIntersecting){gate.disconnect();setup();}
  },{rootMargin:"100px 0px"});
  gate.observe(holder);
  window.addEventListener("pagehide",cleanup,{once:true});
}