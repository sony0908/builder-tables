import { strToU8, zipSync } from 'fflate'
import { prepareStructures } from './nbt'
import { addControllerAssets } from './controller'
import { addDynamicAssets } from './dynamics'
import { addPreviewFiles } from './preview'
import type { StructureAnalysis, WorkerStructureInput } from './types'

type GeneratedArchive = {
  archive: ArrayBuffer
  report: string
  structures: StructureAnalysis[]
}

function json(value: unknown) {
  return JSON.stringify(value, null, 2) + '\n'
}

export async function generateArchive(
  inputs: WorkerStructureInput[],
): Promise<GeneratedArchive> {
  if (!inputs.length) {
    throw new Error('Añade al menos una estructura antes de generar.')
  }

  const structures = await prepareStructures(inputs)
  const files: Record<string, Uint8Array> = {}
  const put = (path: string, content: string) => {
    files[path] = strToU8(content)
  }
  const putJson = (path: string, value: unknown) => {
    put(path, json(value))
  }

  putJson('pack.mcmeta', {
    pack: {
      min_format: [107, 1],
      max_format: [107, 1],
      description:
        'Builder Tables - POC Bloque de Planificación para Java 26.2',
    },
  })
  putJson('data/minecraft/tags/function/load.json', {
    values: [
      'builder_tables_generated:init',
      'builder_tables_generated:controller_block/init',
    ],
  })

  structures.forEach((structure) => {
    files[
      'data/builder_tables/structure/' + structure.analysis.id + '.nbt'
    ] = structure.construction
    structure.previewParts.forEach((part) => {
      files[
        'data/builder_tables_generated/structure/preview/' +
          structure.analysis.id +
          '/part_' +
          part.index +
          '.nbt'
      ] = part.template
    })
  })

  addControllerAssets(put, putJson, structures)
  addDynamicAssets(put, structures)
  addPreviewFiles(put, structures)

  const report = [
    'BUILDER TABLES 26.2 - POC BLOQUE DE PLANIFICACIÓN',
    '',
    ...structures.flatMap((structure) => {
      const { analysis } = structure
      return [
        '- ' +
          analysis.id +
          ': ' +
          analysis.size.join('x') +
          ', ' +
          analysis.count +
          ' bloques, precio ' +
          analysis.price,
        ...analysis.removed.map(
          (removed) =>
            '  eliminado (no compatible): ' +
            removed.name +
            ' x ' +
            removed.count,
        ),

      ]
    }),
    '',
    'ERRORES: 0',
    'RESULTADO: OK',
    '',
  ].join('\n')

  const archive = zipSync(files, { level: 6 }).slice()

  return {
    archive: archive.buffer,
    report,
    structures: structures.map((structure) => structure.analysis),
  }
}
