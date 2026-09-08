import { Int32, read, TAG, TAG_TYPE, write } from 'nbtify'
import type { TAG as TagType } from 'nbtify'
import type {
  StructureAnalysis,
  ViewerModel,
  ViewerPaletteEntry,
  WorkerStructureInput,
} from './types'
import { splitStructureRegions, type StructureSize } from './geometry'

const AIR_BLOCKS = new Set([
  'minecraft:air',
  'minecraft:cave_air',
  'minecraft:void_air',
  'minecraft:structure_void',
])

const UNSUPPORTED_26_2 = new Set([
  'minecraft:dark_oak_wall_hanging_sign',
])

export type BlockState = {
  name: string
  properties: Array<[string, string]>
}

export type PreviewPart = {
  index: number
  offset: StructureSize
  size: StructureSize
  template: Uint8Array
}

export type GeneratedStructure = {
  analysis: StructureAnalysis
  states: BlockState[]
  construction: Uint8Array
  previewParts: PreviewPart[]
}

export type AnalysisBundle = {
  structures: StructureAnalysis[]
  viewerModels: ViewerModel[]
}

type NbtRecord = Record<string, unknown>
type NbtList = unknown[] & { [TAG_TYPE]?: TagType }

type ProcessedStructure = {
  analysis: StructureAnalysis
  viewer?: ViewerModel
  states?: BlockState[]
  construction?: Uint8Array
  previewParts?: PreviewPart[]
}

type PositionedBlock = {
  block: NbtRecord
  position: StructureSize
}

function sourceStem(sourceName: string) {
  return sourceName.replace(/\.nbt$/i, '')
}

export function structureId(raw: string) {
  const normalized = Array.from(raw.normalize('NFKD'))
    .filter((character) => character.charCodeAt(0) <= 127)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .split('_')
    .filter(Boolean)
    .join('_')

  return normalized && /^[a-z]/.test(normalized)
    ? normalized
    : 'c_' + (normalized || 'structure')
}

function plainText(value: unknown) {
  return typeof value === 'string' ? value : String(value)
}

function asRecord(value: unknown, message: string): NbtRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(message)
  }

  return value as NbtRecord
}

function asList(value: unknown, message: string): NbtList {
  if (!Array.isArray(value)) throw new Error(message)
  return value as NbtList
}

function withListType<T>(items: T[], source: unknown) {
  const sourceType =
    (source as { [TAG_TYPE]?: TagType })[TAG_TYPE] ?? TAG.COMPOUND

  Object.defineProperty(items, TAG_TYPE, {
    value: sourceType,
    enumerable: false,
    configurable: true,
    writable: true,
  })
  return items
}

function blockState(entry: unknown): BlockState {
  const compound = asRecord(entry, 'La paleta contiene una entrada inválida.')
  const name =
    typeof compound.Name === 'string' ? compound.Name : 'minecraft:air'
  const rawProperties = compound.Properties

  if (!rawProperties) return { name, properties: [] }

  const properties = asRecord(
    rawProperties,
    'La paleta contiene propiedades inválidas.',
  )

  return {
    name,
    properties: Object.entries(properties)
      .map(([key, value]) => [key, plainText(value)] as [string, string])
      .sort(([left], [right]) => left.localeCompare(right)),
  }
}

function stateKey(state: BlockState) {
  return (
    state.name +
    '\u0000' +
    state.properties
      .map(([key, value]) => key + '\u0000' + value)
      .join('\u0001')
  )
}

