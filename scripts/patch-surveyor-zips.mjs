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
  '# Abrir catálogo único o selector de paquetes\n' +
    'scoreboard players set #installed_packs bt_pack_count 0\n' +
    'function #builder_tables:menu/register_pack\n' +
    'execute if score #installed_packs bt_pack_count matches 1 run function #builder_tables:menu/open_single_pack\n' +
    'execute if score #installed_packs bt_pack_count matches 2.. run function builder_tables:controller/show_pack_selector\n' +
    'execute if score #installed_packs bt_pack_count matches ..0 run dialog show @s builder_tables:catalogo\n',
)
put(
  'data/builder_tables/function/controller/show_pack_selector.mcfunction',
  'tellraw @s ["",{"text":"═══════════════════════════════════════","color":"gold","strikethrough":true}]\n' +
    'tellraw @s ["",{"text":" 📦 PAQUETES DE CONSTRUCCIÓN DISPONIBLES","color":"gold","bold":true}]\n' +
    'tellraw @s ["",{"text":" Selecciona un paquete para abrir sus planos:","color":"gray"}]\n' +
    'function #builder_tables:menu/show_pack_entry\n' +
    'tellraw @s ["",{"text":"═══════════════════════════════════════","color":"gold","strikethrough":true}]\n',
)

// Base pack menu files (allows opening default structures if other packs are present)
put(
  'data/builder_tables/function/pack_base/menu/register.mcfunction',
  '# Registrar presencia del paquete base\n' +
    'scoreboard players add #installed_packs bt_pack_count 1\n',
)
put(
  'data/builder_tables/function/pack_base/menu/open_if_only.mcfunction',
  '# Si es el único paquete instalado, abrir catálogo base directamente\n' +
    'execute if score #installed_packs bt_pack_count matches 1 run dialog show @s builder_tables:catalogo\n',
)
put(
  'data/builder_tables/function/pack_base/menu/show_entry.mcfunction',
  '# Entrada en selector para Construcciones Base\n' +
    'tellraw @s ["",{"text":"  ▶ ","color":"gold","clickEvent":{"action":"run_command","value":"/trigger bt_open_pack set 1"},"hoverEvent":{"action":"show_text","contents":"Haz clic para abrir el catálogo base"}},{"text":"[Pack: ","color":"yellow","clickEvent":{"action":"run_command","value":"/trigger bt_open_pack set 1"},"hoverEvent":{"action":"show_text","contents":"Haz clic para abrir el catálogo base"}},{"text":"Construcciones Base","color":"aqua","bold":true,"clickEvent":{"action":"run_command","value":"/trigger bt_open_pack set 1"},"hoverEvent":{"action":"show_text","contents":"Haz clic para abrir el catálogo base"}},{"text":"] ","color":"yellow","clickEvent":{"action":"run_command","value":"/trigger bt_open_pack set 1"},"hoverEvent":{"action":"show_text","contents":"Haz clic para abrir el catálogo base"}},{"text":"(3 construcciones) ","color":"gray"},{"text":"[Abrir Catalogo]","color":"green","bold":true,"clickEvent":{"action":"run_command","value":"/trigger bt_open_pack set 1"},"hoverEvent":{"action":"show_text","contents":"Haz clic para abrir el catálogo base"}}]\n',
)
put(
  'data/builder_tables/function/pack_base/menu/trigger.mcfunction',
  '# Abrir catalogo base al recibir el trigger 1\n' +
    'execute as @a[scores={bt_open_pack=1}] run dialog show @s builder_tables:catalogo\n',
)

