import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'excel-addin', 'dist')
const dest = join(root, 'dist', 'excel')

if (!existsSync(src)) {
  console.error('excel-addin/dist missing — run excel:build first')
  process.exit(1)
}

rmSync(dest, { recursive: true, force: true })
mkdirSync(dirname(dest), { recursive: true })
cpSync(src, dest, { recursive: true })
console.log(`Copied excel-addin/dist → dist/excel`)
