# MedVisionRx

A healthcare platform for prescription analysis, medicine information, blood donation, blood requirements, organ donation, and organ requirements. Built as a B.Tech major project.

## Features

- Prescription upload, camera capture, preview, local OCR analysis, medicine details and private history.
- Medicine search and reference information with pharmacy search links.
- Blood and organ donor registration, requirements, and bank directories.
- Firebase sign-in and user profiles.
- Administrator portal for records, bank management, support replies, activity logs and scheduled maintenance.

## Technology

React, TypeScript, Vite, FastAPI, MongoDB, Firebase Authentication and RapidOCR / ONNX Runtime.

## Run locally

Install Node.js and Python, and configure MongoDB and a Firebase project. Dependencies are pinned in the requirements files; Python wheel availability varies by platform. The existing development environment uses Python 3.14.

### Backend (PowerShell)

```powershell
cd backend
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt -r requirements-admin.txt -r requirements-prescription.txt
.venv\Scripts\python.exe -m pip install firebase-admin
Copy-Item .env.example .env
```

Fill in your own MongoDB configuration in `.env`. Place your Firebase Admin SDK credential file at `backend/firebase-service-account.json`. This file must remain private and is excluded from Git.

```powershell
.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

### Frontend (another terminal)

```powershell
cd frontend
npm ci
Copy-Item .env.example .env
npm run dev
```

Configure Firebase web authentication in `frontend/src/firebase.ts` for your own project and enable the required sign-in providers / authorized domains. The browser configuration is client configuration; never put Firebase Admin credentials in frontend code or Vite environment variables.

Open the local URL printed by Vite. API documentation is available at http://127.0.0.1:8000/docs while the backend runs.

## Deployment

See [free hosting setup](docs/DEPLOYMENT.md) for the prepared Render backend and Vercel frontend configuration. Prescription originals can be stored privately in the existing Atlas database; never publish them in this repository.

## Configuration and documentation

- [Prescription setup](backend/PRESCRIPTION_SETUP.md)
- [Administrator setup](backend/ADMIN_SETUP.md)
- [Admin website access](docs/ADMIN_WEBSITE_ACCESS.md)
- [Maintenance](docs/MAINTENANCE.md)
- [Support notifications](docs/SUPPORT_NOTIFICATIONS.md)

Local `.env` files, credentials, uploaded prescriptions, user files, databases, datasets, downloaded model weights, dependencies and generated builds are excluded. A fresh clone does not contain existing database records or trained models. Optional dataset/training setup is documented separately; local RapidOCR inference is the default prescription OCR path.

## Checks

```powershell
# From frontend
npm run build
npm run lint

# From backend, after private local configuration is available
.venv\Scripts\python.exe -B -m unittest discover -s tests -q
```

## Project limits

Handwriting recognition can miss or misread medicines. Verify detected names, strengths and instructions against the original prescription with a qualified professional. Unreadable information must not be treated as a prescription. Pharmacy links are searches and require confirmation of the exact product.

GitHub hosts this source code. Running the website publicly additionally requires frontend hosting, a running backend, MongoDB, Firebase configuration and HTTPS. The repository does not deploy these services automatically.
