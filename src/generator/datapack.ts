import { strToU8, zipSync } from 'fflate'
import { prepareStructures } from './nbt'
import { addControllerAssets } from './controller'
import { addDynamicAssets } from './dynamics'
import { addPreviewFiles } from './preview'
import { addBankAssets } from './bank'
import { addSurveyorAssets } from './surveyor'
import { SURVIVAL_POLICY_METADATA } from './survival-policy'
import type { StructureAnalysis, WorkerStructureInput } from './types'
import { getVersionProfile, type MinecraftVersion } from './version-profiles'

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
  targetVersion: MinecraftVersion = '26.2',
): Promise<GeneratedArchive> {
  if (!inputs.length) {
    throw new Error('Añade al menos una estructura antes de generar.')
  }

  const structures = await prepareStructures(inputs)
  const profile = getVersionProfile(targetVersion)
  const files: Record<string, Uint8Array> = {}
  const put = (path: string, content: string) => {
    files[path] = strToU8(content)
  }
  const putJson = (path: string, value: unknown) => {
    put(path, json(value))
  }

  const packObject: Record<string, unknown> = {
    pack_format: profile.packFormatNumber ?? profile.packFormat[0],
    description:
      'Builder Tables - Bloque de Planificación para ' + profile.label,
  }
  if (profile.supportedFormats) {
    packObject.supported_formats = profile.supportedFormats
  }
  packObject.min_format = profile.packFormat
  packObject.max_format = profile.packFormat

  putJson('pack.mcmeta', {
    pack: packObject,
  })
  putJson('data/minecraft/tags/function/load.json', {
    values: [
      'builder_tables:init',
      'builder_tables_generated:init',
      'builder_tables_generated:controller_block/init',
      'builder_tables_generated:surveyor/init',
    ],
  })
  putJson('data/minecraft/tags/function/tick.json', {
    values: [
      'builder_tables:tick',
      'builder_tables_generated:surveyor/tick',
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

  putJson('builder_tables_survival_policy_26_2.json', {
    ...SURVIVAL_POLICY_METADATA,
    structures: structures.map(({ analysis }) => ({
      id: analysis.id,
      name: analysis.name,
      price: analysis.price,
      policy: analysis.policy,
    })),
  })

  addControllerAssets(put, putJson, structures)
  addDynamicAssets(put, structures)
  addPreviewFiles(put, structures)
  addBankAssets(put, putJson, structures)
  addSurveyorAssets(put, putJson)

  const report = [
    'BUILDER TABLES ' + targetVersion + ' - BLOQUE DE PLANIFICACIÓN',
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
            '  eliminado o reparado (no compatible / estado transitorio): ' +
            removed.name +
            ' x ' +
            removed.count,
        ),
        ...(analysis.removedEntities
          ? ['  entidades eliminadas automáticamente: ' + analysis.removedEntities]
          : []),
        ...(analysis.policy?.dependencies ?? []).map(
          (dependency) =>
            '  dependencia survival: ' +
            dependency.id +
            ' x ' +
            dependency.count +
            (dependency.billable ? '' : ' (informativa)'),
        ),
        ...(analysis.policy?.embeddedItems ?? []).map(
          (item) =>
            '  contenido incluido y cobrado: ' +
            item.name +
            ' x ' +
            item.count,
        ),
        ...(analysis.policy?.worldLimits ?? []).map(
          (limit) =>
            '  límite ' +
            limit.scope +
            ': ' +
            limit.id +
            ' x ' +
            limit.count +
            '/' +
            limit.maximum,
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
