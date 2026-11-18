import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";

export default function CameraCapture({ onCapture, onClose }: { onCapture: (file: File) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    dialog.current?.showModal();
    let active = true;
    let stream: MediaStream | null = null;
    const start = async () => {
      try {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error("Camera access needs HTTPS or localhost and a browser with camera support. Use the phone camera option or choose a photo instead.");
        const camera = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } }, audio: false });
        if (!active) { camera.getTracks().forEach((track) => track.stop()); return; }
        stream = camera;
        if (video.current) { video.current.srcObject = camera; await video.current.play(); }
      } catch (reason) {
        if (active) setError(reason instanceof Error && reason.name === "NotAllowedError" ? "Camera permission was denied. Allow camera access in your browser, use the phone camera option, or choose an existing photo." : reason instanceof Error && reason.name === "NotFoundError" ? "No camera was found. Choose an existing photo instead." : reason instanceof Error ? reason.message : "Unable to open the camera.");
      }
    };
    void start();
    return () => { active = false; stream?.getTracks().forEach((track) => track.stop()); };
  }, []);
  const capture = () => {
    const source = video.current;
    if (!source?.videoWidth || !source.videoHeight || capturing) return;
    setCapturing(true); setError("");
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 2400 / Math.max(source.videoWidth, source.videoHeight));
    canvas.width = Math.round(source.videoWidth * scale); canvas.height = Math.round(source.videoHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) { setError("Unable to capture a photo. Choose a file instead."); setCapturing(false); return; }
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      setCapturing(false);
      if (!blob) { setError("Unable to capture a photo. Please try again."); return; }
      onCapture(new File([blob], `prescription-camera-${Date.now()}.jpg`, { type: "image/jpeg" }));
    }, "image/jpeg", .94);
  };
  return <dialog ref={dialog} className="rx-camera-dialog" aria-labelledby="rx-camera-title" onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="rx-section-title"><h2 id="rx-camera-title">Photograph your prescription</h2><button type="button" className="rx-secondary" aria-label="Close camera" onClick={onClose}><X size={19} /></button></div>
    <p>Keep the full page inside the frame. Use good light and hold the camera steady.</p>
    {error && <p className="rx-error" role="alert">{error}</p>}
    <video ref={video} autoPlay muted playsInline onLoadedMetadata={() => setReady(true)} aria-label="Live prescription camera preview" />
    <div className="rx-actions"><button type="button" className="rx-secondary" onClick={onClose}>Cancel</button><button type="button" className="rx-button" disabled={!ready || capturing || !!error} onClick={capture}><Camera size={18} />{capturing ? "Capturing..." : "Capture photo"}</button></div>
    <p>The photo stays in this browser until you preview and submit it.</p>
  </dialog>;
}
