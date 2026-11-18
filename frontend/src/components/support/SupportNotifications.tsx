import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { onAuthStateChanged, type User } from "firebase/auth";
import { Bell, ChevronDown, RefreshCw, ThumbsDown, ThumbsUp, Trash2, X } from "lucide-react";
import { auth } from "../../firebase";
import { supportServiceForPath, type SupportNotification } from "./supportNotificationState";
import "./SupportNotifications.css";
const endpoint=(import.meta.env.VITE_API_URL||"http://127.0.0.1:8000").replace(/\/+$/,"")+"/api/admin/support/notifications";

export default function SupportNotifications({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [user,setUser]=useState<User|null>(null);
  const service=supportServiceForPath(pathname);
  useEffect(()=>onAuthStateChanged(auth,setUser),[]);
  return <>{children}{service && user && <NotificationTray key={`${user.uid}:${service}`} user={user} service={service}/>}</>;
}
function NotificationTray({ user,service }: { user:User;service:string }) {
  const [items,setItems]=useState<SupportNotification[]>([]);const [unread,setUnread]=useState(0);
  const [open,setOpen]=useState(false);const [expanded,setExpanded]=useState("");const [error,setError]=useState("");const [busy,setBusy]=useState("");const [revision,setRevision]=useState(0);const [loading,setLoading]=useState(true);
  useEffect(()=>{
    const controller=new AbortController();let fetching=false;
    const load=async()=>{if(fetching)return;fetching=true;try{const token=await user.getIdToken();const response=await fetch(`${endpoint}?service=${encodeURIComponent(service)}`,{headers:{Authorization:`Bearer ${token}`},signal:controller.signal,cache:"no-store"});const data=await response.json();if(!response.ok)throw new Error(typeof data.detail==='string'?data.detail:"Notifications unavailable.");if(!controller.signal.aborted){setItems(data.items);setUnread(data.unread_count);setError("");}}catch(cause){if(!controller.signal.aborted)setError(cause instanceof Error?cause.message:"Notifications unavailable.");}finally{fetching=false;if(!controller.signal.aborted)setLoading(false);}};
    void load();const timer=window.setInterval(()=>void load(),15000);const focus=()=>void load();window.addEventListener("focus",focus);
    return()=>{controller.abort();window.clearInterval(timer);window.removeEventListener("focus",focus);};
  },[user,service,revision]);
  useEffect(()=>{if(!open)return;const close=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false);};window.addEventListener("keydown",close);return()=>window.removeEventListener("keydown",close);},[open]);
  const action=async(item:SupportNotification,operation:"read"|"clear"|"helpful"|"not_helpful")=>{
    if(busy)return;setBusy(item.id);setError("");try{const token=await user.getIdToken();const response=await fetch(`${endpoint}/${encodeURIComponent(item.id)}`,{method:"PATCH",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({action:operation})});const data=await response.json();if(!response.ok)throw new Error(typeof data.detail==='string'?data.detail:"Unable to update notification.");const updated:SupportNotification=data.item;setItems(rows=>updated.cleared_at?rows.filter(row=>row.id!==updated.id):rows.map(row=>row.id===updated.id?updated:row));if(!item.read_at&&(updated.read_at||updated.cleared_at))setUnread(count=>Math.max(0,count-1));if(updated.cleared_at)setExpanded("");setRevision(value=>value+1);}catch(cause){setError(cause instanceof Error?cause.message:"Unable to update notification.");}finally{setBusy("");}
  };
  const date=(value:string)=>new Date(value).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
  return <div className="support-notice-widget"><button className="support-notice-bell" aria-label={`Support notifications${unread?`, ${unread} unread`:""}`} aria-expanded={open} aria-controls="support-notice-panel" onClick={()=>setOpen(value=>!value)}><Bell size={20}/><span>Notifications</span>{unread>0&&<strong className="support-notice-count">{unread>99?"99+":unread}</strong>}</button>{open&&<section id="support-notice-panel" className="support-notice-panel" aria-label="Support notifications"><header><div><h2>Support notifications</h2><p aria-live="polite">{unread} unread</p></div><button aria-label="Refresh notifications" onClick={()=>setRevision(value=>value+1)}><RefreshCw size={17}/></button><button aria-label="Close notifications" onClick={()=>setOpen(false)}><X size={19}/></button></header>{error&&<p className="support-notice-error" role="alert">{error}</p>}<div className="support-notice-list">{loading?<p className="support-notice-empty">Loading notifications...</p>:items.length?items.map(item=><article key={item.id} className={`support-notice-item ${item.read_at?"is-read":"is-unread"}`}><button className="support-notice-open" disabled={!!busy} aria-expanded={expanded===item.id} onClick={()=>{setExpanded(value=>value===item.id?"":item.id);if(!item.read_at)void action(item,"read");}}><span className={`support-notice-light ${item.read_at?"is-read":"is-unread"}`}/><span><strong>{item.subject}</strong><small>{date(item.created_at)} &bull; {item.read_at?"Read":"Unread"}</small></span><ChevronDown size={17}/></button>{expanded===item.id&&<div className="support-notice-body"><h3>Your request</h3><p>{item.request_message}</p><h3>Admin response</h3><p>{item.message}</p><div className="support-notice-reactions"><button className={`is-positive ${item.feedback==="helpful"?"is-selected":""}`} aria-pressed={item.feedback==="helpful"} disabled={!!busy} onClick={()=>void action(item,"helpful")}><ThumbsUp size={16}/>Helpful</button><button className={`is-negative ${item.feedback==="not_helpful"?"is-selected":""}`} aria-pressed={item.feedback==="not_helpful"} disabled={!!busy} onClick={()=>void action(item,"not_helpful")}><ThumbsDown size={16}/>Not helpful</button></div>{item.feedback&&<p className="support-notice-feedback-sent">Your feedback has been sent to admin.</p>}<button className="support-notice-clear" disabled={!!busy} onClick={()=>void action(item,"clear")}><Trash2 size={15}/>Clear notification</button></div>}</article>):<p className="support-notice-empty">No support responses for this service yet.</p>}</div></section>}</div>;
}
