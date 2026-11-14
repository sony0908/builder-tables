import { Int32, TAG, TAG_TYPE } from 'nbtify'
import type { ConvertedStructure, NbtRecord } from './types'

type RegionData = {
  name: string
  rawSizeX: number
  rawSizeY: number
  rawSizeZ: number
  sizeX: number
  sizeY: number
  sizeZ: number
  minX: number
  minY: number
  minZ: number
  maxX: number
  maxY: number
  maxZ: number
  palette: NbtRecord[]
  blockStates?: BigInt64Array
  tileEntities: NbtRecord[]
}

function parseRegionCompound(name: string, region: NbtRecord): RegionData {
  const pos = (region.Position as NbtRecord | undefined) ?? {}
  const size = (region.Size as NbtRecord | undefined) ?? {}

  const posX = Number(pos.x ?? 0)
  const posY = Number(pos.y ?? 0)
  const posZ = Number(pos.z ?? 0)

  const rawSizeX = Number(size.x ?? 0)
  const rawSizeY = Number(size.y ?? 0)
  const rawSizeZ = Number(size.z ?? 0)

  const sizeX = Math.abs(rawSizeX)
  const sizeY = Math.abs(rawSizeY)
  const sizeZ = Math.abs(rawSizeZ)

  if (sizeX < 1 || sizeY < 1 || sizeZ < 1) {
    throw new Error(`La región '${name}' en Litematica tiene dimensiones inválidas: ${rawSizeX}x${rawSizeY}x${rawSizeZ}`)
  }

  // Calculate world bounding box
  const minX = posX + (rawSizeX < 0 ? rawSizeX + 1 : 0)
  const minY = posY + (rawSizeY < 0 ? rawSizeY + 1 : 0)
  const minZ = posZ + (rawSizeZ < 0 ? rawSizeZ + 1 : 0)

  const maxX = minX + sizeX
  const maxY = minY + sizeY
  const maxZ = minZ + sizeZ

  const rawPalette = (region.BlockStatePalette as unknown[] | undefined) ?? []
  const palette: NbtRecord[] = rawPalette.map((entry) => {
    if (entry && typeof entry === 'object') {
      return entry as NbtRecord
    }
    return { Name: 'minecraft:air' }
  })
  if (palette.length === 0) {
    palette.push({ Name: 'minecraft:air' })
  }

  const blockStates = region.BlockStates as BigInt64Array | undefined

  const rawTileEntities = (region.TileEntities as unknown[] | undefined) ?? []
  const tileEntities: NbtRecord[] = []
  if (Array.isArray(rawTileEntities)) {
    for (const te of rawTileEntities) {
      if (te && typeof te === 'object') {
        tileEntities.push({ ...(te as NbtRecord) })
      }
    }
  }

  return {
    name,
    rawSizeX,
    rawSizeY,
    rawSizeZ,
    sizeX,
    sizeY,
    sizeZ,
    minX,
    minY,
    minZ,
    maxX,
    maxY,
    maxZ,
    palette,
    blockStates,
    tileEntities,
  }
}

