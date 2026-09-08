"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import StatusMessage from "@/components/StatusMessage";
export default function GenerateMediaButton({statId,language}:{statId:string;language:"de"|"en"}){const en=language==="en",router=useRouter();const [busy,setBusy]=useState(false),[msg,setMsg]=useState("");return <div><button className="secondaryButton" disabled={busy} onClick={async()=>{setBusy(true);setMsg("");try{const r=await fetch("/api/admin/media",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({statId})});const j=await r.json();if(!r.ok)throw Error(j.error);router.refresh();}catch(e){setMsg(e instanceof Error?e.message:String(e));}finally{setBusy(false);}}}>{busy?(en?"Preparing coverage…":"Berichte entstehen…"):(en?"Create game coverage":"Spielberichte erzeugen")}</button>{msg&&<StatusMessage tone="error">{msg}</StatusMessage>}</div>;}
