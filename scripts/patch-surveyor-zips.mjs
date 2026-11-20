import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { unzipSync, zipSync, strToU8 } from 'fflate'

// Import surveyor and bank modules
import { addSurveyorAssets } from '../src/generator/surveyor.ts'
import { addBaseBankAssets } from '../src/generator/bank.ts'
import { packIdNumber } from '../src/generator/controller.ts'

const files = {}
const put = (path, content) => {
  files[path] = strToU8(content)
}
const putJson = (path, value) => {
  put(path, JSON.stringify(value, null, 2) + '\n')
}

// Generate all surveyor and bank assets
addSurveyorAssets(put, putJson)
addBaseBankAssets(put, putJson)

// Add bank charges for default controller structures (cl0_1, cl0_7, clx_2)
;['cl0_1', 'cl0_7', 'clx_2'].forEach((id) => {
  put(
    `data/builder_tables_generated/function/bank/charge_${id}.mcfunction`,
    `# Capturar cuánto cubre el banco ANTES de modificarlo\n` +
      `scoreboard players operation @s bt_temp = @s bt_bank\n` +
      `# Caso 1: el banco cubre el total\n` +
      `execute if score @s bt_bank >= @s bt_price run scoreboard players operation @s bt_bank -= @s bt_price\n` +
      `execute if score @s bt_temp >= @s bt_price run tellraw @s [{"text":"[Banco] Pago completado con tu Tarjeta Bancaria. Saldo restante: ","color":"green"},{"score":{"name":"@s","objective":"bt_bank"},"color":"gold"}]\n` +
      `execute if score @s bt_temp >= @s bt_price run function builder_tables:dynamic/build_${id}\n` +
      `execute if score @s bt_temp >= @s bt_price run return 1\n` +
      `# Caso 2: el banco cubre solo una parte — descontar del banco y cobrar el resto del inventario\n` +
      `scoreboard players operation @s bt_price -= @s bt_bank\n` +
      `scoreboard players set @s bt_bank 0\n` +
      `tellraw @s [{"text":"[Banco] Se aplicaron ","color":"yellow"},{"score":{"name":"@s","objective":"bt_temp"},"color":"gold"},{"text":" esmeraldas de tu Tarjeta Bancaria. El resto se cobrará del inventario.","color":"yellow"}]\n`,
  )
})

// Multi-pack controller functions and tags
put(
  'data/builder_tables/function/controller/open_catalog.mcfunction',
  '# Abrir catalogo directamente en la interfaz GUI (sin chat)\n' +
    'scoreboard players set #installed_packs bt_pack_count 0\n' +
    'function #builder_tables:menu/register_pack\n' +
    'execute unless score #active_pack bt_pack_index matches 1.. run scoreboard players set #active_pack bt_pack_index 1\n' +
    'execute if score #active_pack bt_pack_index > #installed_packs bt_pack_count run scoreboard players set #active_pack bt_pack_index 1\n' +
    'function #builder_tables:menu/open_pack_by_index\n' +
    'execute if score #installed_packs bt_pack_count matches ..0 run dialog show @s builder_tables:catalogo\n',
)
put(
  'data/builder_tables/function/controller/next_pack.mcfunction',
  '# Cambiar al siguiente paquete de planos desde la interfaz GUI\n' +
    'scoreboard players add #active_pack bt_pack_index 1\n' +
    'execute if score #active_pack bt_pack_index > #installed_packs bt_pack_count run scoreboard players set #active_pack bt_pack_index 1\n' +
    'function #builder_tables:menu/open_pack_by_index\n' +
    'execute if score #installed_packs bt_pack_count matches 1 run title @s actionbar {"text":"Solo hay 1 paquete de planos instalado","color":"yellow"}\n',
)

// Base pack menu files (allows opening default structures if other packs are present)
put(
  'data/builder_tables/function/pack_base/menu/register.mcfunction',
  '# Registrar presencia y asignar indice al paquete base\n' +
    'scoreboard players add #installed_packs bt_pack_count 1\n' +
    'scoreboard players operation #pack_base bt_pack_index = #installed_packs bt_pack_count\n',
)
put(
  'data/builder_tables/function/pack_base/menu/open_pack.mcfunction',
  '# Abrir catalogo base si coincide con el indice activo\n' +
    'execute if score #active_pack bt_pack_index = #pack_base bt_pack_index run dialog show @s builder_tables:catalogo\n',
)

putJson('data/builder_tables/tags/function/menu/register_pack.json', {
  values: ['builder_tables:pack_base/menu/register'],
})
putJson('data/builder_tables/tags/function/menu/open_pack_by_index.json', {
  values: ['builder_tables:pack_base/menu/open_pack'],
})
putJson('data/builder_tables/tags/function/menu/open_plan.json', { values: [] })
putJson('data/builder_tables/tags/function/pack_triggers.json', { values: [] })
putJson('data/builder_tables/tags/function/pack_recipes.json', { values: [] })

