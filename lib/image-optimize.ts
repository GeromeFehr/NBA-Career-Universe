import {imageMime} from "./image-format";
type OptimizedImage={dataUrl:string;originalBytes:number;optimizedBytes:number;width:number;height:number};
type Decoded={source:CanvasImageSource;width:number;height:number;release:()=>void};
function asDataUrl(blob:Blob){
 return new Promise<string>((resolve,reject)=>{
  const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||""));
  reader.onerror=()=>reject(Error("IMAGE_DECODE_FAILED"));reader.readAsDataURL(blob);
 });
}
export async function decodeImage(blob:Blob):Promise<Decoded>{
 if(typeof createImageBitmap==="function")try{
  const bitmap=await new Promise<ImageBitmap>((resolve,reject)=>{
   let expired=false;const timer=setTimeout(()=>{expired=true;reject(Error("IMAGE_DECODE_FAILED"));},8000);
   try{createImageBitmap(blob).then(value=>{clearTimeout(timer);if(expired)value.close();else resolve(value);},error=>{clearTimeout(timer);reject(error);});}
   catch(error){clearTimeout(timer);reject(error);}
  });
  if(bitmap.width&&bitmap.height)return {source:bitmap,width:bitmap.width,height:bitmap.height,release:()=>bitmap.close()};
  bitmap.close();
 }catch{/* Some browsers decode the same file successfully through an image element. */}
 return new Promise((resolve,reject)=>{
  const img=new Image(),url=URL.createObjectURL(blob);
  const release=()=>{img.onload=null;img.onerror=null;URL.revokeObjectURL(url);img.src="";};
  const fail=()=>{clearTimeout(timer);release();reject(Error("IMAGE_DECODE_FAILED"));};
  const timer=setTimeout(fail,8000);
  img.onload=()=>{if(!img.naturalWidth||!img.naturalHeight)return fail();clearTimeout(timer);resolve({source:img,width:img.naturalWidth,height:img.naturalHeight,release});};
  img.onerror=fail;img.src=url;
 });
}
function canvasBlob(canvas:HTMLCanvasElement,type:string,quality:number){
 return new Promise<Blob>((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error("IMAGE_DECODE_FAILED")),8000);
  try{canvas.toBlob(blob=>{clearTimeout(timer);blob?.size?resolve(blob):reject(Error("IMAGE_DECODE_FAILED"));},type,quality);}
  catch(error){clearTimeout(timer);reject(error);}
 });
}
async function serverConvert(file:Blob,originalBytes:number):Promise<OptimizedImage>{
 if(file.size>4_000_000)throw Error("IMAGE_SERVER_LIMIT");
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),20000);
 try{
  const response=await fetch("/api/admin/image-normalize",{method:"POST",headers:{"content-type":"application/octet-stream"},body:file,signal:abort.signal});
  if(response.status===401)throw Error("UNAUTHORIZED");
  const data=await response.json().catch(()=>{throw Error("IMAGE_CONVERSION_FAILED");});
  if(!response.ok)throw Error(data.code||"IMAGE_CONVERSION_FAILED");
  if(typeof data.dataUrl!=="string"||!data.dataUrl.startsWith("data:image/jpeg;base64,")||!data.width||!data.height)throw Error("IMAGE_CONVERSION_FAILED");
  return {...data,originalBytes};
 }catch(error){if(error instanceof Error&&["UNAUTHORIZED","IMAGE_HEIC","IMAGE_DECODE_FAILED","IMAGE_SERVER_LIMIT"].includes(error.message))throw error;throw Error("IMAGE_CONVERSION_FAILED");}
 finally{clearTimeout(timer);}
}
export async function optimizeImage(file:File,maxDimension=1440,quality=0.68):Promise<OptimizedImage>{
 if(file.size>25_000_000)throw Error("IMAGE_TOO_LARGE");
 if(!file.size)throw Error("IMAGE_DECODE_FAILED");
 const mime=imageMime(new Uint8Array(await file.slice(0,64).arrayBuffer()));if(!mime)throw Error("IMAGE_FORMAT");
 const blob=file.slice(0,file.size,mime);
 let decoded:Decoded|undefined,canvas:HTMLCanvasElement|undefined;
 try{
  decoded=await decodeImage(blob);
  const scale=Math.min(1,maxDimension/Math.max(decoded.width,decoded.height));
  const width=Math.max(1,Math.round(decoded.width*scale)),height=Math.max(1,Math.round(decoded.height*scale));
  canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext("2d",{alpha:false});if(!ctx)throw Error("IMAGE_DECODE_FAILED");
  ctx.fillStyle="#ffffff";ctx.fillRect(0,0,width,height);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
  ctx.drawImage(decoded.source,0,0,width,height);
  const results=await Promise.allSettled([canvasBlob(canvas,"image/webp",quality),canvasBlob(canvas,"image/jpeg",Math.min(.76,quality+.04))]);
  const outputs=results.flatMap(r=>r.status==="fulfilled"&&["image/jpeg","image/png","image/webp"].includes(r.value.type)?[r.value]:[]).sort((a,b)=>a.size-b.size);
  const best=outputs[0];if(!best||best.size>3_000_000)throw Error("IMAGE_DECODE_FAILED");
  // Always use normalized pixels, never pass an original animated/unsupported file to the scan.
  return {dataUrl:await asDataUrl(best),originalBytes:file.size,optimizedBytes:best.size,width,height};
 }catch{return await serverConvert(blob,file.size);}
 finally{decoded?.release();if(canvas){canvas.width=0;canvas.height=0;}}
}
export async function optimizeImages(files:File[],maxFiles=2){
 const images:OptimizedImage[]=[];
 // Limit peak memory on phones by decoding one full-resolution image at a time.
 for(const file of files.slice(0,maxFiles))images.push(await optimizeImage(file));
 return images;
}
