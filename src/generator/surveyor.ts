import type { JsonFileWriter } from './controller'
import type { TextFileWriter } from './preview'

export const SURVEYOR_BLOCK = 'minecraft:note_block'
export const SURVEYOR_TOOL_ITEM = 'minecraft:carrot_on_a_stick'

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
        text: 'Centro de Obras y Demolición',
        color: 'yellow',
        italic: false,
      },
      {
        text: 'Colócalo y haz clic para abrir el centro de control',
        color: 'gray',
        italic: false,
      },
      {
        text: 'Allana y vende terreno o construcciones al 75%',
        color: 'green',
        italic: false,
      },
    ],
  }
}

export function surveyorToolComponents() {
  return {
    'minecraft:max_stack_size': 1,
    'minecraft:item_model': 'minecraft:compass',
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
        text: 'Clic derecho: Marca Primer Punto y Segundo Punto',
        color: 'gray',
        italic: false,
      },
      {
        text: 'Sin límite de tamaño para proyectos gigantes',
        color: 'gold',
        italic: false,
      },
    ],
  }
}

export function surveyorBlockItemSnbt() {
  return (
    'minecraft:note_block[max_stack_size=1,custom_data={builder_tables_surveyor:1b},' +
    'item_name={text:"Bloque de Topografía y Demolición",color:"gold",bold:true,italic:false},' +
    'lore=[{text:"Centro de Obras y Demolición",color:"yellow",italic:false},' +
    '{text:"Colócalo y haz clic para abrir el centro de control",color:"gray",italic:false},' +
    '{text:"Allana y vende terreno o construcciones al 75%",color:"green",italic:false}]]'
  )
}

