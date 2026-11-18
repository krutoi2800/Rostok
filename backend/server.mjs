// Node.js 22.13+ . SQLite stays on the host's persistent volume.
import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from './worker.mjs';
const database=new DatabaseSync(process.env.ROSTOK_DATABASE || 'rostok.sqlite');
database.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
database.exec(readFileSync(new URL('./schema.sql',import.meta.url),'utf8'));
const DB={prepare(sql){
  const stmt=database.prepare(sql);
  return {bind(...values){return {
    first:()=>stmt.get(...values),run:()=>stmt.run(...values),all:()=>({results:stmt.all(...values)})
  }}};
}};
http.createServer(async(req,res)=>{
  try{
    const chunks=[];let size=0;
    for await(const chunk of req){size+=chunk.length;if(size>2048){res.writeHead(413).end();return}chunks.push(chunk)}
    const body=Buffer.concat(chunks);
    const request=new Request(new URL(req.url,'http://localhost'),{method:req.method,headers:req.headers,body:body.length?body:undefined});
    const reply=await worker.fetch(request,{DB});res.writeHead(reply.status,Object.fromEntries(reply.headers));res.end(Buffer.from(await reply.arrayBuffer()));
  }catch{res.writeHead(400).end()}
}).listen(Number(process.env.PORT||8787));
