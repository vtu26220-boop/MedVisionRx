import { Link } from "react-router-dom";
import "./PublicForms.css";
export default function Legal({ privacy = false }: { privacy?: boolean }) {
  return <main className="mv-public-form-page"><article className="mv-public-form-card">
    <h1>{privacy ? "Privacy information" : "Terms of Service"}</h1>
    {privacy ? <>
      <h2>Information used by this project</h2><p>MedVisionRx uses Firebase for account sign-in and stores account profiles, donor registrations, requirements, support messages and prescription history through its backend and database.</p>
      <h2>Prescription documents</h2><p>Prescription uploads may contain personal medical information. Upload only documents you are permitted to share. The configured local OCR processes documents on the backend. Medicine-reference lookups can send reviewed medicine names to external reference providers.</p>
      <h2>Access and storage</h2><p>Prescription originals and saved reports require account authentication. Separately authorized clinical reviewers can access prescription content for a stated, audited reason. Your chosen avatar uses an external avatar service. Account and service records remain stored until removed through the available controls or handled by the project administrator.</p>
      <h2>Questions or removal requests</h2><p>Contact support for questions about your stored information or to request account-data removal. This project does not automatically delete all records when you log out.</p>
    </> : <>
      <h2>Educational project</h2><p>MedVisionRx is a student healthcare information and coordination project. Medicine information and prescription recognition require your review and are not a diagnosis or a prescription.</p>
      <h2>Use services responsibly</h2><p>Provide information you are authorized to share. Do not impersonate donors, submit false requests, or use another person's account. Donor registration and search do not establish medical eligibility or guarantee availability.</p>
      <h2>Medical decisions</h2><p>Confirm medicine names, strengths, age precautions and treatment instructions with a qualified pharmacist or prescriber. Blood and organ donation decisions must be handled by appropriate medical facilities. Contact local emergency services for emergencies.</p>
      <h2>External links</h2><p>Pharmacy and reference links lead to external websites. Availability, prices and suitability need independent confirmation. Do not change treatment based solely on this project.</p>
    </>}
    <Link className="mv-form-secondary" to="/contact">Contact support</Link><Link className="mv-form-secondary" to="/register">Back to signup</Link>
  </article></main>;
}
