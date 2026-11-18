import { useEffect, useState, type FormEvent } from "react";
import { MessageSquareReply, ThumbsUp, ThumbsDown } from "lucide-react";
import { adminRequest, dateValue, serviceNames, textValue, type AdminRow } from "./adminApi";
import { ErrorNotice } from "./AdminShared";

type Reply = { id: string; message: string; created_at: string; read_at: string | null; feedback: string | null; cleared_at: string | null };
export function SupportFeedback({ read, feedback, sent, feedbackOnly = false }: { read: boolean; feedback?: unknown; sent: boolean; feedbackOnly?: boolean }) {
  if (!sent) return <span className="ad-small">No response</span>;
  if (feedback === "helpful") return <span className="ad-support-feedback is-positive"><ThumbsUp size={14}/>Helpful</span>;
  if (feedback === "not_helpful") return <span className="ad-support-feedback is-negative"><ThumbsDown size={14}/>Not helpful</span>;
  if (feedbackOnly) return <span className="ad-small">Awaiting feedback</span>;
  return <span className="ad-support-read"><i className={read ? "is-read" : "is-unread"}/>{read ? "Read" : "Unread"}</span>;
}
export default function SupportReplyForm({ row, onSaved }: { row: AdminRow; onSaved: () => void }) {
  const [items,setItems]=useState<Reply[]>([]); const [message,setMessage]=useState(""); const [error,setError]=useState(""); const [busy,setBusy]=useState(false);
  const [requestId,setRequestId]=useState(()=>crypto.randomUUID());
  useEffect(()=>{const controller=new AbortController();const load=()=>adminRequest<{items:Reply[]}>(`/support/${encodeURIComponent(row.id)}/responses`,{signal:controller.signal}).then(data=>{if(!controller.signal.aborted)setItems(data.items);}).catch((cause:unknown)=>{if(!controller.signal.aborted)setError(cause instanceof Error?cause.message:"Responses unavailable.");});void load();const timer=window.setInterval(()=>void load(),15000);return()=>{controller.abort();window.clearInterval(timer);};},[row.id]);
  const send=async(event:FormEvent)=>{event.preventDefault();if(!message.trim())return;setBusy(true);setError("");try{await adminRequest(`/support/${encodeURIComponent(row.id)}/respond`,{method:"POST",body:JSON.stringify({request_id:requestId,message:message.trim()})});onSaved();}catch(cause){setError(cause instanceof Error?cause.message:"Unable to send response.");}finally{setBusy(false);}};
  return <><div className="ad-support-original"><h3>{textValue(row.subject)}</h3><p>{textValue(row.name)} {textValue(row.email)}</p><small>{serviceNames[textValue(row.service)] || textValue(row.service)}</small><p className="ad-support-message">{textValue(row.message)}</p></div>{items.length>0&&<section className="ad-support-conversation"><h3>Previous responses</h3>{items.map(item=><article key={item.id}><p className="ad-support-message">{item.message}</p><div><span className="ad-small">{dateValue(item.created_at)}</span><SupportFeedback read={!!item.read_at} sent feedback={item.feedback}/>{item.cleared_at&&<span className="ad-small">Cleared by user</span>}</div></article>)}</section>}<form className="ad-form" onSubmit={send}><ErrorNotice message={error}/><fieldset disabled={busy}><label>Your response<textarea required maxLength={4000} rows={5} placeholder="Write a response to this support request..." value={message} onChange={event=>{setMessage(event.target.value);setRequestId(crypto.randomUUID());}}/></label><p className="ad-small">Delivered to this user's {serviceNames[textValue(row.service)] || "services"} dashboard. You can see when they read it and whether it was helpful.</p><button className="ad-primary" disabled={busy || !message.trim()}><MessageSquareReply size={17}/>{busy?"Sending...":"Send response"}</button></fieldset></form></>;
}
