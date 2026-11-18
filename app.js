const $=s=>document.querySelector(s), key='rostok.planner.v1';
const paths={plans:'M4 5h16v16H4z M8 3v4m8-4v4M4 10h16',wish:'M12 20S2 14 3 8c1-5 7-5 9-1 3-4 9-4 9 2s-9 11-9 11z',closed:'M3 6h18v4H3z M5 10v10h14V10 M9 14l2 2 4-4',profile:'M16 8a4 4 0 1 1-8 0 4 4 0 1 1 8 0 M4 21a8 8 0 0 1 16 0'};
const tabs={plans:'Мои планы',wish:'Вишлист',closed:'Закрытые планы',profile:'Профиль'};
const pets=[['🦊','Лисёнок'],['🐱','Котёнок'],['🐰','Кролик'],['🐼','Панда']];
const dateKey=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const fromKey=k=>new Date(k+'T12:00:00'), shift=(d,n)=>{let x=new Date(d);x.setDate(x.getDate()+n);return x}, fmt=(d,o)=>d.toLocaleDateString('ru-RU',o);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let selected=dateKey(new Date()), tab='plans', edit=null, op='', avatarDraft='', timer;
const fresh=()=>({name:'',avatar:'',tasks:[],wishes:[],pet:null});
let state={mode:'boy',boy:fresh(),girl:fresh()};
try{const saved=JSON.parse(localStorage.getItem(key));if(saved&&saved.boy&&saved.girl)state=saved}catch{}
const p=()=>state[state.mode], btn=(act,label,cls='')=>'<button type="button" class="'+cls+'" data-act="'+act+'">'+label+'</button>';
function say(s){$('#message').textContent=s;clearTimeout(timer);timer=setTimeout(()=>$('#message').textContent='',3000)}
function save(){try{localStorage.setItem(key,JSON.stringify(state));return true}catch{say('Не удалось сохранить. Проверь свободное место и настройки Safari.');return false}}
function av(){return p().avatar?'<img class="av" alt="Аватар" src="'+esc(p().avatar)+'">':'<span class="av">'+esc((p().name||'Я').slice(0,1))+'</span>'}
function week(){const d=fromKey(selected),mon=shift(d,-((d.getDay()+6)%7));return Array.from({length:7},(_,i)=>shift(mon,i))}
const paletteNames = {forest:'Шалфей', rose:'Пион', sky:'Небо', lavender:'Лаванда'};
const backgrounds = {plain:'Гладкий', grid:'Клетка', dots:'Точки'};
const theme = () => p().theme || (state.mode === 'girl' ? 'rose' : 'forest');
const monthView = () => p().view !== 'week';

