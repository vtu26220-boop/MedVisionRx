import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { FileUp, FileText, History, ShieldCheck, AlertTriangle, ArrowRight, Trash2, Plus, RefreshCw, Download, Camera, ArrowUp, Check, LockKeyhole, X } from "lucide-react";
import { auth } from "../../firebase";
import { rxDate, rxFetch, rxRequest, statusLabel, type RxDocumentField, type RxPrescribed, type RxMedicine, type RxRecord } from "./prescriptionApi";
import "./PrescriptionWorkspace.css";
import "./PrescriptionDesign.css";
import "./PrescriptionUpload.css";
import prescriptionWelcomePhoto from "./assets/prescription-welcome.jpg";
import CameraCapture from "./CameraCapture";
import { isAnalyzedStatus, prescriptionCounts } from "./prescriptionStatus";
import { DocumentDetails, MedicineReport, PrescribedEditor, OtherInstructions, ExtractedTextDialog, PrescriptionFlow } from "./PrescriptionReportSections";
import medvisionRxLogo from "../../assets/medvisionrx-logo.png";

function Heading({ title, description }: { title: string; description: string }) {
  return <div className="rx-heading"><div><span className="rx-eyebrow">PRESCRIPTION ANALYZER</span><h1>{title}</h1><p>{description}</p></div></div>;
}
function ErrorBox({ message }: { message: string }) { return message ? <div className="rx-error" role="alert"><AlertTriangle size={19} /><span>{message}</span></div> : null; }
const recordUrl = (id: string) => `/prescription/history-details?id=${encodeURIComponent(id)}`;

function useHistory() {
  const [records, setRecords] = useState<RxRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let controller = new AbortController();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      controller.abort();
      controller = new AbortController();
      const signal = controller.signal;
      setRecords([]); setLoading(true); setError("");
      if (!user) { setError("Sign in to view your prescriptions."); setLoading(false); return; }
      rxRequest<RxRecord[]>("/history/all", { signal }).then((rows) => {
        if (!signal.aborted) setRecords(rows);
      }).catch((reason: unknown) => {
        if (!signal.aborted) setError(reason instanceof Error ? reason.message : "Unable to load history.");
      }).finally(() => { if (!signal.aborted) setLoading(false); });
    });
    return () => { controller.abort(); unsubscribe(); };
  }, [revision]);
  return { records, loading, error, refresh: () => setRevision((n) => n + 1) };
}

export function Dashboard() {
  const { displayName } = useOutletContext<{ displayName: string }>();
  const { records, loading, error, refresh } = useHistory();
  const counts = prescriptionCounts(records);
  const stats = [["Total prescriptions uploaded", counts.total], ["Analyzed prescriptions", counts.analyzed], ["Failed analyses", counts.failed]];
  return <div className="rx-workspace">
    <section className="rx-welcome">
      <div className="rx-welcome-copy">
        <span className="rx-eyebrow">PRESCRIPTION ANALYZER SERVICE</span>
        <h1>Welcome <span>{displayName}!</span></h1>
        <p>Upload your prescription, explore medicine information, and keep your reports in one place.</p>
      </div>
      <div className="rx-welcome-photo">
        <img src={prescriptionWelcomePhoto} alt="A clinician writing medical notes on a clipboard" decoding="async" />
      </div>
    </section>
    <section className="rx-dashboard-upload" aria-labelledby="rx-dashboard-upload-title">
      <div className="rx-upload-motion" aria-hidden="true"><FileUp size={30} /></div>
      <div className="rx-dashboard-upload-copy">
        <h2 id="rx-dashboard-upload-title">Upload your prescription</h2>
        <p>Choose a photo or PDF, preview it, then submit it for analysis.</p>
        <span>JPG, PNG or PDF · Up to 10 MB</span>
      </div>
      <Link className="rx-button rx-dashboard-upload-button" to="/prescription/upload"><FileUp size={18} />Upload Prescription<ArrowRight size={17} /></Link>
    </section>
    <ErrorBox message={error} />
    <div className="rx-stats">{stats.map(([label, value]) => <div className="rx-card" key={label}><span>{label}</span><strong>{loading || error ? "?" : value}</strong></div>)}</div>
    <div className="rx-section-title"><div><h2>Recent prescriptions</h2><p>Only prescriptions saved to your signed-in account appear here.</p></div><button className="rx-secondary" onClick={refresh}><RefreshCw size={16} />Refresh</button></div>
    {loading ? <div className="rx-card rx-empty">Loading your saved prescriptions?</div> : !error && !records.length ? <div className="rx-card rx-empty"><FileText size={36} /><h3>No prescriptions yet</h3><p>Your real dashboard counts will update after you upload a prescription.</p><Link to="/prescription/upload" className="rx-button">Upload your first prescription</Link></div> : <RecordList records={records.slice(0, 5)} />}
    <Link className="rx-text-link" to="/prescription/history">Open full history <ArrowRight size={16} /></Link>
    <section className="rx-info"><ShieldCheck size={22} /><div><strong>Your analysis is saved automatically</strong><p>View the recognized text and detected medicines after analysis. Corrections are optional; unclear handwriting remains marked as uncertain.</p></div></section>
  </div>;
}