putJson('data/builder_tables/tags/function/menu/register_pack.json', {
  values: ['builder_tables:pack_base/menu/register'],
})
putJson('data/builder_tables/tags/function/menu/open_single_pack.json', {
  values: ['builder_tables:pack_base/menu/open_if_only'],
})
putJson('data/builder_tables/tags/function/menu/show_pack_entry.json', {
  values: ['builder_tables:pack_base/menu/show_entry'],
})
putJson('data/builder_tables/tags/function/menu/open_plan.json', { values: [] })
putJson('data/builder_tables/tags/function/pack_triggers.json', {
  values: ['builder_tables:pack_base/menu/trigger'],
})
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

  // Inject/replace all surveyor and bank files
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

  // Ensure data/builder_tables/function/init.mcfunction initializes bank objectives if present
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
        unzipped['data/builder_tables/function/init.mcfunction'] = strToU8(initCode)
      } else {
        // Actualizar constantes si ya existía el bloque con la versión anterior de 250
        initCode = initCode.replace(
          'scoreboard players set #hundred bt_interest_math 100\nscoreboard players set #cap bt_interest_math 250',
          'scoreboard players set #ten bt_interest_math 10\nscoreboard players set #hundred bt_interest_math 100\nscoreboard players set #tier1_limit bt_interest_math 25000\nscoreboard players set #tier1_max bt_interest_math 2500\nscoreboard players set #cap bt_interest_math 5000'
        )
        unzipped['data/builder_tables/function/init.mcfunction'] = strToU8(initCode)
      }
    } catch (e) {
      console.error(`Error updating init.mcfunction in ${zipPath}:`, e)
    }
  }

  // Ensure data/builder_tables/function/tick.mcfunction has bank triggers enabled
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
        unzipped['data/builder_tables/function/tick.mcfunction'] = strToU8(tickCode)
      }

      if (!tickCode.includes('function #builder_tables:pack_triggers')) {
        tickCode = tickCode.replace(
          'function builder_tables:dynamic_triggers',
          'function #builder_tables:pack_triggers\nfunction builder_tables:dynamic_triggers',
        )
        unzipped['data/builder_tables/function/tick.mcfunction'] = strToU8(tickCode)
      }
    } catch (e) {
      console.error(`Error updating tick.mcfunction in ${zipPath}:`, e)
    }
  }

  // Ensure data/builder_tables/function/init.mcfunction has bt_pack_count and bt_open_pack objectives
  if (unzipped['data/builder_tables/function/init.mcfunction']) {
    try {
      let initCode = new TextDecoder().decode(unzipped['data/builder_tables/function/init.mcfunction'])
      if (!initCode.includes('scoreboard objectives add bt_pack_count dummy')) {
        initCode += '\nscoreboard objectives add bt_pack_count dummy\n'
      }
      if (!initCode.includes('scoreboard objectives add bt_open_pack trigger')) {
        initCode += '\nscoreboard objectives add bt_open_pack trigger\n'
      }
      unzipped['data/builder_tables/function/init.mcfunction'] = strToU8(initCode)
    } catch (e) {
      console.error(`Error adding objectives in ${zipPath}:`, e)
    }
  }

  // Ensure data/builder_tables/function/tick.mcfunction has bt_open_pack enabled and reset
  if (unzipped['data/builder_tables/function/tick.mcfunction']) {
    try {
      let tickCode = new TextDecoder().decode(unzipped['data/builder_tables/function/tick.mcfunction'])
      if (!tickCode.includes('scoreboard players enable @a bt_open_pack')) {
        tickCode +=
          '\n# Selector de paquetes por trigger\n' +
          'scoreboard players enable @a bt_open_pack\n' +
          'scoreboard players reset @a[scores={bt_open_pack=1..}] bt_open_pack\n'
        unzipped['data/builder_tables/function/tick.mcfunction'] = strToU8(tickCode)
      }
    } catch (e) {
      console.error(`Error updating bt_open_pack in tick.mcfunction in ${zipPath}:`, e)
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

  // If this zip is a generated pack with a pack_<id>/menu/show_entry.mcfunction, fix its clickEvent
  for (const entryPath of Object.keys(unzipped)) {
    const match = entryPath.match(/^data\/builder_tables\/function\/pack_([^/]+)\/menu\/show_entry\.mcfunction$/)
    if (match) {
      const packId = match[1]
      if (packId === 'base') continue
      const packNum = packIdNumber(packId)
      let showEntryCode = new TextDecoder().decode(unzipped[entryPath])
      if (showEntryCode.includes('/dialog show @s')) {
        showEntryCode = showEntryCode.replaceAll(
          `/dialog show @s builder_tables:catalogo_${packId}`,
          `/trigger bt_open_pack set ${packNum}`,
        )
        unzipped[entryPath] = strToU8(showEntryCode)
      }
      unzipped[`data/builder_tables/function/pack_${packId}/menu/trigger.mcfunction`] = strToU8(
        `# Abrir catalogo del paquete al recibir el trigger del selector\nexecute as @a[scores={bt_open_pack=${packNum}}] run dialog show @s builder_tables:catalogo_${packId}\n`,
      )
      const packTriggersPath = 'data/builder_tables/tags/function/pack_triggers.json'
      let triggersList = []
      if (unzipped[packTriggersPath]) {
        try {
          triggersList = JSON.parse(new TextDecoder().decode(unzipped[packTriggersPath])).values || []
        } catch {}
      }
      const triggerFn = `builder_tables:pack_${packId}/menu/trigger`
      if (!triggersList.includes(triggerFn)) {
        triggersList.push(triggerFn)
      }
      unzipped[packTriggersPath] = strToU8(JSON.stringify({ values: triggersList }, null, 2) + '\n')
    }
  }

  const updatedZip = zipSync(unzipped, { level: 6 })
  writeFileSync(zipPath, Buffer.from(updatedZip))
  console.log(`Successfully patched ${zipPath} (${updatedZip.length} bytes)`)
}
