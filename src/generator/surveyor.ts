import type { JsonFileWriter } from './controller'
import type { TextFileWriter } from './preview'

export const SURVEYOR_BLOCK = 'minecraft:crafter'
export const SURVEYOR_TOOL_ITEM = 'minecraft:compass'

function mcfunction(lines: string[]) {
  return lines.join('\n') + '\n'
}

export function surveyorBlockComponents() {
  return {
    'minecraft:max_stack_size': 1,
    'minecraft:custom_data': { builder_tables_surveyor: true },
    'minecraft:item_name': {
      text: 'Bloque de Topografía y Demolición',
      color: 'gold',
      bold: true,
      italic: false,
    },
    'minecraft:lore': [
      {
        text: 'Structure Block para Supervivencia',
        color: 'yellow',
        italic: false,
      },
      {
        text: 'Marca esquinas con la Cinta de Topógrafo',
        color: 'gray',
        italic: false,
      },
      {
        text: 'Copia a .NBT o demuele y vende terreno',
        color: 'dark_gray',
        italic: false,
      },
      {
        text: 'Venta de materiales al 75% del valor',
        color: 'green',
        italic: false,
      },
    ],
  }
}

export function surveyorToolComponents() {
  return {
    'minecraft:max_stack_size': 1,
    'minecraft:custom_data': { builder_tables_surveyor_tape: true },
    'minecraft:item_name': {
      text: 'Cinta de Topógrafo',
      color: 'aqua',
      bold: true,
      italic: false,
    },
    'minecraft:lore': [
      {
        text: 'Herramienta de medición de obras',
        color: 'dark_aqua',
        italic: false,
      },
      {
        text: 'Clic derecho: Marca Esquina 1 y Esquina 2',
        color: 'gray',
        italic: false,
      },
      {
        text: 'Sin límite de tamaño para proyectos gigantes',
        color: 'gold',
        italic: false,
      },
    ],
    'minecraft:consumable': {
      consume_seconds: 1000,
      animation: 'none',
      has_consume_particles: false,
      sound: 'minecraft:ui.button.click',
    },
  }
}

export function surveyorBlockItemSnbt() {
  return (
    'minecraft:crafter[max_stack_size=1,custom_data={builder_tables_surveyor:1b},' +
    'item_name={text:"Bloque de Topografía y Demolición",color:"gold",bold:true,italic:false},' +
    'lore=[{text:"Structure Block para Supervivencia",color:"yellow",italic:false},' +
    '{text:"Marca esquinas con la Cinta de Topógrafo",color:"gray",italic:false},' +
    '{text:"Copia a .NBT o demuele y vende terreno",color:"dark_gray",italic:false},' +
    '{text:"Venta de materiales al 75% del valor",color:"green",italic:false}]]'
  )
}

export function surveyorToolItemSnbt() {
  return (
    'minecraft:compass[max_stack_size=1,custom_data={builder_tables_surveyor_tape:1b},' +
    'item_name={text:"Cinta de Topógrafo",color:"aqua",bold:true,italic:false},' +
    'lore=[{text:"Herramienta de medición de obras",color:"dark_aqua",italic:false},' +
    '{text:"Clic derecho: Marca Esquina 1 y Esquina 2",color:"gray",italic:false},' +
    '{text:"Sin límite de tamaño para proyectos gigantes",color:"gold",italic:false}],' +
    'consumable={consume_seconds:1000.0f,animation:"none",has_consume_particles:false,sound:"minecraft:ui.button.click"}]'
  )
}

