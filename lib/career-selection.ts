import {cache} from "react";
import {cookies} from "next/headers";
import {currentUser} from "@/lib/auth";
import {db} from "@/lib/db";
import type {SupabaseClient} from "@supabase/supabase-js";

export const selectedCareer=cache(async()=>{
 const user=await currentUser();if(!user)return null;
 const id=(await cookies()).get("nba_universe")?.value;
 if(!id||!/^[0-9a-f-]{36}$/i.test(id))return null;
 const client=db() as unknown as SupabaseClient<any>;
 const {data:universe,error}=await client.from("universes").select("*").eq("id",id).eq("owner_id",user.id).maybeSingle();
 if(error)throw error;if(!universe)return null;return {user,universe,client};
});
