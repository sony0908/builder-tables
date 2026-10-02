import type { BlockState, GeneratedStructure } from './nbt'

export type TextFileWriter = (path: string, content: string) => void

const NAMESPACE = 'builder_tables_generated'

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

function relative(value: number) {
  return value === 0 ? '~' : '~' + value
}

const quaternions = [
  '[0.0f,0.0f,0.0f,1.0f]',
  '[0.0f,-0.7071068f,0.0f,0.7071068f]',
  '[0.0f,1.0f,0.0f,0.0f]',
  '[0.0f,0.7071068f,0.0f,0.7071068f]',
]

function rotatedCoords(
  x: number,
  y: number,
  z: number,
  rotation: number,
): [number, number, number] {
  if (rotation === 0) return [x, y, z]
  if (rotation === 1) return [-z, y, x]
  if (rotation === 2) return [-x, y, -z]
  return [z, y, -x]
}

export function addPreviewFiles(
  put: TextFileWriter,
  structures: GeneratedStructure[],
) {
  const root = 'data/' + NAMESPACE + '/function/preview/'

  // Inicialización limpia
  put(
    'data/' + NAMESPACE + '/function/init.mcfunction',
    mcfunction(['function builder_tables_generated:preview/clear']),
  )

  // Tick loop de previsualización (mantiene el endpoint para llamadas periódicas)
  put(
    root + 'tick.mcfunction',
    mcfunction(['# Tick de previsualización mediante block_display directos']),
  )

  // Limpieza total de hologramas y marcadores sin tocar bloques del mundo
  put(
    root + 'clear.mcfunction',
    mcfunction([
      'kill @e[tag=bt_preview]',
      'kill @e[tag=bt_preview_anchor]',
      'kill @e[tag=bt_preview_stage]',
    ]),
  )

  structures.forEach((structure) => {
    const { analysis, blocks = [] } = structure
    const id = analysis.id

    // Generar funciones de invocación directa por cada rotación
    for (let rotation = 0; rotation < 4; rotation += 1) {
      const quaternion = quaternions[rotation]
      const lines: string[] = []

      blocks.forEach((block) => {
        const [rx, ry, rz] = rotatedCoords(
          block.pos[0],
          block.pos[1],
          block.pos[2],
          rotation,
        )
        const snbt = stateSnbt(block.state)

        lines.push(
          'summon minecraft:block_display ' +
            relative(rx) +
            ' ' +
            relative(ry) +
            ' ' +
            relative(rz) +
            ' {block_state:' +
            snbt +
            ',Glowing:1b,transformation:{left_rotation:' +
            quaternion +
            '},Tags:["bt_preview"]}',
        )
      })

      if (!lines.length) {
        lines.push('# Sin bloques para mostrar en previsualización')
      }

      put(
        root + 'spawn/' + id + '/rot' + rotation + '.mcfunction',
        mcfunction(lines),
      )
    }

    // start/<id>.mcfunction: Se ejecuta instantáneamente al seleccionar la estructura
    const start = [
      'function builder_tables_generated:preview/clear',
      'execute unless score @s bt_rot_state matches 0..3 run scoreboard players set @s bt_rot_state 0',
      'summon minecraft:marker ~ ~ ~ {Tags:["bt_preview_anchor"]}',
      'execute if score @s bt_rot_state matches 0 at @e[tag=bt_preview_anchor,limit=1] run function builder_tables_generated:preview/spawn/' +
        id +
        '/rot0',
      'execute if score @s bt_rot_state matches 1 at @e[tag=bt_preview_anchor,limit=1] run function builder_tables_generated:preview/spawn/' +
        id +
        '/rot1',
      'execute if score @s bt_rot_state matches 2 at @e[tag=bt_preview_anchor,limit=1] run function builder_tables_generated:preview/spawn/' +
        id +
        '/rot2',
      'execute if score @s bt_rot_state matches 3 at @e[tag=bt_preview_anchor,limit=1] run function builder_tables_generated:preview/spawn/' +
        id +
        '/rot3',
      'tellraw @s ' +
        JSON.stringify({
          text:
            '[Preview] Previsualización de ' +
            analysis.name +
            ' generada (' +
            blocks.length +
            ' bloques).',
          color: 'aqua',
        }),
    ]

    put(root + 'start/' + id + '.mcfunction', mcfunction(start))
  })
}
