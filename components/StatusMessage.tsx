export default function StatusMessage({children,tone="info"}:{children:React.ReactNode;tone?:"info"|"error"|"success"|"warning"}) {
  return <div className={"statusMessage status-"+tone} role={tone==="error"?"alert":"status"} aria-live={tone==="error"?"assertive":"polite"}>{children}</div>;
}
