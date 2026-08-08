# Jobber Excel Add-in

Office.js task-pane add-in that reuses calculator math from `../src/lib` (Vite alias `@lib`).

**Support / product URL:** [https://jobberlm.vercel.app/](https://jobberlm.vercel.app/)

## Prerequisites

- Microsoft Excel for Mac or Windows (Microsoft 365 / recent desktop Excel)
- Node.js 20+

## Manifests

| File | Origin | When to use |
|---|---|---|
| `manifest.xml` | https://localhost:3000 | Local development (`npm run excel:dev`) |
| `manifest.prod.xml` | https://jobberlm.vercel.app/excel/ | Production sideload (deployed with the web app) |

Do not mix them: local manifest needs the local HTTPS server; prod manifest needs a successful Vercel deploy.

`manifest.prod.xml` is store-oriented: versioned display name, SupportUrl → jobberlm.vercel.app, Insert value / Insert table capabilities described in the tooltip.

## Develop (localhost)

From the **repo root**:

```bash
npm run excel:dev
```

Or from this folder:

```bash
npm install
npm run dev
```

1. Open https://localhost:3000 and accept the self-signed certificate (required once so Excel can load the pane).
2. Sideload **`manifest.xml`** (steps below).
3. Use **Jobber Calc** → **Insert value** or **Insert table**.

## Production sideload (Vercel)

No local server required.

1. Confirm the hosted pane loads: [https://jobberlm.vercel.app/excel/](https://jobberlm.vercel.app/excel/)
2. Sideload **`manifest.prod.xml`** using the Mac or Windows steps below.
3. Ribbon button: **Jobber Calc** (display name includes “Prod”).
4. **Insert value** writes the display string into the active cell.
5. **Insert table** writes a small range (mode, value, unit, memory, triangle fields, recent tape) starting at the active cell.

Web calculator (non-Office): [https://jobberlm.vercel.app/](https://jobberlm.vercel.app/)

## Sideload — Excel on Mac

1. Choose the right manifest (`manifest.xml` for local, `manifest.prod.xml` for prod).
2. For local only: start `npm run excel:dev` and trust https://localhost:3000.
3. In Excel: **Insert → Add-ins → My Add-ins → Upload My Add-in** (or **Developer → Add-ins**).
4. Select the manifest file and upload / sideload.
5. Open **Jobber Calc** on the Home ribbon.

If Upload My Add-in is missing:

- Excel → **Preferences → Security & Privacy** → enable Web Add-ins / Developer options, or
- Place/symlink the manifest into the wef cache folder, then restart Excel:
  - `~/Library/Containers/com.microsoft.Excel/Data/Documents/wef/`

## Sideload — Excel on Windows

1. For local: start `npm run excel:dev` and trust https://localhost:3000. For prod: skip the server.
2. Create a network share folder for manifests (one-time), e.g. `C:\Addins`, and share it.
3. **File → Options → Trust Center → Trust Center Settings → Trusted Add-in Catalogs**
4. Add the share URL (e.g. `\\YOUR-PC\Addins`), check **Show in Menu**, restart Excel.
5. Copy the chosen manifest into that share folder.
6. **Insert → My Add-ins → Shared Folder** → select **Jobber Construction Calculator**.

Alternatively use [Microsoft 365 Agents Toolkit](https://learn.microsoft.com/office/dev/add-ins/testing/test-debug-office-add-ins) / `office-addin-debugging`.

## Microsoft 365 admin — centralized deployment

For org-wide rollout without AppSource (tenant admin):

1. Sign in to [Microsoft 365 admin center](https://admin.microsoft.com/) as a Global or Exchange admin.
2. **Settings → Integrated apps** (or **Settings → Apps → Integrated apps**).
3. **Upload custom apps** → upload `manifest.prod.xml`.
4. Assign to users/groups; users get **Jobber Calc** in Excel after policy sync (may take minutes to hours).
5. Confirm the task pane origin `https://jobberlm.vercel.app` is allowed by your org network / Safe Links policies.

Docs: [Centralized Deployment](https://learn.microsoft.com/microsoft-365/admin/manage/manage-deployment-of-add-ins).

## AppSource / Partner Center (not done here)

Publishing to AppSource requires a [Microsoft Partner Center](https://partner.microsoft.com/) developer account, certification, privacy policy hosting, and store listing assets. This repo prepares `manifest.prod.xml` and hosting on Vercel; it does **not** submit to AppSource.

### Store-readiness checklist

- [ ] Partner Center account + MPN ID
- [ ] Privacy policy URL (point at jobberlm.vercel.app or a dedicated privacy page)
- [ ] Support URL: https://jobberlm.vercel.app/ (already in `manifest.prod.xml`)
- [ ] Screenshots: task pane in Excel (desktop Win + Mac), Insert value, Insert table result
- [ ] 32×32 / 80×80 icons (see `excel-addin/public/assets/`)
- [ ] Short + long description, categories (Productivity / Construction tools)
- [ ] Age rating / data handling: no account, no server-side user data from the add-in
- [ ] Test against Excel Online if targeting that host (current MVP targets desktop workbook host)
- [ ] Validation with [office-addin-manifest validate](https://learn.microsoft.com/office/dev/add-ins/testing/troubleshoot-manifest)

### Privacy (light)

The add-in runs locally in Excel’s task pane, loads JS/CSS from `https://jobberlm.vercel.app/excel/`, and writes only to the workbook the user chooses via Insert. No sign-in. The main web app may use Vercel Analytics; the Excel iframe path is separate and does not load `@vercel/analytics`.

## Shared code

```
excel-addin/src  →  imports CalcEngine from @lib/engine.ts
vite.config.ts   →  alias @lib → ../src/lib
```

Do **not** copy math into this folder; edit `src/lib` in the web app.

## Build

From repo root (`npm run build` also copies into `dist/excel` for Vercel):

```bash
cd excel-addin
npm run build          # base=/excel/ for production hosting
npm run build:root     # base=/ for standalone hosting at domain root
```

Production URLs live in `manifest.prod.xml`. Local URLs stay in `manifest.xml`.
