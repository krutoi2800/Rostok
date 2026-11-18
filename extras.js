let wishDraft='',photoBusy=false,friendState=null,friendError='',friendSequence=0;
const friendKey='rostok.friends.token.v1';
const groupedId=id=>id.match(/.{1,4}/g).join('-');
function wishPhotoEditor(){
  return '<label for="wish-photo">Фото желания</label><input id="wish-photo" type="file" accept="image/*"><div id="wish-preview">'+photoPreview()+'</div>';
}
function photoPreview(){return wishDraft?'<img class="wish-preview" src="'+esc(wishDraft)+'" alt="Фото желания"><button type="button" data-clear-wish>Убрать фото</button>':''}
document.addEventListener('change',async e=>{
  if(e.target.id!=='wish-photo'||!e.target.files.length)return;
  const input=e.target, url=URL.createObjectURL(input.files[0]), saveButton=document.querySelector('#form .primary');
  photoBusy=true;saveButton.disabled=true;input.disabled=true;
  try{
    const img=new Image();img.src=url;await img.decode();
    const scale=Math.min(1,640/Math.max(img.width,img.height)),c=document.createElement('canvas');
    c.width=Math.max(1,Math.round(img.width*scale));c.height=Math.max(1,Math.round(img.height*scale));
    const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height);
    if(input.isConnected && document.querySelector('dialog').open){wishDraft=c.toDataURL('image/jpeg',.68);document.querySelector('#wish-preview').innerHTML=photoPreview()}
  }catch{say('Не удалось прочитать фото. Попробуй JPEG или PNG.')}
  finally{URL.revokeObjectURL(url);photoBusy=false;saveButton.disabled=false;input.disabled=false}
});
function backupCard(){return '<section class="card profile settings"><h2>Резервная копия</h2><p class="small muted">Сохрани оба режима, фото, питомцев и ключ своего ID. Храни файл у себя.</p><button class="add" data-backup="export">Скачать копию</button><label>Восстановить из файла<input type="file" id="restore-file" accept=".json,application/json"></label></section>'}
function token(){
  let value=localStorage.getItem(friendKey);
  if(!value){value=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');localStorage.setItem(friendKey,value)}
  return value;
}
function validBackup(data){
  const safePhoto=x=>x==null||x===''||typeof x==='string'&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(x);
  const validItem=x=>x&&typeof x.text==='string'&&typeof x.done==='boolean'&&typeof x.id==='string'&&/^[\w-]+$/.test(x.id)&&safePhoto(x.photo);
  return data?.type==='rostok-backup'&&data.version===1&&(!data.identity||/^[a-f0-9]{64}$/.test(data.identity))&&['boy','girl'].includes(data.planner?.mode)&&['boy','girl'].every(k=>{
    const x=data.planner[k];return x&&typeof x.name==='string'&&safePhoto(x.avatar)&&(x.pet===null||Number.isInteger(x.pet)&&x.pet>=0&&x.pet<4)&&Array.isArray(x.tasks)&&Array.isArray(x.wishes)&&x.tasks.every(t=>validItem(t)&&/^\d{4}-\d\d-\d\d$/.test(t.date))&&x.wishes.every(validItem);
  });
}
document.addEventListener('change',async e=>{
  if(e.target.id!=='restore-file'||!e.target.files.length)return;
  try{
    const data=JSON.parse(await e.target.files[0].text());if(!validBackup(data))throw Error();
    if(!confirm('Заменить данные обоих режимов данными из этой копии?'))return;
    const oldToken=localStorage.getItem(friendKey);
    if(data.identity)localStorage.setItem(friendKey,data.identity);
    try{localStorage.setItem(key,JSON.stringify(data.planner))}catch(err){if(oldToken)localStorage.setItem(friendKey,oldToken);else localStorage.removeItem(friendKey);throw err}
    state=data.planner;friendState=null;render();refreshFriends();say('Копия восстановлена');
  }catch{say('Не удалось восстановить копию. Проверь файл и свободное место.')}
  finally{e.target.value=''}
});
function friendsCard(){return '<section class="card profile settings"><div class="split"><h2>Друзья</h2><button type="button" data-social="refresh">Обновить</button></div><div id="friend-result">'+friendSummary()+'</div><form id="friend-form"><label for="friend-id">ID друга</label><input id="friend-id" placeholder="XXXX-XXXX-XXXX-XXXX" required autocomplete="off" maxlength="24"><button class="primary">Отправить заявку</button></form></section>'}
function friendSummary(){
  let html=friendError?'<p role="status">'+esc(friendError)+'</p>':'';
  if(!friendState)return html||'<p>Получаем ID…</p>';
  html+='<p>Твой ID <b>'+groupedId(friendState.id)+'</b> <button data-social="copy">Скопировать</button></p>';
  for(const [status,title] of [['in','Входящие заявки'],['out','Отправленные заявки'],['friend','Мои друзья']]){
    const people=friendState.people.filter(x=>x.status===status);
    if(people.length)html+='<h3>'+title+'</h3>'+people.map(x=>'<div class="friend-row">'+groupedId(x.id)+(status==='in'?'<div><button data-social="accept" data-other="'+x.id+'">Принять</button><button data-social="decline" data-other="'+x.id+'">Отклонить</button></div>':'')+'</div>').join('');
  }
  return html;
}
async function refreshFriends(action='open',other=''){
  const seq=++friendSequence;
  try{
    const base=window.ROSTOK_FRIENDS_SERVER;
    if(!base)throw Error('Сервер друзей ещё не подключён.');
    const r=await fetch(base.replace(/\/$/,'')+'/friends',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token()},body:JSON.stringify({action,other})});
    const data=await r.json();if(!r.ok)throw Error(data.error||'Не удалось обновить заявки.');
    if(seq!==friendSequence)return;
    friendState=data;friendError='';
  }catch(err){if(seq!==friendSequence)return;friendError=err.message==='Failed to fetch'?'Сервер недоступен. Попробуй обновить.':err.message}
  const box=document.querySelector('#friend-result');if(box)box.innerHTML=friendSummary();
}
document.addEventListener('submit',async e=>{
  if(e.target.id!=='friend-form')return;e.preventDefault();
  const input=e.target.querySelector('input'),id=input.value.replace(/[\s-]/g,'').toUpperCase();
  if(!/^[0-9A-F]{16}$/.test(id)){say('В ID должно быть 16 символов.');return}
  await refreshFriends('send',id);if(!friendError)input.value='';
});
document.addEventListener('click',async e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.clearWish!==undefined){wishDraft='';document.querySelector('#wish-preview').innerHTML='';document.querySelector('#wish-photo').value=''}
  if(b.dataset.backup==='export'){
    const payload={type:'rostok-backup',version:1,planner:state,identity:localStorage.getItem(friendKey)};
    const url=URL.createObjectURL(new Blob([JSON.stringify(payload)],{type:'application/json'})),link=document.createElement('a');
    link.href=url;link.download='rostok-'+dateKey(new Date())+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  const act=b.dataset.social;
  if(act==='copy'){try{await navigator.clipboard.writeText(groupedId(friendState.id));say('ID скопирован')}catch{say('Выдели ID и скопируй его вручную.')}}
  if(act==='refresh'||act==='accept'||act==='decline')await refreshFriends(act==='refresh'?'open':act,b.dataset.other);
});
window.addEventListener('focus',()=>{if(tab==='profile')refreshFriends()});
setInterval(()=>{if(tab==='profile'&&!document.hidden&&window.ROSTOK_FRIENDS_SERVER)refreshFriends()},30000);
