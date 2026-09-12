import {bonusDrawingEnabled,hasDb,json,setEventSetting,staffAuthorized} from '../_shared.js';

export async function onRequestGet({request,env}){
  if(!await staffAuthorized(request,env))return json({ok:false,error:'unauthorized'},401);
  if(!hasDb(env))return json({ok:false,error:'d1_not_configured'},503);
  try{return json({ok:true,bonus_drawing_enabled:await bonusDrawingEnabled(env)})}
  catch{return json({ok:false,error:'settings_load_failed'},500)}
}

export async function onRequestPost({request,env}){
  if(!await staffAuthorized(request,env))return json({ok:false,error:'unauthorized'},401);
  if(!hasDb(env))return json({ok:false,error:'d1_not_configured'},503);
  let body;try{body=await request.json()}catch{return json({ok:false,error:'invalid_request'},400)}
  if(typeof body.bonus_drawing_enabled!=='boolean')return json({ok:false,error:'invalid_setting'},400);
  try{
    await setEventSetting(env,'bonus_drawing_enabled',body.bonus_drawing_enabled?'1':'0');
    return json({ok:true,bonus_drawing_enabled:body.bonus_drawing_enabled});
  }catch{return json({ok:false,error:'settings_save_failed'},500)}
}

export function onRequest(){return json({ok:false,error:'method_not_allowed'},405)}