function RecordList({ records }: { records: RxRecord[] }) {
  return <div className="rx-history-table-wrap"><table className="rx-history-table"><thead><tr><th scope="col">File name</th><th scope="col">Date</th><th scope="col">Status</th><th scope="col">Action</th></tr></thead><tbody>{records.map((row) => <tr key={row.id}><td><FileText size={17} /><span>{row.filename}</span></td><td>{rxDate(row.created_at)}</td><td><span className={`rx-status rx-status-${row.status}`}>{statusLabel(row.status)}</span></td><td><Link className="rx-view-analysis" to={recordUrl(row.id)}>View analysis<ArrowRight size={15} /></Link></td></tr>)}</tbody></table></div>;
}

export function HistoryPage() {
  const { records, loading, error, refresh } = useHistory();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const filtered = records.filter((row) => (!filter || (filter === "analyzed" ? isAnalyzedStatus(row.status) : row.status === filter)) && [row.filename, ...row.medicines.map((m) => `${m.medicine_name} ${m.generic_name || ""}`)].join(" ").toLowerCase().includes(query.toLowerCase()));
  return <div className="rx-workspace"><PrescriptionFlow active={4} /><div className="rx-private-history-heading"><Heading title="Private history" description="Reopen your uploads and saved analysis without analyzing them again." /><span className="rx-private-pill"><ShieldCheck size={16} />Only your uploads and saved results</span></div>
    <div className="rx-toolbar"><input aria-label="Search prescription history" placeholder="Search filename, medicine or generic name?" value={query} onChange={(event) => setQuery(event.target.value)} /><select aria-label="Filter by status" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="">All statuses</option>{["analyzed", "failed", "processing"].map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select><button className="rx-secondary" onClick={refresh}><RefreshCw size={16} />Refresh</button><Link className="rx-button" to="/prescription/upload"><Plus size={16} />New upload</Link></div>
    <ErrorBox message={error} />{loading ? <div className="rx-card rx-empty">Loading history?</div> : !error && <><p>{filtered.length} of {records.length} saved prescriptions</p>{filtered.length ? <RecordList records={filtered} /> : <div className="rx-card rx-empty"><History size={34} /><h3>No prescriptions found</h3><p>{records.length ? "Try a different search or filter." : "Your uploaded prescriptions and reports will be saved here."}</p></div>}</>}
  </div>;
}

function validFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!["jpg", "jpeg", "png", "pdf"].includes(extension || "")) return "Choose a JPG, PNG or PDF file.";
  if (file.size < 1 || file.size > 10 * 1024 * 1024) return "Choose a non-empty file up to 10 MB.";
  return "";
}

function DocumentPreview({ url, pdf }: { url: string; pdf: boolean }) {
  return <div className="rx-document">{pdf ? <iframe src={url} title="Prescription PDF preview" /> : <img src={url} alt="Original uploaded prescription" />}<a href={url} target="_blank" rel="noreferrer">Open original in a new tab</a></div>;
}
function useObjectUrl(file: Blob | null) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!file) return;
    const value = URL.createObjectURL(file);
    let active = true;
    queueMicrotask(() => { if (active) setUrl(value); });
    return () => { active = false; URL.revokeObjectURL(value); };
  }, [file]);
  return url;
}

