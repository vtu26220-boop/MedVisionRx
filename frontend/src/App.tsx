import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import MaintenanceGate from "./components/maintenance/MaintenanceGate";
import WebsiteAdminProvider from "./components/admin-access/WebsiteAdminProvider";
import SupportNotifications from "./components/support/SupportNotifications";

function App() {
  return (
    <BrowserRouter>
      <WebsiteAdminProvider><MaintenanceGate><SupportNotifications><AppRoutes /></SupportNotifications></MaintenanceGate></WebsiteAdminProvider>
    </BrowserRouter>
  );
}

export default App;