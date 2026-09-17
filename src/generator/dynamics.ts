import { rotatedFillBounds, splitStructureRegions, type Rotation } from './geometry'
import type { GeneratedStructure } from './nbt'
import type { TextFileWriter } from './preview'

const CONTROLLER_BLOCK = 'minecraft:note_block'
const CONFIRM_OBJECTIVES = ['bt_confirm1', 'bt_confirm2']
const OWNER_OBJECTIVES = ['bt_owner0', 'bt_owner1', 'bt_owner2', 'bt_owner3']
const OWNER_CHECK_TAG = 'bt_owner_check'
const PLAN_OWNER_MATCH_TAG = 'bt_plan_owner_match'
const UNDO_OWNER_MATCH_TAG = 'bt_undo_owner_match'
const NEW_UNDO_ANCHOR_TAG = 'bt_new_undo_anchor'
const OWNED_UNDO_ANCHOR_TAG = 'bt_owned_undo_anchor'
const PLAN_ANCHOR = '@e[type=minecraft:marker,tag=bt_plan_anchor,limit=1]'
const OWNED_PLAN_ANCHOR =
  '@e[type=minecraft:marker,tag=bt_plan_anchor,tag=' +
  PLAN_OWNER_MATCH_TAG +
  ',limit=1]'

function mcfunction(lines: string[]) {
  return lines.join('\n') + '\n'
}

function chat(text: string, color: string) {
  return JSON.stringify({ text, color })
}

function snbtString(value: string) {
  return JSON.stringify(value)
}

function ownerMatchConditions(source: string) {
  return OWNER_OBJECTIVES.map(
    (objective) => 'if score @s ' + objective + ' = ' + source + ' ' + objective,
  ).join(' ')
}

function copyOwnerScores(target: string) {
  return OWNER_OBJECTIVES.map(
    (objective) =>
      'scoreboard players operation ' + target + ' ' + objective + ' = @s ' + objective,
  )
}

function ownerMatch(target: string, matchTag: string) {
  return [
    'function builder_tables_generated:controller_block/owner/capture',
    'tag @a remove ' + OWNER_CHECK_TAG,
    'tag @s add ' + OWNER_CHECK_TAG,
    'tag ' + target + ' remove ' + matchTag,
    'execute as ' +
      target +
      ' ' +
      ownerMatchConditions('@a[tag=' + OWNER_CHECK_TAG + ',limit=1]') +
      ' run tag @s add ' +
      matchTag,
    'tag @s remove ' + OWNER_CHECK_TAG,
  ]
}

function planOwnerGuard(missing: string, notOwner: string) {
  return [
    'function builder_tables_generated:controller_block/owner/check_plan',
    'execute unless entity ' + PLAN_ANCHOR + ' run tellraw @s ' + chat(missing, 'red'),
    'execute unless entity ' + PLAN_ANCHOR + ' run return 0',
    'execute unless entity ' +
      OWNED_PLAN_ANCHOR +
      ' run tellraw @s ' +
      chat(notOwner, 'red'),
    'execute unless entity ' + OWNED_PLAN_ANCHOR + ' run return 0',
  ]
}

function build(structure: GeneratedStructure) {
  const id = structure.analysis.id

  return mcfunction([
    ...planOwnerGuard(
      'No hay un Bloque de Planificación activo.',
      'Este Bloque de Planificación pertenece a otro jugador.',
    ),
    'execute at ' +
      OWNED_PLAN_ANCHOR +
      ' unless block ~ ~ ~ ' +
      CONTROLLER_BLOCK +
      ' run tellraw @s ' +
      chat('El Bloque de Planificación ya no existe.', 'red'),
    'execute at ' +
      OWNED_PLAN_ANCHOR +
      ' if block ~ ~ ~ ' +
      CONTROLLER_BLOCK +
      ' run function builder_tables:dynamic/build_do_' +
      id,
  ])
}

