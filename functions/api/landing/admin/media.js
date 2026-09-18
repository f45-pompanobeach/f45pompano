import {adminAuthorized,json} from '../_shared.js';

const ALLOWED=new Set(['video/mp4','video/webm','video/quicktime']);
const MAX_BYTES=60*1024*1024;

function extFor(type,name){
  const lower=String(name||'').toLowerCase();
  if(lower.endsWith('.webm')||type==='video/webm')return 'webm';
  if(lower.endsWith('.mov')||type==='video/quicktime')return 'mov';
  return 'mp4';
}

export async function onRequestPost({request,env}){
  if(!await adminAuthorized(request,env))return json({ok:false,error:'unauthorized'},401);
  if(!env?.LANDING_MEDIA||typeof env.LANDING_MEDIA.put!=='function')return json({ok:false,error:'media_storage_unavailable',message:'Video storage is not configured for Landing Admin yet.'},503);

  let form;
  try{form=await request.formData()}catch{return json({ok:false,error:'invalid_upload'},400)}
  const file=form.get('file');
  if(!file||typeof file.stream!=='function')return json({ok:false,error:'missing_file',message:'Choose a video file.'},400);
  if(!ALLOWED.has(String(file.type||'')))return json({ok:false,error:'unsupported_type',message:'Use MP4, WebM, or MOV video.'},400);
  if(Number(file.size||0)<=0||Number(file.size)>MAX_BYTES)return json({ok:false,error:'file_too_large',message:'Video must be 60 MB or smaller.'},413);

  const ext=extFor(file.type,file.name);
  const key=crypto.randomUUID()+'.'+ext;
  await env.LANDING_MEDIA.put(key,file.stream(),{httpMetadata:{contentType:file.type,cacheControl:'public, max-age=31536000, immutable'},customMetadata:{originalName:String(file.name||'video').slice(0,180),uploadedAt:new Date().toISOString()}});
  return json({ok:true,url:'/landing-media/'+key,name:String(file.name||''),size:Number(file.size||0),content_type:file.type});
}
export function onRequest(){return json({ok:false,error:'method_not_allowed'},405)}
