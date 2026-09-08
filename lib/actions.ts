import {db} from "@/lib/db";
import {jsonObject} from "@/lib/data";
import type {Json} from "@/lib/database.types";
/** Persistent deduplication: cached actions never reach a paid provider. */
export async function oncePerKey<T>(careerId:string,key:string,fn:()=>Promise<T>):Promise<T>{
 const client=db();const {data,error}=await client.rpc("claim_action",{p_career:careerId,p_key:key});if(error)throw error;
 const claim=jsonObject(data);if(claim.cached)return claim.result as T;
 try{const result=await fn();const saved=await client.from("action_jobs").update({status:"completed",result:JSON.parse(JSON.stringify(result)) as Json,updated_at:new Date().toISOString()}).eq("career_id",careerId).eq("job_key",key).eq("token",claim.token);if(saved.error)throw saved.error;return result;}
 catch(error){await client.from("action_jobs").update({status:"failed",updated_at:new Date().toISOString()}).eq("career_id",careerId).eq("job_key",key).eq("token",claim.token);throw error;}
}
