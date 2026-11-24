/* Local-first shared-sky countdown. No server or account required. */
(function () {
  "use strict";
  const Core = window.CountdownCore, STORAGE_KEY = "countdown.timers.v2", PREF_KEY = "countdown.sky.preferences.v1";
  const $ = id => document.getElementById(id);
  const cities = [
    ["Hong Kong","Asia/Hong_Kong"],["Tokyo","Asia/Tokyo"],["Seoul","Asia/Seoul"],["Singapore","Asia/Singapore"],["Shanghai","Asia/Shanghai"],
    ["New York","America/New_York"],["San Francisco","America/Los_Angeles"],["Los Angeles","America/Los_Angeles"],["Vancouver","America/Vancouver"],["Toronto","America/Toronto"],
    ["London","Europe/London"],["Paris","Europe/Paris"],["Rome","Europe/Rome"],["Amsterdam","Europe/Amsterdam"],["Sydney","Australia/Sydney"]
  ];
  const state = {timers:[],activeId:null,editingId:null,now:Date.now(),prefs:{left:"Asia/Hong_Kong",right:"America/New_York",art:"cutout",progress:true,format:"days"}};
  function readTimers(){try{const v=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");return Array.isArray(v)?v.filter(validTimer):[]}catch(_){return[]}}
  function validTimer(t){return t&&typeof t.id==="string"&&typeof t.name==="string"&&Number.isFinite(Date.parse(t.target))}
  function save(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state.timers))}catch(_){announce("This browser couldn't save your countdowns. You can still share a link.")}}
  function loadPrefs(){try{const p=JSON.parse(localStorage.getItem(PREF_KEY)||"{}");if(!p||typeof p!=="object")return;const zones=new Set(cities.map(city=>city[1]));if(zones.has(p.left))state.prefs.left=p.left;if(zones.has(p.right))state.prefs.right=p.right;if(p.art==="cutout"||p.art==="line")state.prefs.art=p.art;if(typeof p.progress==="boolean")state.prefs.progress=p.progress;if(["days","hours","minutes"].includes(p.format))state.prefs.format=p.format}catch(_){}}
  function savePrefs(){try{localStorage.setItem(PREF_KEY,JSON.stringify(state.prefs))}catch(_){}}
  function announce(message){$("notice").textContent=message;$("notice").classList.add("visible");clearTimeout(announce.timeout);announce.timeout=setTimeout(()=>$("notice").classList.remove("visible"),3200)}
  function activeTimer(){return state.timers.find(t=>t.id===state.activeId)||null}
  function syncUrlForActiveTimer(){try{const url=new URL(location.href),timer=activeTimer();url.searchParams.delete("countdowndate");if(timer){url.searchParams.set("at",timer.target);url.searchParams.set("name",timer.name)}else{url.searchParams.delete("at");url.searchParams.delete("name")}history.replaceState(null,"",url.toString())}catch(_){}}
  function setActive(id){state.activeId=id;syncUrlForActiveTimer();render()}
  function cityByZone(zone){return cities.find(c=>c[1]===zone)||cities[0]}
  function fillCitySelects(){
    ["city-left","city-right"].forEach((id,index)=>{const select=$(id);select.replaceChildren();cities.forEach(([name,zone])=>{const option=document.createElement("option");option.value=zone;option.textContent=name;select.append(option)});select.value=index===0?state.prefs.left:state.prefs.right});
  }
  function localClock(zone){
    const date=new Date(state.now);
    return {time:new Intl.DateTimeFormat("en-US",{timeZone:zone,hour:"numeric",minute:"2-digit",hour12:true}).format(date),
      date:new Intl.DateTimeFormat(undefined,{timeZone:zone,weekday:"short",month:"short",day:"numeric"}).format(date),
      hour:Number(new Intl.DateTimeFormat("en-US",{timeZone:zone,hour:"2-digit",hourCycle:"h23"}).format(date))};
  }
  function daypart(hour){if(hour>=6&&hour<9)return"dawn";if(hour>=9&&hour<17)return"day";if(hour>=17&&hour<20)return"dusk";return"night"}
  function updateSky(){
    const a=localClock(state.prefs.left),b=localClock(state.prefs.right);
    $("clock-left").textContent=a.time;$("date-left").textContent=a.date;
    $("clock-right").textContent=b.time;$("date-right").textContent=b.date;
    const midpoint=((a.hour+b.hour)/2)%24;
    $("timer-view").dataset.time=daypart(midpoint);
    $("timer-view").dataset.art=state.prefs.art;
    $("city-left").value=state.prefs.left;$("city-right").value=state.prefs.right;
    $("sky-theme").value=state.prefs.art;$("show-progress").checked=state.prefs.progress;$("countdown-format").value=state.prefs.format;
  }
  function importLink(){
    const params=new URLSearchParams(location.search),at=params.get("at");
    if(at){try{const timer=Core.createTimer({name:params.get("name")||"A date to look forward to",target:at});state.timers=[timer,...state.timers.filter(t=>t.target!==timer.target||t.name!==timer.name)];state.activeId=timer.id;save();return}catch(_){}}
    const legacyDate=params.get("countdowndate");
    if(legacyDate&&/^\d{4}-\d{2}-\d{2}$/.test(legacyDate)){const [y,m,d]=legacyDate.split("-").map(Number);const timer=Core.createTimer({name:"Next reunion",target:new Date(y,m-1,d).getTime()});state.timers=[timer,...state.timers.filter(t=>t.target!==timer.target)];state.activeId=timer.id;save()}
  }
  function renderMain(){
    const timer=activeTimer(),empty=!timer;$("empty-state").hidden=!empty;$("timer-view").hidden=empty;if(empty)return;
    const target=Date.parse(timer.target),remaining=Core.formatRemaining(target,state.now);
    $("active-name").textContent=timer.name;$("target-date").textContent=new Intl.DateTimeFormat(undefined,{dateStyle:"full",timeStyle:"short"}).format(new Date(target));
    const arrived=remaining.arrived;$("script-line").textContent=arrived?"The day is here!":"Counting down to...";$("time-grid").hidden=arrived;$("arrival-message").hidden=!arrived;
    const format=state.prefs.format;
    $("count-days").textContent=remaining.days.toLocaleString();
    const totalHours=remaining.days*24+remaining.hours, totalMinutes=totalHours*60+remaining.minutes;
    $("count-hours").textContent=String(format==="days"?remaining.hours:totalHours).padStart(2,"0");
    $("count-minutes").textContent=String(format==="minutes"?totalMinutes:remaining.minutes).padStart(2,"0");
    $("count-seconds").textContent=String(remaining.seconds).padStart(2,"0");
    $("count-days").parentElement.hidden=format!=="days";
    $("count-hours").parentElement.hidden=format==="minutes";
    $("count-hours").parentElement.querySelector("span").textContent="hours";
    $("count-minutes").parentElement.querySelector("span").textContent="minutes";
    const progress=Core.progressBetween(Date.parse(timer.createdAt),target,state.now),pct=progress===null?100:Math.floor(progress*100);
    $("progress-fill").style.width=pct+"%";$("progress-plane").style.left=pct+"%";
    $("progress-label").textContent=remaining.arrived?"The day is here ♥":(progress===null?"Your countdown is ready":pct+"% of the journey");
    $("journey").hidden=!state.prefs.progress;
    updateSky();
  }
  function renderList(){
    const list=$("countdown-list");list.replaceChildren();
    state.timers.forEach(timer=>{const item=document.createElement("li");item.className="countdown-item"+(timer.id===state.activeId?" active":"");
      const select=document.createElement("button");select.className="countdown-select";select.type="button";select.setAttribute("aria-pressed",String(timer.id===state.activeId));
      const name=document.createElement("span");name.className="item-name";name.textContent=timer.name;
      const date=document.createElement("span");date.className="item-date";date.textContent=new Intl.DateTimeFormat(undefined,{dateStyle:"medium"}).format(new Date(timer.target));
      select.append(name,date);select.addEventListener("click",()=>setActive(timer.id));
      const remove=document.createElement("button");remove.className="remove-button";remove.type="button";remove.setAttribute("aria-label","Delete "+timer.name);remove.textContent="×";
      remove.addEventListener("click",()=>{state.timers=state.timers.filter(t=>t.id!==timer.id);if(state.activeId===timer.id)state.activeId=state.timers[0]?.id||null;save();syncUrlForActiveTimer();render();announce("Countdown removed.")});item.append(select,remove);list.append(item)});
    $("timer-count").textContent=state.timers.length+(state.timers.length===1?" saved date":" saved dates");
  }
  function render(){renderList();renderMain()}
  function toLocalInputValue(iso){const d=new Date(iso),pad=n=>String(n).padStart(2,"0");return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+"T"+pad(d.getHours())+":"+pad(d.getMinutes())}
  function openDialog(timer=null){state.editingId=timer?timer.id:null;$("timer-dialog-title").textContent=timer?"Edit countdown":"Create a countdown";$("save-timer-button").textContent=timer?"Save changes":"Save countdown";$("timer-name").value=timer?timer.name:"";$("timer-date").value=timer?toLocalInputValue(timer.target):"";$("timer-dialog").showModal();$("timer-name").focus()}
  $("add-button").addEventListener("click",()=>openDialog());$("empty-add").addEventListener("click",()=>openDialog());$("edit-button").addEventListener("click",()=>{const timer=activeTimer();if(timer)openDialog(timer)});
  $("timer-form").addEventListener("submit",event=>{event.preventDefault();const value=$("timer-date").value;if(!value)return;try{const existing=state.timers.find(t=>t.id===state.editingId);const timer=Core.createTimer({name:$("timer-name").value,target:new Date(value).getTime(),id:existing?.id,createdAt:existing?.createdAt});if(existing)state.timers=state.timers.map(t=>t.id===existing.id?timer:t);else state.timers.unshift(timer);state.activeId=timer.id;state.editingId=null;save();syncUrlForActiveTimer();$("timer-dialog").close();$("timer-form").reset();render();announce(existing?"Your changes are saved.":"Your countdown is ready.")}catch(error){announce(error.message)}});
  $("cancel-button").addEventListener("click",()=>$("timer-dialog").close());$("cancel-button-secondary").addEventListener("click",()=>$("timer-dialog").close());
  $("city-left").addEventListener("change",e=>{state.prefs.left=e.target.value;savePrefs();updateSky()});
  $("city-right").addEventListener("change",e=>{state.prefs.right=e.target.value;savePrefs();updateSky()});
  $("sky-theme").addEventListener("change",e=>{state.prefs.art=e.target.value;savePrefs();updateSky()});
  $("show-progress").addEventListener("change",e=>{state.prefs.progress=e.target.checked;savePrefs();$("journey").hidden=!state.prefs.progress});
  $("countdown-format").addEventListener("change",e=>{state.prefs.format=e.target.value;savePrefs();renderMain()});
  $("share-button").addEventListener("click",async()=>{const timer=activeTimer();if(!timer)return;const url=new URL(location.href);url.search="";url.searchParams.set("at",timer.target);url.searchParams.set("name",timer.name);try{if(navigator.share)await navigator.share({title:timer.name+" — Countdown",url:url.toString()});else{await navigator.clipboard.writeText(url.toString());announce("Share link copied.")}}catch(error){if(error.name!=="AbortError")announce("Couldn't share this link. Try copying the page address.")}});
  loadPrefs();fillCitySelects();state.timers=readTimers();importLink();state.activeId=state.activeId||state.timers[0]?.id||null;
  state.timers.forEach(t=>{if(!t.createdAt||!Number.isFinite(Date.parse(t.createdAt)))t.createdAt=new Date().toISOString()});save();render();
  window.setInterval(()=>{state.now=Date.now();renderMain()},1000);
})();