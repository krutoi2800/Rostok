const allowedOrigin = 'https://krutoi2800.github.io';
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const headers = {'Cache-Control':'no-store','Content-Type':'application/json','Vary':'Origin'};
    if (origin === allowedOrigin) Object.assign(headers, {
      'Access-Control-Allow-Origin':origin, 'Access-Control-Allow-Headers':'Authorization, Content-Type',
      'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Max-Age':'600'
    });
    const reply = (data, status=200) => new Response(JSON.stringify(data),{status,headers});
    if (origin && origin !== allowedOrigin) return reply({error:'Недоступный источник.'},403);
    if (request.method==='OPTIONS') return new Response(null,{status:204,headers});
    if (request.method!=='POST'||new URL(request.url).pathname!=='/friends') return reply({error:'Страница не найдена.'},404);
    const token=(request.headers.get('Authorization')||'').replace(/^Bearer /,'');
    if (!/^[0-9a-f]{64}$/.test(token)) return reply({error:'Некорректный ключ профиля.'},401);
    const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
    const hash=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
    const id=hash.slice(0,16).toUpperCase();
    try {
      const data=await request.json();
      const db=env.DB;
      if(data.action==='open') await db.prepare('INSERT OR IGNORE INTO members(id,token_hash) VALUES (?,?)').bind(id,hash).run();
      if(!await db.prepare('SELECT id FROM members WHERE id=? AND token_hash=?').bind(id,hash).first()) return reply({error:'Профиль не зарегистрирован.'},401);
      if(data.action!=='open'){
        const other=String(data.other||'').toUpperCase();
        if(!/^[A-F0-9]{16}$/.test(other)||other===id)return reply({error:'Укажи ID другого человека.'},400);
        const [a,b]=[id,other].sort();
        if(data.action==='send'){
          if(!await db.prepare('SELECT id FROM members WHERE id=?').bind(other).first())return reply({error:'Пользователь с таким ID не найден.'},404);
          await db.prepare("INSERT OR IGNORE INTO friendships(a,b,sender,status) VALUES (?,?,?,'pending')").bind(a,b,id).run();
        }else if(data.action==='accept'){
          await db.prepare("UPDATE friendships SET status='accepted' WHERE a=? AND b=? AND sender=? AND status='pending'").bind(a,b,other).run();
        }else if(data.action==='decline'){
          await db.prepare("DELETE FROM friendships WHERE a=? AND b=? AND sender=? AND status='pending'").bind(a,b,other).run();
        }else return reply({error:'Неизвестное действие.'},400);
      }
      const {results}=await db.prepare('SELECT a,b,sender,status FROM friendships WHERE a=? OR b=? ORDER BY a,b').bind(id,id).all();
      return reply({id,people:results.map(x=>({id:x.a===id?x.b:x.a,status:x.status==='accepted'?'friend':x.sender===id?'out':'in'}))});
    }catch{return reply({error:'Не удалось выполнить запрос. Проверь подключение сервера.'},503)}
  }
};
