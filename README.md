# Image Editor

A professional web-based image editor with a React and TypeScript frontend and a FastAPI image-processing backend. The project implements real pixel-based processing with a revision-oriented asset lifecycle, object-based Canvas previews, and a hybrid metadata/revision history system.

## Final Delivery Status

The project is delivered through Phase 20 with the following final state:

| Area | Status |
|---|---|
| Phases 1–17 | CLOSED / PASS / STABLE |
| Phase 18 — Advanced Features | CLOSED / PASS / STABLE |
| Phase 19 — Testing | CLOSED / PASS / STABLE |
| Phase 20 — Full Code Audit | CLOSED / PASS / STABLE |
| Final project status | FINAL COMPLETE / READY FOR SUBMISSION |

## Implemented Capabilities

The editor includes image upload and metadata inspection, Canvas zoom and pan, transformations, pixel operations, filters, histogram analysis, background removal, image blending, background library support, creative features, export, Undo/Redo, Blur Area, text watermarking, Advanced Text Tool, and Image Layers.

Advanced Features use object or layer representations for interactive Preview and real pixel processing for Apply. Text and image layers are rasterized or flattened in the Backend when committed. Image Layers support up to ten layers with visibility, opacity, position, scale, rotation, ordering, rename, delete, reset, Preview, Apply, Cancel, and Reset.

## Architecture

The processing flow is:

```text
UI → Store → Service → API → Backend Service → Processor → Storage/Asset Revision → Canvas
```

Fabric.js is isolated inside `frontend/src/canvas/adapter`. React components manage presentation and interaction, Zustand stores manage state, frontend services call the API, and Python processors perform the pixel operations.

## Project Layout

| Path | Responsibility |
|---|---|
| `backend/app` | FastAPI application, routers, schemas, services, processors, storage, and validation |
| `backend/tests` | Backend unit, API, numerical, lifecycle, and validation tests |
| `frontend/src` | React application, features, stores, services, types, Canvas integration, and UI |
| `frontend/tests` | Frontend component, state, interaction, Canvas, and workflow tests |
| `frontend/public` | Small public frontend assets and backgrounds required by the application |
| `assets` | Project fonts and background resources |
| `docs` | Architecture, API, and decision documentation |
| `scripts` | Offline asset-generation and verification utilities |
| `.audit` | Audit evidence and verification scripts retained with the delivery documentation |
| `rc-assets` | Small release-candidate test fixtures |
| `PROJECT_STATUS.md` | Current project status and phase record |
| `DEVELOPMENT_LOG.md` | Chronological implementation and verification log |

## Requirements

The Backend requires Python 3.11 or newer and the dependencies declared in `backend/pyproject.toml`. The Frontend requires Node.js with pnpm and uses the dependencies declared in `frontend/package.json` and locked by `frontend/pnpm-lock.yaml`.

## Quick Start

For complete commands, environment variables, service startup, testing, and troubleshooting, read [RUNNING.md](RUNNING.md).

From the project root, install the Backend environment according to the Python environment used by the target machine, install Frontend packages, start the Backend on port 8000, and start the Frontend on port 5173. Then open `http://127.0.0.1:5173/` in a browser.

## Verification Commands

Backend tests:

```bash
cd backend
python3 -m compileall -q app
pytest -q
```

Frontend checks:

```bash
cd frontend
pnpm exec tsc --noEmit
pnpm exec vitest run
pnpm run build
```

The final verification baseline recorded 106 passing Backend tests, 68 passing Frontend tests across 16 test files, passing TypeScript validation, and a passing production build. The build retains a non-blocking Vite chunk-size warning, and the Backend test suite retains a non-blocking Starlette/httpx deprecation warning.

## Scope and Known Non-Blocking Warnings

No Drawing, Image Watermark, Layer Masks, Groups, new Blend Modes, Animation, OCR, or AI feature is included in the approved final scope. The project retains the existing Vite bundle-size warning and Starlette/httpx deprecation warning. These warnings did not cause test or build failures and were intentionally not changed during final delivery preparation.

## License and Ownership

This repository is the final project delivery package. Add deployment-specific licensing and operational policies externally if required by the receiving organization.
