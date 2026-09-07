import Link from "next/link";

export default function MediaCard({post,compact=false}:{post:any;compact?:boolean}){
  return <article className={`mediaCard ${compact?"compact":""} tone-${String(post.tone||"").toLowerCase()} kind-${String(post.kind||"").toLowerCase()}`}>
    <div className="mediaMeta">
      <span className="pill">{post.outlet}</span>
      <span>{post.kind}</span>
      <span>🔥 {post.virality||0}</span>
    </div>
    <h3>{post.headline}</h3>
    <p>{post.body}</p>
    <footer>
      <span>{post.author_name||"Staff"}</span>
      {post.game_id&&<Link href={`/game/${post.game_id}`}>Game ↗</Link>}
    </footer>
  </article>;
}
