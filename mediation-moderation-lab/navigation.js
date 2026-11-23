'use strict';
// Preserve links to sections from the earlier single-page version.
if(/\/(?:index\.html)?$/.test(location.pathname)){
 const legacy={moderation:'examples.html#moderation',mediation:'examples.html#mediation',conditional:'examples.html#conditional',syntax:'syntax.html',downloads:'downloads.html',practice:'checklist.html'};
 if(legacy[location.hash.slice(1)])location.replace(legacy[location.hash.slice(1)]);
}
function showTopic(){
 const links=[...document.querySelectorAll('[data-topic]')],panels=[...document.querySelectorAll('.topic-panel')];
 if(!links.length)return;
 const id=decodeURIComponent(location.hash.slice(1)),active=links.find(a=>a.dataset.topic===id)||links[0];
 panels.forEach(p=>{p.hidden=p.id!==active.dataset.topic});
 links.forEach(a=>{if(a===active)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current')});
}
window.addEventListener('hashchange',showTopic);showTopic();