function moveMonth(date, amount) {
  const first = new Date(date.getFullYear(), date.getMonth() + amount, 1, 12);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  first.setDate(Math.min(date.getDate(), last));
  return first;
}
function options(group, values, active) {
  return Object.entries(values).map(([value, label]) =>
    '<button type="button" data-'+group+'="'+value+'" aria-pressed="'+(value===active)+'">'+label+'</button>'
  ).join('');
}
function appearance() {
  return '<section class="card profile settings"><h2>Оформление</h2><h3>Палитра</h3><div class="choices palettes">'+
    options('theme', paletteNames, theme())+'</div><h3>Фон</h3><div class="choices">'+
    options('background', backgrounds, p().background || 'plain')+'</div></section>';
}
function weekCard() {
  const day = fromKey(selected), today = dateKey(new Date()), month = monthView();
  const first = new Date(day.getFullYear(),day.getMonth(),1,12);
  const offset = (first.getDay()+6)%7;
  const last = new Date(day.getFullYear(),day.getMonth()+1,0).getDate();
  const dates = month ? Array.from({length:Math.ceil((offset+last)/7)*7},(_,i)=>shift(first,i-offset)) : week();
  const byDate = new Map();
  for (const t of p().tasks) {
    const counts = byDate.get(t.date) || {total:0, done:0};
    counts.total++;
    if (t.done) counts.done++;
    byDate.set(t.date,counts);
  }
  const cells = dates.map(d=>{
    const k=dateKey(d), counts=byDate.get(k);
    const mark=counts ? (counts.done===counts.total?'✓':'●') : '';
    const label=fmt(d,{weekday:'long',day:'numeric',month:'long'})+(counts?', выполнено '+counts.done+' из '+counts.total:'');
    return '<button type="button" data-day="'+k+'" aria-label="'+label+'" aria-pressed="'+(k===selected)+'" class="calday'+
      (d.getMonth()!==day.getMonth()?' outside':'')+(k===today?' now':'')+'"><span>'+d.getDate()+'</span><small>'+mark+'</small></button>';
  }).join('');
  const label=month?fmt(day,{month:'long',year:'numeric'}):fmt(dates[0],{day:'numeric',month:'short'})+' — '+fmt(dates[6],{day:'numeric',month:'short'});
  return '<section class="card calendar"><div class="split"><h2>Календарь</h2><div class="choices view">'+
    options('view',{week:'Неделя',month:'Месяц'},month?'month':'week')+'</div></div><div class="split period"><strong>'+label+
    '</strong><div class="arrows">'+btn('prev','‹')+btn('next','›')+'</div></div><div class="calgrid">'+
    ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(s=>'<b>'+s+'</b>').join('')+cells+'</div><div class="calfoot"><small>● Есть планы　 ✓ Всё готово</small>'+
    btn('today','Сегодня')+'</div></section>';
}
function rows(items,wish=false){return items.map(t=>'<div class="row"><button class="check '+(t.done?'checked':'')+'" aria-label="'+(t.done?'Вернуть':'Завершить')+' '+esc(t.text)+'" data-toggle="'+t.id+'">'+(t.done?'✓':'')+'</button><button class="label '+(t.done?'done':'')+'" data-edit="'+t.id+'">'+(tab==='wish'&&t.photo?'<img class="wish-thumb" alt="" src="'+esc(t.photo)+'">':'')+esc(t.text)+(tab==='closed'?'<br><small>'+esc(fmt(fromKey(t.date),{day:'numeric',month:'long'}))+'</small>':'')+'</button></div>').join('')}
function progress(){const days=week().map(dateKey),tasks=p().tasks.filter(t=>days.includes(t.date)),n=tasks.filter(t=>t.done).length,pc=tasks.length?Math.round(n*100/tasks.length):0;return '<section class="card progress"><div class="eyebrow">Прогресс недели</div><div class="split"><h2>Выполнено</h2><b class="big">'+pc+'%</b></div><div class="track"><i style="width:'+pc+'%"></i></div><div class="small">'+n+' из '+tasks.length+' планов за выбранную неделю</div></section>'}
const petKinds=['fox','cat','rabbit','panda'];
const petThresholds=[0,3,7,15,...Array.from({length:21},(_,i)=>25+i*10)];
function petProgress(){
  const cur=p();
  if(!Number.isFinite(cur.petXp)){
    cur.petXp=cur.tasks.filter(t=>t.done).length;
    cur.tasks.forEach(t=>{if(t.done)t.petRewarded=true});
    save();
  }
  const xp=Math.max(0,cur.petXp);
  let level=1;
  while(level<25&&xp>=petThresholds[level])level++;
  return {xp,level,next:petThresholds[level]};
}
function petImage(kind,level){return 'assets/pets/'+petKinds[kind]+'-'+String(level).padStart(2,'0')+'.webp'}
function petRank(level){return level<=5?'Малыш':level<=10?'Исследователь':level<=15?'Хранитель':level<=20?'Защитник':'Легенда'}
function petCard(){
  const hatched=Number.isInteger(p().pet)&&p().pet>=0&&p().pet<pets.length;
  const {xp,level,next}=petProgress(),pet=pets[p().pet];
  const percent=level===25?100:Math.round((xp-petThresholds[level-1])*100/(next-petThresholds[level-1]));
  return '<section class="card pet"><div class="pethead"><div class="eyebrow">Мой питомец · 25 обликов</div><h2>'+(hatched?pet[1]:'Таинственное яйцо')+'</h2></div>'+(hatched?'<div class="pet-stage"><img class="pet-sprite" src="'+petImage(p().pet,level)+'" alt="'+pet[1]+' — '+petRank(level)+', уровень '+level+'" width="384" height="384"></div><div class="petfoot"><div class="split"><b>'+petRank(level)+'</b><span class="tag">'+level+' / 25</span></div><div class="track"><i style="width:'+percent+'%"></i></div><small>'+(level===25?'Все облики открыты!':'До нового облика: '+(next-xp)+' выполненных планов')+'</small><p class="small muted">Рост сохраняется даже при удалении завершённых планов.</p>'+btn('pet-gallery','Посмотреть эволюцию','pet-gallery-button')+'</div>':'<img class="art" src="egg.webp" alt="Яйцо с ростком среди клевера"><div class="petfoot">'+btn('hatch','Раскрыть яйцо　✧')+'</div>')+'</section>';
}
function petGallery(){
 const {level}=petProgress();
 modal('Эволюция · '+pets[p().pet][1],'<p class="small muted">Один новый выполненный план — один опыт. Повторные галочки не добавляют опыт.</p><div class="evolution-grid">'+petThresholds.map((xp,i)=>'<figure class="evolution-item '+(i+1>level?'locked':'')+'"><img loading="lazy" src="'+petImage(p().pet,i+1)+'" alt="'+petRank(i+1)+', уровень '+(i+1)+'" width="160" height="160"><figcaption><b>Уровень '+(i+1)+'</b><small>'+xp+' опыта'+(i+1>level?' · ещё закрыт':' · открыт')+'</small></figcaption></figure>').join('')+'</div>');
 $('dialog').classList.add('evolution-dialog');
}
function render(){const cur=p(),dayTasks=cur.tasks.filter(t=>t.date===selected),closed=cur.tasks.filter(t=>t.done).sort((a,b)=>b.date.localeCompare(a.date));document.body.classList.toggle('rose',theme()==='rose');document.body.dataset.theme=theme();document.body.dataset.background=cur.background||'plain';$('nav').innerHTML=Object.entries(tabs).map(([k,v])=>btn(k,'<svg viewBox="0 0 24 24"><path d="'+paths[k]+'"/></svg>'+v,k===tab?'active':'')).join('');$('.who').innerHTML=av()+esc(cur.name||'Мой профиль');$('#today').textContent=fmt(new Date(),{weekday:'long',day:'numeric',month:'long'});const title=tab==='plans'?'Мой планер':tabs[tab],sub={plans:'Каждый выполненный план помогает питомцу расти.',wish:'Мечты, которые хочется исполнить.',closed:'Здесь собраны твои выполненные планы.',profile:'Имя, аватар и оформление твоего планера.'};let content='';
if(tab==='plans')content='<div class="layout"><div class="stack">'+weekCard()+'<section class="card tasks"><div class="split"><h2>Планы на '+(selected===dateKey(new Date())?'сегодня':fmt(fromKey(selected),{day:'numeric',month:'long'}))+'</h2><span class="tag">'+dayTasks.filter(t=>t.done).length+' / '+dayTasks.length+'</span></div><div class="rows">'+(rows(dayTasks)||'<div class="empty">Пока свободно. Что хочешь сделать?</div>')+'</div>'+btn('add','＋　Добавить план','add')+'</section></div><div class="stack">'+petCard()+progress()+'</div></div>';
if(tab==='closed'||tab==='wish'){const wish=tab==='wish',items=wish?cur.wishes:closed;content='<section class="card"><div class="split"><h2>'+(wish?'Мои желания':'Выполнено')+'</h2><span class="tag">'+items.length+'</span></div><div class="rows">'+(rows(items)||'<div class="empty">'+(wish?'Какое желание запишем первым?':'Отметь план галочкой, и он появится здесь.')+'</div>')+'</div>'+(wish?btn('add','＋　Добавить желание','add'):'')+'</section>'}
if(tab==='profile')content='<section class="card profile"><div class="split">'+av()+'<div><h2>'+esc(cur.name||'Мой профиль')+'</h2>'+btn('account','Изменить профиль','add')+'</div></div><h2>Режим</h2><p class="muted small">У каждого режима свои планы, желания и питомец. Всё сохраняется на этом устройстве.</p><div class="mode">'+btn('boy','Для мальчика',state.mode==='boy'?'active':'')+btn('girl','Для девочки',state.mode==='girl'?'active':'')+'</div></section>';
if(tab==='profile')content+=friendsCard()+appearance()+backupCard();
$('#app').innerHTML='<div class="title"><h1>'+title+'</h1><p>'+sub[tab]+'</p></div>'+content;document.querySelector('[data-act=prev]')?.setAttribute('aria-label',monthView()?'Предыдущий месяц':'Предыдущая неделя');document.querySelector('[data-act=next]')?.setAttribute('aria-label',monthView()?'Следующий месяц':'Следующая неделя')}
function modal(title,html){$('dialog').classList.remove('evolution-dialog');$('#dtitle').textContent=title;$('#fields').innerHTML=html;$('dialog').showModal()}
function editor(t){op='item';edit=t?.id;let wish=tab==='wish';wishDraft=t?.photo||'';modal(wish?'Желание':'План','<label for="item">Что '+(wish?'хочется':'запланировано')+'?</label><input id="item" required maxlength="180" value="'+esc(t?.text||'')+'">'+(wish?wishPhotoEditor():'<label for="when">Дата</label><input type="date" id="when" required value="'+(t?.date||selected)+'">')+'<button class="primary">Сохранить</button>'+(edit?btn('del','Удалить','delete'):''))}
function items(){return tab==='wish'?p().wishes:p().tasks}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const a=b.dataset.act;
if(b.dataset.social || b.closest('#friend-form') || b.dataset.backup || b.dataset.clearWish!==undefined)return;
if(b.dataset.view){p().view=b.dataset.view;save()}
if(b.dataset.theme){p().theme=b.dataset.theme;save()}
if(b.dataset.background){p().background=b.dataset.background;save()}
if(a==='today')selected=dateKey(new Date());
if(b.dataset.day)selected=b.dataset.day;
if(b.dataset.toggle){const t=items().find(t=>t.id===b.dataset.toggle);petProgress();t.done=!t.done;if(t.done&&!t.petRewarded){t.petRewarded=true;p().petXp++}save()}
if(b.dataset.edit){editor(items().find(t=>t.id===b.dataset.edit));return}
if(Object.hasOwn(tabs,a)){tab=a;window.scrollTo(0,0)}
if(a==='prev'||a==='next')selected=dateKey(monthView()?moveMonth(fromKey(selected),a==='prev'?-1:1):shift(fromKey(selected),a==='prev'?-7:7));
if(a==='hatch'&&p().pet===null){p().pet=Math.floor(Math.random()*pets.length);save();say('Из яйца появился '+pets[p().pet][1].toLowerCase()+'!')}
if(a==='pet-gallery'){op='info';petGallery();return}
if(a==='add'){editor();return}
if(a==='install'){op='info';modal('На главный экран','<p>В Safari открой меню страницы и нажми <b>«Поделиться»</b>. Выбери <b>«На экран Домой»</b> и нажми <b>«Добавить»</b>.</p><p class="small muted">Если пункт скрыт, прокрути список действий вниз.</p>'+btn('close','Понятно','primary'));return}
if(a==='account'){op='account';avatarDraft=p().avatar;modal('Мой профиль','<label for="name">Имя</label><input id="name" maxlength="36" value="'+esc(p().name)+'"><label for="photo">Аватарка</label><input id="photo" type="file" accept="image/*"><button class="primary" id="saveProfile">Сохранить</button>');return}
if(a==='boy'||a==='girl'){state.mode=a;save()}
if(a==='del'){const list=items();list.splice(list.findIndex(t=>t.id===edit),1);save();$('dialog').close()}
if(a==='close')$('dialog').close();render()});
document.addEventListener('change',async e=>{if(e.target.id!=='photo'||!e.target.files[0])return;const button=$('#saveProfile'),url=URL.createObjectURL(e.target.files[0]);button.disabled=true;try{const im=new Image();im.src=url;await im.decode();const c=document.createElement('canvas');c.width=c.height=192;const s=Math.min(im.width,im.height);c.getContext('2d').drawImage(im,(im.width-s)/2,(im.height-s)/2,s,s,0,0,192,192);avatarDraft=c.toDataURL('image/jpeg',.82)}catch{say('Попробуй фото в формате JPEG или PNG')}finally{button.disabled=false;URL.revokeObjectURL(url)}});
$('#form').onsubmit=e=>{e.preventDefault();if(photoBusy)return;const before=JSON.stringify(state);if(op==='item'){let t=items().find(t=>t.id===edit);const value=$('#item').value.trim();if(!value){$('#item').focus();return}if(!t){t={id:crypto.randomUUID(),done:false};items().push(t);edit=t.id}t.text=value;if(tab==='wish')t.photo=wishDraft;if(tab!=='wish'){t.date=$('#when').value;selected=t.date}}else if(op==='account'){p().name=$('#name').value.trim();p().avatar=avatarDraft}if(save())$('dialog').close();else state=JSON.parse(before);render()};
window.addEventListener('storage',e=>{if(e.key===key&&e.newValue){state=JSON.parse(e.newValue);render()}});render();

refreshFriends();