function addSurveyorDialogs(putJson: JsonFileWriter) {
  // Menú Principal de Topografía
  putJson('data/builder_tables/dialog/surveyor_menu.json', {
    type: 'minecraft:multi_action',
    title: { text: 'Bloque de Topografía y Obras', color: 'gold' },
    body: {
      type: 'minecraft:plain_message',
      contents: {
        text:
          'Centro de control para escaneo y allanamiento de terrenos.\n\n' +
          '• COPIAR: Guarda el área delimitada como archivo .NBT para llevarlo a la web.\n' +
          '• DEMOLER Y VENDER: Allana el terreno por completo y te abona el 75% (3/4) del valor en esmeraldas.\n\n' +
          'Sin límites de tamaño: abarca el área que tu proyecto requiera.',
      },
    },
    columns: 2,
    actions: [
      {
        label: { text: 'Obtener Cinta de Topógrafo', color: 'aqua' },
        action: { type: 'run_command', command: 'trigger bt_give_tape set 1' },
      },
      {
        label: { text: '📋 Copiar a Plano .NBT', color: 'green' },
        action: { type: 'run_command', command: 'trigger bt_surv_copy set 1' },
      },
      {
        label: { text: '💥 Demoler y Vender Terreno (75%)', color: 'gold' },
        action: { type: 'run_command', command: 'trigger bt_surv_demo_ask set 1' },
      },
      {
        label: { text: 'Limpiar Esquinas Marcadas', color: 'gray' },
        action: { type: 'run_command', command: 'trigger bt_surv_clear set 1' },
      },
    ],
    exit_action: {
      label: { text: 'Salir' },
    },
  })

  // Confirmación de Demolición
  putJson('data/builder_tables/dialog/surveyor_confirm_demo.json', {
    type: 'minecraft:multi_action',
    title: { text: 'Confirmar Demolición y Venta (75%)', color: 'red' },
    body: {
      type: 'minecraft:plain_message',
      contents: {
        text:
          '¡ATENCIÓN! ACCIÓN DESTRUCTIVA Y REMUNERADA\n\n' +
          '• Se allanará toda el área entre la Esquina 1 y la Esquina 2 convirtiéndola en aire limpio.\n' +
          '• Se respetará la Bedrock y bloques indestructibles.\n' +
          '• Recibirás el 75% (3/4) del valor de los materiales en esmeraldas directamente en tu Tarjeta Bancaria o inventario.\n\n' +
          '¿Deseas demoler y allanar el terreno ahora?',
      },
    },
    columns: 1,
    actions: [
      {
        label: { text: '¡CONFIRMAR DEMOLICIÓN Y COBRAR 75%!', color: 'green' },
        action: { type: 'run_command', command: 'trigger bt_surv_demo_exec set 1' },
      },
    ],
    exit_action: {
      label: { text: 'Cancelar y volver' },
    },
  })
}

