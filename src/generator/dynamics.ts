import type { GeneratedStructure } from './nbt'
import type { TextFileWriter } from './preview'

const CONTROLLER_BLOCK = 'minecraft:note_block'
const CONFIRM_OBJECTIVES = ['bt_confirm1', 'bt_confirm2']

function mcfunction(lines: string[]) {
  return lines.join('\n') + '\n'
}

function chat(text: string, color: string) {
  return JSON.stringify({ text, color })
}

function snbtString(value: string) {
  return JSON.stringify(value)
}

function build(structure: GeneratedStructure) {
  const id = structure.analysis.id
  const anchor = '@e[tag=bt_plan_anchor,limit=1]'

  return mcfunction([
    'execute unless entity ' +
      anchor +
      ' run tellraw @s ' +
      chat('No hay un Bloque de Planificación activo.', 'red'),
    'execute if entity ' +
      anchor +
      ' at ' +
      anchor +
      ' unless block ~ ~ ~ ' +
      CONTROLLER_BLOCK +
      ' run tellraw @s ' +
      chat('El Bloque de Planificación ya no existe.', 'red'),
    'execute if entity ' +
      anchor +
      ' at ' +
      anchor +
      ' if block ~ ~ ~ ' +
      CONTROLLER_BLOCK +
      ' run function builder_tables:dynamic/build_do_' +
      id,
  ])
}

function buildDo(structure: GeneratedStructure) {
  const { id, name } = structure.analysis

  return mcfunction([
    'function builder_tables_generated:preview/clear',
    'kill @e[tag=bt_anchor_' + id + ']',
    'execute unless score @s bt_rot_state matches 0.. run scoreboard players set @s bt_rot_state 0',
    'execute if score @s bt_rot_state matches 0 run summon minecraft:marker ~ ~ ~ {Tags:["bt_anchor","bt_anchor_' +
      id +
      '","bt_rot0"]}',
    'execute if score @s bt_rot_state matches 1 run summon minecraft:marker ~ ~ ~ {Tags:["bt_anchor","bt_anchor_' +
      id +
      '","bt_rot1"]}',
    'execute if score @s bt_rot_state matches 2 run summon minecraft:marker ~ ~ ~ {Tags:["bt_anchor","bt_anchor_' +
      id +
      '","bt_rot2"]}',
    'execute if score @s bt_rot_state matches 3 run summon minecraft:marker ~ ~ ~ {Tags:["bt_anchor","bt_anchor_' +
      id +
      '","bt_rot3"]}',
    '# La plantilla no contiene aire: sólo se elimina explícitamente el bloque-controlador.',
    'setblock ~ ~ ~ air',
    'execute if score @s bt_rot_state matches 0 run place template builder_tables:' +
      id +
      ' ~ ~ ~ none',
    'execute if score @s bt_rot_state matches 1 run place template builder_tables:' +
      id +
      ' ~ ~ ~ clockwise_90',
    'execute if score @s bt_rot_state matches 2 run place template builder_tables:' +
      id +
      ' ~ ~ ~ 180',
    'execute if score @s bt_rot_state matches 3 run place template builder_tables:' +
      id +
      ' ~ ~ ~ counterclockwise_90',
    'particle minecraft:cloud ~ ~1 ~ 1 1 1 0.1 100',
    'playsound minecraft:block.anvil.use player @a ~ ~ ~',
    'tellraw @s ' + chat("Estructura '" + name + "' construida con exito.", 'green'),
    'function builder_tables_generated:controller_block/remove_anchor',
  ])
}

