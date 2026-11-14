import { Int32, TAG, TAG_TYPE } from 'nbtify'
import type { ConvertedStructure, NbtRecord } from './types'

export function parseBlockStateString(raw: string): {
  name: string
  properties?: Record<string, string>
} {
  const bracketIndex = raw.indexOf('[')
  let name = bracketIndex === -1 ? raw.trim() : raw.slice(0, bracketIndex).trim()
  if (!name.includes(':')) {
    name = 'minecraft:' + name
  }
  if (bracketIndex === -1) {
    return { name }
  }

  const closingIndex = raw.indexOf(']', bracketIndex)
  if (closingIndex === -1) {
    return { name }
  }

  const propStr = raw.slice(bracketIndex + 1, closingIndex).trim()
  if (!propStr) {
    return { name }
  }

  const properties: Record<string, string> = {}
  for (const pair of propStr.split(',')) {
    const eq = pair.indexOf('=')
    if (eq !== -1) {
      const k = pair.slice(0, eq).trim()
      const v = pair.slice(eq + 1).trim()
      if (k && v) {
        properties[k] = v
      }
    }
  }

  return {
    name,
    properties: Object.keys(properties).length > 0 ? properties : undefined,
  }
}

function toUint8Array(input: unknown): Uint8Array {
  if (input instanceof Uint8Array) return input
  if (input instanceof Int8Array) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
  }
  if (Array.isArray(input)) {
    return Uint8Array.from(input.map((v) => Number(v) & 0xff))
  }
  return new Uint8Array(0)
}

function extractTileEntityPos(be: NbtRecord): [number, number, number] | null {
  if (Array.isArray(be.Pos) || ArrayBuffer.isView(be.Pos)) {
    const arr = Array.from(be.Pos as ArrayLike<number>, Number)
    if (arr.length === 3) return [arr[0], arr[1], arr[2]]
  }
  if (
    typeof be.x === 'number' &&
    typeof be.y === 'number' &&
    typeof be.z === 'number'
  ) {
    return [be.x, be.y, be.z]
  }
  return null
}

export function convertSchemToVanilla(rootInput: NbtRecord): ConvertedStructure {
  // Support wrapped Sponge Schematic (e.g. root.Schematic)
  const root = (rootInput.Schematic as NbtRecord | undefined) ?? rootInput

  const width = Number(root.Width ?? 0)
  const height = Number(root.Height ?? 0)
  const length = Number(root.Length ?? 0)

  if (width < 1 || height < 1 || length < 1) {
    throw new Error(
      `Dimensiones inválidas en WorldEdit .schem: ${width}x${height}x${length}`,
    )
  }

  // Sponge v1/v2 vs v3 paths for Palette and BlockData
  const blocksCompound = root.Blocks as NbtRecord | undefined
  const rawPalette =
    (root.Palette as NbtRecord | undefined) ??
    (root.BlockPalette as NbtRecord | undefined) ??
    (blocksCompound?.Palette as NbtRecord | undefined) ??
    (blocksCompound?.BlockPalette as NbtRecord | undefined)

  if (!rawPalette || typeof rawPalette !== 'object') {
    throw new Error('El archivo WorldEdit .schem no contiene una paleta de bloques.')
  }

  const rawBlockData =
    root.BlockData ??
    root.Data ??
    blocksCompound?.BlockData ??
    blocksCompound?.Data

  if (!rawBlockData) {
    throw new Error('El archivo WorldEdit .schem no contiene BlockData.')
  }

  const dataBytes = toUint8Array(rawBlockData)

  // Invert palette: id -> blockStateString
  const idToString = new Map<number, string>()
  for (const [stateStr, rawId] of Object.entries(rawPalette)) {
    idToString.set(Number(rawId), stateStr)
  }

  const paletteSize = Math.max(0, ...idToString.keys()) + 1
  const vanillaPalette: NbtRecord[] = []
  for (let i = 0; i < paletteSize; i++) {
    const stateStr = idToString.get(i) ?? 'minecraft:air'
    const parsed = parseBlockStateString(stateStr)
    const entry: NbtRecord = {
      Name: parsed.name,
    }
    if (parsed.properties) {
      entry.Properties = parsed.properties
    }
    vanillaPalette.push(entry)
  }

  // Parse BlockEntities / TileEntities
  const rawEntities =
    (root.BlockEntities as unknown[] | undefined) ??
    (root.TileEntities as unknown[] | undefined) ??
    (blocksCompound?.BlockEntities as unknown[] | undefined) ??
    []

  const tileEntityMap = new Map<string, NbtRecord>()
  if (Array.isArray(rawEntities)) {
    for (const rawBe of rawEntities) {
      if (!rawBe || typeof rawBe !== 'object') continue
      const be = { ...(rawBe as NbtRecord) }
      const pos = extractTileEntityPos(be)
      if (!pos) continue

      const [x, y, z] = pos
      // Ensure lowercase 'id' is present if 'Id' was used
      if (typeof be.Id === 'string' && !be.id) {
        be.id = be.Id
      }
      delete be.Pos
      delete be.x
      delete be.y
      delete be.z

      tileEntityMap.set(`${x},${y},${z}`, be)
    }
  }

  // Decode VarInts from dataBytes
  // Sponge layout: (y * length + z) * width + x
  let ptr = 0
  function readVarInt(): number {
    let value = 0
    let shift = 0
    while (ptr < dataBytes.length) {
      const byte = dataBytes[ptr++]
      value |= (byte & 0x7f) << shift
      if ((byte & 0x80) === 0) break
      shift += 7
    }
    return value
  }

  const blocks: NbtRecord[] = []
  for (let y = 0; y < height; y++) {
    for (let z = 0; z < length; z++) {
      for (let x = 0; x < width; x++) {
        const stateId = readVarInt()
        const pos = [new Int32(x), new Int32(y), new Int32(z)]
        Object.defineProperty(pos, TAG_TYPE, {
          value: TAG.INT,
          enumerable: false,
          configurable: true,
          writable: true,
        })
        const blockEntry: NbtRecord = {
          pos,
          state: new Int32(stateId),
        }
        const te = tileEntityMap.get(`${x},${y},${z}`)
        if (te) {
          blockEntry.nbt = te
        }
        blocks.push(blockEntry)
      }
    }
  }

  const dataVersion = Number(root.DataVersion ?? 3955)

  const size = [new Int32(width), new Int32(height), new Int32(length)]
  Object.defineProperty(size, TAG_TYPE, {
    value: TAG.INT,
    enumerable: false,
    configurable: true,
    writable: true,
  })
  Object.defineProperty(vanillaPalette, TAG_TYPE, {
    value: TAG.COMPOUND,
    enumerable: false,
    configurable: true,
    writable: true,
  })
  Object.defineProperty(blocks, TAG_TYPE, {
    value: TAG.COMPOUND,
    enumerable: false,
    configurable: true,
    writable: true,
  })

  const vanillaRoot: NbtRecord = {
    size,
    palette: vanillaPalette,
    blocks,
    DataVersion: new Int32(dataVersion),
  }

  return {
    format: 'schem',
    root: vanillaRoot,
    warnings: [],
  }
}
