# Running the Image Editor

This document describes how to install, run, verify, and build the final Image Editor delivery on a clean machine. Run the Backend and Frontend as two separate processes.

## 1. Prerequisites

Install the following before starting:

| Requirement | Version or note |
|---|---|
| Python | 3.11 or newer |
| Node.js | A current LTS release compatible with the installed pnpm version |
| pnpm | Required by the Frontend package scripts |
| Browser | A current Chromium, Firefox, or equivalent browser |

The Backend uses FastAPI, Uvicorn, Pillow, NumPy, OpenCV, Pydantic, and python-multipart. The Frontend uses React, TypeScript, Vite, Tailwind CSS, Fabric.js, Zustand, Vitest, and Testing Library. Exact package ranges are declared in the project manifests and the Frontend lockfile.

## 2. Backend Installation

Open a terminal at the project root and create or activate a Python virtual environment. Then install the Backend project and its test extras:

```bash
cd backend
python3 -m venv .venv
. .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e '.[test]'
```

On Windows PowerShell, activate the environment with:

```powershell
.venv\\Scripts\\Activate.ps1
```

The application stores temporary processing content in `/tmp/image-editor` by default on Unix-like systems. The directory is created and managed by the existing storage layer as needed.

## 3. Frontend Installation

In a second terminal:

```bash
cd frontend
pnpm install --frozen-lockfile
```

If the target environment does not have pnpm, install it through the target machine's standard Node.js package-management process before running this command. Do not copy `node_modules` from the delivery archive.

## 4. Environment Variables

All variables are optional for the default local configuration. Set them before starting the relevant service when a different environment is required.

### Backend Variables

| Variable | Default | Purpose |
|---|---|---|
| `IMAGE_EDITOR_APP_NAME` | `Image Editor API` | API service name |
| `IMAGE_EDITOR_ENVIRONMENT` | `development` | Runtime environment label |
| `IMAGE_EDITOR_API_PREFIX` | `/api/v1` | API route prefix |
| `IMAGE_EDITOR_ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated CORS origins |
| `IMAGE_EDITOR_MAX_UPLOAD_BYTES` | `26214400` | Maximum upload size in bytes |
| `IMAGE_EDITOR_MAX_IMAGE_DIMENSION` | `12000` | Maximum width or height |
| `IMAGE_EDITOR_MAX_IMAGE_PIXELS` | `40000000` | Maximum total pixel count |
| `IMAGE_EDITOR_TEMPORARY_DIRECTORY` | `/tmp/image-editor` | Temporary asset directory |

### Frontend Variables

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | Derived from current browser host and port | Complete API base URL |
| `VITE_API_PORT` | `8000` | Backend port used by the derived URL |

Do not put credentials, private keys, or production secrets in the repository, `.env` files included in the archive, or Frontend source code. Configure deployment secrets through the target environment.

## 5. Start the Backend

From the project root:

```bash
cd backend
. .venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

The API should report healthy at:

```text
http://127.0.0.1:8000/api/v1/health
```

The API prefix is `/api/v1`. The root `/health` path is not the configured health endpoint.

## 6. Start the Frontend

In another terminal:

```bash
cd frontend
pnpm dev --host 127.0.0.1 --port 5173
```

Open the displayed Frontend URL, normally:

```text
http://127.0.0.1:5173/
```

If the Backend is on another host or port, set `VITE_API_BASE_URL` before starting Vite. For example:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1 pnpm dev --host 127.0.0.1 --port 5173
```

On Windows PowerShell:

```powershell
$env:VITE_API_BASE_URL='http://127.0.0.1:8000/api/v1'
pnpm dev --host 127.0.0.1 --port 5173
```

## 7. Run Tests and Build

Backend compile and tests:

```bash
cd backend
python3 -m compileall -q app
pytest -q
```

Frontend TypeScript, tests, and production build:

```bash
cd frontend
pnpm exec tsc --noEmit
pnpm exec vitest run
pnpm run build
```

The final recorded verification passed 106 Backend tests and 68 Frontend tests across 16 test files. The final build completed successfully. Existing non-blocking warnings include the Vite chunk-size warning and the Starlette/httpx deprecation warning.

## 8. Runtime Verification

Verify the Backend directly:

```bash
curl http://127.0.0.1:8000/api/v1/health
curl http://127.0.0.1:8000/api/v1/info
```

Then open the Frontend and verify that an image can be uploaded, displayed on Canvas, processed through a Preview, committed through Apply, restored with Undo/Redo, and exported. The application supports Arabic/RTL and English/LTR, Dark/Light theme switching, Canvas zoom and pan, and responsive panel behavior.

## 9. Production Frontend Build

Create the production bundle with:

```bash
cd frontend
pnpm run build
```

The output is written to `frontend/dist`. This directory is generated and is intentionally excluded from the source delivery ZIP. A deployment system may generate it again from the included source and lockfile.

## 10. Troubleshooting

If the Frontend cannot reach the Backend, confirm that the Backend is running on port 8000, that the URL includes `/api/v1`, and that the Frontend `VITE_API_BASE_URL` or `VITE_API_PORT` is correct. Confirm that the Backend CORS list includes the exact Frontend origin.

If an upload is rejected, verify the file signature, supported format, file size, image dimensions, and total pixel count. The Backend validates the content rather than trusting the filename or browser MIME type.

If a test command fails because a package is missing, activate the Backend virtual environment or rerun `pnpm install --frozen-lockfile` in `frontend`. Do not add packages to the project without a separate dependency decision.

## 11. Delivery Archive Exclusions

`PROJECT_FINAL_SUBMISSION.zip` excludes generated or machine-local content: `node_modules`, Python `__pycache__`, pytest caches, frontend `dist`, common build/cache directories, local `.env` files, credentials, keys, and secrets. It includes source code, tests, manifests, lockfiles, assets, documentation, audit evidence, `PROJECT_STATUS.md`, `DEVELOPMENT_LOG.md`, and the scripts required by the project repository.