function shouldRemoveState(state: BlockState) {
  return (
    !AIR_BLOCKS.has(state.name) &&
    (UNSUPPORTED_26_2.has(state.name) || !state.name.startsWith('minecraft:'))
  )
}
function parseMetadata(input: WorkerStructureInput) {
  const fallbackName = sourceStem(input.sourceName)
  let name = fallbackName
  let price: number | undefined

  if (input.metadataText) {
    let metadata: unknown
    try {
      metadata = JSON.parse(input.metadataText)
    } catch {
      throw new Error('El archivo JSON asociado no es válido.')
    }

    const object = asRecord(
      metadata,
      'El archivo JSON asociado debe ser un objeto.',
    )

    if (Object.hasOwn(object, 'price')) {
      if (
        typeof object.price !== 'number' ||
        !Number.isInteger(object.price) ||
        object.price < 0
      ) {
        throw new Error(
          'El campo price del JSON debe ser un entero no negativo.',
        )
      }
      price = object.price
    }

    if (Object.hasOwn(object, 'name')) {
      name = plainText(object.name)
    }
  }

  return {
    name: input.nameOverride?.trim() || name,
    price,
  }
}

function rejected(
  input: WorkerStructureInput,
  id: string,
  message: string,
): ProcessedStructure {
  return {
    analysis: {
      key: input.key,
      sourceName: input.sourceName,
      id,
      name: input.nameOverride?.trim() || sourceStem(input.sourceName),
      size: [0, 0, 0],
      count: 0,
      price: 0,
      stateCount: 0,
      materials: [],
      removed: [],
      status: 'rejected',
      error: input.sourceName + ': ' + message,
    },
  }
}

function copyWithoutBlockEntity(block: NbtRecord) {
  const preview = { ...block }
  delete preview.nbt
  return preview
}

function blockPosition(block: NbtRecord, size: [number, number, number]) {
  if (!Array.isArray(block.pos) || block.pos.length !== 3) {
    throw new Error('La estructura contiene una posición de bloque inválida.')
  }

  const values = block.pos.map(Number)
  if (values.some((value) => !Number.isInteger(value))) {
    throw new Error('La estructura contiene una posición de bloque inválida.')
  }

  if (
    values[0] < 0 ||
    values[1] < 0 ||
    values[2] < 0 ||
    values[0] >= size[0] ||
    values[1] >= size[1] ||
    values[2] >= size[2]
  ) {
    throw new Error('La estructura contiene un bloque fuera de sus dimensiones.')
  }

  return values as [number, number, number]
}

function blockColor(name: string) {
  if (name.includes('water') || name.includes('ice')) return '#4f9bdd'
  if (name.includes('lava') || name.includes('magma')) return '#e06a39'
  if (name.includes('glass')) return '#79b7c9'
  if (name.includes('leaves') || name.includes('moss')) return '#518a50'
  if (name.includes('grass') || name.includes('fern')) return '#6a9c50'
  if (
    name.includes('log') ||
    name.includes('wood') ||
    name.includes('planks') ||
    name.includes('fence')
  ) {
    return '#8a6140'
  }
  if (name.includes('sand') || name.includes('end_stone')) return '#c9b578'
  if (name.includes('dirt') || name.includes('terracotta')) return '#a56e55'
  if (
    name.includes('stone') ||
    name.includes('deepslate') ||
    name.includes('brick') ||
    name.includes('concrete')
  ) {
    return '#7b8391'
  }

  let hash = 0
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) >>> 0
  }

  const red = 78 + (hash & 63)
  const green = 78 + ((hash >>> 6) & 63)
  const blue = 78 + ((hash >>> 12) & 63)

  return (
    '#' +
    [red, green, blue]
      .map((value) => value.toString(16).padStart(2, '0'))
      .join('')
  )
}