export function UploadPage() {
  const [cameraOpen, setCameraOpen] = useState(false);
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const pick = (selected?: File) => {
    if (!selected) return;
    const message = validFile(selected);
    setError(message); setFile(message ? null : selected);
  };
  return <div className="rx-workspace rx-upload-page"><PrescriptionFlow active={0} presentation="timeline" /><Heading title="Upload prescription" description="Choose a document or take a photo. Preview it before analysis." />
    <ErrorBox message={error} />
    <section className="rx-design-panel rx-upload-panel rx-upload-surface">
      <div className={`rx-upload-dropzone ${dragging ? "is-dragging" : ""}`} role="group" aria-label="Prescription file drop area"
        onDragEnter={(event) => { event.preventDefault(); if (event.dataTransfer.types.includes("Files")) { dragDepth.current += 1; setDragging(true); } }}
        onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }}
        onDragLeave={(event) => { event.preventDefault(); dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDragging(false); }}
        onDrop={(event) => { event.preventDefault(); dragDepth.current = 0; setDragging(false); const files = event.dataTransfer.files; if (files.length !== 1) { setError("Choose one prescription file at a time."); return; } pick(files[0]); }}>
        <div className="rx-drop-illustration" aria-hidden="true"><div className="rx-drop-document"><strong>R<sub>x</sub></strong><i /><i /><i /></div><span className="rx-drop-arrow"><ArrowUp size={30} strokeWidth={3} /></span></div>
        <h2>{dragging ? "Drop your prescription here" : "Drag & drop your prescription here"}</h2><p>or choose a file from your device</p>
        <div className="rx-upload-choices"><button type="button" className="rx-button" onClick={() => fileInput.current?.click()}><FileUp size={20} />Choose file</button><input ref={fileInput} className="rx-file-input" aria-label="Choose prescription file" type="file" accept="image/jpeg,image/png,application/pdf" onChange={(event) => { pick(event.target.files?.[0]); event.target.value = ""; }} /><button type="button" className="rx-secondary rx-open-camera" onClick={() => setCameraOpen(true)}><Camera size={20} />Open camera</button></div>
        <div className="rx-format-chips" aria-label="Supported formats"><span>JPG</span><span>PNG</span><span>PDF</span></div><small>Up to 10 MB &bull; PDFs up to 5 pages</small>
        <label className="rx-native-camera">Use phone camera<input className="rx-file-input" aria-label="Use phone camera" type="file" accept="image/jpeg,image/png" capture="environment" onChange={(event) => { pick(event.target.files?.[0]); event.target.value = ""; }} /></label>
      </div>
      <aside className="rx-upload-tips" aria-labelledby="rx-scan-tips-title"><img src={prescriptionWelcomePhoto} alt="A clinician writing a prescription on a clipboard beside a stethoscope" /><h2 id="rx-scan-tips-title">For a clearer scan</h2><ul>{["Include the entire prescription", "Use good lighting", "Keep the text sharp"].map((tip) => <li key={tip}><span><Check size={17} /></span>{tip}</li>)}</ul></aside>
      {file && <div className="rx-selected-upload" role="status"><FileText size={23} /><div><strong>{file.name}</strong><span>{(file.size / 1024 / 1024).toFixed(2)} MB &bull; Ready to preview</span></div><button type="button" className="rx-remove-upload" aria-label="Remove selected file" onClick={() => { setFile(null); setError(""); }}><X size={18} /></button><button type="button" className="rx-button" onClick={() => navigate("/prescription/preview", { state: { file } })}>Preview prescription<ArrowRight size={17} /></button></div>}
    </section>
    <footer className="rx-upload-footer"><p><LockKeyhole size={18} />Your uploads and reports stay in your account.</p><Link to="/prescription/health-guidelines">View upload guidelines</Link></footer>
    {cameraOpen && <CameraCapture onClose={() => setCameraOpen(false)} onCapture={(photo) => { pick(photo); setCameraOpen(false); }} />}
  </div>;
}

