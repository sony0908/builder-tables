import type { GeneratedStructure } from './nbt'
import type { TextFileWriter } from './preview'

export type JsonFileWriter = (path: string, value: unknown) => void

const CONTROLLER_BLOCK = 'minecraft:note_block'
const CONFIRM_OBJECTIVES = ['bt_confirm1', 'bt_confirm2']

function mcfunction(lines: string[]) {
  return lines.join('\n') + '\n'
}

function action(label: string, command: string, color?: string) {
  const text: Record<string, string> = { text: label }
  if (color) text.color = color

  return {
    label: text,
    action: { type: 'run_command', command },
  }
}

function controllerComponents() {
  return {
    'minecraft:max_stack_size': 1,
    'minecraft:custom_data': { builder_tables_controller: true },
    'minecraft:item_name': {
      text: 'Bloque de Planificación',
      color: 'gold',
      italic: false,
    },
    'minecraft:lore': [
      {
        text: 'Colócalo y haz clic para abrir los planos',
        color: 'gray',
        italic: false,
      },
      {
        text: 'El sonido confirma el clic',
        color: 'dark_gray',
        italic: false,
      },
    ],
  }
}

function controllerItemSnbt() {
  return (
    'minecraft:note_block[max_stack_size=1,custom_data={builder_tables_controller:1b},' +
    'item_name={text:"Bloque de Planificación",color:"gold",italic:false},' +
    'lore=[{text:"Colócalo y haz clic para abrir los planos",color:"gray",italic:false},' +
    '{text:"El sonido confirma el clic",color:"dark_gray",italic:false}]]'
  )
}

function addDialogs(
  putJson: JsonFileWriter,
  structures: GeneratedStructure[],
) {
  putJson('data/builder_tables/dialog/catalogo.json', {
    type: 'minecraft:multi_action',
    title: { text: 'Planos de construccion' },
    body: {
      type: 'minecraft:plain_message',
      contents: { text: 'Selecciona una construccion.' },
    },
    columns: 2,
    actions: structures.map((structure, index) =>
      action(
        structure.analysis.name,
        'trigger bt_select set ' + (index + 1),
      ),
    ).map((entry, index) => ({
      ...entry,
      tooltip: {
        text:
          structures[index].analysis.size.join(' x ') +
          ' | ' +
          structures[index].analysis.count +
          ' bloques | ' +
          structures[index].analysis.price +
          ' esmeraldas',
      },
    })),
    exit_action: { label: { text: 'Salir' } },
  })

  structures.forEach((structure, index) => {
    const plan = index + 1
    const { analysis } = structure

    putJson('data/builder_tables/dialog/plan_' + analysis.id + '.json', {
      type: 'minecraft:multi_action',
      title: { text: analysis.name },
      body: {
        type: 'minecraft:plain_message',
        contents: {
          text:
            analysis.size.join(' x ') +
            ' bloques\n' +
            analysis.count +
            ' bloques - Precio: ' +
            analysis.price +
            ' esmeraldas\n\nEl Bloque de Planificación es el origen fijo.',
        },
      },
      columns: 2,
      actions: [
        action(
          'Generar receta en libro',
          'trigger bt_book set ' + plan,
          'aqua',
        ),
        action(
          'Construir - ' + analysis.price + ' esmeraldas',
          'trigger bt_confirm1 set ' + plan,
          'green',
        ),
        action('Rotar 90 grados', 'trigger bt_rot add 1', 'yellow'),
        action('UNDO', 'trigger bt_undo set ' + plan, 'red'),
      ],
      exit_action: {
        label: { text: 'Salir' },
        action: { type: 'run_command', command: 'trigger bt_exit set 1' },
      },
    })

    putJson(
      'data/builder_tables/dialog/confirm_1_' + analysis.id + '.json',
      {
        type: 'minecraft:multi_action',
        title: { text: 'Confirmar construccion (1/2)', color: 'gold' },
        body: {
          type: 'minecraft:plain_message',
          contents: {
            text:
              'Construiras ' +
              analysis.name +
              ' desde el Bloque de Planificación.\nPrecio: ' +
              analysis.price +
              ' esmeraldas.\n\nLa preview y el bloque se eliminaran solo tras la segunda confirmacion.',
          },
        },
        columns: 1,
        actions: [
          action(
            'Continuar',
            'trigger bt_confirm2 set ' + plan,
            'yellow',
          ),
        ],
        exit_action: { label: { text: 'Cancelar' } },
      },
    )

    putJson(
      'data/builder_tables/dialog/confirm_2_' + analysis.id + '.json',
      {
        type: 'minecraft:multi_action',
        title: { text: 'Confirmar construccion (2/2)', color: 'red' },
        body: {
          type: 'minecraft:plain_message',
          contents: {
            text:
              'Accion definitiva: se cobraran ' +
              analysis.price +
              ' esmeraldas, se consumira el Bloque de Planificación y se colocara ' +
              analysis.name +
              '.',
          },
        },
        columns: 1,
        actions: [
          action(
            'Construir definitivamente',
            'trigger bt_trigger set ' + plan,
            'green',
          ),
        ],
        exit_action: { label: { text: 'Cancelar' } },
      },
    )
  })
}

function raycast(foundFunction: string) {
  const lines = ['tag @s remove bt_ctrl_ray_hit']

  for (let step = 1; step <= 60; step += 1) {
    lines.push(
      'execute unless entity @s[tag=bt_ctrl_ray_hit] anchored eyes positioned ^ ^ ^' +
        (step / 10).toFixed(1) +
        ' align xyz if block ~ ~ ~ ' +
        CONTROLLER_BLOCK +
        ' run function ' +
        foundFunction,
    )
  }

  lines.push('tag @s remove bt_ctrl_ray_hit')
  return mcfunction(lines)
}

