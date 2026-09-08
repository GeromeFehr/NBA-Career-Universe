import {cache} from "react";
import {headers,cookies} from "next/headers";
import {activeContext} from "@/lib/universe";
import {db,hasDatabaseConfig} from "@/lib/db";
import {langOf,type AppLanguage} from "@/lib/i18n";
export const uiLanguage=cache(async ():Promise<AppLanguage>=>{
  const h=await headers();const slug=h.get("x-cu-share");
  if(slug&&hasDatabaseConfig()) {
    const {data}=await db().from("universes").select("language").eq("slug",slug).eq("visibility","public").maybeSingle();
    if(data)return langOf(data);
  }
  const context=await activeContext();
  if(context)return langOf(context.universe);
  return (h.get("x-cu-language")||(await cookies()).get("nba_ui_language")?.value)==="en"?"en":"de";
});