function undo(structure: GeneratedStructure) {
  const { id, name, price, size } = structure.analysis
  const [width, height, depth] = size
  const a = width - 1
  const b = height - 1
  const c = depth - 1

  return mcfunction([
    'function builder_tables_generated:controller_block/clear_preview',
    'execute unless entity @e[tag=bt_anchor_' +
      id +
      '] run tellraw @s ' +
      chat(
        'No hay una construccion reciente de este plano para deshacer.',
        'red',
      ),
    'execute if entity @e[tag=bt_anchor_' +
      id +
      ',tag=bt_rot0] at @e[tag=bt_anchor_' +
      id +
      ',tag=bt_rot0,limit=1] run fill ~ ~ ~ ~' +
      a +
      ' ~' +
      b +
      ' ~' +
      c +
      ' air replace',
    'execute if entity @e[tag=bt_anchor_' +
      id +
      ',tag=bt_rot1] at @e[tag=bt_anchor_' +
      id +
      ',tag=bt_rot1,limit=1] run fill ~-' +
      c +
      ' ~ ~ ~ ~' +
      b +
      ' ~' +
      a +
      ' air replace',
    'execute if entity @e[tag=bt_anchor_' +
      id +
      ',tag=bt_rot2] at @e[tag=bt_anchor_' +
      id +
      ',tag=bt_rot2,limit=1] run fill ~-' +
      a +
      ' ~ ~-' +
      c +
      ' ~ ~' +
      b +
      ' ~ air replace',
    'execute if entity @e[tag=bt_anchor_' +
      id +
      ',tag=bt_rot3] at @e[tag=bt_anchor_' +
      id +
      ',tag=bt_rot3,limit=1] run fill ~ ~ ~-' +
      a +
      ' ~' +
      c +
      ' ~' +
      b +
      ' ~ air replace',
    'execute if entity @e[tag=bt_anchor_' +
      id +
      '] run give @s minecraft:emerald ' +
      price,
    'execute if entity @e[tag=bt_anchor_' +
      id +
      '] run tellraw @a ' +
      chat(
        "Estructura '" +
          name +
          "' retirada y " +
          price +
          ' esmeraldas devueltas.',
        'yellow',
      ),
    'kill @e[tag=bt_anchor_' + id + ']',
  ])
}

function pay(structure: GeneratedStructure) {
  const { id, price } = structure.analysis
  const anchor = '@e[tag=bt_plan_anchor,limit=1]'

  return mcfunction([
    'scoreboard players set @s bt_price ' + price,
    'execute store result score @s bt_emeralds run clear @s minecraft:emerald 0',
    'execute store result score @s bt_emerald_blocks run clear @s minecraft:emerald_block 0',
    'scoreboard players operation @s bt_balance = @s bt_emeralds',
    'scoreboard players operation @s bt_remaining = @s bt_emerald_blocks',
    'scoreboard players operation @s bt_remaining *= #nine bt_price',
    'scoreboard players operation @s bt_balance += @s bt_remaining',
    'execute unless entity ' +
      anchor +
      ' run tellraw @s ' +
      chat('No hay un Bloque de Planificación activo. No se cobró nada.', 'red'),
    'execute if entity ' +
      anchor +
      ' at ' +
      anchor +
      ' unless block ~ ~ ~ ' +
      CONTROLLER_BLOCK +
      ' run tellraw @s ' +
      chat(
        'El Bloque de Planificación ya no existe. No se cobró nada.',
        'red',
      ),
    'execute if entity ' +
      anchor +
      ' at ' +
      anchor +
      ' if block ~ ~ ~ ' +
      CONTROLLER_BLOCK +
      ' if score @s bt_balance matches ..' +
      (price - 1) +
      ' run tellraw @s ' +
      chat(
        'No tienes suficientes esmeraldas. Precio: ' + price + '.',
        'red',
      ),
    'execute if entity ' +
      anchor +
      ' at ' +
      anchor +
      ' if block ~ ~ ~ ' +
      CONTROLLER_BLOCK +
      ' if score @s bt_balance matches ' +
      price +
      '.. run function builder_tables:dynamic/charge_' +
      id,
  ])
}

function charge(structure: GeneratedStructure) {
  const { id, price } = structure.analysis
  const lines = [
    'execute if score @s bt_emeralds matches ' +
      price +
      '.. run clear @s minecraft:emerald ' +
      price,
    'execute if score @s bt_emeralds matches ' +
      price +
      '.. run function builder_tables:dynamic/build_' +
      id,
  ]

  for (let emeralds = 0; emeralds < price; emeralds += 1) {
    const blocks = Math.ceil((price - emeralds) / 9)
    const change = emeralds + blocks * 9 - price

    lines.push(
      'execute if score @s bt_emeralds matches ' +
        emeralds +
        ' run clear @s minecraft:emerald ' +
        emeralds,
      'execute if score @s bt_emeralds matches ' +
        emeralds +
        ' run clear @s minecraft:emerald_block ' +
        blocks,
    )

    if (change) {
      lines.push(
        'execute if score @s bt_emeralds matches ' +
          emeralds +
          ' run give @s minecraft:emerald ' +
          change,
      )
    }

    lines.push(
      'execute if score @s bt_emeralds matches ' +
        emeralds +
        ' run function builder_tables:dynamic/build_' +
        id,
    )
  }

  return mcfunction(lines)
}