export function PreviewPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const file = (location.state as { file?: File } | null)?.file || null;
  const url = useObjectUrl(file);
  const [consent, setConsent] = useState(false);
  if (!file) return <div className="rx-workspace rx-card rx-empty"><h2>No file selected</h2><Link to="/prescription/upload">Choose a prescription</Link></div>;
  return <div className="rx-workspace rx-preview-page"><PrescriptionFlow active={1} /><Heading title="Preview & confirm" description="Make sure the whole prescription is readable and correctly oriented." /><section className="rx-design-panel rx-preview-panel"><div className="rx-preview-content"><div className="rx-preview-original">{url && <DocumentPreview url={url} pdf={file.name.toLowerCase().endsWith(".pdf")} />}</div><div className="rx-selected-file"><FileText size={25} /><h2>Selected file</h2><dl><div><dt>Name</dt><dd>{file.name}</dd></div><div><dt>Size</dt><dd>{(file.size / 1024 / 1024).toFixed(2)} MB</dd></div><div><dt>Type</dt><dd>{file.name.split(".").pop()?.toUpperCase()}</dd></div></dl><p>The original and analysis will be saved to your private history.</p><label className="rx-check"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />I agree to process this prescription and save it to my account.</label></div></div><div className="rx-preview-actions"><Link className="rx-secondary" to="/prescription/upload">Change file</Link><button className="rx-button" disabled={!consent} onClick={() => navigate("/prescription/processing", { state: { file } })}>Submit for analysis<ArrowRight size={17} /></button></div></section></div>;

}

export function ProcessingPage() {
  const location = useLocation(); const navigate = useNavigate();
  const file = (location.state as { file?: File } | null)?.file;
  const request = useRef<Promise<RxRecord> | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!file) return;
    let active = true;
    if (!request.current) {
      const body = new FormData(); body.append("file", file);
      request.current = rxRequest<RxRecord>("/scan", { method: "POST", body, headers: { "Idempotency-Key": crypto.randomUUID() } });
    }
    request.current.then((record) => { if (active) navigate(`/prescription/results?id=${encodeURIComponent(record.id)}`, { replace: true }); }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Analysis failed."); });
    return () => { active = false; };
  }, [file, navigate]);
  const processing = Boolean(file && !error);
  return (
    <div className="rx-workspace"><PrescriptionFlow active={2} />
      <Heading
        title={error ? "Analysis needs attention" : "Reading your prescription"}
        description="Please wait while we read your document and save the extracted analysis to your private history."
      />
      <ErrorBox message={error} />
      <section className={`rx-card rx-empty ${processing ? "rx-processing-card" : ""}`} aria-busy={processing}>
        {!file ? (
          <><h2>No file selected</h2><Link to="/prescription/upload">Upload a prescription</Link></>
        ) : error ? (
          <>
            <p>Check OCR configuration or try a clearer image. If the request timed out, check History before submitting again.</p>
            <Link className="rx-button" to="/prescription/upload">Back to upload</Link>
            <Link to="/prescription/history">Open history</Link>
          </>
        ) : (
          <>
            <div className="rx-logo-loader" aria-hidden="true">
              <span className="rx-loader-halo" />
              <span className="rx-loader-orbit" />
              <div className="rx-loader-logo"><img src={medvisionRxLogo} alt="" /></div>
              <span className="rx-loader-scan" />
            </div>
            <div className="rx-processing-copy" role="status" aria-live="polite">
              <span className="rx-eyebrow">MEDVISIONRX PRESCRIPTION ANALYZER</span>
              <h2>Analyzing your prescription<span className="rx-loading-dots" aria-hidden="true"><i /><i /><i /></span></h2>
              <p className="rx-processing-filename" title={file.name}>{file.name}</p>
              <p>We are reading document details, medicine names and written instructions. Your results will appear automatically.</p>
            </div>
            <div className="rx-processing-note">
              <strong>Why can this take a little longer?</strong>
              <p>The first scan loads the OCR models. Larger images, multiple pages and a busy server can also take longer to process. Unclear handwriting may need your help during review.</p>
            </div>
            <p className="rx-processing-hint">You will be taken to the analysis results automatically when processing finishes.</p>
          </>
        )}
      </section>
    </div>
  );
}

