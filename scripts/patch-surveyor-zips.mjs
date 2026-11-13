import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { unzipSync, zipSync, strToU8 } from 'fflate'

// Import surveyor module compiled via vite/node or dynamically:
// We can use the builder functions directly in TypeScript or generate the files map
import { addSurveyorAssets, surveyorBlockComponents, surveyorToolComponents, surveyorBlockItemSnbt, surveyorToolItemSnbt } from '../src/generator/surveyor.ts'

const files = {}
const put = (path, content) => {
  files[path] = strToU8(content)
}
const putJson = (path, value) => {
  put(path, JSON.stringify(value, null, 2) + '\n')
}

// Generate all surveyor assets
addSurveyorAssets(put, putJson)

console.log(`Generated ${Object.keys(files).length} surveyor files to inject.`)

const targetZips = [
  'public/downloads/BuilderTables_26.2_controller_menu_v2.zip',
  'public/downloads/BuilderTables_1.21.2_controller_menu_v2.zip',
  'public/downloads/BuilderTables_1.21.4_controller_menu_v2.zip',
  'public/downloads/BuilderTables_1.21_controller_menu_v2.zip',
  'public/downloads/BuilderTables_26.1_controller_menu_v2.zip',
  'public/downloads/BuilderTables_26.3_controller_menu_v2.zip',
  'C:/Users/erick/AppData/Roaming/.minecraft/saves/mundo construcciones/datapacks/BuilderTables_26.2_controller_menu_v2.zip',
  'C:/Users/erick/AppData/Roaming/.minecraft/saves/mundo construcciones/datapacks/BuilderTables_26.2_generated (3).zip',
]

for (const zipPath of targetZips) {
  if (!existsSync(zipPath)) {
    console.warn(`Skipping missing zip: ${zipPath}`)
    continue
  }

  const buffer = readFileSync(zipPath)
  const unzipped = unzipSync(new Uint8Array(buffer))

  // Inject/replace all surveyor files
  for (const [filePath, content] of Object.entries(files)) {
    unzipped[filePath] = content
  }

  // Also ensure data/minecraft/tags/function/load.json and tick.json contain surveyor hooks
  if (unzipped['data/minecraft/tags/function/load.json']) {
    try {
      const loadTag = JSON.parse(new TextDecoder().decode(unzipped['data/minecraft/tags/function/load.json']))
      if (!loadTag.values.includes('builder_tables_generated:surveyor/init')) {
        loadTag.values.push('builder_tables_generated:surveyor/init')
        unzipped['data/minecraft/tags/function/load.json'] = strToU8(JSON.stringify(loadTag, null, 2) + '\n')
      }
    } catch (e) {
      console.error(`Error updating load.json in ${zipPath}:`, e)
    }
  }

  if (unzipped['data/minecraft/tags/function/tick.json']) {
    try {
      const tickTag = JSON.parse(new TextDecoder().decode(unzipped['data/minecraft/tags/function/tick.json']))
      if (!tickTag.values.includes('builder_tables_generated:surveyor/tick')) {
        tickTag.values.push('builder_tables_generated:surveyor/tick')
        unzipped['data/minecraft/tags/function/tick.json'] = strToU8(JSON.stringify(tickTag, null, 2) + '\n')
      }
    } catch (e) {
      console.error(`Error updating tick.json in ${zipPath}:`, e)
    }
  }

  const updatedZip = zipSync(unzipped, { level: 6 })
  writeFileSync(zipPath, Buffer.from(updatedZip))
  console.log(`Successfully patched ${zipPath} (${updatedZip.length} bytes)`)
}
