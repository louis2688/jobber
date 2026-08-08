# Jobber Construction Calculator

Web construction calculator inspired by [Jobber Instruments](https://jobberinstruments.com/demo/) — FIS (feet–inches–sixteenths) keypad, unit conversion, six calculation programs, Excel export, and an Office.js Excel add-in that shares the same math core.

**Live:** [https://jobberlm.vercel.app/](https://jobberlm.vercel.app/)

## Quick start (web)

```bash
npm install
npm run dev
```

Open the Vite URL (usually http://127.0.0.1:5173/).

```bash
npm test          # vitest
npm run build     # web + excel-addin → dist/ and dist/excel/
npm run preview   # serve dist locally
```

## Modes how-to (inputs → keys → result)

Press the white **mode** key (top-left) to cycle programs. Yellow keys change with each mode.

### 1. RIGHT TRIANGLE

| Goal | Inputs | Keys | Result |
|---|---|---|---|
| Solve from rise/run | rise, run | **Rise**, **Run** | Auto-solves; press **SLP** / **pitch** / **DEG** / **Area** to show each |
| Pitch → slope | pitch (per 12), run | **pitch**, **Run**, **SLP** | Common / hypotenuse |
| DMS → decimal degrees | packed `DD.MMSS` (e.g. `45.3015`) | **DMSin** | Decimal ° in DEC; display shows `D° M′ S″` |
| Clear / recall | — | **ClrTR** / **ReTR** | Clears or restores last triangle |

### 2. CIRCLE

| Goal | Inputs | Keys | Result |
|---|---|---|---|
| Circumference | diameter or radius | **Diam** or **RAD**, then **Circ** | Circumference |
| Full / segment area | RAD/Diam; optional DEG | **Area** | Full disk, or segment area if DEG set |
| Arc length | RAD + DEG | **ARC** | Arc length |
| Segment height | RAD + DEG | **SEG** (with 0) | Segment height; or enter height into **SEG** to back-solve DEG |
| Middle ordinate | RAD + Cord (or DEG) | **M.O.** | Sagitta |

### 3. ROOF

| Goal | Inputs | Keys | Result |
|---|---|---|---|
| Regular hip/valley | pitch + run (or rise/run) | **pitch**, **Run**, **HIP** | HIP/VAL ≈ common × √2 |
| Irregular hip/valley | pitch₁, pitch₂, run on side 1 | **pitch**, **pitch** (2nd), **Run**, **HIP** | HIP/VAL length + run2 + SLP2 on tape |
| Secondary plan width | after irregular setup | **Rise** | Shows rise and run2 |
| Jack / rake sequence | pitch, Spac, common (SLP or pitch+run) | **Spac**, then **Rk-Up** / **Rk-Dn** | Jack length (value) + plumb on tape |
| Jump to bay | bay # in DEC | enter `3` (DEC), **Rk-Up** | Bay #3 |

### 4. STAIRS

| Goal | Inputs | Keys | Result |
|---|---|---|---|
| Rise from floor-to-floor | FL-FL + riserH | **FL-FL**, **riserH** | Rounds **steps**; adjusts actual riser |
| Total run | trdWth + steps | **trdWth**, **steps** | **Run** = tread × (steps − 1) |
| Stringer | FL-FL + Run | **stringr** | Hypotenuse (platform: steps=1 → stringer = FL-FL) |
| Stair pitch / angle | riserH + trdWth; optional nose | **pitch** / **angle** | Pitch /12 or degrees (nose subtracts from tread) |

### 5. OBLIQUE TRIANGLE

| Goal | Inputs | Keys | Result |
|---|---|---|---|
| SSS | sides a, b, c | **a side**, **b side**, **c side** | Angles A/B/C |
| SAS / ASA | sides + included/adjacent angles | enter known fields | Solves remaining |
| SSA ambiguous | A, a, b | **A deg**, **a side**, **b side** | Primary B/C; tape notes second B |
| Area / DMS | solved triangle | **Area** / **DMS** | Area ft² or A as D°M′S″ |

### 6. TECHNICAL

| Goal | Inputs | Keys | Result |
|---|---|---|---|
| Trig / algebra | number | **SINE**, **COS**, **%**, **1/X**, **X²**, **√** | Function of display |
| DMS in | packed `DD.MMSS` | **DMSin** | Decimal degrees + D°M′S″ on display |
| Constants / yards | number or — | **π**, **CuYd**, **SqYd** | π, ft³→yd³, ft²→yd² |

### Units

Red keys: **FIS** · **DEC** (decimal feet) · **INCH** · **MET** (mm). Lengths convert without changing the underlying measurement.

### Memory

Five memory slots match the Jobber display grid. Tap a cell to **recall**; right-click (desktop) a cell to **store**. **MEM↓** stores into the active slot. **clear mem** clears all slots.

### DMSin

Enter packed **DD.MMSS** (e.g. `45.3015` → 45°30′15″) or `D:M:S`, then press **DMSin** (triangle / technical). Result is decimal degrees in DEC mode; the display bar also shows **D° M′ S″**.

## Excel export (web)

Use the floating **Export Excel** control. Downloads a `.xlsx` workbook with:

- Current value, unit mode, memory
- Triangle fields
- Paperless tape sheet

Implemented with `xlsx` in `src/lib/exportExcel.ts` — no Excel install required for export.

## Excel add-in (Office.js)

Task-pane add-in in `excel-addin/` reuses `src/lib` via Vite alias `@lib`.

Dual manifests:

| Manifest | Task pane URL | Use when |
|---|---|---|
| `excel-addin/manifest.xml` | https://localhost:3000 | Local `npm run excel:dev` |
| `excel-addin/manifest.prod.xml` | https://jobberlm.vercel.app/excel/ | Production sideload (no local server) |

```bash
npm run excel:install   # once
npm run excel:dev       # HTTPS https://localhost:3000
```

### Dev sideload

1. Accept the self-signed certificate for https://localhost:3000 in a browser.
2. Sideload `excel-addin/manifest.xml` into Excel.
3. Open **Jobber Calc** → **Insert into Excel**.

### Production sideload

1. Confirm https://jobberlm.vercel.app/excel/ loads in a browser.
2. Sideload `excel-addin/manifest.prod.xml` (same Mac/Windows steps as local).
3. Open **Jobber Calc (Prod)** — pane loads from Vercel; **Insert into Excel** works inside desktop Excel.

Full steps: [excel-addin/README.md](excel-addin/README.md).

## Project layout

```
src/lib/           Pure calc engine (Dimension, CalcEngine, mode solvers, DMS, memory)
src/components/    Display, Keypad, Export
excel-addin/       Office.js task pane + manifest.xml / manifest.prod.xml
dist/excel/        Produced by npm run build (hosted at /excel on Vercel)
```

## Deploy (Vercel)

Project: [jobberlm](https://vercel.com/louis-madrigals-projects/jobberlm) → https://jobberlm.vercel.app/

```bash
npm run build
npx vercel --yes
# production:
npx vercel --yes --prod
```

`vercel.json` builds the web app and copies the Excel add-in to `/excel`.

### Git → Vercel auto-deploy

If the GitHub repo is linked under **Project Settings → Git**, pushes to `main` deploy production automatically.

If not linked yet (CLI `vercel git connect` may require the dashboard):

1. Open https://vercel.com/louis-madrigals-projects/jobberlm/settings/git
2. **Connect Git Repository** → GitHub → `louis2688/jobber`
3. Set production branch to `main`
4. Save — next push to `main` triggers a production deploy

## Known limitations

- Roof HIP/VAL / jack / rake are practical MVPs (documented formulas), not full Jobber Instruments parity.
- Irregular jack drop uses the primary pitch common; secondary-side jack sequence is not modeled separately.
- Oblique SSA picks one valid solution and notes the ambiguous second B; it does not flip between both interactively.
- FIS entry is Jobber-style 0–15 keypad (not a full QWERTY feet-inch parser).
- No auth (public calculator).
