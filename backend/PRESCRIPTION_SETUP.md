# Prescription Analyzer setup

Only the Prescription workflow is changed. No other service's data or logic is modified.

## Run and install

Use the same Python environment for installation and the FastAPI server:

```powershell
cd backend
.venv\Scripts\python.exe -m pip install -r requirements-prescription.txt
.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

PDF rendering has been installed into the existing `.venv` for this workspace. PDF uploads are limited to 5 pages and all uploads to 10 MB. JPG/PNG contents are decoded, not trusted by extension alone. Firebase Admin must already be configured for account authentication.

## Free local OCR (default)

Prescription uses **RapidOCR + ONNX Runtime on the CPU** by default. These are open-source inference packages; scans do not use a paid OCR API. Models are included in the RapidOCR wheel and loaded once per backend process.

```dotenv
PRESCRIPTION_OCR_PROVIDER=local
```

An existing Google API key is ignored in local mode. The current workspace `.env` selects local mode explicitly. No prescription image is sent to Google in this mode. Medicine-reference lookups still need internet access, but send only the reviewed medicine names.

Install into the exact virtual environment used to start FastAPI:

```powershell
cd backend
.venv\Scripts\python.exe -m pip install -r requirements-prescription.txt
.venv\Scripts\python.exe prescription_local_smoke.py
.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

The smoke test uses synthetic printed medicine names, never a real patient document. The upload page should show **Local RapidOCR (free)**. Clear printed English works best. Other scripts and difficult handwriting are not guaranteed, and OCR output is never automatically a confirmed medicine.

### Publish the website

Local means **on your backend server**, not in the visitor's browser and not necessarily on your laptop. To support people opening the public website link:

1. Deploy the Python/FastAPI backend with its existing base dependencies plus `requirements-prescription.txt`. Use a Python/OS version with ONNX Runtime wheels (Python 3.12 is a practical deployment target; this workspace was also tested on Python 3.14 Windows).
2. Set `PRESCRIPTION_OCR_PROVIDER=local` in the hosting environment. No Google key or billing account is needed for local OCR.
3. Run `python prescription_local_smoke.py` during a deployment check so missing model/runtime dependencies are detected before users scan files.
4. Start with one server worker to avoid loading multiple model copies. Measure CPU and memory use on the hosting plan; a free plan may have insufficient resources or cold-start limits. No hosting provider's free tier is guaranteed by this setup.
5. Configure the frontend's `VITE_API_URL` to the public backend URL and allow the frontend origin in the backend CORS deployment configuration. Other services' CORS/configuration was not changed by this task.
6. Use persistent private storage for uploaded files and configure MongoDB and Firebase Admin on the host. Never expose the private upload directory as public static files.

The ONNX runtime and model weights must be present on the deployed backend. Installing them on a laptop alone does not enable OCR for a separately hosted website. No GPU is required for this configuration; hosting CPU/RAM/storage may still cost money.

RapidOCR references:

- https://rapidai.github.io/RapidOCRDocs/main/en/install_usage/rapidocr/install/
- https://github.com/RapidAI/RapidOCR

## Optional Google OCR

Google is never used as an automatic fallback. To opt in explicitly, set both:

```dotenv
PRESCRIPTION_OCR_PROVIDER=google
PRESCRIPTION_GOOGLE_VISION_API_KEY=your_server_side_key
```

Google requires Cloud Vision API and billing enabled, and may charge above its allowance. Keep the key in the backend environment only. Multilingual handwriting accuracy varies and still requires medicine review.

- https://docs.cloud.google.com/vision/docs/handwriting
- https://docs.cloud.google.com/vision/docs/languages

## Medicine references and a local brand catalogue

There is no imported comprehensive, clinically reviewed Indian medicine dataset in this repository. The previous seven-drug example database is not used as verified medical information.

For confirmed medicine names, the service reads existing `medicine_catalogue` entries without modifying them and optionally reads a Prescription-only JSON catalogue. Exact matches with `verified: true`, a generic ingredient name, and an HTTPS `information_source` may supply reference information. The reviewer is responsible for validating these fields and the dataset's license.

Set the optional file path in `.env`:

```dotenv
PRESCRIPTION_CATALOG_PATH=C:/path/to/reviewed-prescription-medicines.json
```

