# xlsx dependency note

The web app uses the npm package `xlsx` (SheetJS Community) **only for client-side Excel export** (`src/lib/exportExcel.ts`), lazy-loaded into its own chunk.

## Why not upgraded

- `npm audit` reports high severity issues (prototype pollution / ReDoS) for `xlsx@0.18.5`.
- Fixed builds (`>=0.20.2`) are **not published on the public npm registry** for the community edition; SheetJS distributes newer builds via their own CDN/commercial channels.
- `fixAvailable: false` from npm audit for this package tree.

## Alternatives considered

| Option | Why deferred |
|---|---|
| SheetJS CDN / paid build | Extra install path / licensing; not drop-in via `npm install xlsx` |
| `exceljs` | Heavier bundle; API rewrite for a rarely used export path |
| Server-side generation | Conflicts with static Vercel deploy and privacy-light model |

## Risk posture

- Export-only: we **write** workbooks from trusted in-memory calculator state; we do **not** parse untrusted `.xlsx` uploads.
- Lazy-loaded: calculator shell does not include `xlsx` in the initial bundle.
- Acceptable for MVP; revisit if SheetJS returns to npm or if export moves to a maintained alternative.
