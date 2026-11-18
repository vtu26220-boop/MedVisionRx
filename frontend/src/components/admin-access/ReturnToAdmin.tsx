import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useWebsiteAdmin } from "./WebsiteAdminContext";
import { returnToAdmin } from "./adminSession";
import "./AdminWebsiteAccess.css";
export default function ReturnToAdmin(){
  const {isAdmin}=useWebsiteAdmin();const location=useLocation();const navigate=useNavigate();const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  if(!isAdmin||location.pathname==="/admin"||location.pathname.startsWith("/admin/"))return null;
  const open=async()=>{setBusy(true);setError("");try{await returnToAdmin();navigate("/admin");}catch(cause){setError(cause instanceof Error?cause.message:"Unable to open administrator portal.");}finally{setBusy(false);}};
  return <div className="website-admin-return">{error&&<p role="alert">{error}</p>}<button onClick={()=>void open()} disabled={busy}><ShieldCheck size={18}/>{busy?"Opening admin portal...":"Return to Admin Portal"}</button></div>;
}
