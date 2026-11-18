# Administrator website access

The admin portal and website keep separate Firebase Auth instances. View Website calls POST /api/admin/website-session using the signed-in administrator ID token. The backend verifies administrator claims or MEDVISION_ADMIN_UIDS, then creates a Firebase custom token for that same UID. The browser signs the website instance in with this token and opens /services. Return to Admin Portal performs the same verified transfer in reverse.

No password is copied, stored, or placed in a URL. The response uses Cache-Control: no-store, and the transfer token is excluded from audit records. The backend requires its existing Firebase Admin signing credentials. There is no new API key to configure.

GET /api/users/me projects the verified administrator as Admin / Administrator with /admin-avatar.svg and an empty phone number, even when no MongoDB user profile exists. Stored role fields or an email address cannot grant administrator access. Phone requirements for ordinary users remain unchanged. The website admin controls depend on the server response and fail closed on verification errors.

Logging out clears the linked session in both Firebase instances when the UIDs match. An unrelated account in the other instance is preserved. Maintenance behavior remains unchanged; the return control is available outside the maintenance gate so an administrator can return to the portal.

Validation: 114 backend tests pass; frontend build and lint pass. Isolated browser tests with synthetic Firebase/API responses cover portal-to-website transfer, reverse transfer, direct website administrator login, admin avatar, service profile, ordinary-user visibility and linked logout. They do not mint live tokens or change production accounts. Restart the backend and refresh the frontend before trying the live flow.

Firebase custom token documentation: https://firebase.google.com/docs/auth/admin/create-custom-tokens