console.log(`Generated ${Object.keys(files).length} base surveyor, bank & multi-pack files to inject.`)

const targetZips = [
  'public/downloads/BuilderTables_26.2_controller_menu_v2.zip',
  'public/downloads/BuilderTables_1.21.2_controller_menu_v2.zip',
  'public/downloads/BuilderTables_1.21.4_controller_menu_v2.zip',
  'public/downloads/BuilderTables_1.21_controller_menu_v2.zip',
  'public/downloads/BuilderTables_26.1_controller_menu_v2.zip',
  'public/downloads/BuilderTables_26.3_controller_menu_v2.zip',
  'C:/Users/erick/AppData/Roaming/.minecraft/saves/mundo construcciones/datapacks/BuilderTables_26.2_controller_menu_v2.zip',
  'C:/Users/erick/AppData/Roaming/.minecraft/saves/mundo construcciones/datapacks/BuilderTables_26.2_generated (3).zip',
  'C:/Users/erick/Downloads/BuilderTables_26.2_controller_menu_v2 (3).zip',
  'C:/Users/erick/Downloads/BuilderTables_26.2_controller_menu_v2.zip',
  'C:/Users/erick/Downloads/BuilderTables_26.2_zombificador.zip',
  'C:/Users/erick/Downloads/BuilderTables_26.2_pack_b56at.zip',
]

