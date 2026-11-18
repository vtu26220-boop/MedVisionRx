# MedVisionRx Admin

Open `/admin` on the frontend (locally: `http://localhost:5173/admin`). The admin UI follows the agreed dashboard mockup and reads existing MongoDB records. No demo rows are seeded.

## First administrator account

The owner-selected email is `medvisionrx@gmail.com`. This is not automatically a privileged email: access is granted to its verified Firebase UID by a backend-only allowlist. There was no Firebase account for this email when checked during setup.

From the project root:

```powershell
.\backend\.venv\Scripts\python.exe -m pip install -r backend/requirements-admin.txt
.\backend\.venv\Scripts\python.exe backend/admin_bootstrap.py --set-password
```

The command prompts privately for a password and confirmation. Firebase requires at least 6 characters, so `admin` cannot be used. Use a unique password. No password is printed or stored in the repository. The script creates the account if missing, or changes the selected account's password only when `--set-password` is supplied, then appends its UID to `MEDVISION_ADMIN_UIDS` in `backend/.env`.

Restart FastAPI after setup. Sign in at `/admin` with that account and the password you entered. No changes to ordinary login or service pages are needed. Email/password sign-in must be enabled in the project's Firebase Authentication providers (the existing user login already uses it).

Windows shortcut: you can double-click `backend/SetupAdmin.cmd` instead of entering the command. It runs the same private password setup and pauses so you can read the result. Password typing is hidden.

On a hosted backend, install the dependencies and put `MEDVISION_ADMIN_UIDS` in the host's environment variables as well. Do not expose server environment variables or service-account credentials to the browser.

### Reviewer permission is separate

Normal administrators can manage operational records but cannot view a prescription's original, raw OCR text, or medicine report. They also cannot mark medicine information clinically reviewed. For an authorized, qualified reviewer, provision separately:

```powershell
.\backend\.venv\Scripts\python.exe backend/admin_bootstrap.py --email reviewer@example.org --reviewer
```

This adds that account to `MEDVISION_ADMIN_UIDS` and `MEDVISION_REVIEWER_UIDS`. Do not grant reviewer permission merely because someone is an administrator. Every clinical access requires a reason and is audited before content is returned. Server-controlled Firebase custom claims `admin: true` and `clinical_reviewer: true` are also supported; editable user profile fields never grant roles.

## Included pages

- **Dashboard:** real registered-user profile count, reviewed prescription count, active blood/organ requirement counts, unreviewed medicines and flagged reports. The date range changes the daily activity chart; summary cards cover all dates. CSV export contains the actual returned aggregates.
- **Users:** search registered user profiles and suspend/restore their Firebase UID. Self-suspension and suspension of recognized admin accounts are blocked. Firebase sign-in is disabled/re-enabled and refresh sessions are revoked on suspension. The separate policy middleware also blocks already-issued tokens for suspended UIDs.
- **Prescriptions:** metadata/status/error monitoring and administrative issue flags; content access is separately gated by reviewer permission. Existing user review/analysis statuses are not overwritten by admin flags.
- **Medicine Catalogue:** validated create/edit forms, combination generic ingredients, strengths/forms, sourced uses/side effects/age precautions. Only a reviewer may set `verified`, and a generic ingredient plus HTTPS source is required. An edit without renewed confirmation invalidates earlier review.
- **Blood / Organ Services:** search donors, requests and banks; toggle donor availability/status; add/edit/deactivate banks; cancel active requirements. No invented donation or fulfillment transactions, and no destructive record deletion or automatic donor medical eligibility approval.
- **Support:** logged requests, resolution notes and statuses. Existing public contact-page code was not changed. Administrators can log incoming requests manually, and signed-in callers can submit a real ticket to `POST /api/admin/support/request`. No email or message is sent automatically.
- **Activity Log:** read-only admin action records including actor, reason, affected fields and pending/success/failed outcome. The log starts empty and records activity going forward; historical activity is not invented.
- **Settings:** maintenance mode, all six service availability switches, Prescription upload limit (1–10 MB), and support contact details. Contact details are stored for administration; existing public contact-page text is not rewritten.

## Integration and existing service code

New code is in `app/admin/` and `frontend/src/pages/admin/`. Shared-file edits only register admin routes and middleware in `app/main.py` and `frontend/src/routes/AppRoutes.tsx`. No existing service page, router, schema, or service implementation was edited for this admin task.

The new policy middleware makes settings and account suspension effective without editing those handlers. Defaults keep all services enabled, maintenance off, and the existing 10 MB upload limit. Controls are cached for at most 5 seconds across workers; local changes invalidate the current worker immediately. CORS is outside the policy layer, so browsers receive useful error responses when a service is paused.

If the policy database is unavailable, protected service API calls return an explicit 503 rather than silently bypassing suspension/maintenance controls. Keep MongoDB available in production.

System CA trust is enabled at application startup using `truststore` when installed. This addresses the local Windows certificate-chain issue found during Firebase administration setup while preserving HTTPS certificate verification. It never uses `verify=False`.

## Validation

```powershell
cd backend
.venv\Scripts\python.exe -m unittest discover -s tests -p "test_admin.py" -v
```

Tests use a fake database, synthetic records and mocked Firebase identities. They verify real-count logic, permission boundaries, data minimization, immutable audit endpoints, field validation, maintenance/service settings, and multipart upload-limit handling. They do not mutate production patient records. A browser login check needs the first administrator account provisioned with a valid password.

## Deployment and legacy API protection

Legacy blood-bank, organ-bank and medicine create/update/delete endpoints now require the same verified administrator permission as the portal. Public active bank directories and medicine search stay readable. Clinical verification through legacy medicine writes also requires clinical reviewer permission, a generic ingredient and an HTTPS information source.

Set `CORS_ORIGINS` on the hosted backend to the comma-separated public frontend origins (for example `https://your-frontend.example`), and set `VITE_API_URL` when building the frontend. Keep credentials and private uploads on the backend. Local development origins remain allowed. This does not deploy the application or add a production domain automatically.
