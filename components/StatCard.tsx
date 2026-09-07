export default function StatCard({label,value,sub}:{label:string;value:any;sub?:string}){
  return <div className="statCard"><span>{label}</span><strong>{value}</strong>{sub&&<small>{sub}</small>}</div>
}
