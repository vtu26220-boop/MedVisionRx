import { createContext, useContext } from "react";
export const WebsiteAdminContext=createContext({isAdmin:false,uid:""});
export const useWebsiteAdmin=()=>useContext(WebsiteAdminContext);
