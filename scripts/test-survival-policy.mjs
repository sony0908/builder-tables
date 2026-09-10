import { build } from 'vite'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const source = fileURLToPath(
  new URL('../src/generator/survival-policy-fixtures.ts', import.meta.url),
)
const directory = await mkdtemp(join(tmpdir(), 'builder-tables-policy-'))

try {
  await build({
    configFile: false,
    logLevel: 'error',
    root: process.cwd(),
    build: {
      emptyOutDir: false,
      lib: {
        entry: source,
        fileName: 'fixtures',
        formats: ['es'],
      },
      minify: false,
      outDir: directory,
    },
  })
  const output = (await readdir(directory)).find((file) => file.endsWith('.js'))
  if (!output) throw new Error('No se pudo compilar el módulo de fixtures.')
  const fixtures = await import(pathToFileURL(join(directory, output)).href)
  console.log(fixtures.runSurvivalPolicyFixtures())
} finally {
  await rm(directory, { force: true, recursive: true })
}