The JSON is an array. A schema template (not clinical data) is supplied in `data/prescription_catalogue.schema.json`. Include exact brand aliases, all generic ingredients for combinations, strength/form, uses, side effects, age precautions and source URL. Do not mark unreviewed scraped datasets verified. Distinct ingredient combinations under the same name are treated as ambiguous. An alias must never be inferred from spelling similarity.

When no reviewed entry supplies clinical information, the service tries exact-name openFDA product labels and saves the source link and reference snapshot with the report. It does not send patient names, prescription images or OCR text to openFDA. US labels may not cover Indian brands or match the prescribed formulation; the UI explicitly describes this limitation. Unavailable reference information stays unavailable, and buying links are withheld for those entries.

References:

- https://open.fda.gov/apis/drug/label/
- https://open.fda.gov/apis/drug/label/how-to-use-the-endpoint/

## Saved records and privacy

- Every Prescription API operation requires a Firebase bearer token and filters by the verified Firebase UID. Client `user_id` query/form values cannot choose an owner.
- History/dashboard counts come from the signed-in user's MongoDB `prescriptions` records. No sample records are added.
- Statuses: `processing`, `needs_review`, `completed` (human review saved), `failed`.
- Original files live in `app/uploads/prescription-private`, served only by the authenticated original-file endpoint. Do not publish this folder using a static-files mount.
- Existing anonymous demo records are not automatically reassigned to accounts.
- Reopening a saved report does not rerun OCR or reference lookups. Editing and saving the review refreshes reference snapshots.
- Buying links are pharmacy searches, not stock, price, a diagnosis, or an exact product guarantee. No purchase is made by this application.
- Delete removes the account's saved record and private original. Production deployments also need backup/retention policies.
- Print / Save PDF uses the browser. Download data exports the saved report as JSON. No invented report PDF or successful interaction check is shown.

## Validation

```powershell
cd backend
.venv\Scripts\python.exe -m unittest discover -s tests -p "test_prescription*.py" -v
```

Tests use a temporary upload directory, synthetic prescription text, fake account-owned storage and mocked OCR/reference providers; they never write sample prescriptions to the real database. A real multilingual handwritten prescription still needs end-to-end validation with configured OCR credentials and a licensed medicine catalogue before clinical use.

## Structured prescription reports and camera capture

The Prescription upload page supports a live browser camera on HTTPS/localhost, a mobile capture input, and ordinary JPG/PNG/PDF files. Camera capture produces a JPEG locally and releases camera tracks when closed; a captured image still requires preview and consent before submission. Unsupported browsers or denied permissions can use the file picker.

OCR output is retained in full. Literal labelled hospital, doctor, patient, date, observations, advice and other fields are grouped into document details, with source text and unclassified notes retained. Names, strengths and document fields remain reviewable. OCR layout/language/handwriting limitations still apply; missing information is not inferred.

Prescribed dose, duration, frequency, morning/afternoon/evening/night instructions and meal instructions are stored separately from reference information. Unlabelled schedule codes such as `1-0-1` are preserved without assigning time-of-day or food instructions. Abbreviations remain labelled for clarification. Strength alone does not establish a personal dose. Each detected medicine links to `/prescription/medicine?id=...&medicine=...` and is loaded through the account-owned record API.

A reviewed medicine with an available sourced reference has four pharmacy search links (Tata 1mg, Apollo Pharmacy, PharmEasy and Netmeds). These are searches, not verified product matches or stock guarantees. Unknown medicines continue to withhold links and clinical details. History retains the saved document fields, review and reference snapshot; reopening it does not rerun OCR. Older records can be presented from their stored OCR text without modifying the database or refreshing references.

## Results-first presentation

After preview/consent and analysis, the user opens `/prescription/results?id=...` in a read-only results view. Structured values, all OCR text and remaining notes are visible without opening a form or confirming a review. The upload and analysis are already in private history. "Correct extraction (optional)" opens the editor; users do not need to fill missing fields or invent a medicine to view results. Document corrections may be saved with zero medicine entries.

Available general medicine references are now saved during analysis while `user_confirmed` remains false. A reference match is not confirmation that OCR identified the prescription correctly; this distinction is displayed on medicine views. Older saved reports retain their original reference snapshots. Unreviewed header fields can be restructured from saved OCR text, including dotted header labels, without rerunning OCR or writing back to the database.

