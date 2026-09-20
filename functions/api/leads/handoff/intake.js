import {adminAuthorized,ensureSchema,eventDb,json,namedUserFromRequest,sha256Hex} from '../_shared.js';

function randomToken(){
  const b=new Uint8Array(32);crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

export async function onRequestPost({request,env}){
  await ensureSchema(env);
  let userKey='super-admin';
  let allowed=await adminAuthorized(request,env);
  if(!allowed){
    const user=await namedUserFromRequest(request,env);
    if(user&&user.permissions.includes('intake_admin')){
      allowed=true;
      userKey=user.user_key;
    }
  }
  if(!allowed)return json({ok:false,error:'unauthorized'},401);

  const db=eventDb(env),token=randomToken(),hash=await sha256Hex(token);
  const now=Math.floor(Date.now()/1000),expires=now+120,iso=new Date().toISOString();
  await db.prepare('DELETE FROM admin_handoff_tokens WHERE expires_at<?').bind(now).run();
  await db.prepare('INSERT INTO admin_handoff_tokens(token_hash,user_key,target,expires_at,created_at) VALUES(?,?,?,?,?)')
    .bind(hash,userKey,'intake_admin',expires,iso).run();
  return json({ok:true,token,expires_at:expires});
}

export function onRequest(){return json({ok:false,error:'method_not_allowed'},405)}