async function processInput(
  input: WorkerStructureInput,
  id: string,
  includeTemplates: boolean,
): Promise<ProcessedStructure> {
  const metadata = parseMetadata(input)
  const decoded = await read(input.bytes, {
    endian: 'big',
    rootName: true,
  })
  const root = asRecord(decoded.data, 'La raíz NBT no es un compuesto.')

  if (
    !Object.hasOwn(root, 'size') ||
    !Object.hasOwn(root, 'palette') ||
    !Object.hasOwn(root, 'blocks')
  ) {
    throw new Error('NBT de estructura inválido: faltan size, palette o blocks.')
  }

  const rawSize = root.size
  if (
    !rawSize ||
    typeof rawSize !== 'object' ||
    (!Array.isArray(rawSize) && !ArrayBuffer.isView(rawSize))
  ) {
    throw new Error('El tamaño de la estructura no es válido.')
  }

  const sizeValues = Array.from(
    rawSize as unknown as ArrayLike<number>,
    Number,
  )
  if (
    sizeValues.length !== 3 ||
    sizeValues.some((value) => !Number.isInteger(value) || value < 1)
  ) {
    throw new Error('El tamaño de la estructura no es válido.')
  }
  const size = sizeValues as StructureSize
  const oldPalette = asList(root.palette, 'La paleta NBT no es válida.')
  const oldBlocks = asList(root.blocks, 'La lista de bloques NBT no es válida.')
  const states = oldPalette.map(blockState)
  const palette: NbtRecord[] = []
  const paletteStates: BlockState[] = []
  const mapping = new Map<number, number | null>()
  const stateIds = new Map<string, number>()

  states.forEach((state, index) => {
    if (shouldRemoveState(state)) {
      mapping.set(index, null)
      return
    }

    const key = stateKey(state)
    let newId = stateIds.get(key)
    if (newId === undefined) {
      newId = palette.length
      stateIds.set(key, newId)
      paletteStates.push(state)
      palette.push(
        asRecord(oldPalette[index], 'La paleta contiene una entrada inválida.'),
      )
    }
    mapping.set(index, newId)
  })

  const keptBlocks: PositionedBlock[] = []
  const used = new Map<string, BlockState>()
  const materials = new Map<string, number>()
  const removed = new Map<string, number>()
  const viewerPositions: number[] = []
  const viewerStates: number[] = []

  for (const rawBlock of oldBlocks) {
    const block = asRecord(
      rawBlock,
      'La lista de bloques contiene una entrada inválida.',
    )
    const oldId = Number(block.state)

    if (!Number.isInteger(oldId) || !mapping.has(oldId) || !states[oldId]) {
      throw new Error('La estructura referencia un índice de paleta inválido.')
    }

    const sourceState = states[oldId]
    const newId = mapping.get(oldId)

    if (newId === undefined) {
      throw new Error('La estructura referencia un índice de paleta inválido.')
    }

    if (newId === null) {
      removed.set(sourceState.name, (removed.get(sourceState.name) ?? 0) + 1)
      continue
    }

    if (AIR_BLOCKS.has(sourceState.name)) continue

    const key = stateKey(sourceState)
    const position = blockPosition(block, size)
    used.set(key, sourceState)
    materials.set(
      sourceState.name,
      (materials.get(sourceState.name) ?? 0) + 1,
    )

    const keptBlock: NbtRecord = {
      ...block,
      state: new Int32(newId),
    }
    keptBlocks.push({ block: keptBlock, position })

    viewerPositions.push(position[0], position[1], position[2])
    viewerStates.push(newId)
  }
  const filteredPalette = palette.length
    ? palette
    : [{ Name: 'minecraft:air' }]

  const buildRoot: NbtRecord = {
    ...root,
    palette: withListType(filteredPalette, oldPalette),
    blocks: withListType(
      keptBlocks.map(({ block }) => block),
      oldBlocks,
    ),
  }

  const viewerPalette: ViewerPaletteEntry[] = paletteStates.map((state) => ({
    name: state.name,
    color: blockColor(state.name),
    properties: Object.fromEntries(state.properties),
  }))
  const viewer: ViewerModel = {
    key: input.key,
    size,
    positions: Int32Array.from(viewerPositions),
    states: Uint32Array.from(viewerStates),
    palette: viewerPalette,
  }

  const analysis: StructureAnalysis = {
    key: input.key,
    sourceName: input.sourceName,
    id,
    name: metadata.name,
    size,
    count: keptBlocks.length,
    price: metadata.price ?? Math.ceil(keptBlocks.length / 10),
    stateCount: used.size,
    materials: [...materials.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => right.count - left.count),
    removed: [...removed.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => left.name.localeCompare(right.name)),
    status: 'ready',
  }

  if (!includeTemplates) return { analysis, viewer }

  const writeOptions = {
    rootName: decoded.rootName,
    endian: decoded.endian,
    compression: decoded.compression,
    bedrockLevel: decoded.bedrockLevel,
  } as const

  const previewParts: PreviewPart[] = []

  for (const region of splitStructureRegions(size)) {
    const partBlocks = keptBlocks.filter(({ position }) =>
      position[0] >= region.offset[0] &&
      position[0] < region.offset[0] + region.size[0] &&
      position[1] >= region.offset[1] &&
      position[1] < region.offset[1] + region.size[1] &&
      position[2] >= region.offset[2] &&
      position[2] < region.offset[2] + region.size[2],
    )

    if (!partBlocks.length) continue

    const previewBlocks = partBlocks.map(({ block, position }) => {
      const previewBlock = copyWithoutBlockEntity(block)
      previewBlock.pos = withListType(
        [
          new Int32(position[0] - region.offset[0]),
          new Int32(position[1] - region.offset[1]),
          new Int32(position[2] - region.offset[2]),
        ],
        block.pos,
      )
      return previewBlock
    })
    const previewRoot: NbtRecord = {
      ...buildRoot,
      size: withListType(
        region.size.map((value) => new Int32(value)),
        root.size,
      ),
      blocks: withListType(previewBlocks, oldBlocks),
    }
    delete previewRoot.entities

    previewParts.push({
      index: previewParts.length,
      offset: region.offset,
      size: region.size,
      template: await write(previewRoot, writeOptions),
    })
  }

  return {
    analysis,
    viewer,
    states: [...used.values()].sort((left, right) => {
      const nameOrder = left.name.localeCompare(right.name)
      return nameOrder || stateKey(left).localeCompare(stateKey(right))
    }),
    construction: await write(buildRoot, writeOptions),
    previewParts,
  }
}

