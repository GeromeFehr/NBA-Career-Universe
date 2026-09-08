import assert from "node:assert/strict";
import test from "node:test";
import {NextRequest} from "next/server";
import {proxy} from "../proxy";
import {privateResponse} from "../lib/private-response";

function protectedHeaders(response:{headers:Headers}){
 assert.match(response.headers.get("Cache-Control")||"",/private/);
 assert.match(response.headers.get("Cache-Control")||"",/no-store/);
 assert.equal(response.headers.get("CDN-Cache-Control"),"no-store");
 assert.equal(response.headers.get("Netlify-CDN-Cache-Control"),"no-store");
 assert.match(response.headers.get("Vary")||"",/Cookie/);
}

test("private responses replace CDN caching and preserve RSC variation and cookies",()=>{
 const response=new Response(null,{headers:{"Cache-Control":"public, max-age=3600","Netlify-CDN-Cache-Control":"public, durable, max-age=3600","Vary":"RSC, Next-Router-State-Tree","Set-Cookie":"test=value; HttpOnly"}});
 privateResponse(response);protectedHeaders(response);
 assert.match(response.headers.get("Vary")||"",/Next-Router-State-Tree/);
 assert.equal(response.headers.get("Set-Cookie"),"test=value; HttpOnly");
});

test("refreshed sessions stay separate across requests and every response prohibits shared caching",async()=>{
 const saved={url:process.env.NEXT_PUBLIC_SUPABASE_URL,key:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,fetch:globalThis.fetch};
 process.env.NEXT_PUBLIC_SUPABASE_URL="https://privacy-test.supabase.co";
 process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="test-key";
 const ids=["00000000-0000-0000-0000-000000000001","00000000-0000-0000-0000-000000000002"];
 const token=(id:string,exp:number)=>[Buffer.from(JSON.stringify({alg:"HS256",typ:"JWT"})).toString("base64url"),Buffer.from(JSON.stringify({sub:id,exp,role:"authenticated"})).toString("base64url"),"signature"].join(".");
 const session=(id:string,exp:number)=>({access_token:token(id,exp),refresh_token:id,token_type:"bearer",expires_in:3600,expires_at:exp,user:{id,aud:"authenticated",email:`${id}@example.invalid`,app_metadata:{},user_metadata:{},created_at:"2026-01-01T00:00:00Z"}});
 let refreshes=0;
 globalThis.fetch=async(input,init)=>{
  const url=String(input);
  if(url.includes("/token")){refreshes++;const id=JSON.parse(String(init?.body)).refresh_token;assert.ok(ids.includes(id));return Response.json(session(id,Math.floor(Date.now()/1000)+3600));}
  if(url.endsWith("/user")){const auth=new Headers(init?.headers).get("Authorization")||"";const id=JSON.parse(Buffer.from(auth.split(".")[1],"base64url").toString()).sub;return Response.json(session(id,0).user);}
  throw Error("Unexpected network request");
 };
 try{
  const responses=await Promise.all(ids.map(id=>{
   const cookie="base64-"+Buffer.from(JSON.stringify(session(id,1))).toString("base64url");
   return proxy(new NextRequest("https://career.example/login",{headers:{Cookie:`sb-privacy-test-auth-token=${cookie}`}}));
  }));
  assert.equal(refreshes,2);
  responses.forEach((response,i)=>{
   protectedHeaders(response);
   const cookie=response.cookies.get("sb-privacy-test-auth-token")?.value;
   assert.ok(cookie);const decoded=JSON.parse(Buffer.from(cookie.replace(/^base64-/,""),"base64url").toString());
   assert.equal(decoded.user.id,ids[i]);
  });
  const anonymous=await proxy(new NextRequest("https://career.example/login"));
  protectedHeaders(anonymous);assert.equal(anonymous.cookies.getAll().length,0);
  const rejected=await proxy(new NextRequest("https://career.example/api/auth/login",{method:"POST",headers:{Origin:"https://other.example","sec-fetch-site":"cross-site"}}));
  assert.equal(rejected.status,403);protectedHeaders(rejected);
 }finally{
  globalThis.fetch=saved.fetch;
  if(saved.url===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_URL;else process.env.NEXT_PUBLIC_SUPABASE_URL=saved.url;
  if(saved.key===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=saved.key;
 }
});
