type PreviewPost={id:string;created_at:string};

/** Reserve space for every player, fill unused slots, then show newest first. */
export function balancedMediaPreview<T extends PreviewPost>(groups:T[][],limit=6):T[]{
 const selected:T[]=[],seen=new Set<string>();
 for(let i=0;i<Math.max(0,...groups.map(g=>g.length))&&selected.length<limit;i++){
  for(const group of groups){
   const post=group[i];
   if(post&&!seen.has(post.id)){selected.push(post);seen.add(post.id);}
   if(selected.length===limit)break;
  }
 }
 return selected.sort((a,b)=>b.created_at.localeCompare(a.created_at)||a.id.localeCompare(b.id));
}