function addDynamicFiles(put: TextFileWriter, structures: GeneratedStructure[]) {
  const triggers: string[] = []
  const recipes: string[] = []

  structures.forEach((structure, index) => {
    const plan = index + 1
    const { analysis } = structure

    put(
      'data/builder_tables/function/dynamic/build_' + analysis.id + '.mcfunction',
      build(structure),
    )
    put(
      'data/builder_tables/function/dynamic/build_do_' +
        analysis.id +
        '.mcfunction',
      buildDo(structure),
    )
    put(
      'data/builder_tables/function/dynamic/undo_' + analysis.id + '.mcfunction',
      undo(structure),
    )
    put(
      'data/builder_tables/function/dynamic/pay_' + analysis.id + '.mcfunction',
      pay(structure),
    )
    put(
      'data/builder_tables/function/dynamic/charge_' +
        analysis.id +
        '.mcfunction',
      charge(structure),
    )

    triggers.push(
      'execute as @a[scores={bt_trigger=' +
        plan +
        '}] run function builder_tables:dynamic/pay_' +
        analysis.id,
      'execute as @a[scores={bt_undo=' +
        plan +
        '}] run function builder_tables:dynamic/undo_' +
        analysis.id,
    )

    const materials = analysis.materials
      .map((material) => material.name + ' x ' + material.count)
      .join('\n')
    const book = (
      'written_book_content={title:' +
      snbtString('Receta ' + analysis.id) +
      ',author:"Builder Tables",pages:[{text:' +
      snbtString(
        analysis.name +
          '\n\n' +
          materials +
          '\n\nPrecio: ' +
          analysis.price +
          ' esmeraldas',
      ) +
      '}]}'
    )

    recipes.push(
      'execute if score @s bt_book matches ' +
        plan +
        ' run give @s minecraft:written_book[' +
        book +
        ']',
    )
  })

  put(
    'data/builder_tables/function/dynamic_triggers.mcfunction',
    mcfunction(
      triggers.concat([
        'scoreboard players reset @a[scores={bt_trigger=1..}] bt_trigger',
        'scoreboard players reset @a[scores={bt_undo=1..}] bt_undo',
      ]),
    ),
  )
  put(
    'data/builder_tables/function/give_recipe.mcfunction',
    mcfunction(recipes),
  )
}

