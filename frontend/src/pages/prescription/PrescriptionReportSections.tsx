import { ArrowRight, AlertTriangle, FileText, FileUp, History, Pill, Plus, ShieldCheck, Utensils, X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { RxDocumentDetails, RxDocumentField, RxMedicine, RxPrescribed } from "./prescriptionApi";

const unspecified = "Not clearly specified";
const prescribedFields: [keyof RxPrescribed, string][] = [
  ["dose", "Dose"], ["frequency", "Frequency"], ["duration", "Duration"],
  ["morning", "Morning"], ["afternoon", "Afternoon"], ["evening", "Evening"], ["night", "Night"],
  ["meal_instructions", "Before / after meals"], ["schedule_code", "Schedule code as written"],
];
export function PrescriptionFlow({ active, presentation = "cards" }: { active: number; presentation?: "cards" | "timeline" }) {
  const nav = useRef<HTMLElement>(null);
  useEffect(() => {
    const reveal = () => {
      const container = nav.current;
      const step = container?.querySelector<HTMLElement>('li[aria-current="step"]');
      if (!container || !step || container.scrollWidth <= container.clientWidth) return;
      const left = step.getBoundingClientRect().left - container.getBoundingClientRect().left + container.scrollLeft;
      container.scrollTo({ left: Math.max(0, left - (container.clientWidth - step.clientWidth) / 2), behavior: "instant" });
    };
    reveal(); window.addEventListener("resize", reveal);
    return () => window.removeEventListener("resize", reveal);
  }, [active]);
  const steps = [{ label: "Upload / Camera", icon: FileUp }, { label: "Preview & confirm", icon: FileText }, { label: "Analyze", icon: ShieldCheck }, { label: "View medicine", icon: Pill }, { label: "Saved history", icon: History }];
  return <nav ref={nav} className={`rx-flow ${presentation === "timeline" ? "rx-flow-timeline" : ""}`} aria-label="Prescription workflow"><ol>{steps.map(({ label, icon: Icon }, index) => <li key={label} className={index === active ? "rx-flow-current" : index < active ? "rx-flow-done" : ""} aria-current={index === active ? "step" : undefined}><span><Icon size={18} />{presentation === "timeline" ? <strong>{label}</strong> : label}</span>{index < steps.length - 1 && <ArrowRight size={16} aria-hidden="true" />}</li>)}</ol></nav>;
}
export function ExtractedTextDialog({ text, provider, onClose }: { text: string; provider?: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} className="rx-raw-dialog" aria-labelledby="rx-raw-title" onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="rx-section-title"><h2 id="rx-raw-title">Original extracted text</h2><button className="rx-secondary" aria-label="Close extracted text" onClick={onClose}><X size={18} /></button></div><p>{provider || "OCR"} · Recognized text only; unclear handwriting may be incomplete.</p><pre className="rx-raw-text">{text || "No readable text was extracted."}</pre></dialog>;
}
function safeLink(value: string) { try { return new URL(value).protocol === "https:"; } catch { return false; } }
function fieldValue(fields: RxDocumentField[], keys: string[]) {
  return keys.map((key) => fields.find((field) => field.key === key && field.value.trim())?.value).find(Boolean) || "Not clearly detected";
}
export function DocumentDetails({ details, editing, disabled, onChange }: { details: RxDocumentDetails; editing: boolean; disabled: boolean; onChange: (fields: RxDocumentField[]) => void }) {
  const update = (index: number, key: "label" | "value", value: string) => onChange(details.fields.map((field, i) => i === index ? { ...field, [key]: value } : field));
  const cells = [
    { label: "Hospital", keys: ["hospital_name"] }, { label: "Doctor", keys: ["doctor_name"] },
    { label: details.fields.some((field) => field.key === "patient_name" && field.value) ? "Patient" : "Name as written", keys: ["patient_name", "name_as_written"] },
    { label: "Date", keys: ["prescription_date"] }, { label: details.fields.some((field) => field.key === "age_sex" && field.value) ? "Age / sex" : "Age", keys: ["patient_age", "age_sex"] },
    { label: "Visit ID", keys: ["prescription_number"] },
  ];
  const secondary = details.fields.filter((field) => field.value.trim() && ["patient_dob", "patient_sex", "doctor_registration", "contact", "address"].includes(field.key));
  return <section className="rx-design-panel rx-document-details"><h2 className="rx-panel-heading">Prescription details</h2>
    {editing ? <div className="rx-document-edit-grid">{details.fields.map((field, index) => <fieldset disabled={disabled} className="rx-document-field" key={index}><label>Detail label<input aria-label={`Detail ${index + 1} label`} maxLength={150} value={field.label} onChange={(event) => update(index, "label", event.target.value)} /></label><label>{field.label || "Value"}<textarea maxLength={1500} rows={2} value={field.value} onChange={(event) => update(index, "value", event.target.value)} placeholder="Leave blank if unclear" /></label></fieldset>)}<button type="button" className="rx-secondary" disabled={disabled || details.fields.length >= 80} onClick={() => onChange([...details.fields, { key: `other_${details.fields.length}`, label: "Other detail", value: "", source_text: "" }])}><Plus size={16} />Add detail</button></div> : <><dl className="rx-identity-grid">{cells.map(({ label, keys }) => <div key={label}><dt>{label}</dt><dd>{fieldValue(details.fields, keys)}</dd></div>)}</dl>{!!secondary.length && <dl className="rx-additional-identity">{secondary.map((field, index) => <div key={index}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}</dl>}</>}
  </section>;
}
export function OtherInstructions({ details }: { details?: RxDocumentDetails }) {
  const fields = details?.fields || [];
  const rows = [
    { label: "Tests", keys: ["tests"] }, { label: "Follow-up", keys: ["follow_up"] },
    ...["diagnosis", "allergies", "observations"].filter((key) => fields.some((field) => field.key === key && field.value.trim())).map((key) => ({ label: fields.find((field) => field.key === key)?.label || key, keys: [key] })),
    { label: "Other notes", keys: ["advice", ...fields.filter((field) => field.key.startsWith("other_")).map((field) => field.key)] },
  ];
  return <section className="rx-design-panel rx-other-instructions"><h2 className="rx-panel-heading">Other prescription instructions</h2><dl className="rx-detail-rows">{rows.map(({ label, keys }) => <div key={label}><dt>{label}</dt><dd>{fields.filter((field) => keys.includes(field.key) && field.value.trim()).map((field, index) => <span key={index}>{field.value}</span>)}{!fields.some((field) => keys.includes(field.key) && field.value.trim()) && "Not clearly detected"}</dd></div>)}</dl></section>;
}
export function PrescribedEditor({ medicine, onChange }: { medicine: RxMedicine; onChange: (key: keyof RxPrescribed, value: string) => void }) {
  return <details className="rx-instruction-editor"><summary>Correct dosage and timing</summary><p>Copy only readable or clarified instructions. Empty fields stay unspecified.</p><div className="rx-two-columns">{prescribedFields.map(([key, label]) => <label key={key}>{label}<input maxLength={key === "meal_instructions" ? 500 : key === "schedule_code" ? 100 : 250} value={medicine.prescribed?.[key] || ""} onChange={(event) => onChange(key, event.target.value)} placeholder="Not clearly specified" /></label>)}</div></details>;
}
function ReferenceCard({ title, values, kind }: { title: string; values: string[]; kind: "uses" | "effects" | "age" }) {
  const Icon = kind === "uses" ? Pill : kind === "effects" ? AlertTriangle : ShieldCheck;
  return <section className={`rx-design-panel rx-reference-card rx-reference-${kind}`}><h3 className="rx-panel-heading"><Icon size={18} />{title}</h3><ul>{values.length ? values.map((value, index) => <li key={index}>{value}</li>) : <li>No sourced information available.</li>}</ul></section>;
}
export function MedicineReport({ medicine, reviewed }: { medicine: RxMedicine; index: number; reviewed: boolean }) {
  const available = ["catalogue_match", "label_match", "category_match"].includes(medicine.reference_status || "");
  const identity = [["Brand / name", medicine.medicine_name], ["Strength", medicine.strength], ["Form", medicine.dosage_form], ["Generic", medicine.generic_name]];
  const shops = [{ label: "Tata 1mg", aliases: ["tata 1mg"] }, { label: "Apollo", aliases: ["apollo pharmacy", "apollo"] }, { label: "PharmEasy", aliases: ["pharmeasy"] }, { label: "Netmeds", aliases: ["netmeds"] }];
  const ageValues = Object.entries(medicine.age_restrictions || {}).filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`);
  return <article className="rx-medicine-report rx-medicine-design">
    <div className="rx-medicine-page-title"><h1>{medicine.medicine_name}</h1><span className="rx-ocr-chip"><ShieldCheck size={15} />{reviewed ? "Checked against original by you" : "Check OCR name against original"}</span></div>
    {medicine.reference_status === "category_match" && <p className="rx-notice">General medicine category information. The exact brand, ingredients and formulation have not been identified.</p>}
    <div className="rx-medicine-top-grid"><section className="rx-design-panel"><h2 className="rx-panel-heading">Medicine identity</h2><dl className="rx-detail-rows">{identity.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || unspecified}</dd></div>)}</dl></section>
      <section className="rx-design-panel"><h2 className="rx-panel-heading">Prescribed directions</h2><dl className="rx-detail-rows">{prescribedFields.slice(0, 3).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{medicine.prescribed?.[key] || unspecified}</dd></div>)}</dl></section></div>
    <section className="rx-design-panel rx-timing-panel"><h2 className="rx-panel-heading">Timing (as per prescription)</h2><div className="rx-timing-table"><table><thead><tr>{prescribedFields.slice(3, 7).map(([key, label]) => <th key={key} scope="col">{label}</th>)}</tr></thead><tbody><tr>{prescribedFields.slice(3, 7).map(([key]) => <td key={key}>{medicine.prescribed?.[key] || "Not specified"}</td>)}</tr></tbody></table></div><div className="rx-meal-strip"><Utensils size={17} aria-hidden="true" /><p><strong>Before / after breakfast, lunch or dinner: </strong>{medicine.prescribed?.meal_instructions || unspecified}</p></div>{medicine.prescribed?.schedule_code && <p className="rx-schedule-note"><strong>Code as written:</strong> {medicine.prescribed.schedule_code}. Confirm day parts and meal timing; they are not inferred from this code.</p>}</section>
    <div className="rx-reference-grid"><ReferenceCard title="Uses" kind="uses" values={medicine.uses || []} /><ReferenceCard title="Side effects" kind="effects" values={medicine.side_effects || []} /><ReferenceCard title="Age precautions" kind="age" values={ageValues} /></div>
    {!!medicine.precautions?.length && <section className="rx-design-panel rx-warnings-panel"><h3 className="rx-panel-heading"><AlertTriangle size={17} />Warnings and precautions</h3><ul>{medicine.precautions.map((value, index) => <li key={index}>{value}</li>)}</ul></section>}
    <div className="rx-sources">{medicine.sources?.filter((source) => safeLink(source.url)).map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title}<ArrowRight size={14} /></a>)}</div>
    <section className="rx-design-panel rx-pharmacies"><div className="rx-panel-heading rx-pharmacy-heading"><h2>Pharmacy buying options</h2><span>Pharmacy search links · Confirm exact product</span></div><div className="rx-pharmacy-grid">{shops.map(({ label, aliases }) => {
      const shop = medicine.pharmacy_options?.find((option) => aliases.includes(option.store.toLowerCase()) && safeLink(option.url));
      return available && shop ? <a className="rx-secondary" key={label} href={shop.url} target="_blank" rel="noreferrer">{label}<ArrowRight size={15} /></a> : <span key={label} className="rx-secondary rx-pharmacy-disabled" aria-disabled="true">{label}<ArrowRight size={15} /></span>;
    })}</div>{!available && <p className="rx-reference-note">No reliable saved reference was found. Pharmacy links are unavailable for this detected name.</p>}</section>
    <p className="rx-reference-note">{medicine.reference_note || "Reference information does not establish a personal dose. Confirm unclear medicine names, directions and age suitability with the prescriber or pharmacist."}</p>
    <details className="rx-written-source"><summary>Medicine text as written</summary><p>{medicine.instructions || medicine.source_text || "No readable medicine instructions recorded."}</p></details>
  </article>;
}
