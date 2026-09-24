import {ensureSchema,eventDb,json,sha256Hex} from '../_shared.js';

export async function onRequestPost({request,env}){
  let body={};try{body=await request.json()}catch{return json({ok:false,error:'invalid_request'},400)}
  const token=String(body.token||'').trim();
  if(token.length<20)return json({ok:false,error:'invalid_token'},400);
  const db=eventDb(env),hash=await sha256Hex(token),now=Math.floor(Date.now()/1000);
  const read=()=>db.prepare('SELECT user_key,target,expires_at FROM admin_handoff_tokens WHERE token_hash=? AND expires_at>? LIMIT 1').bind(hash,now).first();
  let row;
  try{row=await read()}catch{await ensureSchema(env);row=await read()}
  if(!row||row.target!=='intake_admin')return json({ok:false,error:'expired_or_invalid'},401);
  await db.prepare('DELETE FROM admin_handoff_tokens WHERE token_hash=?').bind(hash).run();
  return json({ok:true,user_key:row.user_key,target:row.target});
}

export function onRequest(){return json({ok:false,error:'method_not_allowed'},405)}