export function DetailPage() {
  const [params] = useSearchParams(); const location = useLocation(); const navigate = useNavigate();
  const legacy = location.state as { prescription?: { id?: string }; analysis?: { data?: { id?: string }; id?: string } } | null;
  const id = params.get("id") || legacy?.prescription?.id || legacy?.analysis?.data?.id || legacy?.analysis?.id || "";
  const medicineParam = params.get("medicine");
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [id, medicineParam]);
  const [record, setRecord] = useState<RxRecord | null>(null);
  const [draft, setDraft] = useState<RxMedicine[]>([]);
  const [documentFields, setDocumentFields] = useState<RxDocumentField[]>([]);
  const [loading, setLoading] = useState(Boolean(id)); const [error, setError] = useState("");
  const [saving, setSaving] = useState(false); const [editing, setEditing] = useState(false);
  const [confirmed, setConfirmed] = useState(false); const [original, setOriginal] = useState<Blob | null>(null);
  const [originalError, setOriginalError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [rawOpen, setRawOpen] = useState(false);
  const originalUrl = useObjectUrl(original);
  useEffect(() => {
    if (!id) return;
    let controller = new AbortController();
    const unsubscribe = onAuthStateChanged(auth, () => {
      controller.abort(); controller = new AbortController(); const signal = controller.signal;
      setRecord(null); setOriginal(null); setError(""); setOriginalError(""); setLoading(true); setConfirmed(false); setRawOpen(false);
      rxRequest<RxRecord>(`/${encodeURIComponent(id)}`, { signal }).then((row) => { if (!signal.aborted) { setRecord(row); setDraft(row.medicines); setDocumentFields(row.document_details?.fields || []); setEditing(false); } }).catch((reason: unknown) => { if (!signal.aborted) setError(reason instanceof Error ? reason.message : "Unable to load prescription."); }).finally(() => { if (!signal.aborted) setLoading(false); });
      rxFetch(`/${encodeURIComponent(id)}/original`, { signal }).then(async (response) => { if (!response.ok) throw new Error("The original file is unavailable."); const blob = await response.blob(); if (!signal.aborted) setOriginal(blob); }).catch((reason: unknown) => { if (!signal.aborted) setOriginalError(reason instanceof Error ? reason.message : "Original unavailable."); });
    });
    return () => { controller.abort(); unsubscribe(); };
  }, [id]);
  useEffect(() => {
    const openForPrint = () => {
      document.querySelectorAll<HTMLDetailsElement>(".rx-medicine-report details").forEach((detail) => {
        detail.dataset.wasOpen = String(detail.open);
        detail.open = true;
      });
    };
    const restoreAfterPrint = () => {
      document.querySelectorAll<HTMLDetailsElement>(".rx-medicine-report details").forEach((detail) => {
        detail.open = detail.dataset.wasOpen === "true";
        delete detail.dataset.wasOpen;
      });
    };
    window.addEventListener("beforeprint", openForPrint);
    window.addEventListener("afterprint", restoreAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", openForPrint);
      window.removeEventListener("afterprint", restoreAfterPrint);
    };
  }, []);
  const update = (index: number, key: keyof RxMedicine, value: string) => { setConfirmed(false); setDraft((rows) => rows.map((row, i) => i === index ? { ...row, [key]: value } : row)); };
  const save = async () => {
    if (!record || !confirmed || saving) return;
    const owner = auth.currentUser?.uid;
    setSaving(true); setError("");
    try {
      const reviewed = await rxRequest<RxRecord>(`/${encodeURIComponent(id)}/review`, { method: "PATCH", body: JSON.stringify({ confirmed, version: record.version || 1, document_fields: documentFields.map(({key, label, value, source_text}) => ({key, label, value, source_text})), medicines: draft.map((m) => ({ medicine_name: m.medicine_name, strength: m.strength || "", dosage_form: m.dosage_form || "", instructions: m.instructions || "", source_text: m.source_text || "", prescribed: m.prescribed })) }) });
      if (auth.currentUser?.uid !== owner) return;
      setRecord(reviewed); setDraft(reviewed.medicines); setDocumentFields(reviewed.document_details?.fields || []); setEditing(false); setConfirmed(false);
    } catch (reason) { if (auth.currentUser?.uid === owner) setError(reason instanceof Error ? reason.message : "Unable to save review."); }
    finally { setSaving(false); }
  };
  const updatePrescribed = (index: number, key: keyof RxPrescribed, value: string) => {
    setConfirmed(false); setDraft((rows) => rows.map((row, i) => i === index ? { ...row, prescribed: { ...row.prescribed, [key]: value } } : row));
  };
  const remove = async () => { setSaving(true); try { await rxRequest(`/${encodeURIComponent(id)}`, { method: "DELETE" }); navigate("/prescription/history", { replace: true }); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to delete prescription."); } finally { setSaving(false); setDeleteOpen(false); } };
  const download = () => { if (!record) return; const url = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2)], { type: "application/json" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `MedVisionRx-${id}.json`; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); };
  if (!id) return <div className="rx-workspace rx-card rx-empty"><h2>Choose a saved prescription</h2><Link to="/prescription/history">Open history</Link></div>;
  if (loading) return <div className="rx-workspace rx-card rx-empty">Loading saved prescription?</div>;
  if (!record) return <div className="rx-workspace"><ErrorBox message={error || "Choose a prescription from your history."} /><Link to="/prescription/history">Open history</Link></div>;
  if (medicineParam !== null) {
    const index = /^\d+$/.test(medicineParam) ? Number(medicineParam) : -1;
    const medicine = record.medicines[index];
    return <div className="rx-workspace rx-medicine-page"><PrescriptionFlow active={3} /><Link className="rx-secondary rx-back-to-prescription rx-no-print" to={recordUrl(record.id)}>Back to prescription</Link>{medicine ? <MedicineReport medicine={medicine} index={index} reviewed={record.status === "completed"} /> : <p>Choose a detected medicine from your saved prescription.</p>}</div>;
  }

  return <div className="rx-workspace rx-analysis-design"><PrescriptionFlow active={2} />
    <div className="rx-analysis-heading"><div><h1>{editing ? "Correct extraction" : "Prescription analysis"}</h1><span className="rx-saved-pill"><ShieldCheck size={15} />Saved to your history</span><p>{record.filename} · {rxDate(record.created_at)}</p></div>{["needs_review", "completed"].includes(record.status) && <button className="rx-secondary rx-correct-button rx-no-print" disabled={saving} onClick={() => { setDraft(record.medicines); setDocumentFields(record.document_details?.fields || []); setEditing(!editing); setConfirmed(false); }}>{editing ? "Cancel corrections" : "Correct extraction (optional)"}</button>}</div>
    <ErrorBox message={error} />{record.status === "failed" && <ErrorBox message={record.error || "This document could not be read."} />}{record.status === "processing" && <p className="rx-notice">Analysis is still processing. Your original is saved.</p>}
    {record.document_details && <DocumentDetails details={{ ...record.document_details, fields: editing ? documentFields : record.document_details.fields }} editing={editing} disabled={saving} onChange={(fields) => { setDocumentFields(fields); setConfirmed(false); }} />}
    {editing ? <section className="rx-design-panel rx-correction-panel"><h2 className="rx-panel-heading">Optional medicine corrections</h2><div className="rx-editor-body"><><p>You can correct a detected name or add a missing medicine if you can verify it. Adding medicines is not required to save other corrections.</p>{draft.map((medicine, index) => <fieldset className="rx-medicine-edit" key={index} disabled={saving}><legend>Medicine {index + 1} ? needs review</legend>{medicine.source_text && <p className="rx-source">Detected text: {medicine.source_text}</p>}<label>Medicine / brand name<input required maxLength={140} value={medicine.medicine_name} onChange={(event) => update(index, "medicine_name", event.target.value)} /></label><div className="rx-two-columns"><label>Strength as written<input maxLength={100} placeholder="Leave blank if unclear" value={medicine.strength || ""} onChange={(event) => update(index, "strength", event.target.value)} /></label><label>Form as written<input maxLength={100} placeholder="Tablet, syrup?" value={medicine.dosage_form || ""} onChange={(event) => update(index, "dosage_form", event.target.value)} /></label></div><label>Prescription instructions (only if readable)<textarea maxLength={1000} value={medicine.instructions || ""} placeholder="Copy the instructions; do not invent a dose or duration." onChange={(event) => update(index, "instructions", event.target.value)} /></label><PrescribedEditor medicine={medicine} onChange={(key, value) => updatePrescribed(index, key, value)} /><button className="rx-text-link" type="button" onClick={() => { setDraft((rows) => rows.filter((_, i) => i !== index)); setConfirmed(false); }}>Remove item</button></fieldset>)}<button className="rx-secondary" disabled={saving || draft.length >= 30} onClick={() => { setDraft([...draft, { medicine_name: "", strength: "", dosage_form: "" }]); setConfirmed(false); }}><Plus size={16} />Add medicine</button><label className="rx-check"><input type="checkbox" disabled={saving} checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />I checked these corrections against the prescription, with a pharmacist if needed. This is my review, not clinical verification.</label><button className="rx-button" disabled={saving || !confirmed || (draft.some((m) => !m.medicine_name.trim()) || documentFields.some((field) => !field.label.trim()))} onClick={save}>{saving ? "Saving corrections..." : "Save corrections"}</button></></div></section> : <>
      <section className="rx-design-panel rx-detected-medicines"><h2 className="rx-panel-heading">Detected medicines · {record.medicines.length}</h2><div className="rx-medicine-table-wrap"><table className="rx-medicine-table"><thead><tr><th scope="col">Medicine</th><th scope="col">Strength</th><th scope="col">Written instruction</th><th scope="col">Action</th></tr></thead><tbody>{record.medicines.map((medicine, index) => <tr key={index}><td><strong>{medicine.medicine_name}</strong></td><td>{medicine.strength || "Not specified"}</td><td>{[medicine.prescribed?.dose, medicine.prescribed?.frequency, medicine.prescribed?.duration].filter(Boolean).join(" · ") || medicine.prescribed?.schedule_code || "Not clearly specified"}</td><td><Link className="rx-view-medicine" to={`/prescription/medicine?id=${encodeURIComponent(id)}&medicine=${index}`}>View details<ArrowRight size={16} /></Link></td></tr>)}{!record.medicines.length && <tr><td colSpan={4} className="rx-no-medicine-row">No medicine name could be confidently identified from this upload.</td></tr>}</tbody></table></div></section>
      <div className="rx-analysis-bottom-grid"><OtherInstructions details={record.document_details} /><section className="rx-design-panel rx-original-thumbnail"><h2 className="rx-panel-heading">Original prescription</h2><div>{originalUrl ? original?.type === "application/pdf" ? <a href={originalUrl} target="_blank" rel="noreferrer" className="rx-original-pdf"><FileText size={44} />Open original PDF</a> : <a href={originalUrl} target="_blank" rel="noreferrer"><img src={originalUrl} alt="Original prescription" /></a> : <p>{originalError || "Loading original..."}</p>}</div></section></div>
      {original && ["needs_review", "completed"].includes(record.status) && <div className="rx-notice"><p>Retry the saved original with the current recognition engine, or upload a clearer photo. This saves a new analysis in your history.</p><button className="rx-secondary" onClick={() => navigate("/prescription/processing", { state: { file: new File([original], record.filename, { type: original.type }) } })}><RefreshCw size={16} />Retry medicine detection</button></div>}
      <button className="rx-raw-trigger" onClick={() => setRawOpen(true)}><FileText size={17} />View original extracted text</button>
      {!record.medicines.length && <div className="rx-recognition-warning rx-no-medicines"><AlertTriangle size={18} /><span>Medicine names were not confidently recognized. The extracted information is saved; unclear handwriting is never replaced with an invented medicine.</span></div>}
    </>}
    <div className="rx-analysis-footer rx-no-print"><Link to="/prescription/history">My history</Link><button onClick={download}><Download size={15} />Download analysis</button><button onClick={() => window.print()}>Print / Save PDF</button><button className="rx-delete-link" disabled={saving} onClick={() => setDeleteOpen(true)}><Trash2 size={15} />Delete upload</button></div>
    {deleteOpen && <div className="rx-error rx-no-print" role="alert"><span>Delete this upload and saved analysis permanently?</span><button disabled={saving} className="rx-danger" onClick={remove}>Delete permanently</button><button className="rx-secondary" onClick={() => setDeleteOpen(false)}>Cancel</button></div>}
    {rawOpen && <ExtractedTextDialog text={record.raw_text || ""} provider={record.ocr_provider} onClose={() => setRawOpen(false)} />}
  </div>;
}