## Structured analysis design

The analysis screen uses six labelled identity cells, a detected-medicines table with one View details action per medicine, separate other-instructions rows and an original-document thumbnail. Raw OCR appears only in the single View original extracted text dialog. Missing recognition stays explicitly unknown; no demonstration records are added to the real database.

Medicine details use separate identity/directions panels, four time-of-day columns, a meal-instruction strip, uses/side-effects/age cards and four pharmacy slots. Pharmacy slots without a reliable saved reference are disabled. Upload, preview and private history use the same workflow indicator and visual style. Optional corrections and account-owned saved history remain supported.


### Local image reading retries

Local OCR now retries low-confidence or blue-ink documents with contrast and ink-separation passes, then combines the strongest readings by position into one text view. Medicine parsing accepts sachets, plural dosage forms, IV prefixes and percentage strengths. These changes improve recognition but do not guarantee handwritten medicine names are readable. Names are not corrected by fuzzy matching; unreadable names and instructions remain unconfirmed.

Saved reports retain their previous analysis. When a report contains no detected medicines, use **Retry medicine detection** to process its private original again and save a new report. Alternatively, upload a sharper image. The original saved analysis is retained.

No additional model or paid API is required for these image-processing passes. Experimental handwriting models are not used by the production pipeline.


### Downloaded prescription datasets

Run `.venv\Scripts\python.exe scripts/prepare_prescription_datasets.py` from backend after placing `RxHandBD.zip` and `RxNorm_full_prescribe_11022026.zip` in `backend/datasets`.

The script preserves ZIP files and builds:
- `app/models/prescription/rxnorm.sqlite3`: read-only exact-name recognition index from unsuppressed English RXNORM entries. This is terminology, not a clinical information catalogue; it does not infer ingredients for ambiguous brands, dosage, timing, side effects or pharmacy products.
- `datasets/prepared/rxhandbd/{train,validation,test}.jsonl` and word images. Unclear labels are excluded; validation is drawn only from the original training split. The original test split stays held out. Image hashes report duplicate images across train/test.
- `datasets/prepared/report.json`: preparation counts. Preparing the data does not train a handwriting model. Training, evaluation on unseen prescriptions, and acceptance checks are still required before changing the deployed recognizer.

Only the name index needs deployment for exact-name recognition. Keep training images and ZIP files outside public frontend assets. Review dataset licensing and attribution before training/distributing a model. DailyMed integration does not require downloading its complete label archive; the existing reference path currently uses the openFDA label API.


### Experimental handwriting training

Training is separate from serving OCR. Install `requirements-prescription-training.txt` only in a training environment. Run from backend:

```powershell
.venv\Scripts\python.exe -u scripts/train_prescription_handwriting.py --epochs 20
```

This trains a small CNN/BiGRU CTC word recognizer from scratch on the prepared RxHandBD crops. It is an experimental baseline, not a fine-tuned clinical model. It uses CPU when CUDA is unavailable and defaults to three CPU threads. The character alphabet is derived only from training labels. Test labels never train the model. Validation character error rate selects the checkpoint; the held-out test is evaluated after the run. Metrics count unsupported characters as recognition errors.

Artifacts stay in `app/models/prescription/experimental-crnn`: `last.pt` (resumable state), `best.pt` (selected by validation), `metrics.json`. Resume an interrupted run with `--resume --epochs 20`. Read only checkpoints you created or trust. No checkpoint is automatically enabled in the web service. A word-crop benchmark does not establish recognition of full prescription pages or unseen languages; line detection, comparison with the current OCR, and evaluation on representative unseen prescriptions are required before deployment.

The dataset contains uncertain/spelling-variable labels and is not a verified medicine catalogue. A successful training command or decreasing loss is not evidence of acceptable medicine recognition. Inspect validation/test error and compare exact medicine names before considering deployment. Preserve dataset provenance and confirm usage terms before distributing trained weights.


### Pretrained recognizer evaluation

The experimental from-scratch run was stopped because validation word accuracy remained zero after 11 completed epochs. Its checkpoints are retained for research and are not used for patient reports.

`download_prescription_pretrained.py` completes a local cache of Microsoft's MIT-licensed `trocr-base-handwritten` weights using bounded range requests and verifies their SHA256 before evaluation. This utility expects the matching model configuration/tokenizer files to have been cached first. It does not upload documents or call a paid inference service.

