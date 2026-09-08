/** HTML, RSC and API responses can carry account state or refreshed auth cookies. */
export function privateResponse<T extends {headers:Headers}>(response:T):T {
 response.headers.set("Cache-Control","private, no-store, no-cache, max-age=0, must-revalidate");
 response.headers.set("CDN-Cache-Control","no-store");
 response.headers.set("Netlify-CDN-Cache-Control","no-store");
 response.headers.set("Pragma","no-cache");
 response.headers.set("Expires","0");
 const vary=response.headers.get("Vary")?.split(",").map(s=>s.trim()).filter(Boolean)||[];
 if(!vary.some(s=>s.toLowerCase()==="cookie")&&!vary.includes("*"))vary.push("Cookie");
 response.headers.set("Vary",vary.join(", "));
 return response;
}
