import Link from "next/link";
export default function MediaCard({post}:{post:any}){
  return <article className={`mediaCard tone-${String(post.tone||"").toLowerCase()}`}>
    <div className="mediaMeta"><span className="pill">{post.outlet}</span><span>{post.kind}</span><span>🔥 {post.virality||0}</span></div>
    <h3>{post.headline}</h3><p>{post.body}</p>
    <footer>{post.author_name||"Staff"} {post.game_id&&<>· <Link href={`/game/${post.game_id}`}>zum Spiel</Link></>}</footer>
  </article>
}
