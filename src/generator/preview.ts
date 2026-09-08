import type { BlockState, GeneratedStructure, PreviewPart } from './nbt'

export type TextFileWriter = (path: string, content: string) => void

const NAMESPACE = 'builder_tables_generated'
const STASIS_Y = -60
const OBJECTIVES = [
  'btpv_x',
  'btpv_y',
  'btpv_z',
  'btpv_minx',
  'btpv_minz',
  'btpv_endx',
  'btpv_endy',
  'btpv_endz',
  'btpv_budget',
  'btpv_tmpx',
  'btpv_tmpz',
  'btpv_math',
  'btpv_emit',
]

function mcfunction(lines: string[]) {
  return lines.join('\n') + '\n'
}

function stateSnbt(state: BlockState) {
  if (!state.properties.length) {
    return '{Name:"' + state.name + '"}'
  }

  return (
    '{Name:"' +
    state.name +
    '",Properties:{' +
    state.properties
      .map(([key, value]) => '"' + key + '":"' + value + '"')
      .join(',') +
    '}}'
  )
}

function blockPredicate(state: BlockState) {
  if (!state.properties.length) return state.name

  return (
    state.name +
    '[' +
    state.properties
      .map(([key, value]) => key + '=' + value)
      .join(',') +
    ']'
  )
}

function relative(value: number) {
  return value === 0 ? '~' : '~' + value
}

function partTag(id: string, part: PreviewPart) {
  return 'bt_preview_part_' + id + '_' + part.index
}

function partFill(part: PreviewPart) {
  const [x, y, z] = part.offset
  const [width, height, depth] = part.size

  return (
    'fill ' +
    relative(x) +
    ' ' +
    relative(y) +
    ' ' +
    relative(z) +
    ' ' +
    relative(x + width - 1) +
    ' ' +
    relative(y + height - 1) +
    ' ' +
    relative(z + depth - 1) +
    ' air'
  )
}

function partTemplate(id: string, part: PreviewPart) {
  return NAMESPACE + ':preview/' + id + '/part_' + part.index
}

function addRotationFiles(put: TextFileWriter, root: string) {
  put(
    root + 'emit_rot0.mcfunction',
    mcfunction([
      'execute store result storage builder_tables_generated:preview runtime.x int 1 run scoreboard players get @s btpv_x',
      'execute store result storage builder_tables_generated:preview runtime.y int 1 run scoreboard players get @s btpv_y',
      'execute store result storage builder_tables_generated:preview runtime.z int 1 run scoreboard players get @s btpv_z',
      'function builder_tables_generated:preview/summon/rot0 with storage builder_tables_generated:preview runtime',
    ]),
  )
  put(
    root + 'emit_rot1.mcfunction',
    mcfunction([
      'scoreboard players operation @s btpv_tmpx = @s btpv_z',
      'scoreboard players operation @s btpv_tmpx *= #minus_one btpv_math',
      'execute store result storage builder_tables_generated:preview runtime.x int 1 run scoreboard players get @s btpv_tmpx',
      'execute store result storage builder_tables_generated:preview runtime.y int 1 run scoreboard players get @s btpv_y',
      'execute store result storage builder_tables_generated:preview runtime.z int 1 run scoreboard players get @s btpv_x',
      'function builder_tables_generated:preview/summon/rot1 with storage builder_tables_generated:preview runtime',
    ]),
  )
  put(
    root + 'emit_rot2.mcfunction',
    mcfunction([
      'scoreboard players operation @s btpv_tmpx = @s btpv_x',
      'scoreboard players operation @s btpv_tmpx *= #minus_one btpv_math',
      'scoreboard players operation @s btpv_tmpz = @s btpv_z',
      'scoreboard players operation @s btpv_tmpz *= #minus_one btpv_math',
      'execute store result storage builder_tables_generated:preview runtime.x int 1 run scoreboard players get @s btpv_tmpx',
      'execute store result storage builder_tables_generated:preview runtime.y int 1 run scoreboard players get @s btpv_y',
      'execute store result storage builder_tables_generated:preview runtime.z int 1 run scoreboard players get @s btpv_tmpz',
      'function builder_tables_generated:preview/summon/rot2 with storage builder_tables_generated:preview runtime',
    ]),
  )
  put(
    root + 'emit_rot3.mcfunction',
    mcfunction([
      'scoreboard players operation @s btpv_tmpx = @s btpv_z',
      'scoreboard players operation @s btpv_tmpz = @s btpv_x',
      'scoreboard players operation @s btpv_tmpz *= #minus_one btpv_math',
      'execute store result storage builder_tables_generated:preview runtime.x int 1 run scoreboard players get @s btpv_tmpx',
      'execute store result storage builder_tables_generated:preview runtime.y int 1 run scoreboard players get @s btpv_y',
      'execute store result storage builder_tables_generated:preview runtime.z int 1 run scoreboard players get @s btpv_tmpz',
      'function builder_tables_generated:preview/summon/rot3 with storage builder_tables_generated:preview runtime',
    ]),
  )

  const quaternions = [
    '[0.0f,0.0f,0.0f,1.0f]',
    '[0.0f,-0.7071068f,0.0f,0.7071068f]',
    '[0.0f,1.0f,0.0f,0.0f]',
    '[0.0f,0.7071068f,0.0f,0.7071068f]',
  ]

  quaternions.forEach((quaternion, rotation) => {
    put(
      root + 'summon/rot' + rotation + '.mcfunction',
      '$execute at @e[tag=bt_preview_anchor,limit=1] positioned ~$(x) ~$(y) ~$(z) run summon minecraft:block_display ~ ~ ~ {block_state:$(state),Glowing:1b,transformation:{left_rotation:' +
        quaternion +
        '},Tags:["bt_preview"]}\n',
    )
  })
}

