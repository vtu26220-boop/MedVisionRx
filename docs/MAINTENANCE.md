# Scheduled maintenance

Admin > Settings opens the Maintenance tab. The full website switch and six service switches independently support public reasons and optional end dates/times. Dates entered in the UI are explicitly interpreted as India Standard Time (Asia/Kolkata) and stored as timezone-aware ISO timestamps. Without an end time, maintenance continues until manually switched off. Active schedules must end in the future. Click Save maintenance settings to apply draft changes; Preview visitor page shows the draft full-site or first selected-service page without saving it.

Full website maintenance replaces all public frontend routes, including landing/login pages. Admin routes stay accessible. Service-only maintenance replaces that service's route tree while other routes remain available. Full-site mode takes priority. Existing user/profile API access and the administrator API exemptions are retained. Service API enforcement remains in the shared policy middleware; handlers for the six services were not changed. Requests already processing are not cancelled.

The anonymous GET /api/admin/maintenance-status endpoint returns only public maintenance rules and server time, with Cache-Control: no-store. It never returns administrator settings, contacts, account controls or medical data. The frontend checks status before mounting public pages, polls every five seconds and checks again near the deadline. It automatically restores the requested route once the server confirms it is available. If the first availability check fails, it displays an availability error and retry control instead of mounting a dashboard.

Expiry uses server time on every policy evaluation, including cached settings. It does not depend on an admin browser or an in-memory timer. At/after a deadline, the next status/API request atomically persists the switch OFF before responding. A compare-and-update guard prevents expiry from overwriting a concurrently extended schedule. If no requests arrive, the stored flag is cleared on the next request, while the deadline remains the source of availability. Other server workers refresh settings within the existing five-second policy cache. An independent service schedule remains active after full-site maintenance expires.

Restart the backend after deploying and refresh the frontend. No manual database migration is required: existing maintenance/services settings are normalized into the new controls. Automated checks use synthetic fixtures and never toggle the live platform's maintenance settings.

## Illustration provenance

Asset: frontend/src/components/maintenance/maintenance-kit.png. Generated with the built-in image-generation tool, transparent background, then copied into the workspace. No existing logo was modified.

Final prompt:

Create one polished 3D healthcare maintenance illustration as a transparent PNG cutout for the MedVisionRx website. Isolated compact composition: a softly rounded white first aid case with vivid royal blue handle and a raised blue medical plus on the front, a small satin silver wrench leaning diagonally against its lower left side and a vivid royal blue gear beside its lower right side. Friendly premium soft 3D product render, rounded edges, diffuse studio illumination, subtle contact shadow, front three quarter view, all elements entirely inside frame. The supplied intended UI is a very pale blue healthcare maintenance page; keep artwork white, royal blue, sky blue, silver only. No text, no letters, no branding, no hearts or additional logo, no people, no background scene, actual transparent alpha background. Visually balanced and similar to a clean healthcare software maintenance illustration.