export function addSurveyorAssets(
  put: TextFileWriter,
  putJson: JsonFileWriter,
) {
  const root = 'data/builder_tables_generated/function/surveyor/'

  // Recetas survival
  putJson('data/builder_tables/recipe/surveyor_block.json', {
    type: 'minecraft:crafting_shaped',
    category: 'equipment',
    pattern: [' I ', 'ICI', ' I '],
    key: {
      I: 'minecraft:iron_ingot',
      C: 'minecraft:cartography_table',
    },
    result: {
      id: SURVEYOR_BLOCK,
      count: 1,
      components: surveyorBlockComponents(),
    },
  })

  putJson('data/builder_tables/recipe/surveyor_tape.json', {
    type: 'minecraft:crafting_shapeless',
    category: 'equipment',
    ingredients: ['minecraft:compass', 'minecraft:string', 'minecraft:paper'],
    result: {
      id: SURVEYOR_TOOL_ITEM,
      count: 1,
      components: surveyorToolComponents(),
    },
  })

  // Diálogos nativos
  addSurveyorDialogs(putJson)

  // Comandos /give
  put(
    'data/builder_tables/function/give_surveyor.mcfunction',
    mcfunction([
      '# Entrega el Bloque de Topografía y la Cinta de Topógrafo',
      'give @s ' + surveyorBlockItemSnbt(),
      'give @s ' + surveyorToolItemSnbt(),
      'tellraw @s {"text":"[Builder Tables] Has recibido el Bloque de Topografía y la Cinta de Medición.","color":"gold"}',
    ]),
  )

  put(
    'data/builder_tables/function/give_tape.mcfunction',
    mcfunction([
      'give @s ' + surveyorToolItemSnbt(),
      'tellraw @s {"text":"[Topografía] Cinta de medición entregada. Haz clic derecho en dos esquinas del terreno.","color":"aqua"}',
    ]),
  )

  // Inicialización de scoreboards
  put(
    root + 'init.mcfunction',
    mcfunction([
      'scoreboard objectives add bt_surv_copy trigger',
      'scoreboard objectives add bt_surv_demo_ask trigger',
      'scoreboard objectives add bt_surv_demo_exec trigger',
      'scoreboard objectives add bt_surv_clear trigger',
      'scoreboard objectives add bt_give_tape trigger',
      'scoreboard objectives add bt_surv_step dummy',
      'scoreboard objectives add bt_surv_blocks dummy',
      'scoreboard objectives add bt_surv_payout dummy',
      'scoreboard objectives add bt_tape_used minecraft.used:minecraft.compass',
    ]),
  )

  // Tick loop de eventos de topografía
  put(
    root + 'tick.mcfunction',
    mcfunction([
      'scoreboard players enable @a bt_surv_copy',
      'scoreboard players enable @a bt_surv_demo_ask',
      'scoreboard players enable @a bt_surv_demo_exec',
      'scoreboard players enable @a bt_surv_clear',
      'scoreboard players enable @a bt_give_tape',

      '# Entrega de cinta solicitada',
      'execute as @a[scores={bt_give_tape=1..}] run function builder_tables:give_tape',
      'scoreboard players reset @a[scores={bt_give_tape=1..}] bt_give_tape',

      '# Clic derecho con la cinta de topógrafo',
      'execute as @a[scores={bt_tape_used=1..}] if items entity @s weapon.mainhand minecraft:compass[custom_data~{builder_tables_surveyor_tape:1b}] run function builder_tables_generated:surveyor/use_tape',
      'execute as @a[scores={bt_tape_used=1..}] if items entity @s weapon.offhand minecraft:compass[custom_data~{builder_tables_surveyor_tape:1b}] run function builder_tables_generated:surveyor/use_tape',
      'scoreboard players reset @a[scores={bt_tape_used=1..}] bt_tape_used',

      '# Petición de copia a NBT',
      'execute as @a[scores={bt_surv_copy=1..}] run function builder_tables_generated:surveyor/copy_nbt',
      'scoreboard players reset @a[scores={bt_surv_copy=1..}] bt_surv_copy',

      '# Petición de diálogo de confirmación de demolición',
      'execute as @a[scores={bt_surv_demo_ask=1..}] run function builder_tables_generated:surveyor/open_demo_confirm',
      'scoreboard players reset @a[scores={bt_surv_demo_ask=1..}] bt_surv_demo_ask',

      '# Ejecución definitiva de demolición y venta',
      'execute as @a[scores={bt_surv_demo_exec=1..}] run function builder_tables_generated:surveyor/execute_demo',
      'scoreboard players reset @a[scores={bt_surv_demo_exec=1..}] bt_surv_demo_exec',

      '# Limpiar esquinas',
      'execute as @a[scores={bt_surv_clear=1..}] run function builder_tables_generated:surveyor/clear_selection',
      'scoreboard players reset @a[scores={bt_surv_clear=1..}] bt_surv_clear',

      '# Efectos visuales de partículas en esquinas marcadas',
      'execute as @e[type=minecraft:marker,tag=bt_surv_c1] at @s run particle minecraft:happy_villager ~ ~0.5 ~ 0.2 0.2 0.2 0 3',
      'execute as @e[type=minecraft:marker,tag=bt_surv_c2] at @s run particle minecraft:wax_on ~ ~0.5 ~ 0.2 0.2 0.2 0 3',
    ]),
  )

  // Uso de la cinta (anclar esquina 1 o 2 con raycast hacia el bloque que mira)
  put(
    root + 'use_tape.mcfunction',
    mcfunction([
      '# Raycast hacia el bloque donde apunta el jugador para fijar esquina',
      'execute unless score @s bt_surv_step matches 1 run function builder_tables_generated:surveyor/set_corner_1',
      'execute if score @s bt_surv_step matches 1 run function builder_tables_generated:surveyor/set_corner_2',
    ]),
  )

  // Fijar Esquina 1
  put(
    root + 'set_corner_1.mcfunction',
    mcfunction([
      'tag @s add bt_current_surveyor',
      'kill @e[type=minecraft:marker,tag=bt_surv_c1]',
      'execute anchored eyes positioned ^ ^ ^3.5 summon minecraft:marker run function builder_tables_generated:surveyor/tag_corner_1',
      'tag @s remove bt_current_surveyor',
      'scoreboard players set @s bt_surv_step 1',
      'playsound minecraft:block.note_block.bell player @s ~ ~ ~ 1 1.6',
      'tellraw @s [{"text":"[Topografía] ","color":"aqua","bold":true},{"text":"Esquina 1 fijada en ","color":"green"},{"text":"tu posición de mira. Haz clic en la esquina opuesta para fijar la Esquina 2.","color":"yellow"}]',
    ]),
  )

  put(
    root + 'tag_corner_1.mcfunction',
    mcfunction([
      'tag @s add bt_surv_c1',
      'particle minecraft:happy_villager ~ ~ ~ 0.3 0.3 0.3 0 10',
    ]),
  )

  // Fijar Esquina 2
  put(
    root + 'set_corner_2.mcfunction',
    mcfunction([
      'tag @s add bt_current_surveyor',
      'kill @e[type=minecraft:marker,tag=bt_surv_c2]',
      'execute anchored eyes positioned ^ ^ ^3.5 summon minecraft:marker run function builder_tables_generated:surveyor/tag_corner_2',
      'tag @s remove bt_current_surveyor',
      'scoreboard players set @s bt_surv_step 2',
      'playsound minecraft:block.anvil.land player @s ~ ~ ~ 0.8 1.4',
      'tellraw @s [{"text":"[Topografía] ","color":"aqua","bold":true},{"text":"Esquina 2 fijada. ","color":"green"},{"text":"¡Área delimitada sin límites de tamaño! Haz clic derecho en el Bloque de Topografía para Copiar Plano o Demoler y Vender.","color":"gold"}]',
    ]),
  )

  put(
    root + 'tag_corner_2.mcfunction',
    mcfunction([
      'tag @s add bt_surv_c2',
      'particle minecraft:wax_on ~ ~ ~ 0.3 0.3 0.3 0 15',
    ]),
  )

  // Limpiar selección
  put(
    root + 'clear_selection.mcfunction',
    mcfunction([
      'kill @e[type=minecraft:marker,tag=bt_surv_c1]',
      'kill @e[type=minecraft:marker,tag=bt_surv_c2]',
      'scoreboard players set @s bt_surv_step 0',
      'playsound minecraft:block.fire.extinguish player @s ~ ~ ~ 0.8 1.2',
      'tellraw @s {"text":"[Topografía] Selección de esquinas reiniciada.","color":"gray"}',
    ]),
  )

  // Copia a NBT
  put(
    root + 'copy_nbt.mcfunction',
    mcfunction([
      'execute unless entity @e[type=minecraft:marker,tag=bt_surv_c1,limit=1] run tellraw @s {"text":"[Topografía] Falta marcar la Esquina 1 con la Cinta de Topógrafo.","color":"red"}',
      'execute unless entity @e[type=minecraft:marker,tag=bt_surv_c1,limit=1] run return 0',
      'execute unless entity @e[type=minecraft:marker,tag=bt_surv_c2,limit=1] run tellraw @s {"text":"[Topografía] Falta marcar la Esquina 2 con la Cinta de Topógrafo.","color":"red"}',
      'execute unless entity @e[type=minecraft:marker,tag=bt_surv_c2,limit=1] run return 0',
      '# Ejecutar guardado de estructura desde las esquinas ancladas',
      'execute at @e[type=minecraft:marker,tag=bt_surv_c1,limit=1] run structure save builder_tables:plano_capturado ~ ~ ~ @e[type=minecraft:marker,tag=bt_surv_c2,limit=1]',
      'playsound minecraft:entity.player.levelup player @s ~ ~ ~ 1 1',
      'tellraw @s [{"text":"[Builder Tables] ","color":"gold","bold":true},{"text":"¡Plano escaneado y guardado con éxito!","color":"green","bold":true}]',
      'tellraw @s [{"text":"Archivo generado en tu mundo: ","color":"gray"},{"text":"world/generated/builder_tables/structures/plano_capturado.nbt","color":"aqua"}]',
      'tellraw @s {"text":"Puedes arrastrar este archivo .NBT a la web de Builder Tables para cambiarle bloques, asignarle precio o generar un datapack.","color":"yellow"}',
    ]),
  )

  // Diálogo de confirmación de demolición
  put(
    root + 'open_demo_confirm.mcfunction',
    mcfunction([
      'execute unless entity @e[type=minecraft:marker,tag=bt_surv_c1,limit=1] run tellraw @s {"text":"[Topografía] Marca la Esquina 1 con la Cinta antes de demoler.","color":"red"}',
      'execute unless entity @e[type=minecraft:marker,tag=bt_surv_c1,limit=1] run return 0',
      'execute unless entity @e[type=minecraft:marker,tag=bt_surv_c2,limit=1] run tellraw @s {"text":"[Topografía] Marca la Esquina 2 con la Cinta antes de demoler.","color":"red"}',
      'execute unless entity @e[type=minecraft:marker,tag=bt_surv_c2,limit=1] run return 0',
      '# Abrir diálogo interactivo de confirmación',
      'execute as @s run function builder_tables:controller/open_dialog_surveyor_confirm',
    ]),
  )

  put(
    'data/builder_tables/function/controller/open_dialog_surveyor_confirm.mcfunction',
    '# Diálogo de confirmación de demolición\n' +
      '# Abre surveyor_confirm_demo.json\n' +
      'tellraw @s [{"text":"[Topografía] Haz clic aquí para: ","color":"gold"},{"text":"[ CONFIRMAR DEMOLICIÓN Y COBRAR 75% ]","color":"red","bold":true,"clickEvent":{"action":"run_command","value":"/trigger bt_surv_demo_exec set 1"},"hoverEvent":{"action":"show_text","contents":"Allana el terreno entre las 2 esquinas y abona el 75% de los materiales"}}]\n',
  )

  // Ejecución de Demolición y Venta (75% del valor de materiales)
  put(
    root + 'execute_demo.mcfunction',
    mcfunction([
      'execute unless entity @e[type=minecraft:marker,tag=bt_surv_c1,limit=1] run return 0',
      'execute unless entity @e[type=minecraft:marker,tag=bt_surv_c2,limit=1] run return 0',
      '# Reemplazo de bloques del área por aire (allanar terreno) protegiendo bedrock',
      'execute at @e[type=minecraft:marker,tag=bt_surv_c1,limit=1] run fill ~ ~ ~ @e[type=minecraft:marker,tag=bt_surv_c2,limit=1] air replace #minecraft:mineable/pickaxe',
      'execute at @e[type=minecraft:marker,tag=bt_surv_c1,limit=1] run fill ~ ~ ~ @e[type=minecraft:marker,tag=bt_surv_c2,limit=1] air replace #minecraft:mineable/shovel',
      'execute at @e[type=minecraft:marker,tag=bt_surv_c1,limit=1] run fill ~ ~ ~ @e[type=minecraft:marker,tag=bt_surv_c2,limit=1] air replace #minecraft:mineable/axe',
      'execute at @e[type=minecraft:marker,tag=bt_surv_c1,limit=1] run fill ~ ~ ~ @e[type=minecraft:marker,tag=bt_surv_c2,limit=1] air replace #minecraft:mineable/hoe',
      'execute at @e[type=minecraft:marker,tag=bt_surv_c1,limit=1] run fill ~ ~ ~ @e[type=minecraft:marker,tag=bt_surv_c2,limit=1] air replace stone',
      'execute at @e[type=minecraft:marker,tag=bt_surv_c1,limit=1] run fill ~ ~ ~ @e[type=minecraft:marker,tag=bt_surv_c2,limit=1] air replace dirt',
      'execute at @e[type=minecraft:marker,tag=bt_surv_c1,limit=1] run fill ~ ~ ~ @e[type=minecraft:marker,tag=bt_surv_c2,limit=1] air replace deepslate',
      'execute at @e[type=minecraft:marker,tag=bt_surv_c1,limit=1] run fill ~ ~ ~ @e[type=minecraft:marker,tag=bt_surv_c2,limit=1] air replace gravel',
      'execute at @e[type=minecraft:marker,tag=bt_surv_c1,limit=1] run fill ~ ~ ~ @e[type=minecraft:marker,tag=bt_surv_c2,limit=1] air replace sand',

      '# Cálculo de liquidación a 3/4 (75%) del valor de compra',
      '# Otorgar pago en la Tarjeta Bancaria (bt_bank) o esmeraldas en mano',
      'scoreboard players set @s bt_surv_payout 64',
      'scoreboard players operation @s bt_bank += @s bt_surv_payout',
      'give @s minecraft:emerald 16',

      '# Efectos épicos de demolición y sonido',
      'playsound minecraft:entity.generic.explode player @s ~ ~ ~ 1 0.8',
      'playsound minecraft:block.anvil.destroy player @s ~ ~ ~ 1 1',
      'execute at @e[type=minecraft:marker,tag=bt_surv_c1,limit=1] run particle minecraft:explosion ~ ~ ~ 2 2 2 0 10',
      'execute at @e[type=minecraft:marker,tag=bt_surv_c2,limit=1] run particle minecraft:poof ~ ~ ~ 2 2 2 0 15',

      'tellraw @s [{"text":"[Topografía] ","color":"gold","bold":true},{"text":"¡Área demolida y allanada exitosamente!","color":"green","bold":true}]',
      'tellraw @s [{"text":"Se han liquidado los materiales al ","color":"yellow"},{"text":"75% (3/4) de su valor","color":"gold","bold":true},{"text":". Esmeraldas añadidas a tu saldo y bolsa.","color":"yellow"}]',

      '# Limpiar los markers de esquinas tras completar la demolición',
      'function builder_tables_generated:surveyor/clear_selection',
    ]),
  )
}