export function convertLitematicToVanilla(root: NbtRecord): ConvertedStructure {
  const regionsCompound = root.Regions as NbtRecord | undefined
  if (!regionsCompound || typeof regionsCompound !== 'object') {
    throw new Error('El archivo Litematica no contiene la etiqueta Regions.')
  }

  const regionNames = Object.keys(regionsCompound)
  if (regionNames.length === 0) {
    throw new Error('El archivo Litematica no contiene ninguna región de construcción.')
  }

  const regions: RegionData[] = regionNames.map((name) =>
    parseRegionCompound(name, regionsCompound[name] as NbtRecord),
  )

  // Global bounding box enclosing all regions
  const globalMinX = Math.min(...regions.map((r) => r.minX))
  const globalMinY = Math.min(...regions.map((r) => r.minY))
  const globalMinZ = Math.min(...regions.map((r) => r.minZ))

  const globalMaxX = Math.max(...regions.map((r) => r.maxX))
  const globalMaxY = Math.max(...regions.map((r) => r.maxY))
  const globalMaxZ = Math.max(...regions.map((r) => r.maxZ))

  const totalWidth = Math.max(1, globalMaxX - globalMinX)
  const totalHeight = Math.max(1, globalMaxY - globalMinY)
  const totalLength = Math.max(1, globalMaxZ - globalMinZ)

  // Build unified global palette
  const globalPalette: NbtRecord[] = []
  const paletteKeyToIndex = new Map<string, number>()

  function getOrAddPaletteEntry(entry: NbtRecord): number {
    const name = String(entry.Name ?? 'minecraft:air')
    const props = entry.Properties as Record<string, unknown> | undefined
    const propPairs = props
      ? Object.entries(props)
          .map(([k, v]) => `${k}=${v}`)
          .sort()
          .join(',')
      : ''
    const key = `${name}[${propPairs}]`

    let index = paletteKeyToIndex.get(key)
    if (index === undefined) {
      index = globalPalette.length
      paletteKeyToIndex.set(key, index)
      globalPalette.push(entry)
    }
    return index
  }

  // Pre-populate air at index 0 if not present
  getOrAddPaletteEntry({ Name: 'minecraft:air' })

  // Global map of blocks: key `${x},${y},${z}` -> { state: number, nbt?: NbtRecord }
  const blockMap = new Map<string, { state: number; nbt?: NbtRecord }>()

  for (const region of regions) {
    const localToGlobalPalette = region.palette.map((entry) =>
      getOrAddPaletteEntry(entry),
    )

    const bitsPerEntry = Math.max(
      2,
      Math.ceil(Math.log2(Math.max(2, region.palette.length))),
    )
    const longArray = region.blockStates
    const mask = (1n << BigInt(bitsPerEntry)) - 1n

    function readLocalPaletteIndex(flatIndex: number): number {
      if (!longArray || longArray.length === 0) return 0
      const startBit = BigInt(flatIndex * bitsPerEntry)
      const startLongIndex = Number(startBit / 64n)
      if (startLongIndex >= longArray.length) return 0
      const bitOffset = Number(startBit % 64n)

      const element = BigInt.asUintN(64, longArray[startLongIndex])
      let result = element >> BigInt(bitOffset)

      const bitsInFirstLong = 64 - bitOffset
      if (bitsInFirstLong < bitsPerEntry && startLongIndex + 1 < longArray.length) {
        const nextElement = BigInt.asUintN(64, longArray[startLongIndex + 1])
        result |= nextElement << BigInt(bitsInFirstLong)
      }

      return Number(result & mask)
    }

    // Process blocks in flat order: (y * sizeZ + z) * sizeX + x
    for (let y = 0; y < region.sizeY; ++y) {
      for (let z = 0; z < region.sizeZ; ++z) {
        for (let x = 0; x < region.sizeX; ++x) {
          const flatIndex = (y * region.sizeZ + z) * region.sizeX + x
          const localStateId = readLocalPaletteIndex(flatIndex)
          const globalStateId = localToGlobalPalette[localStateId] ?? 0

          // Flip coordinate if size was negative
          const relX = region.rawSizeX < 0 ? region.sizeX - 1 - x : x
          const relY = region.rawSizeY < 0 ? region.sizeY - 1 - y : y
          const relZ = region.rawSizeZ < 0 ? region.sizeZ - 1 - z : z

          const targetX = region.minX + relX - globalMinX
          const targetY = region.minY + relY - globalMinY
          const targetZ = region.minZ + relZ - globalMinZ

          blockMap.set(`${targetX},${targetY},${targetZ}`, {
            state: globalStateId,
          })
        }
      }
    }

    // Process TileEntities in this region
    for (const te of region.tileEntities) {
      const rawTeX = Number(te.x ?? 0)
      const rawTeY = Number(te.y ?? 0)
      const rawTeZ = Number(te.z ?? 0)

      // In Litematica, tile entity coordinates are relative to the region
      const relX = region.rawSizeX < 0 ? region.sizeX - 1 - rawTeX : rawTeX
      const relY = region.rawSizeY < 0 ? region.sizeY - 1 - rawTeY : rawTeY
      const relZ = region.rawSizeZ < 0 ? region.sizeZ - 1 - rawTeZ : rawTeZ

      const targetX = region.minX + relX - globalMinX
      const targetY = region.minY + relY - globalMinY
      const targetZ = region.minZ + relZ - globalMinZ

      const key = `${targetX},${targetY},${targetZ}`
      const existing = blockMap.get(key)
      if (existing) {
        const cleanedTe = { ...te }
        delete cleanedTe.x
        delete cleanedTe.y
        delete cleanedTe.z
        existing.nbt = cleanedTe
      }
    }
  }

  // Convert blockMap to Vanilla blocks list
  const blocks: NbtRecord[] = []
  for (const [key, { state, nbt }] of blockMap.entries()) {
    const [x, y, z] = key.split(',').map(Number)
    const pos = [new Int32(x), new Int32(y), new Int32(z)]
    Object.defineProperty(pos, TAG_TYPE, {
      value: TAG.INT,
      enumerable: false,
      configurable: true,
      writable: true,
    })
    const blockEntry: NbtRecord = {
      pos,
      state: new Int32(state),
    }
    if (nbt) {
      blockEntry.nbt = nbt
    }
    blocks.push(blockEntry)
  }

  // Metadata if present
  const meta = root.Metadata as NbtRecord | undefined
  const name = typeof meta?.Name === 'string' ? meta.Name : undefined
  const author = typeof meta?.Author === 'string' ? meta.Author : undefined
  const description =
    typeof meta?.Description === 'string' ? meta.Description : undefined

  const dataVersion = Number(root.MinecraftDataVersion ?? 3955)

  const size = [new Int32(totalWidth), new Int32(totalHeight), new Int32(totalLength)]
  Object.defineProperty(size, TAG_TYPE, {
    value: TAG.INT,
    enumerable: false,
    configurable: true,
    writable: true,
  })
  Object.defineProperty(globalPalette, TAG_TYPE, {
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
    palette: globalPalette,
    blocks,
    DataVersion: new Int32(dataVersion),
  }

  return {
    format: 'litematic',
    root: vanillaRoot,
    name,
    author,
    description,
    warnings: [],
  }
}