function buildDo(structure: GeneratedStructure) {
  const { id, name } = structure.analysis
  const undoAnchors =
    '@e[type=minecraft:marker,tag=bt_anchor_' +
    id +
    ',tag=' +
    OWNED_UNDO_ANCHOR_TAG +
    ']'
  const matchedUndoAnchors =
    '@e[type=minecraft:marker,tag=bt_anchor_' +
    id +
    ',tag=' +
    OWNED_UNDO_ANCHOR_TAG +
    ',tag=' +
    UNDO_OWNER_MATCH_TAG +
    ']'
  const newUndoAnchor =
    '@e[type=minecraft:marker,tag=' + NEW_UNDO_ANCHOR_TAG + ',limit=1]'

  return mcfunction([
    ...planOwnerGuard(
      'No hay un Bloque de Planificación activo.',
      'Este Bloque de Planificación pertenece a otro jugador.',
    ),
    ...ownerMatch(undoAnchors, UNDO_OWNER_MATCH_TAG),
    'function builder_tables_generated:preview/clear',
    'kill ' + matchedUndoAnchors,
    'execute unless score @s bt_rot_state matches 0.. run scoreboard players set @s bt_rot_state 0',
    'execute if score @s bt_rot_state matches 0 run summon minecraft:marker ~ ~ ~ {Tags:["bt_anchor","' +
      OWNED_UNDO_ANCHOR_TAG +
      '","' +
      NEW_UNDO_ANCHOR_TAG +
      '","bt_anchor_' +
      id +
      '","bt_rot0"]}',
    'execute if score @s bt_rot_state matches 1 run summon minecraft:marker ~ ~ ~ {Tags:["bt_anchor","' +
      OWNED_UNDO_ANCHOR_TAG +
      '","' +
      NEW_UNDO_ANCHOR_TAG +
      '","bt_anchor_' +
      id +
      '","bt_rot1"]}',
    'execute if score @s bt_rot_state matches 2 run summon minecraft:marker ~ ~ ~ {Tags:["bt_anchor","' +
      OWNED_UNDO_ANCHOR_TAG +
      '","' +
      NEW_UNDO_ANCHOR_TAG +
      '","bt_anchor_' +
      id +
      '","bt_rot2"]}',
    'execute if score @s bt_rot_state matches 3 run summon minecraft:marker ~ ~ ~ {Tags:["bt_anchor","' +
      OWNED_UNDO_ANCHOR_TAG +
      '","' +
      NEW_UNDO_ANCHOR_TAG +
      '","bt_anchor_' +
      id +
      '","bt_rot3"]}',
    ...copyOwnerScores(newUndoAnchor),
    'tag ' + newUndoAnchor + ' remove ' + NEW_UNDO_ANCHOR_TAG,
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

function relative(value: number) {
  return value === 0 ? '~' : '~' + value
}

function clearRegion(rotation: Rotation, structure: GeneratedStructure) {
  return splitStructureRegions(structure.analysis.size).map((region) => {
    const { from, to } = rotatedFillBounds(region, rotation)

    return (
      'fill ' +
      from.map(relative).join(' ') +
      ' ' +
      to.map(relative).join(' ') +
      ' air replace'
    )
  })
}

function undo(structure: GeneratedStructure) {
  const { id, name, price } = structure.analysis
  const undoAnchors =
    '@e[type=minecraft:marker,tag=bt_anchor_' +
    id +
    ',tag=' +
    OWNED_UNDO_ANCHOR_TAG +
    ']'
  const matchedUndoAnchors =
    '@e[type=minecraft:marker,tag=bt_anchor_' +
    id +
    ',tag=' +
    OWNED_UNDO_ANCHOR_TAG +
    ',tag=' +
    UNDO_OWNER_MATCH_TAG +
    ']'
  const rotations: Rotation[] = [0, 1, 2, 3]
  const clears = rotations.flatMap((rotation) => {
    const anchor =
      '@e[type=minecraft:marker,tag=bt_anchor_' +
      id +
      ',tag=' +
      OWNED_UNDO_ANCHOR_TAG +
      ',tag=' +
      UNDO_OWNER_MATCH_TAG +
      ',tag=bt_rot' +
      rotation +
      ']'
    const atAnchor =
      '@e[type=minecraft:marker,tag=bt_anchor_' +
      id +
      ',tag=' +
      OWNED_UNDO_ANCHOR_TAG +
      ',tag=' +
      UNDO_OWNER_MATCH_TAG +
      ',tag=bt_rot' +
      rotation +
      ',limit=1]'

    return clearRegion(rotation, structure).map(
      (fill) =>
        'execute if entity ' + anchor + ' at ' + atAnchor + ' run ' + fill,
    )
  })

  return mcfunction([
    ...ownerMatch(undoAnchors, UNDO_OWNER_MATCH_TAG),
    'execute unless entity ' +
      matchedUndoAnchors +
      ' run tellraw @s ' +
      chat(
        'No hay una construcción reciente de este plano que puedas deshacer.',
        'red',
      ),
    'execute unless entity ' + matchedUndoAnchors + ' run return 0',
    ...clears,
    'give @s minecraft:emerald ' +
      price,
    'tellraw @a ' +
      chat(
        "Estructura '" +
          name +
          "' retirada y " +
          price +
          ' esmeraldas devueltas.',
        'yellow',
      ),
    'kill ' + matchedUndoAnchors,
  ])
}

function pay(structure: GeneratedStructure) {
  const { id, price } = structure.analysis

  return mcfunction([
    ...planOwnerGuard(
      'No hay un Bloque de Planificación activo. No se cobró nada.',
      'Este Bloque de Planificación pertenece a otro jugador. No se cobró nada.',
    ),
    'scoreboard players set #nine bt_price 9',
    'scoreboard players set @s bt_price ' + price,
    'execute store result score @s bt_emeralds run clear @s minecraft:emerald 0',
    'execute store result score @s bt_emerald_blocks run clear @s minecraft:emerald_block 0',
    'scoreboard players operation @s bt_balance = @s bt_emeralds',
    'scoreboard players operation @s bt_remaining = @s bt_emerald_blocks',
    'scoreboard players operation @s bt_remaining *= #nine bt_price',
    'scoreboard players operation @s bt_balance += @s bt_remaining',
    'execute at ' +
      OWNED_PLAN_ANCHOR +
      ' unless block ~ ~ ~ ' +
      CONTROLLER_BLOCK +
      ' run tellraw @s ' +
      chat(
        'El Bloque de Planificación ya no existe. No se cobró nada.',
        'red',
      ),
    'execute at ' +
      OWNED_PLAN_ANCHOR +
      ' if block ~ ~ ~ ' +
      CONTROLLER_BLOCK +
      ' if score @s bt_balance matches ..' +
      (price - 1) +
      ' run tellraw @s ' +
      chat(
        'No tienes suficientes esmeraldas. Precio: ' + price + '.',
        'red',
      ),
    'execute at ' +
      OWNED_PLAN_ANCHOR +
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

  return mcfunction([
    ...planOwnerGuard(
      'No hay un Bloque de Planificación activo. No se cobró nada.',
      'Este Bloque de Planificación pertenece a otro jugador. No se cobró nada.',
    ),
    '# Cobro compacto: usa esmeraldas sueltas primero y bloques sólo para el resto.',
    'execute if score @s bt_emeralds >= @s bt_price run clear @s minecraft:emerald ' +
      price,
    'execute if score @s bt_emeralds >= @s bt_price run function builder_tables:dynamic/build_' +
      id,
    'execute unless score @s bt_emeralds >= @s bt_price run function builder_tables:dynamic/charge_blocks_' +
      id,
  ])
}

function chargeBlocks(structure: GeneratedStructure) {
  const { id } = structure.analysis

  return mcfunction([
    ...planOwnerGuard(
      'No hay un Bloque de Planificación activo. No se cobró nada.',
      'Este Bloque de Planificación pertenece a otro jugador. No se cobró nada.',
    ),
    'scoreboard players operation @s bt_remaining = @s bt_price',
    'scoreboard players operation @s bt_remaining -= @s bt_emeralds',
    'clear @s minecraft:emerald',
    'scoreboard players operation @s bt_blocks_to_pay = @s bt_remaining',
    'scoreboard players add @s bt_blocks_to_pay 8',
    'scoreboard players operation @s bt_blocks_to_pay /= #nine bt_price',
    'scoreboard players operation @s bt_change = @s bt_blocks_to_pay',
    'scoreboard players operation @s bt_change *= #nine bt_price',
    'scoreboard players operation @s bt_change -= @s bt_remaining',
    'execute store result storage builder_tables_generated:payment runtime.blocks int 1 run scoreboard players get @s bt_blocks_to_pay',
    'execute store result storage builder_tables_generated:payment runtime.change int 1 run scoreboard players get @s bt_change',
    'function builder_tables_generated:payment/consume_blocks with storage builder_tables_generated:payment runtime',
    'execute if score @s bt_change matches 1.. run function builder_tables_generated:payment/give_change with storage builder_tables_generated:payment runtime',
    'function builder_tables:dynamic/build_' + id,
  ])
}

function select(structure: GeneratedStructure, plan: number) {
  return mcfunction([
    ...planOwnerGuard(
      'No hay un Bloque de Planificación activo.',
      'Este Bloque de Planificación pertenece a otro jugador.',
    ),
    'scoreboard players set @s bt_active ' + plan,
    'execute at ' +
      OWNED_PLAN_ANCHOR +
      ' run function builder_tables_generated:preview/start/' +
      structure.analysis.id,
  ])
}

function confirmOne(structure: GeneratedStructure, plan: number) {
  return mcfunction([
    ...planOwnerGuard(
      'No hay un Bloque de Planificación activo.',
      'Este Bloque de Planificación pertenece a otro jugador.',
    ),
    'execute if score @s bt_active matches ' +
      plan +
      ' run dialog show @s builder_tables:confirm_1_' +
      structure.analysis.id,
  ])
}

function confirmTwo(structure: GeneratedStructure, plan: number) {
  return mcfunction([
    ...planOwnerGuard(
      'No hay un Bloque de Planificación activo.',
      'Este Bloque de Planificación pertenece a otro jugador.',
    ),
    'execute if score @s bt_active matches ' +
      plan +
      ' run dialog show @s builder_tables:confirm_2_' +
      structure.analysis.id,
  ])
}

function addPaymentMacroFiles(put: TextFileWriter) {
  put(
    'data/builder_tables_generated/function/payment/consume_blocks.mcfunction',
    mcfunction(['$clear @s minecraft:emerald_block $(blocks)']),
  )
  put(
    'data/builder_tables_generated/function/payment/give_change.mcfunction',
    mcfunction(['$give @s minecraft:emerald $(change)']),
  )
}
function addDynamicFiles(put: TextFileWriter, structures: GeneratedStructure[]) {
  const triggers: string[] = []
  const recipes: string[] = []

  addPaymentMacroFiles(put)

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
    put(
      'data/builder_tables/function/dynamic/charge_blocks_' +
        analysis.id +
        '.mcfunction',
      chargeBlocks(structure),
    )
    put(
      'data/builder_tables/function/dynamic/select_' + analysis.id + '.mcfunction',
      select(structure, plan),
    )
    put(
      'data/builder_tables/function/dynamic/confirm_1_' +
        analysis.id +
        '.mcfunction',
      confirmOne(structure, plan),
    )
    put(
      'data/builder_tables/function/dynamic/confirm_2_' +
        analysis.id +
        '.mcfunction',
      confirmTwo(structure, plan),
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
  const opens = [
    ...planOwnerGuard(
      'Coloca un Bloque de Planificación y haz clic en él.',
      'Este Bloque de Planificación pertenece a otro jugador.',
    ),
    'execute if score @s bt_active matches 0 run dialog show @s builder_tables:catalogo',
  ]

  structures.forEach((structure, index) => {
    const plan = index + 1
    const id = structure.analysis.id

    opens.push(
      'execute if score @s bt_active matches ' +
        plan +
        ' run dialog show @s builder_tables:plan_' +
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
    ...structures.map(
      (structure, index) =>
        'execute as @a[scores={bt_select=' +
        (index + 1) +
        '}] run function builder_tables:dynamic/select_' +
        structure.analysis.id,
    ),
    'scoreboard players reset @a[scores={bt_select=1..}] bt_select',
    ...structures.map(
      (structure, index) =>
        'execute as @a[scores={bt_confirm1=' +
        (index + 1) +
        '}] run function builder_tables:dynamic/confirm_1_' +
        structure.analysis.id,
    ),
    'scoreboard players reset @a[scores={bt_confirm1=1..}] bt_confirm1',
    ...structures.map(
      (structure, index) =>
        'execute as @a[scores={bt_confirm2=' +
        (index + 1) +
        '}] run function builder_tables:dynamic/confirm_2_' +
        structure.analysis.id,
    ),
    'scoreboard players reset @a[scores={bt_confirm2=1..}] bt_confirm2',
    'execute as @a[scores={bt_exit=1..}] run function builder_tables:controller/exit',
    'scoreboard players reset @a[scores={bt_exit=1..}] bt_exit',
    'execute as @a[scores={bt_book=1..}] run function builder_tables_generated:controller_block/give_recipe',
    'scoreboard players reset @a[scores={bt_book=1..}] bt_book',
    'function builder_tables:dynamic_triggers',
    'function builder_tables:rotar',
    'function builder_tables_generated:preview/tick',
  )

  put('data/builder_tables/function/tick.mcfunction', mcfunction(tick))
  put(
    'data/builder_tables/function/rotar.mcfunction',
    mcfunction(
      [
        'execute as @a[scores={bt_rot=1..}] run function builder_tables_generated:controller_block/rotate',
        'scoreboard players reset @a[scores={bt_rot=1..}] bt_rot',
      ],
    ),
  )
  put(
    'data/builder_tables/function/controller/open.mcfunction',
    mcfunction(opens),
  )
  put(
    'data/builder_tables/function/controller/exit.mcfunction',
    mcfunction([
      ...planOwnerGuard(
        'No hay un Bloque de Planificación activo.',
        'Este Bloque de Planificación pertenece a otro jugador.',
      ),
      'function builder_tables_generated:controller_block/clear_preview',
    ]),
  )
  put(
    'data/builder_tables_generated/function/controller_block/give_recipe.mcfunction',
    mcfunction([
      ...planOwnerGuard(
        'No hay un Bloque de Planificación activo.',
        'Este Bloque de Planificación pertenece a otro jugador.',
      ),
      'function builder_tables:give_recipe',
    ]),
  )
  put(
    'data/builder_tables_generated/function/controller_block/rotate.mcfunction',
    mcfunction([
      ...planOwnerGuard(
        'No hay un Bloque de Planificación activo.',
        'Este Bloque de Planificación pertenece a otro jugador.',
      ),
      'scoreboard players add @s bt_rot_state 1',
      'execute if score @s bt_rot_state matches 4.. run scoreboard players set @s bt_rot_state 0',
      'execute if score @s bt_rot_state matches 0 run title @s actionbar {"text":"Rotacion: 0 grados","color":"aqua"}',
      'execute if score @s bt_rot_state matches 1 run title @s actionbar {"text":"Rotacion: 90 grados","color":"aqua"}',
      'execute if score @s bt_rot_state matches 2 run title @s actionbar {"text":"Rotacion: 180 grados","color":"aqua"}',
      'execute if score @s bt_rot_state matches 3 run title @s actionbar {"text":"Rotacion: 270 grados","color":"aqua"}',
      'execute if score @s bt_active matches 1.. run function builder_tables_generated:controller_block/refresh',
    ]),
  )
}

export function addDynamicAssets(
  put: TextFileWriter,
  structures: GeneratedStructure[],
) {
  addDynamicFiles(put, structures)
  addControllerFunctions(put, structures)
}