function addControllerBlock(
  put: TextFileWriter,
  putJson: JsonFileWriter,
  structures: GeneratedStructure[],
) {
  const root = 'data/builder_tables_generated/function/controller_block/'
  const anchor = '@e[tag=bt_plan_anchor,limit=1]'

  put(
    root + 'init.mcfunction',
    mcfunction(
      CONFIRM_OBJECTIVES.map(
        (objective) => 'scoreboard objectives remove ' + objective,
      )
        .concat(
          CONFIRM_OBJECTIVES.map(
            (objective) => 'scoreboard objectives add ' + objective + ' trigger',
          ),
        )
        .concat([
          'advancement revoke @a only builder_tables_generated:placed_controller',
          'advancement revoke @a only builder_tables_generated:used_controller',
          'function builder_tables_generated:controller_block/remove_anchor',
        ]),
    ),
  )
  put(
    root + 'clear_preview.mcfunction',
    mcfunction([
      'function builder_tables_generated:preview/clear',
      'scoreboard players set @a bt_active 0',
      'scoreboard players set @a bt_rot_state 0',
    ]),
  )
  put(
    root + 'remove_anchor.mcfunction',
    mcfunction([
      'function builder_tables_generated:preview/clear',
      'kill @e[tag=bt_plan_anchor]',
      'scoreboard players set @a bt_active 0',
      'scoreboard players set @a bt_rot_state 0',
    ]),
  )
  put(
    root + 'validate.mcfunction',
    'execute as ' +
      anchor +
      ' at @s unless block ~ ~ ~ ' +
      CONTROLLER_BLOCK +
      ' run function builder_tables_generated:controller_block/remove_anchor\n',
  )
  put(
    root + 'refresh.mcfunction',
    mcfunction(
      structures.map(
        (structure, index) =>
          'execute if score @s bt_active matches ' +
          (index + 1) +
          ' if entity ' +
          anchor +
          ' at ' +
          anchor +
          ' run function builder_tables_generated:preview/start/' +
          structure.analysis.id,
      ),
    ),
  )
  put(
    root + 'ray_place.mcfunction',
    raycast('builder_tables_generated:controller_block/found_place'),
  )
  put(
    root + 'ray_use.mcfunction',
    raycast('builder_tables_generated:controller_block/found_use'),
  )
  put(
    root + 'placed.mcfunction',
    mcfunction([
      'advancement revoke @s only builder_tables_generated:placed_controller',
      'function builder_tables_generated:controller_block/ray_place',
    ]),
  )
  put(
    root + 'used.mcfunction',
    mcfunction([
      'advancement revoke @s only builder_tables_generated:used_controller',
      'function builder_tables_generated:controller_block/ray_use',
    ]),
  )
  put(
    root + 'found_place.mcfunction',
    mcfunction([
      'tag @s add bt_ctrl_ray_hit',
      'function builder_tables_generated:controller_block/remove_anchor',
      'summon minecraft:marker ~ ~ ~ {Tags:["bt_plan_anchor"]}',
      'tellraw @s {"text":"[Builder Tables] Bloque de Planificación registrado. Haz clic para abrir el catálogo.","color":"aqua"}',
    ]),
  )
  put(
    root + 'found_use.mcfunction',
    mcfunction([
      'tag @s add bt_ctrl_ray_hit',
      'execute if entity @e[tag=bt_plan_anchor,distance=..0.1,limit=1] run setblock ~ ~ ~ minecraft:note_block[note=0]',
      'execute if entity @e[tag=bt_plan_anchor,distance=..0.1,limit=1] run function builder_tables:controller/open',
    ]),
  )

  putJson('data/builder_tables_generated/advancement/placed_controller.json', {
    criteria: {
      place_controller: {
        trigger: 'minecraft:placed_block',
        conditions: {
          location: [
            {
              condition: 'minecraft:location_check',
              predicate: { block: { blocks: CONTROLLER_BLOCK } },
            },
          ],
        },
      },
    },
    rewards: {
      function: 'builder_tables_generated:controller_block/placed',
    },
  })
  putJson('data/builder_tables_generated/advancement/used_controller.json', {
    criteria: {
      use_controller: {
        trigger: 'minecraft:any_block_use',
        conditions: {
          location: [
            {
              condition: 'minecraft:location_check',
              predicate: { block: { blocks: CONTROLLER_BLOCK } },
            },
          ],
        },
      },
    },
    rewards: {
      function: 'builder_tables_generated:controller_block/used',
    },
  })
}

export function addControllerAssets(
  put: TextFileWriter,
  putJson: JsonFileWriter,
  structures: GeneratedStructure[],
) {
  putJson('data/builder_tables/recipe/planning_block.json', {
    type: 'minecraft:crafting_shapeless',
    category: 'equipment',
    ingredients: [CONTROLLER_BLOCK, 'minecraft:paper'],
    result: {
      id: CONTROLLER_BLOCK,
      count: 1,
      components: controllerComponents(),
    },
  })
  addDialogs(putJson, structures)
  addControllerBlock(put, putJson, structures)
  put(
    'data/builder_tables/function/give_controller.mcfunction',
    '# Bloque-controlador sólido para Builder Tables.\ngive @s ' +
      controllerItemSnbt() +
      '\n',
  )
}