export function addPreviewFiles(
  put: TextFileWriter,
  structures: GeneratedStructure[],
) {
  const root = 'data/' + NAMESPACE + '/function/preview/'

  put(
    'data/' + NAMESPACE + '/function/init.mcfunction',
    mcfunction(
      OBJECTIVES.map((objective) => 'scoreboard objectives remove ' + objective)
        .concat(
          OBJECTIVES.map(
            (objective) => 'scoreboard objectives add ' + objective + ' dummy',
          ),
        )
        .concat([
          'scoreboard players set #minus_one btpv_math -1',
          'function builder_tables_generated:preview/clear',
        ]),
    ),
  )
  put(
    root + 'tick.mcfunction',
    mcfunction([
      'scoreboard players set @e[tag=bt_preview_stage] btpv_budget 32',
      'execute as @e[tag=bt_preview_stage,limit=1] at @s run function builder_tables_generated:preview/scan_loop',
    ]),
  )
  put(
    root + 'scan_loop.mcfunction',
    mcfunction([
      'execute if score @s btpv_budget matches 1.. run function builder_tables_generated:preview/cell',
      'execute if score @s btpv_budget matches 1.. run scoreboard players remove @s btpv_budget 1',
      'execute if score @s btpv_budget matches 1.. run function builder_tables_generated:preview/scan_loop',
    ]),
  )
  put(
    root + 'cell.mcfunction',
    mcfunction([
      'execute store result storage builder_tables_generated:preview runtime.x int 1 run scoreboard players get @s btpv_x',
      'execute store result storage builder_tables_generated:preview runtime.y int 1 run scoreboard players get @s btpv_y',
      'execute store result storage builder_tables_generated:preview runtime.z int 1 run scoreboard players get @s btpv_z',
      'function builder_tables_generated:preview/dispatch',
      'function builder_tables_generated:preview/advance',
    ]),
  )

  const dispatch: string[] = []
  const next: string[] = []
  const cleanup: string[] = []

  structures.forEach((structure) => {
    const { analysis, states, previewParts } = structure
    const id = analysis.id
    const stage = '@e[tag=bt_preview_stage_' + id + ',limit=1]'

    put(
      root + 'at/' + id + '.mcfunction',
      '$execute positioned ~$(x) ~$(y) ~$(z) run function builder_tables_generated:preview/palette/' +
        id +
        '\n',
    )
    put(
      root + 'palette/' + id + '.mcfunction',
      mcfunction(
        states.map(
          (state) =>
            'execute if block ~ ~ ~ ' +
            blockPredicate(state) +
            ' run function builder_tables_generated:preview/emit {state:' +
            stateSnbt(state) +
            '}',
        ),
      ),
    )
    dispatch.push(
      'execute if entity @s[tag=bt_preview_stage_' +
        id +
        '] run function builder_tables_generated:preview/at/' +
        id +
        ' with storage builder_tables_generated:preview runtime',
    )

    if (!previewParts.length) {
      put(
        root + 'start/' + id + '.mcfunction',
        mcfunction([
          'function builder_tables_generated:preview/clear',
          'tellraw @s ' +
            JSON.stringify({
              text: '[Preview] ' + analysis.name + ' no tiene bloques compatibles.',
              color: 'yellow',
            }),
        ]),
      )
      return
    }

    const start = [
      'function builder_tables_generated:preview/clear',
      'scoreboard players set #emitted btpv_emit 0',
      'execute unless score @s bt_rot_state matches 0..3 run scoreboard players set @s bt_rot_state 0',
      'summon minecraft:marker ~ ~ ~ {Tags:["bt_preview_anchor"]}',
      'execute positioned ~ ' +
        STASIS_Y +
        ' ~ run summon minecraft:marker ~ ~ ~ {Tags:["bt_preview_stage","bt_preview_stage_' +
        id +
        '"]}',
    ]

    for (let rotation = 0; rotation < 4; rotation += 1) {
      start.push(
        'execute if score @s bt_rot_state matches ' +
          rotation +
          ' as ' +
          stage +
          ' run tag @s add bt_preview_rot' +
          rotation,
      )
    }

    start.push(
      'execute as ' +
        stage +
        ' at @s run function builder_tables_generated:preview/part/' +
        id +
        '/load_' +
        previewParts[0].index,
      'tellraw @s ' +
        JSON.stringify({
          text:
            '[Preview] Escaneo iniciado: ' +
            analysis.name +
            ' (' +
            previewParts.length +
            ' lote' +
            (previewParts.length === 1 ? '' : 's') +
            ').',
          color: 'aqua',
        }),
    )
    put(root + 'start/' + id + '.mcfunction', mcfunction(start))

    previewParts.forEach((part, index) => {
      const tag = partTag(id, part)
      const nextPart = previewParts[index + 1]
      const load = [
        'tag @s add ' + tag,
        'scoreboard players set @s btpv_x ' + part.offset[0],
        'scoreboard players set @s btpv_y ' + part.offset[1],
        'scoreboard players set @s btpv_z ' + part.offset[2],
        'scoreboard players set @s btpv_minx ' + part.offset[0],
        'scoreboard players set @s btpv_minz ' + part.offset[2],
        'scoreboard players set @s btpv_endx ' +
          (part.offset[0] + part.size[0]),
        'scoreboard players set @s btpv_endy ' +
          (part.offset[1] + part.size[1]),
        'scoreboard players set @s btpv_endz ' +
          (part.offset[2] + part.size[2]),
        partFill(part),
        'place template ' +
          partTemplate(id, part) +
          ' ' +
          relative(part.offset[0]) +
          ' ' +
          relative(part.offset[1]) +
          ' ' +
          relative(part.offset[2]) +
          ' none',
      ]
      put(
        root + 'part/' + id + '/load_' + part.index + '.mcfunction',
        mcfunction(load),
      )

      const complete = [partFill(part), 'tag @s remove ' + tag]
      if (nextPart) {
        complete.push(
          'function builder_tables_generated:preview/part/' +
            id +
            '/load_' +
            nextPart.index,
        )
      } else {
        complete.push('function builder_tables_generated:preview/finish')
      }
      put(
        root + 'part/' + id + '/complete_' + part.index + '.mcfunction',
        mcfunction(complete),
      )

      next.push(
        'execute if entity @s[tag=' +
          tag +
          '] run return run function builder_tables_generated:preview/part/' +
          id +
          '/complete_' +
          part.index,
      )
      cleanup.push(
        'execute as @e[tag=bt_preview_stage_' +
          id +
          ',tag=' +
          tag +
          '] at @s run ' +
          partFill(part),
      )
    })
  })

  put(root + 'dispatch.mcfunction', mcfunction(dispatch))
  put(
    root + 'emit.mcfunction',
    mcfunction([
      'scoreboard players add #emitted btpv_emit 1',
      '$data modify storage builder_tables_generated:preview runtime.state set value $(state)',
      'execute if entity @s[tag=bt_preview_rot0] run function builder_tables_generated:preview/emit_rot0',
      'execute if entity @s[tag=bt_preview_rot1] run function builder_tables_generated:preview/emit_rot1',
      'execute if entity @s[tag=bt_preview_rot2] run function builder_tables_generated:preview/emit_rot2',
      'execute if entity @s[tag=bt_preview_rot3] run function builder_tables_generated:preview/emit_rot3',
    ]),
  )
  addRotationFiles(put, root)
  put(
    root + 'advance.mcfunction',
    mcfunction([
      'scoreboard players add @s btpv_x 1',
      'execute if score @s btpv_x >= @s btpv_endx run scoreboard players operation @s btpv_x = @s btpv_minx',
      'execute if score @s btpv_x = @s btpv_minx run scoreboard players add @s btpv_z 1',
      'execute if score @s btpv_z >= @s btpv_endz run scoreboard players operation @s btpv_z = @s btpv_minz',
      'execute if score @s btpv_x = @s btpv_minx if score @s btpv_z = @s btpv_minz run scoreboard players add @s btpv_y 1',
      'execute if score @s btpv_y >= @s btpv_endy run function builder_tables_generated:preview/next',
    ]),
  )
  put(root + 'next.mcfunction', mcfunction(next))
  put(root + 'cleanup.mcfunction', mcfunction(cleanup))
  put(
    root + 'finish.mcfunction',
    mcfunction([
      'function builder_tables_generated:preview/cleanup',
      'kill @e[tag=bt_preview_stage]',
      'tellraw @a [{"text":"[Preview] Displays creados: ","color":"green"},{"score":{"name":"#emitted","objective":"btpv_emit"}}]',
    ]),
  )
  put(
    root + 'clear.mcfunction',
    mcfunction([
      'function builder_tables_generated:preview/cleanup',
      'kill @e[tag=bt_preview_stage]',
      'kill @e[tag=bt_preview_anchor]',
      'kill @e[tag=bt_preview]',
    ]),
  )
}
