// Owner final interview records share the existing CANDIDATE_EVAL_DB binding,
// but live in a separate table and are never exposed by Andrea's candidate endpoints.
const json=(status,data)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"}});
const predefined=new Set(["gema","oto","norlan"]);
const sections=[["sales",[5,5,6,6,5,7,6]],["reliability",[5,5,5,5]],["initiative",[5,5,5]],["communication",[5,5]],["fit",[5,5,5]]];
const personal={gema:[4,4,3,4],oto:[5,4,4,2],norlan:[5,5,4,3]};
async function ensure(db){await db.prepare("CREATE TABLE IF NOT EXISTS owner_final_interviews (candidate_id TEXT PRIMARY KEY, candidate_name TEXT NOT NULL, total_score INTEGER NOT NULL DEFAULT 0, evaluation_json TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT (datetime('now')))").run()}
function validate(candidate,payload){
 if(!candidate||candidate.length>90||!payload||typeof payload!=="object"||!payload.scores||typeof payload.scores!=="object"||!payload.notes||typeof payload.notes!=="object"||!payload.fields||typeof payload.fields!=="object")return null;
 const scores={},notes={},fields={};let total=0;
 for(const [sec,weights] of sections)for(let i=0;i<weights.length;i++){const id=sec+"-"+i,v=payload.scores[id];if(v===undefined||v===null||v==="")continue;const n=Number(v);if(!Number.isInteger(n)||n<0||n>weights[i])return null;scores[id]=n;total+=n}
 (personal[candidate]||[]).forEach((weight,i)=>{const id="personal-"+i,v=payload.scores[id];if(v===undefined||v===null||v==="")return;const n=Number(v);if(!Number.isInteger(n)||n<0||n>weight)throw Error("Invalid personal score");scores[id]=n});
 for(const [k,v] of Object.entries(payload.notes)){if(typeof k!=="string"||!/^((sales|reliability|initiative|communication|fit)-\d+|personal-\d+)$/.test(k))continue;if(typeof v!=="string"||v.length>12000)return null;notes[k]=v}
 const keys=["date","duration","decision","compensation","coverage","confidence","overall","next","candidateName","status"];for(const k of keys){const v=payload.fields[k];if(v!==undefined){if(typeof v!=="string"||v.length>12000)return null;fields[k]=v}}
 if(!predefined.has(candidate)&&(!fields.candidateName||fields.candidateName.trim().length<2))return null;return {scores,notes,fields,total};
}
export async function onRequest({request,env}){
 const db=env.CANDIDATE_EVAL_DB;if(!db?.prepare)return json(503,{ok:false,message:"Candidate evaluation database binding unavailable"});
 const candidate=new URL(request.url).searchParams.get("candidate");
 if(request.method!=="GET"&&request.method!=="PUT")return json(405,{ok:false,message:"Method not allowed"});if(candidate&&(!/^[a-z0-9-]{1,90}$/.test(candidate)))return json(400,{ok:false,message:"Invalid candidate"});
 try{
  await ensure(db);
  if(request.method==="GET"&&!candidate){const result=await db.prepare("SELECT candidate_id,candidate_name,total_score,updated_at,evaluation_json FROM owner_final_interviews ORDER BY updated_at DESC LIMIT 1000").all();return json(200,{ok:true,records:(result.results||[]).map(r=>{let status="draft";try{status=JSON.parse(r.evaluation_json).fields?.status||"draft"}catch{}return {id:r.candidate_id,name:r.candidate_name,total:r.total_score,updated_at:r.updated_at,status}})})}
  if(request.method==="GET"){const row=await db.prepare("SELECT evaluation_json,updated_at FROM owner_final_interviews WHERE candidate_id=?").bind(candidate).first();return json(200,{ok:true,record:row?JSON.parse(row.evaluation_json):null,updated_at:row?.updated_at||null})}
  if(request.method==="PUT"){
   const raw=await request.text();if(raw.length>180000)return json(413,{ok:false,message:"Record too large"});
   const parsed=validate(candidate,JSON.parse(raw));if(!parsed)return json(400,{ok:false,message:"Invalid interview record"});
   const names={gema:"Gema Pravia",oto:"Otoniel (Oto)",norlan:"Norlan Alexander Cruz"};const candidateName=names[candidate]||parsed.fields.candidateName.trim().slice(0,120);
   await db.prepare("INSERT INTO owner_final_interviews(candidate_id,candidate_name,total_score,evaluation_json,updated_at) VALUES(?,?,?,?,datetime('now')) ON CONFLICT(candidate_id) DO UPDATE SET total_score=excluded.total_score,evaluation_json=excluded.evaluation_json,updated_at=datetime('now')").bind(candidate,candidateName,parsed.total,JSON.stringify(parsed)).run();
   return json(200,{ok:true,total:parsed.total,saved:true});
  }
  return json(405,{ok:false,message:"Method not allowed"});
 }catch(e){console.error("owner-interview",e);return json(500,{ok:false,message:"Unable to process owner interview record"})}
}
