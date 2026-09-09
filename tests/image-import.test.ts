import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import {decodeImage,optimizeImage} from "../lib/image-optimize";
import {imageMime,imageErrorMessage} from "../lib/image-format";
import {normalizeScreenshot,readImageBody} from "../lib/image-normalize";

test("bitmap decoder rejection falls back to image element and releases its object URL",async()=>{
 const oldBitmap=globalThis.createImageBitmap,oldImage=globalThis.Image,oldRevoke=URL.revokeObjectURL;
 let revoked=0;
 try{
  globalThis.createImageBitmap=async()=>{throw new DOMException("The source image could not be decoded","InvalidStateError");};
  globalThis.Image=class {naturalWidth=1920;naturalHeight=1080;onload:(()=>void)|null=null;onerror:(()=>void)|null=null;set src(value:string){if(value)queueMicrotask(()=>this.onload?.());}} as unknown as typeof Image;
  URL.revokeObjectURL=(url)=>{revoked++;oldRevoke(url);};
  const image=await decodeImage(new Blob(["fixture"]));assert.equal(image.width,1920);assert.equal(image.height,1080);image.release();assert.equal(revoked,1);
 }finally{globalThis.createImageBitmap=oldBitmap;globalThis.Image=oldImage;URL.revokeObjectURL=oldRevoke;}
});

test("both browser decoders failing uses bounded server conversion instead of a raw browser error",async()=>{
 const oldBitmap=globalThis.createImageBitmap,oldImage=globalThis.Image,oldFetch=globalThis.fetch;
 let calls=0;
 try{
  globalThis.createImageBitmap=async()=>{throw Error("decode");};
  globalThis.Image=class {onerror:(()=>void)|null=null;set src(value:string){if(value)queueMicrotask(()=>this.onerror?.());}} as unknown as typeof Image;
  const png=await sharp({create:{width:20,height:10,channels:3,background:"white"}}).png().toBuffer();
  globalThis.fetch=async(url,options)=>{
   calls++;assert.equal(url,"/api/admin/image-normalize");assert.equal(options?.method,"POST");
   const blob=options?.body as Blob;assert.equal(blob.type,"image/png");
   return Response.json(await normalizeScreenshot(Buffer.from(await blob.arrayBuffer())));
  };
  const result=await optimizeImage(new File([new Uint8Array(png)],"wrong.jpg",{type:"application/octet-stream"}));
  assert.equal(calls,1);assert.ok(result.dataUrl.startsWith("data:image/jpeg;base64,"));assert.equal(result.width,20);
 }finally{globalThis.createImageBitmap=oldBitmap;globalThis.Image=oldImage;globalThis.fetch=oldFetch;}
});

test("server converts real raster formats to bounded JPEG pixels and removes metadata",async()=>{
 for(const format of ["png","jpeg","webp","avif","tiff"] as const){
  const bytes=await sharp({create:{width:2000,height:1000,channels:4,background:{r:255,g:255,b:255,alpha:0}}}).withMetadata().toFormat(format).toBuffer();
  assert.ok(imageMime(bytes));
  const normalized=await normalizeScreenshot(bytes),output=Buffer.from(normalized.dataUrl.split(",")[1],"base64");
  const metadata=await sharp(output).metadata();assert.equal(metadata.format,"jpeg");assert.equal(metadata.width,1440);assert.equal(metadata.height,720);assert.equal(metadata.exif,undefined);assert.ok(output.length<3_000_000);
 }
});

test("invalid files, oversized streamed uploads and decode failures return actionable errors without AI",async()=>{
 assert.equal(imageMime(Buffer.from("<svg></svg>")),null);
 await assert.rejects(()=>normalizeScreenshot(Buffer.from([137,80,78,71,13,10,26,10])),/IMAGE_DECODE_FAILED/);
 await assert.rejects(()=>readImageBody(new Request("https://example.invalid",{method:"POST",body:new Uint8Array(4_000_001)})),/IMAGE_SERVER_LIMIT/);
 assert.match(imageErrorMessage(Error("IMAGE_DECODE_FAILED"),"de"),/Originaldatei/);
 assert.match(imageErrorMessage(Error("IMAGE_HEIC"),"en"),/HEIC/);
});
