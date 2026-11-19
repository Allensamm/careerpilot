(function(){
'use strict';
const E=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const S={
'classic-editorial':{bg:'#fbfaf7',ink:'#171717',a:'#282828',g:'#a58b63'},
'blush-art-deco':{bg:'#f7e8e5',ink:'#50352f',a:'#b76e79',g:'#bd9460'},
'emerald-botanical':{bg:'#f6f0e5',ink:'#173d32',a:'#285b48',g:'#b99a58'},
'lavender-floral':{bg:'#f0ebf7',ink:'#51445f',a:'#8875a6',g:'#b7a0c5'},
'terracotta-destination':{bg:'#f3e2d0',ink:'#663b2e',a:'#bd6b46',g:'#c58c54'},
'celestial-midnight':{bg:'#101a35',ink:'#f4f0e8',a:'#b9c6df',g:'#d6c6a1'},
'burgundy-heirloom':{bg:'#f4eade',ink:'#672b39',a:'#8b3d49',g:'#b58a56'},
'onyx-champagne':{bg:'#101010',ink:'#f7ebd6',a:'#d6ad68',g:'#e6c17d'},
'sage-garden':{bg:'#f5f5ee',ink:'#3e5144',a:'#788c70',g:'#b4a47a'},
'peacock-emerald':{bg:'#073a35',ink:'#f5e9cf',a:'#168078',g:'#d0b05f'}
};
const F={bride:"Bride's Name",groom:"Groom's Name",date:'Saturday, 24 May 2027',time:'4:00 PM',venue:'Venue Name',address:'Street Address',city:'City, State',rsvpDeadline:'1 August 2027',email:'rsvp@example.com',phone:'+1 (555) 000-0000',dressCode:'Formal Attire',website:'yourwedding.com',intro:'Together with their families',reception:'Reception to follow'};
const T=(x,y,v,z,c,anchor,font,extra)=>'<text x="'+x+'" y="'+y+'" text-anchor="'+(anchor||'middle')+'" fill="'+(c||'#222')+'" font-family="'+(font||'Georgia,serif')+'" font-size="'+(z||20)+'" '+(extra||'')+'>'+E(v)+'</text>';
const L=(x,y,X,Y,c,w)=>'<path d="M'+x+' '+y+' L'+X+' '+Y+'" fill="none" stroke="'+c+'" stroke-width="'+(w||1)+'"/>';
const R=(x,y,w,h,fill,stroke,sw,rx)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+(rx||0)+'" fill="'+(fill||'none')+'" stroke="'+(stroke||'none')+'" stroke-width="'+(sw||1)+'"/>';
const C=(x,y,r,fill,stroke,sw)=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+(fill||'none')+'" stroke="'+(stroke||'none')+'" stroke-width="'+(sw||1)+'"/>';
const P=(d,fill,stroke,sw)=>'<path d="'+d+'" fill="'+(fill||'none')+'" stroke="'+(stroke||'none')+'" stroke-width="'+(sw||1)+'"/>';
function leaf(x,y,rot,c){return '<path d="M0 0 Q-28 -30 -2 -70 Q27 -42 0 0Z" transform="translate('+x+' '+y+') rotate('+rot+')" fill="'+c+'"/>';}
function branch(x,y,flip,c,g){let q='<g transform="translate('+x+' '+y+') scale('+(flip?-1:1)+' 1)">'+P('M0 0 Q20 -115 65 -260','none',c,3);[[18,-48,-55],[15,-95,55],[27,-145,-52],[45,-195,55],[60,-240,-40]].forEach(v=>q+=leaf(v[0],v[1],v[2],g));return q+'</g>';}
function star(x,y,r,c){return P('M'+x+' '+(y-r*2)+' L'+(x+r*.4)+' '+(y-r*.4)+' L'+(x+r*2)+' '+y+' L'+(x+r*.4)+' '+(y+r*.4)+' L'+x+' '+(y+r*2)+' L'+(x-r*.4)+' '+(y+r*.4)+' L'+(x-r*2)+' '+y+' L'+(x-r*.4)+' '+(y-r*.4)+'Z',c);}
function render(p,page,values){
 const f=Object.assign({},F,p.sampleFields||{},values||{}),s=S[p.templateStyle]||S['classic-editorial'],d=Number(page)===1,k=p.templateStyle;let a=['<svg xmlns="http://www.w3.org/2000/svg" width="600" height="840" viewBox="0 0 600 840" role="img" aria-label="'+E(p.title)+'">',R(0,0,600,840,s.bg)];
 if(k==='classic-editorial')a.push(R(25,25,550,790,'none',s.ink,1.4),R(38,38,524,764,'none',s.g,.7),P('M25 90 Q25 25 90 25 M510 25 Q575 25 575 90 M25 750 Q25 815 90 815 M510 815 Q575 815 575 750','none',s.ink,1.3));
 if(k==='blush-art-deco'){a.push(R(24,24,552,792,'none',s.g,2),R(38,38,524,764,'none',s.a,1),P('M75 265 L75 170 Q300 -10 525 170 L525 265 M95 265 L95 185 Q300 35 505 185 L505 265','none',s.g,1.5));for(let i=0;i<9;i++)a.push(L(300,65,180+i*30,158,s.g,1));}
 if(k==='emerald-botanical')a.push(R(25,25,550,790,'none',s.g,1.4),branch(65,770,false,s.a,'#6c8a69'),branch(535,770,true,s.a,'#6c8a69'),P('M115 100 Q300 20 485 100','none',s.g,1));
 if(k==='lavender-floral')a.push(R(24,24,552,792,'none',s.g,1),R(38,38,524,764,'none',s.a,.8,22),C(72,86,36,'#d8c8e9'),C(112,70,23,'#b6a0d0'),C(530,770,42,'#d8c8e9'),C(495,792,23,'#b6a0d0'),P('M90 170 Q300 35 510 170','none',s.g,1.2));
 if(k==='terracotta-destination')a.push(R(25,25,550,790,'none',s.g,1.2),C(300,150,75,'#df9a62'),P('M35 570 Q125 425 220 545 Q315 380 410 525 Q500 425 565 560 L565 770 L35 770Z','#d49b75'),P('M35 660 Q145 530 235 650 Q350 525 455 650 Q510 585 565 660 L565 770 L35 770Z','#bd7656'),P('M235 745 L235 465 Q300 355 365 465 L365 745 M255 745 L255 475 Q300 405 345 475 L345 745','none',s.a,2.5));
 if(k==='celestial-midnight'){a.push(R(20,20,560,800,'none',s.g,1),R(33,33,534,774,'none',s.a,.8),C(300,112,46,'none',s.g,1.6),C(320,96,40,s.bg),star(300,55,8,s.g),star(90,190,5,s.a),star(505,180,6,s.a),star(110,650,5,s.g),star(500,670,6,s.g),P('M85 235 L170 190 L255 235 L340 180 L430 230 L515 190','none',s.a,.7));for(let i=0;i<18;i++)a.push(C(65+(i*79)%470,80+(i*137)%680,1.7,s.a));}
 if(k==='burgundy-heirloom')a.push(R(25,25,550,790,'none',s.g,2),R(38,38,524,764,'none',s.a,.8),P('M25 170 Q25 25 170 25 M430 25 Q575 25 575 170 M25 670 Q25 815 170 815 M430 815 Q575 815 575 670','none',s.g,2),C(82,95,30,'none',s.a,1),C(518,745,30,'none',s.a,1),P('M62 95 Q82 45 102 95 Q82 145 62 95Z M498 745 Q518 695 538 745 Q518 795 498 745Z','none',s.a,1.5));
 if(k==='onyx-champagne'){a.push(R(22,22,556,796,'none',s.g,2),R(38,38,524,764,'none',s.g,.6),P('M60 230 L60 90 L180 90 M420 90 L540 90 L540 230 M60 610 L60 750 L180 750 M420 750 L540 750 L540 610','none',s.g,2),P('M300 38 L350 95 L300 152 L250 95Z M300 688 L350 745 L300 802 L250 745Z','none',s.g,1.4));for(let i=0;i<7;i++)a.push(L(300,65,190+i*36,150,s.g,.7));}
 if(k==='sage-garden')a.push(R(24,24,552,792,'none',s.g,.9),branch(70,215,false,s.a,'#a4b29b'),branch(530,650,true,s.a,'#a4b29b'),P('M165 110 Q300 65 435 110','none',s.g,1));
 if(k==='peacock-emerald'){a.push(R(22,22,556,796,'none',s.g,2),R(34,34,532,772,'none',s.a,.8),P('M65 110 Q300 15 535 110','none',s.g,1.2));for(let j=0;j<3;j++){let y=205+j*215,x=70+j*15;a.push(P('M'+x+' '+(y+120)+' Q'+(x-25)+' '+(y-5)+' '+(x+25)+' '+(y-50),'none',s.g,2),C(x+25,y-55,26,s.a,s.g,1.5),C(x+25,y-55,13,'#0b2727',s.g,1),C(x+25,y-55,5,s.g));let xr=530-j*15;a.push(P('M'+xr+' '+(y+120)+' Q'+(xr+25)+' '+(y-5)+' '+(xr-25)+' '+(y-50),'none',s.g,2),C(xr-25,y-55,26,s.a,s.g,1.5),C(xr-25,y-55,13,'#0b2727',s.g,1),C(xr-25,y-55,5,s.g));}}
 if(!d){
  a.push(T(300,98,f.intro.toUpperCase(),11,s.g,'middle','Arial,sans-serif','letter-spacing="3"'));
  if(k==='classic-editorial')a.push(T(300,260,'A & J',92,s.ink,'middle','cursive','font-style="italic"'),L(195,295,405,295,s.g,1),T(300,345,'AT THE WEDDING OF',12,s.ink,'middle','Arial,sans-serif','letter-spacing="4"'));
  else if(k==='blush-art-deco')a.push(T(300,245,'THE WEDDING',47,s.ink,'middle','Georgia,serif','letter-spacing="5"'),T(300,290,'OF',12,s.g,'middle','Arial,sans-serif','letter-spacing="4"'));
  else if(k==='emerald-botanical')a.push(T(300,150,'✦  E  &  L  ✦',22,s.ink,'middle','Georgia,serif','letter-spacing="5"'),T(300,230,'JOYFULLY INVITE YOU',12,s.ink,'middle','Arial,sans-serif','letter-spacing="3"'));
  else if(k==='lavender-floral')a.push(T(300,220,'You are invited',39,s.ink,'middle','cursive','font-style="italic"'),T(300,275,'TO THE WEDDING OF',12,s.a,'middle','Arial,sans-serif','letter-spacing="3"'));
  else if(k==='terracotta-destination')a.push(T(300,235,'JOIN US FOR',13,s.ink,'middle','Arial,sans-serif','letter-spacing="4"'));
  else if(k==='celestial-midnight')a.push(T(300,250,'The Wedding Of',39,s.ink,'middle','cursive','font-style="italic"'));
  else if(k==='burgundy-heirloom')a.push(T(300,190,'is requested',36,s.a,'middle','cursive','font-style="italic"'),T(300,255,'AT THE MARRIAGE OF',12,s.ink,'middle','Arial,sans-serif','letter-spacing="3"'));
  else if(k==='onyx-champagne')a.push(T(300,245,'Wedding',67,s.g,'middle','cursive','font-style="italic"'),T(300,300,'CELEBRATION',13,s.ink,'middle','Arial,sans-serif','letter-spacing="5"'));
  else if(k==='sage-garden')a.push(T(300,190,'A GATHERING OF HEARTS',11,s.a,'middle','Arial,sans-serif','letter-spacing="4"'));
  else if(k==='peacock-emerald')a.push(T(300,240,'THE WEDDING OF',13,s.ink,'middle','Arial,sans-serif','letter-spacing="4"'));
  const y1= k==='classic-editorial'?425:k==='blush-art-deco'?375:k==='emerald-botanical'?375:k==='lavender-floral'?370:k==='terracotta-destination'?315:k==='celestial-midnight'?350:k==='burgundy-heirloom'?350:k==='onyx-champagne'?390:k==='sage-garden'?275:330;
  const y2=y1+85;
  a.push(T(300,y1,f.bride,k==='onyx-champagne'?27:40,s.ink,'middle',k==='onyx-champagne'?'Georgia,serif':'cursive','font-style="italic"'),T(300,y1+43,'&',25,s.g),T(300,y2,f.groom,k==='onyx-champagne'?27:40,s.ink,'middle',k==='onyx-champagne'?'Georgia,serif':'cursive','font-style="italic"'));
  a.push(L(180,y2+35,420,y2+35,s.g,1),T(300,y2+90,f.date,17,s.ink),T(300,y2+125,'AT '+f.time,13,s.ink),T(300,y2+185,f.venue,20,s.ink),T(300,y2+215,f.address+' · '+f.city,13,s.ink),T(300,y2+265,f.reception,14,s.a,'middle','cursive','font-style="italic"'));
  if(p.pages===1)a.push(T(300,790,'KINDLY RSVP BY '+f.rsvpDeadline.toUpperCase(),11,s.g,'middle','Arial,sans-serif','letter-spacing="1"'),T(300,812,f.email+' · '+f.phone,9,s.g,'middle','Arial,sans-serif'));
 }else{
  a.push(T(300,105,'WEDDING DETAILS',15,s.g,'middle','Arial,sans-serif','letter-spacing="4"'));
  if(k==='celestial-midnight')a.push(star(300,155,10,s.g));
  if(k==='terracotta-destination')a.push(C(300,175,42,'#d88c5f'));
  if(k==='lavender-floral')a.push(C(300,165,38,'#d8c8e9'),C(330,155,22,'#b6a0d0'));
  if(k==='peacock-emerald')a.push(C(300,180,44,s.a,s.g,2),C(300,180,22,'#0b2727',s.g,1.4),C(300,180,7,s.g));
  if(k==='sage-garden')a.push(branch(90,225,false,s.a,'#a4b29b'),branch(510,225,true,s.a,'#a4b29b'));
  a.push(T(300,265,f.bride+' & '+f.groom,25,s.ink,'middle','cursive','font-style="italic"'),L(115,295,485,295,s.g,1),T(300,350,'CEREMONY',13,s.g,'middle','Arial,sans-serif','letter-spacing="3"'),T(300,390,f.date+' · '+f.time,18,s.ink),T(300,430,f.venue,22,s.ink),T(300,462,f.address,15,s.ink),T(300,487,f.city,15,s.ink),L(160,525,440,525,s.g,1),T(300,570,'DRESS CODE',12,s.g,'middle','Arial,sans-serif','letter-spacing="3"'),T(300,607,f.dressCode,22,s.ink),T(300,675,'KINDLY RSVP BY '+f.rsvpDeadline.toUpperCase(),13,s.ink,'middle','Arial,sans-serif','letter-spacing="1"'),T(300,715,f.email,15,s.ink),T(300,743,f.phone,15,s.ink),T(300,780,f.website,14,s.g,'middle','Arial,sans-serif','letter-spacing="1"'));
 }
 a.push('</svg>');return a.join('');
}
function defaults(p){return Object.assign({},F,p.sampleFields||{});}
function buildFiles(p,fields){const f=Object.assign(defaults(p),fields||{}),out=[];for(let i=0;i<Number(p.pages||1);i++)out.push({name:p.slug+'-'+(i?'details':'invitation')+'.svg',data:render(p,i,f)});return out;}
window.CareerPilotWedding={render:render,defaults:defaults,buildFiles:buildFiles};
})();