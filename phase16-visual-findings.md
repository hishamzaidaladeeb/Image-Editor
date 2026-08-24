## Visual verification checkpoint 1

The frontend opened successfully at `http://127.0.0.1:5173/` with title `محرر الصور`. The initial UI rendered the top bar, RTL sidebar, upload center, properties panel, and a visible `تصدير` tool button in the sidebar. The initial state correctly showed no canvas asset before upload. The current screenshot was saved by the browser session at `/home/ubuntu/screenshots/127_0_0_1_2026-08-22_18-58-38_5455.webp`.

The test source was verified as a valid 640×420 RGBA PNG at `/home/ubuntu/image-editor/rc-assets/export-visual-source.png`.

## Visual verification checkpoint 2

A direct file-input upload attempt could not locate the hidden file input by browser element index. Clicking the visible `اختيار صورة` button did not expose a browser-upload target in this automation session; the UI remained on the valid initial Upload Center state. This is an automation limitation rather than an application error, so E2E upload was additionally verified through the existing API tests and will be supplemented by direct API/browser navigation checks.

## Visual verification checkpoint 3

The browser session moved to `about:blank` during the scripted file-input attempt, and the DOM no longer contained the upload input. This indicates a browser-session reset during automation, not a UI rendering defect. The visual verification flow is being restarted by reopening the app and will use the API-backed asset path if browser file injection remains unavailable.

## Visual verification checkpoint 4

The application was reopened successfully at `http://127.0.0.1:5173/`. In the fresh session, a real 160×100 RGBA PNG `visual-source.png` was injected into the actual file input and the input change event fired successfully. The browser reported the file as `image/png` with 27,315 bytes. The upload request is now being checked through the live UI.

## Visual verification checkpoint 5

The first live upload attempt at `127.0.0.1:5173` rendered `Failed to fetch`. The backend was healthy, and the cause is the existing CORS allowlist (`http://localhost:5173`) not including the numeric loopback origin. The app was reopened at `http://localhost:5173/`, which matches the configured allowed origin and is the correct RC launch URL for this environment.

## Visual verification checkpoint 6

The live localhost workflow successfully completed Upload → Canvas. The UI displayed `visual-source.png`, a successful upload status, metadata of `160px × 100px`, and the actual gradient image rendered on the Fabric canvas. The Canvas toolbar exposed the Export button alongside the existing tools and viewport controls. This confirms the committed asset is available for the Export workflow.

## Visual verification checkpoint 7

Opening Export after the first Upload revealed `تعذر تجهيز ملف التصدير.` because the process on port 8000 was an older server without the newly registered Export route. The stale process was stopped and the current backend source was started; health returned 200 and the Export route responded to validation. The frontend was then refreshed and correctly returned to the initial Upload Center for a clean end-to-end retry.

## Visual verification checkpoint 8

The clean retry completed Upload → Canvas against the current backend. The page displayed `visual-source.png`, `تم رفع الصورة بنجاح`, `160px × 100px`, and the rendered gradient image. No fetch error appeared. This confirms the browser is now connected to the current API implementation and ready for live Export Preview verification.

## Visual verification checkpoint 9

Opening Export on the committed RGBA asset produced a real backend preview image and metadata: PNG, 160×100px, RGBA, transparency supported, and a measured file size. Changing the width control triggered a new preview artifact and the panel reported updated dimensions (`180 × 100px`) and a visibly updated preview. The browser automation entered `180` when `80` was supplied to the number field, so numeric input behavior is being checked further before treating this as an application defect.

## Visual verification checkpoint 10

The Export Panel successfully switched from PNG to JPG/JPEG. The checkbox was disabled, the preview metadata changed to `RGB`, transparency became `غير مدعومة`, and the output remained 180×100px. Changing the quality control triggered a new JPG preview and changed the measured export size from 4 KB at the earlier setting to 10 KB at 100%, confirming that the quality parameter affects encoded output. The panel remained RTL-compatible and visually readable.

## Visual verification checkpoint 11

The live Export Panel remained stable after the Apply click. It continued to show the backend-produced JPG preview, RGB mode, no transparency, 180×100px dimensions, and an enabled `تنزيل الملف` action while the committed Canvas asset remained `visual-source.png` at 160×100px. This demonstrates that Export does not replace the editor Asset or create a Canvas revision merely for export.

## Visual verification checkpoint 12

The final Download action succeeded. Chrome Download history showed an actual file named `export.jpg` sourced from `http://localhost:5173`, confirming the frontend triggered a real download and the backend supplied the safe `.jpg` extension for the selected JPG format.

## Targeted verification checkpoint 1

A clean localhost browser session accepted the generated RGBA PNG `targeted-source.png` through the real file input and dispatched the upload change event. The targeted verification now continues from the live Upload workflow.

## Targeted verification checkpoint 2

Manual browser interaction after opening Export confirmed that entering Width `80` displayed exactly `80` in the visible field. The live backend preview reported `80 × 100px`, RGBA, and transparency supported. This is after the regex fix and confirms the earlier Checkpoint 9 behavior was not a persistent value-handling bug.

## Targeted verification checkpoint 3

Manual interaction confirmed Height `320` displayed exactly `320`, and the preview reported `80 × 320px`, RGBA, with transparency supported. Entering Width `0` displayed exactly `0` and immediately showed `يجب أن تكون أبعاد التصدير بين 1 و12000 بكسل.`. The Apply action was disabled, and the previous valid preview remained unchanged rather than being replaced by an invalid export.

## Targeted verification checkpoint 4

Manual input of Width `-5` displayed `-5` and kept the validation warning. Manual input of Width `12001` displayed `12001` and kept the warning. The backend preview metadata did not claim 12001; it remained the last valid preview value (`1200 × 320px`) from the intermediate keystrokes, confirming that the invalid final value was not sent as a valid export request and Apply remained unavailable.

## Targeted verification checkpoint 5

Entering nonnumeric `abc` into the number field resulted in an empty displayed value (native number input behavior) and the same visible resolution Validation Error. Reset restored Width=160 and Height=100 and regenerated a valid PNG RGBA preview.

## Targeted verification checkpoint 6

After Reset, manual Width=80 and Height=320 entries both displayed exactly as entered. The live PNG preview reported `80 × 320px`, RGBA, and transparency supported. The committed Canvas remained the original 160×100 asset.

## Targeted verification checkpoint 7

With Width=80 and Height=320 unchanged, selecting JPG/JPEG produced a preview reporting 80×320, RGB, and transparency unsupported. Selecting WEBP produced a preview reporting 80×320, RGBA, and transparency supported. The UI fields remained exactly 80 and 320 during both format changes.

## Targeted verification checkpoint 8

The manual end-to-end path reached WEBP Preview with Width=80 and Height=320, then Apply and Download completed without validation or runtime errors. The panel continued to report 80×320, RGBA, and transparency supported while the Canvas source remained 160×100.