export function GuidelinesPage() {
  return <div className="rx-workspace"><Heading title="Prescription guidelines" description="A careful review makes the saved report more useful." /><section className="rx-card rx-prose"><h2>Upload a readable document</h2><ul><li>Use a sharp, well-lit image with all edges visible. Avoid glare, shadows and cropped medicine names.</li><li>Upload JPG, PNG or an unencrypted PDF up to 10 MB and 5 pages.</li><li>Language and handwriting recognition depend on the configured OCR provider. No system can read every prescription reliably.</li></ul><h2>Verify before using the report</h2><ul><li>Compare each name, strength and instruction with the original. Add missed medicines and remove unrelated text.</li><li>If you cannot read a medicine, contact the prescriber or pharmacist. Don?t replace it with a similar-looking name.</li><li>Generic ingredients, age precautions and side effects are shown only when a sourced reference is available. Missing information stays explicitly unavailable.</li><li>Do not start, stop or change a medicine or dose based on this report. Pharmacy searches are not a substitute for checking the exact product.</li></ul><h2>Your history and privacy</h2><p>Uploaded originals and reports are associated with your signed-in account. You can reopen or delete them from History. In local mode, prescription images are processed on the backend server; reference lookups use medicine names only.</p><Link to="/prescription/upload" className="rx-button">Upload prescription</Link></section></div>;
}
export function AboutPage() { return <div className="rx-workspace"><Heading title="About Prescription Analyzer" description="Keep your original prescription and reviewed medicine information together." /><section className="rx-card rx-prose"><h2>From prescription to a readable report</h2><p>MedVisionRx helps you upload and preview prescriptions, review extracted medicine names, access sourced medicine references and save the results in your account.</p><h2>Recognition with a review step</h2><p>OCR suggests text; it does not establish a diagnosis or guarantee that a drug was identified correctly. Reports distinguish your reviewed instructions from general reference information. Uncertain medicines and missing sources remain clearly marked.</p><h2>Reference coverage</h2><p>The service uses a reviewed medicine catalogue when available and exact-name US product-label lookups. Local brands, combinations and formulations may not be covered. A licensed, professionally reviewed local catalogue can expand coverage.</p><Link className="rx-text-link" to="/prescription/health-guidelines">Read the guidelines</Link></section></div>; }
export function ContactPage() { return <div className="rx-workspace"><Heading title="Prescription support" description="Get help with uploads, recognition and saved reports." /><section className="rx-card rx-prose"><h2>Upload or analysis problems</h2><p>Check file size and format, then try a sharper image. If the OCR provider is not configured, the website administrator needs to enable it using the Prescription setup guide.</p><h2>Incorrect or unclear medicine name</h2><p>Reopen the report, choose Edit medicine review and compare it with the original. Ask the prescriber or pharmacist to clarify unclear handwriting before confirming it.</p><h2>Account or saved-file problems</h2><p>Make sure you are signed in with the account that uploaded the prescription. Only that account can open or delete it.</p><p>No dedicated support email has been configured yet. This page does not send messages or collect medical documents.</p><Link className="rx-button" to="/prescription/history">Open my history</Link></section></div>; }