export function surveyorToolItemSnbt() {
  return (
    'minecraft:carrot_on_a_stick[max_stack_size=1,item_model="minecraft:compass",custom_data={builder_tables_surveyor_tape:1b},' +
    'item_name={text:"Cinta de Topógrafo",color:"aqua",bold:true,italic:false},' +
    'lore=[{text:"Herramienta de medición de obras",color:"dark_aqua",italic:false},' +
    '{text:"Clic derecho: Marca Primer Punto y Segundo Punto",color:"gray",italic:false},' +
    '{text:"Sin límite de tamaño para proyectos gigantes",color:"gold",italic:false}]]'
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
          'Centro de control para topografía, allanamiento y venta de terrenos.\n\n' +
          '• CINTA DE TOPÓGRAFO: Marca dos esquinas en el terreno para delimitar el área.\n' +
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

  // Recetas survival en formato directo de ID (válido en todas las versiones de Java)
  putJson('data/builder_tables/recipe/surveyor_block.json', {
    type: 'minecraft:crafting_shaped',
    category: 'equipment',
    pattern: [' I ', 'INI', ' I '],
    key: {
      I: 'minecraft:iron_ingot',
      N: 'minecraft:note_block',
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
    ingredients: [
      'minecraft:compass',
      'minecraft:string',
      'minecraft:paper',
    ],
    result: {
      id: SURVEYOR_TOOL_ITEM,
      count: 1,
      components: surveyorToolComponents(),
    },
  })

  // Avance de colocación de Bloque de Topografía
  putJson('data/builder_tables_generated/advancement/placed_surveyor.json', {
    criteria: {
      place_surveyor: {
        trigger: 'minecraft:placed_block',
        conditions: {
          location: [
            {
              condition: 'minecraft:location_check',
              predicate: { block: { blocks: SURVEYOR_BLOCK } },
            },
          ],
        },
      },
    },
    rewards: {
      function: 'builder_tables_generated:surveyor/on_placed_advancement',
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
      'tellraw @s {"text":"[Topografía] Cinta de medición entregada. Haz clic derecho en dos puntos del terreno.","color":"aqua"}',
    ]),
  )

  // Despachador tras avance de colocación
  put(
    root + 'on_placed_advancement.mcfunction',
    mcfunction([
      'advancement revoke @s only builder_tables_generated:placed_surveyor',
      '# Si tiene el bloque de topografía en mano principal o secundaria, activar raycast de colocación',
      'execute if items entity @s weapon.mainhand minecraft:note_block[custom_data~{builder_tables_surveyor:1b}] run function builder_tables_generated:controller_block/ray_place',
      'execute if items entity @s weapon.offhand minecraft:note_block[custom_data~{builder_tables_surveyor:1b}] run function builder_tables_generated:controller_block/ray_place',
    ]),
  )

  // Función ejecutada cuando ray_place detecta que el bloque puesto es el de topografía
  put(
    root + 'placed.mcfunction',
    mcfunction([
      '# Eliminar anclajes previos en esta ubicación exacta si existieran',
      'kill @e[type=minecraft:marker,tag=bt_surveyor_anchor,distance=..0.5]',
      'summon minecraft:marker ~ ~ ~ {Tags:["bt_surveyor_anchor"]}',
      'playsound minecraft:block.note_block.chime player @a ~ ~ ~ 1 1.5',
      'tellraw @s [{"text":"[Topografía] ","color":"aqua","bold":true},{"text":"Bloque de Topografía y Obras colocado. Haz clic derecho en él para abrir el Centro de Control.","color":"gold"}]',
    ]),
  )

  // Menú interactivo al hacer clic derecho en el bloque de topografía
  put(
    root + 'open.mcfunction',
    mcfunction([
      'playsound minecraft:block.note_block.chime player @s ~ ~ ~ 0.8 1.8',
      '# Intentar abrir el diálogo nativo (1.21.2+ / 26.x)',
      'dialog show @s builder_tables:surveyor_menu',
      '# Mostrar fallback interactivo en chat con botones clicables',
      'tellraw @s ["",{"text":"======== ","color":"dark_gray"},{"text":"[ CENTRO DE TOPOGRAFÍA Y OBRAS ]","color":"gold","bold":true},{"text":" ========","color":"dark_gray"}]',
      'tellraw @s ["",{"text":"• ","color":"yellow"},{"text":"[ 📏 OBTENER CINTA ]","color":"aqua","bold":true,"clickEvent":{"action":"run_command","value":"/trigger bt_give_tape set 1"},"hoverEvent":{"action":"show_text","contents":"Recibir la cinta de medición"}},{"text":"  "},{"text":"[ 📋 COPIAR A NBT ]","color":"green","bold":true,"clickEvent":{"action":"run_command","value":"/trigger bt_surv_copy set 1"},"hoverEvent":{"action":"show_text","contents":"Guardar área como archivo .NBT"}},{"text":"  "},{"text":"[ 💥 DEMOLER Y VENDER (75%) ]","color":"gold","bold":true,"clickEvent":{"action":"run_command","value":"/trigger bt_surv_demo_ask set 1"},"hoverEvent":{"action":"show_text","contents":"Allana el terreno y cobra el 75% del valor en esmeraldas"}},{"text":"  "},{"text":"[ ✕ LIMPIAR ]","color":"red","clickEvent":{"action":"run_command","value":"/trigger bt_surv_clear set 1"},"hoverEvent":{"action":"show_text","contents":"Reiniciar selección de esquinas"}}]',
      'tellraw @s {"text":"================================================","color":"dark_gray"}',
    ]),
  )

  // Función de raycast para detectar el bloque donde apunta la mirada del jugador (hasta 16 bloques)
  function surveyorRaycast(hitFunction: string) {
    const lines: string[] = ['tag @s remove bt_surv_ray_hit']
    for (let step = 4; step <= 160; step += 2) {
      const dist = (step / 10).toFixed(1)
      lines.push(
        'execute unless entity @s[tag=bt_surv_ray_hit] at @s anchored eyes positioned ^ ^ ^' +
          dist +
          ' align xyz unless block ~ ~ ~ air unless block ~ ~ ~ cave_air unless block ~ ~ ~ void_air run function ' +
          hitFunction,
      )
    }
    // Fallback: si no mira a ningún bloque dentro de 16 bloques, fijar a 4 bloques de los ojos del jugador
    lines.push(
      'execute unless entity @s[tag=bt_surv_ray_hit] at @s anchored eyes positioned ^ ^ ^4.0 align xyz run function ' +
        hitFunction,
    )
    lines.push('tag @s remove bt_surv_ray_hit')
    return mcfunction(lines)
  }

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
      'scoreboard objectives add bt_tape_used minecraft.used:minecraft.carrot_on_a_stick',
      'scoreboard objectives add bt_temp dummy',
      'scoreboard objectives add bt_bank dummy',
      'scoreboard objectives add bt_surv_rm_sb trigger',
      'recipe give @a builder_tables:surveyor_block',
      'recipe give @a builder_tables:surveyor_tape',
      'recipe give @a builder_tables:planning_block',
      'recipe give @a builder_tables:bank_card',
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
      'scoreboard players enable @a bt_surv_rm_sb',

      '# Entrega de cinta solicitada',
      'execute as @a[scores={bt_give_tape=1..}] at @s run function builder_tables:give_tape',
      'scoreboard players reset @a[scores={bt_give_tape=1..}] bt_give_tape',

      '# Clic derecho con la cinta de topógrafo (carrot_on_a_stick)',
      'execute as @a[scores={bt_tape_used=1..}] at @s if items entity @s weapon.mainhand minecraft:carrot_on_a_stick[custom_data~{builder_tables_surveyor_tape:1b}] run function builder_tables_generated:surveyor/use_tape',
      'execute as @a[scores={bt_tape_used=1..}] at @s if items entity @s weapon.offhand minecraft:carrot_on_a_stick[custom_data~{builder_tables_surveyor_tape:1b}] run function builder_tables_generated:surveyor/use_tape',
      'scoreboard players reset @a[scores={bt_tape_used=1..}] bt_tape_used',

      '# Petición de copia a NBT',
      'execute as @a[scores={bt_surv_copy=1..}] at @s run function builder_tables_generated:surveyor/copy_nbt',
      'scoreboard players reset @a[scores={bt_surv_copy=1..}] bt_surv_copy',

      '# Petición de diálogo de confirmación de demolición',
      'execute as @a[scores={bt_surv_demo_ask=1..}] at @s run function builder_tables_generated:surveyor/open_demo_confirm',
      'scoreboard players reset @a[scores={bt_surv_demo_ask=1..}] bt_surv_demo_ask',

      '# Ejecución definitiva de demolición y venta',
      'execute as @a[scores={bt_surv_demo_exec=1..}] at @s run function builder_tables_generated:surveyor/execute_demo',
      'scoreboard players reset @a[scores={bt_surv_demo_exec=1..}] bt_surv_demo_exec',

      '# Limpiar esquinas',
      'execute as @a[scores={bt_surv_clear=1..}] at @s run function builder_tables_generated:surveyor/clear_selection',
      'scoreboard players reset @a[scores={bt_surv_clear=1..}] bt_surv_clear',

      '# Retirar bloque de estructura',
      'execute as @a[scores={bt_surv_rm_sb=1..}] at @s run function builder_tables_generated:surveyor/remove_structure_block',
      'scoreboard players reset @a[scores={bt_surv_rm_sb=1..}] bt_surv_rm_sb',

      '# Efectos visuales continuos de partículas en las esquinas marcadas',
      'execute as @e[type=minecraft:marker,tag=bt_surv_c1] at @s run particle minecraft:happy_villager ~0.5 ~1.1 ~0.5 0.1 0.1 0.1 0 2',
      'execute as @e[type=minecraft:marker,tag=bt_surv_c2] at @s run particle minecraft:wax_on ~0.5 ~1.1 ~0.5 0.1 0.1 0.1 0 2',
    ]),
  )

  // Raycast y marcadores de esquina 1 y 2
  put(
    root + 'ray_corner_1.mcfunction',
    surveyorRaycast('builder_tables_generated:surveyor/hit_corner_1'),
  )

  put(
    root + 'hit_corner_1.mcfunction',
    mcfunction([
      'tag @s add bt_surv_ray_hit',
      'kill @e[type=minecraft:marker,tag=bt_surv_c1]',
      'summon minecraft:marker ~ ~ ~ {Tags:["bt_surv_c1"]}',
      'execute store result score #x1 bt_temp run data get entity @e[type=minecraft:marker,tag=bt_surv_c1,limit=1] Pos[0]',
      'execute store result score #y1 bt_temp run data get entity @e[type=minecraft:marker,tag=bt_surv_c1,limit=1] Pos[1]',
      'execute store result score #z1 bt_temp run data get entity @e[type=minecraft:marker,tag=bt_surv_c1,limit=1] Pos[2]',
      'particle minecraft:happy_villager ~0.5 ~1 ~0.5 0.3 0.3 0.3 0 15',
    ]),
  )

  put(
    root + 'ray_corner_2.mcfunction',
    surveyorRaycast('builder_tables_generated:surveyor/hit_corner_2'),
  )

  put(
    root + 'hit_corner_2.mcfunction',
    mcfunction([
      'tag @s add bt_surv_ray_hit',
      'kill @e[type=minecraft:marker,tag=bt_surv_c2]',
      'summon minecraft:marker ~ ~ ~ {Tags:["bt_surv_c2"]}',
      'execute store result score #x2 bt_temp run data get entity @e[type=minecraft:marker,tag=bt_surv_c2,limit=1] Pos[0]',
      'execute store result score #y2 bt_temp run data get entity @e[type=minecraft:marker,tag=bt_surv_c2,limit=1] Pos[1]',
      'execute store result score #z2 bt_temp run data get entity @e[type=minecraft:marker,tag=bt_surv_c2,limit=1] Pos[2]',
      'particle minecraft:wax_on ~0.5 ~1 ~0.5 0.3 0.3 0.3 0 20',
    ]),
  )

  // Uso de la cinta (alternar estrictamente entre Punto 1 y Punto 2)
  put(
    root + 'use_tape.mcfunction',
    mcfunction([
      'execute if score @s bt_surv_step matches 1 run return run function builder_tables_generated:surveyor/set_corner_2',
      'function builder_tables_generated:surveyor/set_corner_1',
    ]),
  )

  // Fijar Primer Punto
  put(
    root + 'set_corner_1.mcfunction',
    mcfunction([
      'execute at @s run function builder_tables_generated:surveyor/ray_corner_1',
      'scoreboard players set @s bt_surv_step 1',
      'playsound minecraft:block.note_block.bell player @s ~ ~ ~ 1 1.6',
      'tellraw @s [{"text":"[Topografía] ","color":"aqua","bold":true},{"text":"Punto uno seleccionado en ","color":"green","bold":true},{"text":"[","color":"yellow"},{"score":{"name":"#x1","objective":"bt_temp"},"color":"gold","bold":true},{"text":", ","color":"yellow"},{"score":{"name":"#y1","objective":"bt_temp"},"color":"gold","bold":true},{"text":", ","color":"yellow"},{"score":{"name":"#z1","objective":"bt_temp"},"color":"gold","bold":true},{"text":"]","color":"yellow"}]',
    ]),
  )

  // Fijar Segundo Punto
  put(
    root + 'set_corner_2.mcfunction',
    mcfunction([
      'execute at @s run function builder_tables_generated:surveyor/ray_corner_2',
      'scoreboard players set @s bt_surv_step 0',
      'playsound minecraft:block.anvil.land player @s ~ ~ ~ 0.8 1.4',
      'tellraw @s [{"text":"[Topografía] ","color":"aqua","bold":true},{"text":"Segundo punto seleccionado en ","color":"gold","bold":true},{"text":"[","color":"yellow"},{"score":{"name":"#x2","objective":"bt_temp"},"color":"gold","bold":true},{"text":", ","color":"yellow"},{"score":{"name":"#y2","objective":"bt_temp"},"color":"gold","bold":true},{"text":", ","color":"yellow"},{"score":{"name":"#z2","objective":"bt_temp"},"color":"gold","bold":true},{"text":"]","color":"yellow"}]',
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
      'tellraw @s {"text":"[Topografía] Selección de puntos reiniciada.","color":"gray"}',
    ]),
  )

  // Colocación y configuración del Bloque de Estructuras para exportación NBT
  put(
    root + 'place_structure_block.mcfunction',
    mcfunction([
      'kill @e[type=minecraft:marker,tag=bt_surv_sb]',
      '$setblock $(sb_x) $(sb_y) $(sb_z) minecraft:structure_block[mode=save]{mode:"SAVE",name:"mi_construccion",sizeX:$(size_x),sizeY:$(size_y),sizeZ:$(size_z),posX:$(pos_x),posY:$(pos_y),posZ:$(pos_z),showboundingbox:1b} replace',
      '$summon minecraft:marker $(sb_x) $(sb_y) $(sb_z) {Tags:["bt_surv_sb"]}',
      '$particle minecraft:totem_of_undying $(sb_x) $(sb_y) $(sb_z) 1 1 1 0.1 30',
    ]),
  )

  // Retirar el bloque de estructuras cuando el jugador termine y restaurar supervivencia
  put(
    root + 'remove_structure_block.mcfunction',
    mcfunction([
      'execute at @e[type=minecraft:marker,tag=bt_surv_sb,limit=1] run setblock ~ ~ ~ air replace',
      'kill @e[type=minecraft:marker,tag=bt_surv_sb]',
      'gamemode survival @s',
      'playsound minecraft:block.fire.extinguish player @s ~ ~ ~ 0.8 1.4',
      'tellraw @s {"text":"[Topografía] Bloque de Estructuras retirado y modo Supervivencia restaurado.","color":"gray"}',
    ]),
  )

  // Copia a NBT: calcula dimensiones exactas y coloca el Bloque de Estructuras delimitando la obra
  put(
    root + 'copy_nbt.mcfunction',
    mcfunction([
      'execute unless entity @e[type=minecraft:marker,tag=bt_surv_c1,limit=1] run tellraw @s {"text":"[Topografía] Falta marcar el primer punto con la Cinta de Topógrafo.","color":"red"}',
      'execute unless entity @e[type=minecraft:marker,tag=bt_surv_c1,limit=1] run return 0',
      'execute unless entity @e[type=minecraft:marker,tag=bt_surv_c2,limit=1] run tellraw @s {"text":"[Topografía] Falta marcar el segundo punto con la Cinta de Topógrafo.","color":"red"}',
      'execute unless entity @e[type=minecraft:marker,tag=bt_surv_c2,limit=1] run return 0',

      '# 1. Obtener coordenadas de ambas esquinas más cercanas al jugador',
      'execute store result score #x1 bt_temp run data get entity @e[type=minecraft:marker,tag=bt_surv_c1,sort=nearest,limit=1] Pos[0]',
      'execute store result score #y1 bt_temp run data get entity @e[type=minecraft:marker,tag=bt_surv_c1,sort=nearest,limit=1] Pos[1]',
      'execute store result score #z1 bt_temp run data get entity @e[type=minecraft:marker,tag=bt_surv_c1,sort=nearest,limit=1] Pos[2]',
      'execute store result score #x2 bt_temp run data get entity @e[type=minecraft:marker,tag=bt_surv_c2,sort=nearest,limit=1] Pos[0]',
      'execute store result score #y2 bt_temp run data get entity @e[type=minecraft:marker,tag=bt_surv_c2,sort=nearest,limit=1] Pos[1]',
      'execute store result score #z2 bt_temp run data get entity @e[type=minecraft:marker,tag=bt_surv_c2,sort=nearest,limit=1] Pos[2]',

      '# 2. Calcular límites mínimos y máximos en cada eje',
      'scoreboard players operation #min_x bt_temp = #x1 bt_temp',
      'scoreboard players operation #max_x bt_temp = #x2 bt_temp',
      'execute if score #x1 bt_temp > #x2 bt_temp run scoreboard players operation #min_x bt_temp = #x2 bt_temp',
      'execute if score #x1 bt_temp > #x2 bt_temp run scoreboard players operation #max_x bt_temp = #x1 bt_temp',

      'scoreboard players operation #min_y bt_temp = #y1 bt_temp',
      'scoreboard players operation #max_y bt_temp = #y2 bt_temp',
      'execute if score #y1 bt_temp > #y2 bt_temp run scoreboard players operation #min_y bt_temp = #y2 bt_temp',
      'execute if score #y1 bt_temp > #y2 bt_temp run scoreboard players operation #max_y bt_temp = #y1 bt_temp',

      'scoreboard players operation #min_z bt_temp = #z1 bt_temp',
      'scoreboard players operation #max_z bt_temp = #z2 bt_temp',
      'execute if score #z1 bt_temp > #z2 bt_temp run scoreboard players operation #min_z bt_temp = #z2 bt_temp',
      'execute if score #z1 bt_temp > #z2 bt_temp run scoreboard players operation #max_z bt_temp = #z2 bt_temp',

      '# 3. Calcular dimensiones reales (size = max - min + 1)',
      'scoreboard players operation #size_x bt_temp = #max_x bt_temp',
      'scoreboard players operation #size_x bt_temp -= #min_x bt_temp',
      'scoreboard players add #size_x bt_temp 1',

      'scoreboard players operation #size_y bt_temp = #max_y bt_temp',
      'scoreboard players operation #size_y bt_temp -= #min_y bt_temp',
      'scoreboard players add #size_y bt_temp 1',

      'scoreboard players operation #size_z bt_temp = #max_z bt_temp',
      'scoreboard players operation #size_z bt_temp -= #min_z bt_temp',
      'scoreboard players add #size_z bt_temp 1',

      '# Guardar coordenadas exactas en storage global para exportación y uso',
      'execute store result storage builder_tables:surveyor min_x int 1 run scoreboard players get #min_x bt_temp',
      'execute store result storage builder_tables:surveyor min_y int 1 run scoreboard players get #min_y bt_temp',
      'execute store result storage builder_tables:surveyor min_z int 1 run scoreboard players get #min_z bt_temp',
      'execute store result storage builder_tables:surveyor max_x int 1 run scoreboard players get #max_x bt_temp',
      'execute store result storage builder_tables:surveyor max_y int 1 run scoreboard players get #max_y bt_temp',
      'execute store result storage builder_tables:surveyor max_z int 1 run scoreboard players get #max_z bt_temp',

      '# Límite de Structure Block de Minecraft (máx 48 por eje)',
      'execute if score #size_x bt_temp matches 49.. run tellraw @s [{"text":"[Topografía] Aviso: el ancho supera 48 bloques (límite de Bloque de Estructuras). Se delimitarán los primeros 48.","color":"yellow"}]',
      'execute if score #size_x bt_temp matches 49.. run scoreboard players set #size_x bt_temp 48',
      'execute if score #size_y bt_temp matches 49.. run scoreboard players set #size_y bt_temp 48',
      'execute if score #size_z bt_temp matches 49.. run scoreboard players set #size_z bt_temp 48',

      '# 4. Calcular posición del bloque (en la base inferior min_x, min_y - 1, min_z con offset vertical posY=1)',
      'scoreboard players operation #sb_x bt_temp = #min_x bt_temp',
      'scoreboard players operation #sb_y bt_temp = #min_y bt_temp',
      'scoreboard players operation #sb_z bt_temp = #min_z bt_temp',
      'scoreboard players set #pos_x bt_temp 0',
      'scoreboard players set #pos_y bt_temp 1',
      'scoreboard players set #pos_z bt_temp 0',

      '# Si min_y > -63, colocarlo 1 bloque debajo del suelo para no sobreescribir la construcción',
      'execute if score #min_y bt_temp matches -62.. run scoreboard players remove #sb_y bt_temp 1',
      '# Si está en el límite inferior de la bedrock (-63 o -64), colocarlo en min_y con posY=0',
      'execute if score #min_y bt_temp matches ..-63 run scoreboard players set #pos_y bt_temp 0',

      'execute store result storage builder_tables:surveyor sb_x int 1 run scoreboard players get #sb_x bt_temp',
      'execute store result storage builder_tables:surveyor sb_y int 1 run scoreboard players get #sb_y bt_temp',
      'execute store result storage builder_tables:surveyor sb_z int 1 run scoreboard players get #sb_z bt_temp',
      'execute store result storage builder_tables:surveyor pos_x int 1 run scoreboard players get #pos_x bt_temp',
      'execute store result storage builder_tables:surveyor pos_y int 1 run scoreboard players get #pos_y bt_temp',
      'execute store result storage builder_tables:surveyor pos_z int 1 run scoreboard players get #pos_z bt_temp',
      'execute store result storage builder_tables:surveyor size_x int 1 run scoreboard players get #size_x bt_temp',
      'execute store result storage builder_tables:surveyor size_y int 1 run scoreboard players get #size_y bt_temp',
      'execute store result storage builder_tables:surveyor size_z int 1 run scoreboard players get #size_z bt_temp',

      '# 5. Generar bloque de estructura en el mundo con la caja delimitadora exacta',
      'function builder_tables_generated:surveyor/place_structure_block with storage builder_tables:surveyor',

      '# 6. Modo creativo temporal para permitir guardar en el bloque de estructura',
      'gamemode creative @s',
      'playsound minecraft:block.beacon.activate player @s ~ ~ ~ 1 1.2',
      'tellraw @s ["",{"text":"======== ","color":"dark_gray"},{"text":"[ DELIMITACIÓN DE PLANO NBT ]","color":"gold","bold":true},{"text":" ========","color":"dark_gray"}]',
      'tellraw @s [{"text":"✔ ","color":"green","bold":true},{"text":"Caja delimitadora generada cubriendo exactamente tu obra.","color":"white"}]',
      'tellraw @s [{"text":"• Dimensiones: ","color":"gray"},{"score":{"name":"#size_x","objective":"bt_temp"},"color":"yellow"},{"text":" x ","color":"gray"},{"score":{"name":"#size_y","objective":"bt_temp"},"color":"yellow"},{"text":" x ","color":"gray"},{"score":{"name":"#size_z","objective":"bt_temp"},"color":"yellow"},{"text":" bloques.","color":"gray"}]',
      'tellraw @s [{"text":"• Coordenadas: ","color":"gray"},{"text":"[","color":"yellow"},{"score":{"name":"#min_x","objective":"bt_temp"},"color":"gold"},{"text":", ","color":"yellow"},{"score":{"name":"#min_y","objective":"bt_temp"},"color":"gold"},{"text":", ","color":"yellow"},{"score":{"name":"#min_z","objective":"bt_temp"},"color":"gold"},{"text":"] hasta [","color":"yellow"},{"score":{"name":"#max_x","objective":"bt_temp"},"color":"gold"},{"text":", ","color":"yellow"},{"score":{"name":"#max_y","objective":"bt_temp"},"color":"gold"},{"text":", ","color":"yellow"},{"score":{"name":"#max_z","objective":"bt_temp"},"color":"gold"},{"text":"]","color":"yellow"}]',
      'tellraw @s [{"text":"👉 Haz clic derecho en el Bloque de Estructura, escribe el nombre y pulsa ","color":"green"},{"text":"[GUARDAR]","color":"gold","bold":true},{"text":".","color":"green"}]',
      'tellraw @s [{"text":"📂 Se guardará en: ","color":"yellow"},{"text":".minecraft/saves/<tu_mundo>/generated/minecraft/structure/","color":"aqua"}]',
      'tellraw @s ["",{"text":"[ 🛡 GUARDADO LISTO: RETIRAR BLOQUE Y VOLVER A SURVIVAL ]","color":"green","bold":true,"clickEvent":{"action":"run_command","value":"/trigger bt_surv_rm_sb set 1"},"hoverEvent":{"action":"show_text","contents":"Quitar el bloque blanco y regresar automáticamente al modo supervivencia"}},{"text":"  "},{"text":"[ 🛡 Volver a Survival sin retirar ]","color":"dark_green","clickEvent":{"action":"run_command","value":"/gamemode survival"},"hoverEvent":{"action":"show_text","contents":"Volver a modo supervivencia manteniendo el bloque"}}] ',
      'tellraw @s {"text":"================================================","color":"dark_gray"}',
    ]),
  )

  // Diálogo de confirmación de demolición
  put(
    root + 'open_demo_confirm.mcfunction',
    mcfunction([
      'execute unless entity @e[type=minecraft:marker,tag=bt_surv_c1,limit=1] run tellraw @s {"text":"[Topografía] Marca el primer punto con la Cinta antes de demoler.","color":"red"}',
      'execute unless entity @e[type=minecraft:marker,tag=bt_surv_c1,limit=1] run return 0',
      'execute unless entity @e[type=minecraft:marker,tag=bt_surv_c2,limit=1] run tellraw @s {"text":"[Topografía] Marca el segundo punto con la Cinta antes de demoler.","color":"red"}',
      'execute unless entity @e[type=minecraft:marker,tag=bt_surv_c2,limit=1] run return 0',
      'dialog show @s builder_tables:surveyor_confirm_demo',
      'tellraw @s [{"text":"[Topografía] Haz clic aquí para: ","color":"gold"},{"text":"[ CONFIRMAR DEMOLICIÓN Y COBRAR 75% ]","color":"red","bold":true,"clickEvent":{"action":"run_command","value":"/trigger bt_surv_demo_exec set 1"},"hoverEvent":{"action":"show_text","contents":"Allana el terreno entre los 2 puntos y abona el 75% de los materiales"}}]',
    ]),
  )

  // Macro recursiva para demoler y vaciar capa por capa
  put(
    root + 'demo_layer.mcfunction',
    mcfunction([
      '$execute store result score #layer_blocks bt_temp run fill $(x1) $(cur_y) $(z1) $(x2) $(cur_y) $(z2) air',
      'scoreboard players operation #total_blocks bt_temp += #layer_blocks bt_temp',
      'scoreboard players add #cur_y bt_temp 1',
      'execute store result storage builder_tables:surveyor cur_y int 1 run scoreboard players get #cur_y bt_temp',
      'execute if score #cur_y bt_temp <= #max_y bt_temp run function builder_tables_generated:surveyor/demo_layer with storage builder_tables:surveyor',
    ]),
  )

  // Ejecución definitiva de Demolición y Venta (75% del valor de materiales)
  put(
    root + 'execute_demo.mcfunction',
    mcfunction([
      'execute unless entity @e[type=minecraft:marker,tag=bt_surv_c1,limit=1] run tellraw @s {"text":"[Topografía] Falta marcar el primer punto con la Cinta.","color":"red"}',
      'execute unless entity @e[type=minecraft:marker,tag=bt_surv_c1,limit=1] run return 0',
      'execute unless entity @e[type=minecraft:marker,tag=bt_surv_c2,limit=1] run tellraw @s {"text":"[Topografía] Falta marcar el segundo punto con la Cinta.","color":"red"}',
      'execute unless entity @e[type=minecraft:marker,tag=bt_surv_c2,limit=1] run return 0',

      '# 1. Obtener coordenadas de ambas esquinas marcadas más cercanas al jugador',
      'execute store result score #x1 bt_temp run data get entity @e[type=minecraft:marker,tag=bt_surv_c1,sort=nearest,limit=1] Pos[0]',
      'execute store result score #y1 bt_temp run data get entity @e[type=minecraft:marker,tag=bt_surv_c1,sort=nearest,limit=1] Pos[1]',
      'execute store result score #z1 bt_temp run data get entity @e[type=minecraft:marker,tag=bt_surv_c1,sort=nearest,limit=1] Pos[2]',
      'execute store result score #x2 bt_temp run data get entity @e[type=minecraft:marker,tag=bt_surv_c2,sort=nearest,limit=1] Pos[0]',
      'execute store result score #y2 bt_temp run data get entity @e[type=minecraft:marker,tag=bt_surv_c2,sort=nearest,limit=1] Pos[1]',
      'execute store result score #z2 bt_temp run data get entity @e[type=minecraft:marker,tag=bt_surv_c2,sort=nearest,limit=1] Pos[2]',

      '# 2. Determinar min_y y max_y',
      'scoreboard players operation #min_y bt_temp = #y1 bt_temp',
      'scoreboard players operation #max_y bt_temp = #y2 bt_temp',
      'execute if score #y1 bt_temp > #y2 bt_temp run scoreboard players operation #min_y bt_temp = #y2 bt_temp',
      'execute if score #y1 bt_temp > #y2 bt_temp run scoreboard players operation #max_y bt_temp = #y1 bt_temp',

      '# 3. Proteger Bedrock (límite inferior absoluto: Y = -63)',
      'execute if score #min_y bt_temp matches ..-63 run scoreboard players set #min_y bt_temp -63',
      'execute if score #max_y bt_temp < #min_y bt_temp run scoreboard players operation #max_y bt_temp = #min_y bt_temp',

      '# 4. Guardar coordenadas en storage para la macro de demolición',
      'execute store result storage builder_tables:surveyor x1 int 1 run scoreboard players get #x1 bt_temp',
      'execute store result storage builder_tables:surveyor z1 int 1 run scoreboard players get #z1 bt_temp',
      'execute store result storage builder_tables:surveyor x2 int 1 run scoreboard players get #x2 bt_temp',
      'execute store result storage builder_tables:surveyor z2 int 1 run scoreboard players get #z2 bt_temp',
      'scoreboard players operation #cur_y bt_temp = #min_y bt_temp',
      'execute store result storage builder_tables:surveyor cur_y int 1 run scoreboard players get #cur_y bt_temp',

      '# 5. Reiniciar contador de bloques y ejecutar vaciado capa por capa',
      'scoreboard players set #total_blocks bt_temp 0',
      'execute if score #cur_y bt_temp <= #max_y bt_temp run function builder_tables_generated:surveyor/demo_layer with storage builder_tables:surveyor',
      'scoreboard players operation @s bt_surv_blocks = #total_blocks bt_temp',

      '# 6. Cálculo de liquidación a 3/4 (75%) del valor en esmeraldas',
      '# En el catálogo survival: 10 bloques estándar equivalen a 1 esmeralda base',
      'scoreboard players set #c75 bt_temp 75',
      'scoreboard players set #c1000 bt_temp 1000',
      'scoreboard players operation @s bt_surv_payout = @s bt_surv_blocks',
      'scoreboard players operation @s bt_surv_payout *= #c75 bt_temp',
      'scoreboard players operation @s bt_surv_payout /= #c1000 bt_temp',
      'execute if score @s bt_surv_blocks matches 1.. if score @s bt_surv_payout matches 0 run scoreboard players set @s bt_surv_payout 1',

      '# 7. Pago de esmeraldas: hasta 64 físicas en inventario, el resto a Tarjeta Bancaria',
      'scoreboard players operation #cash_pay bt_temp = @s bt_surv_payout',
      'execute if score #cash_pay bt_temp matches 65.. run scoreboard players set #cash_pay bt_temp 64',
      'execute store result storage builder_tables_generated:payment runtime.change int 1 run scoreboard players get #cash_pay bt_temp',
      'execute if score #cash_pay bt_temp matches 1.. run function builder_tables_generated:payment/give_change with storage builder_tables_generated:payment runtime',

      'scoreboard players operation #bank_dep bt_temp = @s bt_surv_payout',
      'scoreboard players operation #bank_dep bt_temp -= #cash_pay bt_temp',
      'execute if score #bank_dep bt_temp matches 1.. run scoreboard players operation @s bt_bank += #bank_dep bt_temp',

      '# 8. Efectos sonoros y visuales de demolición',
      'playsound minecraft:entity.generic.explode player @s ~ ~ ~ 1 0.8',
      'playsound minecraft:block.anvil.destroy player @s ~ ~ ~ 1 1',
      'execute at @e[type=minecraft:marker,tag=bt_surv_c1,limit=1] run particle minecraft:explosion ~ ~ ~ 2 2 2 0 10',
      'execute at @e[type=minecraft:marker,tag=bt_surv_c2,limit=1] run particle minecraft:poof ~ ~ ~ 2 2 2 0 15',

      '# 9. Notificación detallada al jugador',
      'tellraw @s [{"text":"[Topografía] ","color":"gold","bold":true},{"text":"¡Área demolida y allanada exitosamente!","color":"green","bold":true}]',
      'execute if score @s bt_surv_blocks matches 0 run tellraw @s [{"text":"[Topografía] ","color":"aqua"},{"text":"El área seleccionada ya estaba vacía (0 bloques demolidos).","color":"gray"}]',
      'execute if score @s bt_surv_blocks matches 1.. run tellraw @s [{"text":"[Topografía] ","color":"gold"},{"text":"Bloques demolidos: ","color":"yellow"},{"score":{"name":"@s","objective":"bt_surv_blocks"},"color":"green","bold":true},{"text":" | Liquidación (75%): ","color":"yellow"},{"score":{"name":"@s","objective":"bt_surv_payout"},"color":"green","bold":true},{"text":" esmeraldas.","color":"gold"}]',
      'execute if score #bank_dep bt_temp matches 1.. run tellraw @s [{"text":"[Banco] ","color":"dark_aqua"},{"score":{"name":"#bank_dep","objective":"bt_temp"},"color":"gold"},{"text":" esmeraldas excedentes han sido guardadas en tu Tarjeta Bancaria.","color":"aqua"}]',

      '# 10. Limpiar esquinas',
      'function builder_tables_generated:surveyor/clear_selection',
    ]),
  )
}