async function processInputs(
  inputs: WorkerStructureInput[],
  includeTemplates: boolean,
) {
  const ids = inputs.map((input) => structureId(sourceStem(input.sourceName)))
  const counts = new Map<string, number>()

  ids.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1))

  return Promise.all(
    inputs.map(async (input, index) => {
      const id = ids[index]
      if ((counts.get(id) ?? 0) > 1) {
        return rejected(
          input,
          id,
          'Dos archivos producen el mismo ID de estructura: ' + id + '.',
        )
      }

      try {
        return await processInput(input, id, includeTemplates)
      } catch (error) {
        return rejected(
          input,
          id,
          error instanceof Error ? error.message : 'No se pudo leer el NBT.',
        )
      }
    }),
  )
}

export async function analyzeInputs(
  inputs: WorkerStructureInput[],
): Promise<AnalysisBundle> {
  const results = await processInputs(inputs, false)

  return {
    structures: results.map((result) => result.analysis),
    viewerModels: results.flatMap((result) =>
      result.viewer ? [result.viewer] : [],
    ),
  }
}

export async function prepareStructures(inputs: WorkerStructureInput[]) {
  const results = await processInputs(inputs, true)
  const invalid = results.find(
    (result) => result.analysis.status === 'rejected',
  )

  if (invalid) {
    throw new Error(
      'Corrige o elimina las estructuras rechazadas antes de generar.',
    )
  }

  return results.map((result) => {
    if (!result.states || !result.construction || !result.previewParts) {
      throw new Error('No se pudieron preparar los archivos NBT.')
    }

    return {
      analysis: result.analysis,
      states: result.states,
      construction: result.construction,
      previewParts: result.previewParts,
    } satisfies GeneratedStructure
  })
}
