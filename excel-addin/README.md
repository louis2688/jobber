# Jobber Excel Add-in

Office.js task-pane add-in that reuses calculator math from `../src/lib` (Vite alias `@lib`).

## Prerequisites

- Microsoft Excel for Mac or Windows (Microsoft 365 / recent desktop Excel)
- Node.js 20+

## Manifests

| File | Origin | When to use |
|---|---|---|
| `manifest.xml` | https://localhost:3000 | Local development (`npm run excel:dev`) |
| `manifest.prod.xml` | https://jobberlm.vercel.app/excel/ | Production sideload (deployed with the web app) |

Do not mix them: local manifest needs the local HTTPS server; prod manifest needs a successful Vercel deploy.

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
3. Use **Jobber Calc** → **Insert into Excel**.

## Production sideload (Vercel)

No local server required.

1. Confirm the hosted pane loads: [https://jobberlm.vercel.app/excel/](https://jobberlm.vercel.app/excel/)
2. Sideload **`manifest.prod.xml`** using the Mac or Windows steps below.
3. Ribbon button: **Jobber Calc** (display name includes “Prod”).
4. **Insert into Excel** writes the display string into the active cell via Office.js.

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

## Insert into Excel

The task pane calls `Excel.run` and sets `workbook.getActiveCell().values` to the current calculator display string (FIS / DEC / INCH / MET formatted).

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
