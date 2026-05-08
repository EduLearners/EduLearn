# Page Spec — Content Upload

**Route:** `/teaching/content/upload`
**Component:** `src/pages/educator/ContentUploadPage.tsx`
**Persona:** Educator
**Status:** Ready for implementation

---

## 1. Purpose

Upload or link course material (PDF, video, link, document). Minimal form — instructor wants to post a file and move on.

---

## 2. API

```
POST /api/content/upload  — { courseId, title, type, uri, metadataJSON }
PUT  /api/content/{id}    — version update for existing content
```

---

## 3. Layout

```
← Back to content

Upload content                        ← h1

Course                                ← required
[CS-301 Algorithms ▾]

Title                                 ← required
[_________________________________]

Content type
○ PDF  ○ Video  ○ Document  ○ Link

── If PDF / Document / Video: ─────────
[  Drop file or browse  ]
   Max 50 MB · PDF, DOCX, MP4

── If Link: ────────────────────────────
URL
[https://___________________________]

[Upload]                              ← primary, outcome-named
```

Max-width 560px, centered. No card wrapping.

---

## 4. Content type toggle

Radio group: PDF, Video, Document, Link. Selecting Link shows a URL text input instead of the file drop zone. All other types show the drop zone.

File constraints per type:
- PDF: `.pdf`, max 50 MB
- Video: `.mp4 .mov .webm`, max 500 MB (note: large files — show upload progress bar)
- Document: `.docx .pptx .xlsx`, max 50 MB
- Link: no file input, URL validated as `https://` only

---

## 5. MetadataJSON construction

Built client-side before POST:
```ts
const metadataJSON = JSON.stringify({
  fileSize: file?.size ?? 0,
  mimeType: file?.type ?? '',
  sha256: '',   // not computed client-side in v1
  duration: 0  // populated by backend for video
})
```

For Link type: `{ fileSize: 0, mimeType: 'text/uri-list', sha256: '', duration: 0 }`.

---

## 6. States

| State | Render |
|---|---|
| Default | Empty form |
| File selected | Drop zone → filename + size + remove button |
| Uploading | Progress bar below drop zone (0–100%), button disabled |
| Upload success | Toast "Content uploaded." + navigate to `/teaching/content` |
| Error (file too large) | Inline error below drop zone (error-messages.md §3) |
| Error (wrong type) | Inline error below drop zone |
| Error (server) | Toast error from error-messages.md §8 |

---

## 7. A11y

- Radio group: `<fieldset><legend>Content type</legend>` + `<Form.Check type="radio">` × 4
- Drop zone: `<label>` wrapping hidden `<input type="file">`. `aria-label` describes accepted types.
- Progress bar: `<div role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>`

---

## 8. Responsive

<640px: radio group wraps to 2×2 grid. All inputs full-width.

---

## 9. Implementation notes

1. For video uploads: use `XMLHttpRequest` (not `fetch`) for `upload.onprogress` event to get byte-level progress.
2. URI field for non-link types: temporarily set to `file://{filename}` for demo. Backend file storage is a v2 concern.
3. Course dropdown: same as assessment editor — from instructor's sections.
