type OptimizedImage={
  dataUrl:string;
  originalBytes:number;
  optimizedBytes:number;
  width:number;
  height:number;
};

function asDataUrl(blob:Blob){
  return new Promise<string>((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result||""));
    reader.onerror=()=>reject(new Error("Image could not be read."));
    reader.readAsDataURL(blob);
  });
}

export async function optimizeImage(file:File,maxDimension=1600,quality=0.72):Promise<OptimizedImage>{
  const bitmap=await createImageBitmap(file);
  const scale=Math.min(1,maxDimension/Math.max(bitmap.width,bitmap.height));
  const width=Math.max(1,Math.round(bitmap.width*scale));
  const height=Math.max(1,Math.round(bitmap.height*scale));

  const canvas=document.createElement("canvas");
  canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext("2d",{alpha:false});
  if(!ctx)throw new Error("Canvas unavailable.");
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality="high";
  ctx.drawImage(bitmap,0,0,width,height);
  bitmap.close();

  const blob=await new Promise<Blob>((resolve,reject)=>{
    canvas.toBlob(b=>b?resolve(b):reject(new Error("Image compression failed.")),"image/webp",quality);
  });

  return {
    dataUrl:await asDataUrl(blob),
    originalBytes:file.size,
    optimizedBytes:blob.size,
    width,height
  };
}

export async function optimizeImages(files:File[],maxFiles=2){
  const selected=files.slice(0,maxFiles);
  return Promise.all(selected.map(file=>optimizeImage(file)));
}