function addControllerFunctions(
  put: TextFileWriter,
  structures: GeneratedStructure[],
) {
  const anchor = '@e[tag=bt_plan_anchor,limit=1]'
  const selects: string[] = []
  const confirmsOne: string[] = []
  const confirmsTwo: string[] = []
  const opens = [
    'execute unless entity ' +
      anchor +
      ' run tellraw @s ' +
      chat('Coloca un Bloque de Planificación y haz clic en él.', 'red'),
    'execute if entity ' +
      anchor +
      ' if score @s bt_active matches 0 run dialog show @s builder_tables:catalogo',
  ]
  const rotates = [
    'execute as @a[scores={bt_rot=1..}] run scoreboard players add @s bt_rot_state 1',
    'execute as @a[scores={bt_rot=1..}] if score @s bt_rot_state matches 4.. run scoreboard players set @s bt_rot_state 0',
    'execute as @a[scores={bt_rot=1..}] if score @s bt_rot_state matches 0 run title @s actionbar {"text":"Rotacion: 0 grados","color":"aqua"}',
    'execute as @a[scores={bt_rot=1..}] if score @s bt_rot_state matches 1 run title @s actionbar {"text":"Rotacion: 90 grados","color":"aqua"}',
    'execute as @a[scores={bt_rot=1..}] if score @s bt_rot_state matches 2 run title @s actionbar {"text":"Rotacion: 180 grados","color":"aqua"}',
    'execute as @a[scores={bt_rot=1..}] if score @s bt_rot_state matches 3 run title @s actionbar {"text":"Rotacion: 270 grados","color":"aqua"}',
    'execute as @a[scores={bt_rot=1..,bt_active=1..}] if entity ' +
      anchor +
      ' run function builder_tables_generated:controller_block/refresh',
  ]

  structures.forEach((structure, index) => {
    const plan = index + 1
    const id = structure.analysis.id

    selects.push(
      'execute as @a[scores={bt_select=' +
        plan +
        '}] unless entity ' +
        anchor +
        ' run tellraw @s ' +
        chat('No hay un Bloque de Planificación activo.', 'red'),
      'execute as @a[scores={bt_select=' +
        plan +
        '}] if entity ' +
        anchor +
        ' run scoreboard players set @s bt_active ' +
        plan,
      'execute as @a[scores={bt_select=' +
        plan +
        '}] if entity ' +
        anchor +
        ' at ' +
        anchor +
        ' run function builder_tables_generated:preview/start/' +
        id,
    )
    opens.push(
      'execute if entity ' +
        anchor +
        ' if score @s bt_active matches ' +
        plan +
        ' run dialog show @s builder_tables:plan_' +
        id,
    )
    confirmsOne.push(
      'execute as @a[scores={bt_confirm1=' +
        plan +
        '}] if entity ' +
        anchor +
        ' if score @s bt_active matches ' +
        plan +
        ' run dialog show @s builder_tables:confirm_1_' +
        id,
    )
    confirmsTwo.push(
      'execute as @a[scores={bt_confirm2=' +
        plan +
        '}] if entity ' +
        anchor +
        ' if score @s bt_active matches ' +
        plan +
        ' run dialog show @s builder_tables:confirm_2_' +
        id,
    )
  })

  const tick = [
    'function builder_tables_generated:controller_block/validate',
    'execute as @a unless score @s bt_rot_state matches 0.. run scoreboard players set @s bt_rot_state 0',
    'scoreboard players enable @a bt_trigger',
    'scoreboard players enable @a bt_undo',
    'scoreboard players enable @a bt_rot',
    'scoreboard players enable @a bt_book',
    'scoreboard players enable @a bt_select',
    'scoreboard players enable @a bt_exit',
  ]
  CONFIRM_OBJECTIVES.forEach((objective) => {
    tick.push('scoreboard players enable @a ' + objective)
  })
  tick.push(
    ...selects,
    'scoreboard players reset @a[scores={bt_select=1..}] bt_select',
    ...confirmsOne,
    'scoreboard players reset @a[scores={bt_confirm1=1..}] bt_confirm1',
    ...confirmsTwo,
    'scoreboard players reset @a[scores={bt_confirm2=1..}] bt_confirm2',
    'execute as @a[scores={bt_exit=1..}] run function builder_tables:controller/exit',
    'scoreboard players reset @a[scores={bt_exit=1..}] bt_exit',
    'execute as @a[scores={bt_book=1}] run function builder_tables:give_recipe',
    'scoreboard players reset @a[scores={bt_book=1..}] bt_book',
    'function builder_tables:dynamic_triggers',
    'function builder_tables:rotar',
    'function builder_tables_generated:preview/tick',
  )

  put('data/builder_tables/function/tick.mcfunction', mcfunction(tick))
  put(
    'data/builder_tables/function/rotar.mcfunction',
    mcfunction(
      rotates.concat([
        'scoreboard players reset @a[scores={bt_rot=1..}] bt_rot',
      ]),
    ),
  )
  put(
    'data/builder_tables/function/controller/open.mcfunction',
    mcfunction(opens),
  )
  put(
    'data/builder_tables/function/controller/exit.mcfunction',
    'function builder_tables_generated:controller_block/clear_preview\n',
  )
}

export function addDynamicAssets(
  put: TextFileWriter,
  structures: GeneratedStructure[],
) {
  addDynamicFiles(put, structures)
  addControllerFunctions(put, structures)
}
