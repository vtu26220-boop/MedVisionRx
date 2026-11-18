# Free deployment: Render backend and Vercel frontend

This repository prepares a deployment, but does not create hosting accounts or enable paid plans. Select Free compute on Render and Hobby on Vercel. Keep the existing MongoDB Atlas database and Firebase project.

## What changed

New prescription originals default to a private GridFS bucket named `prescription_originals` in the existing MongoDB database. Reports remain in `prescriptions`. Owner-scoped endpoints check the bucket metadata against the report owner and ID before serving or deleting an original. No public image URLs or storage identifiers are returned. The existing reviewer permission and audit requirement also applies to administrator access. Files are limited to 10 MiB; all originals count against Atlas storage limits.

Existing local files remain readable as a fallback. Copy them from the original laptop before deployment:

```powershell
cd backend
.venv\Scripts\python.exe -B scripts/migrate_prescription_originals.py
.venv\Scripts\python.exe -B scripts/migrate_prescription_originals.py --apply
```

The first command is read-only. The second copies, reads back and verifies each eligible file before attaching its storage reference to its report. It never deletes the local source or changes OCR reports. Reruns skip attached files, and compare-and-set updates prevent concurrent migrations from replacing each other's references. Processing, missing and oversized files are skipped. A conservative 400 MiB data-plus-index budget prevents a bulk migration from filling the free database; this is a migration check, not a permanent account quota.

## 1. Render backend

1. Sign in at https://dashboard.render.com/ with GitHub.
2. Create a Web Service from `vtu26220-boop/MedVisionRx`, branch `main`.
3. Set Root Directory to `backend`, runtime to Docker, Dockerfile path to `./Dockerfile`.
4. Select **Free**. Do not attach a paid disk. The backend uses Atlas for originals.
5. Under Environment, privately set:

| Variable | Value |
| --- | --- |
| `MONGODB_URI` | Your existing Atlas connection string, from your local backend environment |
| `DATABASE_NAME` | The same database name used locally; do not switch to an empty database |
| `MEDVISION_ADMIN_UIDS` | The same administrator UID allowlist used locally, if applicable |
| `MEDVISION_REVIEWER_UIDS` | Existing reviewer UID allowlist, only if applicable |
| `PRESCRIPTION_STORAGE` | `gridfs` |
| `PRESCRIPTION_OCR_PROVIDER` | `local` |
| `CORS_ORIGINS` | Exact Vercel website origin, once known; no trailing slash |

6. Add a **Secret File** named `firebase-service-account.json` containing your existing Firebase Admin credential JSON. Render mounts it at `/etc/secrets/firebase-service-account.json`; code detects this path. Do not put it in GitHub, frontend variables, build commands or screenshots. An explicit `FIREBASE_SERVICE_ACCOUNT_PATH` can override this location.
7. In Atlas Network Access, allow the backend's Render outbound IP addresses shown in its dashboard. Keep local access if you still develop on your laptop. Use the existing database user with the required database permissions. Do not change database credentials in GitHub.
8. Deploy and keep the resulting `https://...onrender.com` API address. Health check: `/health`. Verify `/health/database` reports `connected`.

The optional root `render.yaml` describes the same Free Docker service. A Blueprint still needs private environment values and the Firebase secret file configured before a successful startup; creating it does not supply secrets automatically.

`requirements-deploy.txt` installs the active RapidOCR CPU runtime plus backend dependencies, including Firebase Admin. It excludes unused PaddleOCR and training frameworks. The image verifies CPU OCR model initialization during build, uses one server worker, a non-root runtime user and bounded HTTP concurrency. Linux wheel resolution has been checked with pip dry-run. Docker is not installed in the development workspace, so a real container build and hosted memory test still have to happen on Render.

The optional local RxNorm SQLite index, custom catalogues, training checkpoints and datasets are excluded from Git and the container. The existing Atlas medicine catalogue and built-in reference lookups remain available. Deploying an optional local-only resource requires separate packaging; this configuration does not transfer it automatically.

## 2. Vercel frontend

1. Sign in at https://vercel.com/ with GitHub and import this repository.
2. Choose the **Hobby** plan and **Vite** framework preset.
3. Root Directory: `frontend`. Build command: `npm run build`. Output Directory: `dist`.
4. Add `VITE_API_URL` with the HTTPS Render API address, without `/api` or a trailing slash. Never put database or Firebase Admin secrets in `VITE_` variables; these are browser-visible.
5. Deploy. `frontend/vercel.json` handles direct navigation and refreshes on React routes.
6. Add the final frontend origin to Render's `CORS_ORIGINS` and redeploy the backend. Multiple allowed origins can be comma-separated.
7. In Firebase Console, Authentication > Settings > Authorized domains, add the Vercel hostname. For Google login, ensure the corresponding OAuth configuration accepts that deployed domain as needed. Keep the current Firebase web project configuration aligned with the backend credential project.

## 3. Verify the live app

- Sign in and refresh a private service route directly.
- Confirm each service reads the existing Atlas data.
- Upload a small prescription image, preview, analyze, view the original and reopen it from history.
- Confirm the original still opens after a backend restart.
- Test PDF uploads, camera access over HTTPS and repeated analyses. Watch Render memory/error logs; do not log private document text.
- Check two different users cannot access each other's reports or originals.
- Verify administrator transfer, support replies, bank updates and maintenance.

Free hosting is a trial target, not a performance guarantee. The local Windows benchmark measured around 335 MiB peak resident memory and 659 MiB peak committed memory for one image. A 512 MiB Linux service needs an actual hosted test; large PDFs, concurrent users and external API latency can behave differently. Free Render services sleep after inactivity. No paid OCR API is enabled.

## References

- Render Free: https://render.com/docs/free
- Render secret files: https://render.com/docs/configure-environment-variables
- Vite SPA deployment: https://vercel.com/docs/frameworks/frontend/vite
- Motor GridFS: https://motor.readthedocs.io/en/stable/api-asyncio/asyncio_gridfs.html