for (const zipPath of targetZips) {
  if (!existsSync(zipPath)) {
    console.warn(`Skipping missing zip: ${zipPath}`)
    continue
  }

  const buffer = readFileSync(zipPath)
  const unzipped = unzipSync(new Uint8Array(buffer))

  // Clean up obsolete files
  const obsoleteFiles = [
    'data/builder_tables/function/controller/show_pack_selector.mcfunction',
    'data/builder_tables/function/pack_base/menu/open_if_only.mcfunction',
    'data/builder_tables/function/pack_base/menu/show_entry.mcfunction',
    'data/builder_tables/function/pack_base/menu/trigger.mcfunction',
    'data/builder_tables/tags/function/menu/open_single_pack.json',
    'data/builder_tables/tags/function/menu/show_pack_entry.json',
  ]
  for (const obsolete of obsoleteFiles) {
    delete unzipped[obsolete]
  }

  // Inject/replace all surveyor, bank & multi-pack base files
  for (const [filePath, content] of Object.entries(files)) {
    unzipped[filePath] = content
  }

  // Ensure data/minecraft/tags/function/load.json contains bank and surveyor hooks
  if (unzipped['data/minecraft/tags/function/load.json']) {
    try {
      const loadTag = JSON.parse(new TextDecoder().decode(unzipped['data/minecraft/tags/function/load.json']))
      if (!loadTag.values.includes('builder_tables_generated:bank/init')) {
        loadTag.values.push('builder_tables_generated:bank/init')
      }
      if (!loadTag.values.includes('builder_tables_generated:surveyor/init')) {
        loadTag.values.push('builder_tables_generated:surveyor/init')
      }
      unzipped['data/minecraft/tags/function/load.json'] = strToU8(JSON.stringify(loadTag, null, 2) + '\n')
    } catch (e) {
      console.error(`Error updating load.json in ${zipPath}:`, e)
    }
  }

  // Ensure data/minecraft/tags/function/tick.json contains bank and surveyor hooks
  if (unzipped['data/minecraft/tags/function/tick.json']) {
    try {
      const tickTag = JSON.parse(new TextDecoder().decode(unzipped['data/minecraft/tags/function/tick.json']))
      if (!tickTag.values.includes('builder_tables_generated:bank/tick')) {
        tickTag.values.push('builder_tables_generated:bank/tick')
      }
      if (!tickTag.values.includes('builder_tables_generated:surveyor/tick')) {
        tickTag.values.push('builder_tables_generated:surveyor/tick')
      }
      unzipped['data/minecraft/tags/function/tick.json'] = strToU8(JSON.stringify(tickTag, null, 2) + '\n')
    } catch (e) {
      console.error(`Error updating tick.json in ${zipPath}:`, e)
    }
  }

  // Ensure data/builder_tables/function/init.mcfunction initializes bank and multi-pack objectives
  if (unzipped['data/builder_tables/function/init.mcfunction']) {
    try {
      let initCode = new TextDecoder().decode(unzipped['data/builder_tables/function/init.mcfunction'])
      if (!initCode.includes('scoreboard objectives add bt_bank dummy')) {
        initCode +=
          '\n# Inicialización de objetivos bancarios\n' +
          'scoreboard objectives add bt_bank dummy\n' +
          'scoreboard objectives add bt_deposit trigger\n' +
          'scoreboard objectives add bt_withdraw trigger\n' +
          'scoreboard objectives add bt_balance trigger\n' +
          'scoreboard objectives add bt_bank_menu trigger\n' +
          'scoreboard objectives add bt_has_card dummy\n' +
          'scoreboard objectives add bt_temp dummy\n' +
          'scoreboard objectives add bt_temp_emeralds dummy\n' +
          'scoreboard objectives add bt_temp_blocks dummy\n' +
          'scoreboard objectives add bt_bank_timer dummy\n' +
          'scoreboard objectives add bt_interest dummy\n' +
          'scoreboard objectives add bt_interest_math dummy\n' +
          'scoreboard players set #ten bt_interest_math 10\n' +
          'scoreboard players set #hundred bt_interest_math 100\n' +
          'scoreboard players set #tier1_limit bt_interest_math 25000\n' +
          'scoreboard players set #tier1_max bt_interest_math 2500\n' +
          'scoreboard players set #cap bt_interest_math 5000\n' +
          'scoreboard players set #nine bt_price 9\n' +
          'recipe give @a builder_tables:bank_card\n' +
          'advancement revoke @a only builder_tables_generated:used_bank_card\n'
      }

      if (!initCode.includes('scoreboard objectives add bt_pack_count dummy')) {
        initCode += '\nscoreboard objectives add bt_pack_count dummy\n'
      }
      if (!initCode.includes('scoreboard objectives add bt_pack_index dummy')) {
        initCode += 'scoreboard objectives add bt_pack_index dummy\n'
      }
      if (!initCode.includes('scoreboard objectives add bt_next_pack trigger')) {
        initCode += 'scoreboard objectives add bt_next_pack trigger\n'
      }

      unzipped['data/builder_tables/function/init.mcfunction'] = strToU8(initCode)
    } catch (e) {
      console.error(`Error updating init.mcfunction in ${zipPath}:`, e)
    }
  }

  // Ensure data/builder_tables/function/tick.mcfunction has bank triggers & bt_next_pack enabled
  if (unzipped['data/builder_tables/function/tick.mcfunction']) {
    try {
      let tickCode = new TextDecoder().decode(unzipped['data/builder_tables/function/tick.mcfunction'])
      if (!tickCode.includes('bt_deposit')) {
        tickCode +=
          '\n# Disparadores bancarios\n' +
          'scoreboard players enable @a bt_deposit\n' +
          'scoreboard players enable @a bt_withdraw\n' +
          'scoreboard players enable @a bt_balance\n' +
          'scoreboard players enable @a bt_bank_menu\n' +
          'execute as @a[advancements={builder_tables_generated:used_bank_card=true}] run function builder_tables_generated:bank/open\n' +
          'execute as @a[scores={bt_deposit=1}] run function builder_tables_generated:bank/deposit_64_emeralds\n' +
          'execute as @a[scores={bt_deposit=2}] run function builder_tables_generated:bank/deposit_64_blocks\n' +
          'execute as @a[scores={bt_deposit=3}] run function builder_tables_generated:bank/deposit_all\n' +
          'scoreboard players reset @a[scores={bt_deposit=1..}] bt_deposit\n' +
          'execute as @a[scores={bt_withdraw=1}] run function builder_tables_generated:bank/withdraw_64_emeralds\n' +
          'execute as @a[scores={bt_withdraw=2}] run function builder_tables_generated:bank/withdraw_64_blocks\n' +
          'scoreboard players reset @a[scores={bt_withdraw=1..}] bt_withdraw\n' +
          'execute as @a[scores={bt_balance=1..}] run function builder_tables_generated:bank/balance\n' +
          'scoreboard players reset @a[scores={bt_balance=1..}] bt_balance\n' +
          'execute as @a[scores={bt_bank_menu=1..}] run function builder_tables_generated:bank/open\n' +
          'scoreboard players reset @a[scores={bt_bank_menu=1..}] bt_bank_menu\n'
      }

      // Remove obsolete bt_open_pack lines if present
      tickCode = tickCode.replace(/scoreboard players enable @a bt_open_pack\r?\n?/g, '')
      tickCode = tickCode.replace(/scoreboard players reset @a\[scores=\{bt_open_pack=1\.\.\}\] bt_open_pack\r?\n?/g, '')

      if (!tickCode.includes('scoreboard players enable @a bt_next_pack')) {
        tickCode +=
          '\n# Cambio de paquete en interfaz grafica\n' +
          'scoreboard players enable @a bt_next_pack\n' +
          'execute as @a[scores={bt_next_pack=1..}] run function builder_tables:controller/next_pack\n' +
          'scoreboard players reset @a[scores={bt_next_pack=1..}] bt_next_pack\n'
      }

      if (!tickCode.includes('function #builder_tables:pack_triggers')) {
        tickCode = tickCode.replace(
          'function builder_tables:dynamic_triggers',
          'function #builder_tables:pack_triggers\nfunction builder_tables:dynamic_triggers',
        )
      }
      unzipped['data/builder_tables/function/tick.mcfunction'] = strToU8(tickCode)
    } catch (e) {
      console.error(`Error updating tick.mcfunction in ${zipPath}:`, e)
    }
  }

  // Ensure data/builder_tables/function/controller/open.mcfunction supports multi-pack catalog opening
  if (unzipped['data/builder_tables/function/controller/open.mcfunction']) {
    try {
      let openCode = new TextDecoder().decode(unzipped['data/builder_tables/function/controller/open.mcfunction'])
      if (!openCode.includes('function #builder_tables:menu/open_plan')) {
        openCode = openCode.replace(
          'execute if score @s bt_active matches 0 run dialog show @s builder_tables:catalogo',
          'execute if score @s bt_active matches 1.. run function #builder_tables:menu/open_plan\nexecute if score @s bt_active matches 0 run function builder_tables:controller/open_catalog',
        )
        unzipped['data/builder_tables/function/controller/open.mcfunction'] = strToU8(openCode)
      }
    } catch (e) {
      console.error(`Error updating open.mcfunction in ${zipPath}:`, e)
    }
  }

  // Update all dialog/catalogo*.json files to have the [➔ Cambiar Paquete] button
  for (const dialogPath of Object.keys(unzipped)) {
    if (dialogPath.startsWith('data/builder_tables/dialog/catalogo') && dialogPath.endsWith('.json')) {
      try {
        const dialogJson = JSON.parse(new TextDecoder().decode(unzipped[dialogPath]))
        if (Array.isArray(dialogJson.actions)) {
          const hasChangePack = dialogJson.actions.some(
            (a) => a.action?.command === 'trigger bt_next_pack set 1',
          )
          if (!hasChangePack) {
            dialogJson.actions.push({
              label: { text: '➔ Cambiar Paquete', color: 'gold' },
              action: { type: 'run_command', command: 'trigger bt_next_pack set 1' },
              tooltip: { text: 'Ver planos de otros paquetes de construcción instalados' },
            })
            unzipped[dialogPath] = strToU8(JSON.stringify(dialogJson, null, 2) + '\n')
          }
        }
      } catch (e) {
        console.error(`Error updating catalog dialog in ${zipPath}:`, e)
      }
    }
  }

  // If this zip is a generated pack with a pack_<id>, update its files
  for (const entryPath of Object.keys(unzipped)) {
    const match = entryPath.match(/^data\/builder_tables\/function\/pack_([^/]+)\/menu\/register\.mcfunction$/)
    if (match) {
      const packId = match[1]
      if (packId === 'base') continue

      // Update register to assign index
      unzipped[`data/builder_tables/function/pack_${packId}/menu/register.mcfunction`] = strToU8(
        `# Registrar presencia y asignar indice al paquete ${packId}\n` +
          `scoreboard players add #installed_packs bt_pack_count 1\n` +
          `scoreboard players operation #pack_${packId} bt_pack_index = #installed_packs bt_pack_count\n`,
      )

      // Add open_pack
      unzipped[`data/builder_tables/function/pack_${packId}/menu/open_pack.mcfunction`] = strToU8(
        `# Abrir catalogo si este paquete es el seleccionado\n` +
          `execute if score #active_pack bt_pack_index = #pack_${packId} bt_pack_index run dialog show @s builder_tables:catalogo_${packId}\n`,
      )

      // Remove obsolete files for this pack
      delete unzipped[`data/builder_tables/function/pack_${packId}/menu/show_entry.mcfunction`]
      delete unzipped[`data/builder_tables/function/pack_${packId}/menu/open_if_only.mcfunction`]
      delete unzipped[`data/builder_tables/function/pack_${packId}/menu/trigger.mcfunction`]

      // Ensure open_pack_by_index tag includes this pack
      const openTagPath = 'data/builder_tables/tags/function/menu/open_pack_by_index.json'
      let openTagList = []
      if (unzipped[openTagPath]) {
        try {
          openTagList = JSON.parse(new TextDecoder().decode(unzipped[openTagPath])).values || []
        } catch {}
      }
      const packOpenFn = `builder_tables:pack_${packId}/menu/open_pack`
      if (!openTagList.includes(packOpenFn)) {
        openTagList.push(packOpenFn)
      }
      unzipped[openTagPath] = strToU8(JSON.stringify({ values: openTagList }, null, 2) + '\n')
    }
  }

  const updatedZip = zipSync(unzipped, { level: 6 })
  writeFileSync(zipPath, Buffer.from(updatedZip))
  console.log(`Successfully patched ${zipPath} (${updatedZip.length} bytes)`)
}