`evaluate_prescription_pretrained.py` accepts a local image and explicit text-line crops, loads only cached safetensors with local-files-only mode, and saves diagnostic readings. It does not automatically enable the model. This pretrained model is intended for single text lines, not whole prescriptions; see https://huggingface.co/microsoft/trocr-base-handwritten. Cropped-image results are diagnostic, not production validation.

### ORS category references

An exact bare `ORS` or `oral rehydration salts` name can show a sourced category reference with WHO and Medicines for Children links. This is labelled `category_match`, not a verified brand/formulation. Specified strengths/forms and conflicting catalogue entries do not use this category fallback. It supplies no prescribed dose, frequency, meal timing, ingredients or mixing ratio. Four pharmacy category searches are provided; exact product selection remains unverified. Other medicine references continue to use reviewed catalogue entries and exact-name public labels.

Use **Retry medicine detection** on a saved analysis to create a fresh report with current recognition/reference rules. Existing history records are preserved.


### Accepted local OCR improvement and evaluation outcome

Both Microsoft's TrOCR-base and the tested prescription-specific TrOCR checkpoint misread the supplied treatment lines. Neither is enabled in the live OCR pipeline. Their evaluation JSON files record the diagnostic outputs; these results are not a general accuracy benchmark.

The accepted improvement uses the existing pretrained RapidOCR recognizer, with automatic word-region retries on low-confidence blue-ink regions. At most 40 regions are read. A recovered name must be an exact known medication term and agree on original/contrast crops (scores at least 0.90/0.85), with a nearby strength independently agreeing at 0.95 or higher. OCR scores are not medical certainty. No image coordinates, patient identity or observed prescription medicine is hardcoded into region selection. Original full-page text remains intact; separate recovery provenance is saved. Every recovered medicine stays unconfirmed. This can still miss names, and it is not a validated universal prescription reader.

Full-page OCR explicitly resets detection/classification/recognition flags on each pass, because the cached engine's word-only mode otherwise affects later uploads. Regression tests cover consecutive documents.

Bare ORS category information remains available. Exact recognized Dextrose/Glucose with 5% strength and no identified form can show a clearly labelled related intravenous-product reference from DailyMed; this does not assert that the prescription route or manufacturer was identified. These references do not fill a personal dose, schedule or meal timing. Four pharmacy searches are available, with exact-product suitability unverified.

Unused tested TrOCR weight files were removed after evaluation to avoid retaining approximately 2.7 GB of unused model data. Configuration, evaluation reports and the stopped training checkpoints remain. The live OCR uses its existing RapidOCR weights.


### Prescription analysis latency

Candidate parsing builds catalogue name aliases once instead of repeating a full exact-reference scan on every OCR line. Clinical reference matching still runs for detected medicines; candidate recognition never verifies clinical identity.

Optional medicine-reference enrichment has a six-second total waiting budget, with up to three lookups in progress. Network label requests have a five-second socket timeout. Completed references are retained. If other lookups exceed the waiting budget, the report still saves all detected names and readable instructions, with explicit unavailable-reference notes and no fabricated details or links. A user-confirmed review retains its confirmation even when its clinical reference times out. These limits apply to both first analysis and review saves. They do not impose a total deadline on image OCR, queueing, upload or database operations. In-flight I/O may finish after the report stops waiting; queued lookups are cancelled.

A synthetic 20,000-entry catalogue/41-line parser benchmark dropped from 4.160 seconds to 0.085 seconds on the development machine. This is a parser-only measurement, not an end-to-end upload guarantee. Real large files, PDFs, simultaneous scans and the first model load can still take longer.


### Dashboard analysis counts

The signed-in user's dashboard shows three counts from their own stored history: total uploaded records (including processing/failed), analyzed records, and failed analyses. Both `needs_review` and `completed` mean OCR analysis finished and display as **Analyzed**. Internal statuses and user confirmation flags remain distinct for optional corrections and identity verification; no database migration is needed. The admin dashboard counts the same finished statuses across all users, charts analyzed/failed scans by upload date, exports matching CSV labels, and supports the combined `status=analyzed` prescription filter. Failed/processing records are excluded from analyzed totals.
