import { Int32 } from 'nbtify'
import type { ConvertedStructure, NbtRecord } from './types'

const WOOL_COLORS = [
  'white',
  'orange',
  'magenta',
  'light_blue',
  'yellow',
  'lime',
  'pink',
  'gray',
  'light_gray',
  'cyan',
  'purple',
  'blue',
  'brown',
  'green',
  'red',
  'black',
]

const WOOD_TYPES = ['oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark_oak']
const STONE_TYPES = [
  'stone',
  'granite',
  'polished_granite',
  'diorite',
  'polished_diorite',
  'andesite',
  'polished_andesite',
]
const DIRT_TYPES = ['dirt', 'coarse_dirt', 'podzol']
const SAND_TYPES = ['sand', 'red_sand']
const SANDSTONE_TYPES = ['sandstone', 'chiseled_sandstone', 'cut_sandstone']
const PRISMARINE_TYPES = ['prismarine', 'prismarine_bricks', 'dark_prismarine']
const STONE_BRICK_TYPES = [
  'stone_bricks',
  'mossy_stone_bricks',
  'cracked_stone_bricks',
  'chiseled_stone_bricks',
]
const QUARTZ_TYPES = [
  'quartz_block',
  'chiseled_quartz_block',
  'quartz_pillar',
]

function parseStairs(woodOrStone: string, data: number) {
  const facingMap = ['east', 'west', 'south', 'north']
  const facing = facingMap[data & 3] ?? 'east'
  const half = (data & 4) !== 0 ? 'top' : 'bottom'
  return {
    name: `minecraft:${woodOrStone}_stairs`,
    properties: { facing, half, shape: 'straight' },
  }
}

function parseLog(isLog2: boolean, data: number) {
  const wood = isLog2
    ? (data & 3) === 0
      ? 'acacia'
      : 'dark_oak'
    : WOOD_TYPES[data & 3] ?? 'oak'
  const axisBits = data & 12
  const axis = axisBits === 4 ? 'x' : axisBits === 8 ? 'z' : 'y'
  return {
    name: `minecraft:${wood}_log`,
    properties: { axis },
  }
}

function parseLeaves(isLeaves2: boolean, data: number) {
  const wood = isLeaves2
    ? (data & 3) === 0
      ? 'acacia'
      : 'dark_oak'
    : WOOD_TYPES[data & 3] ?? 'oak'
  return {
    name: `minecraft:${wood}_leaves`,
    properties: { persistent: 'true' },
  }
}

function parseDoor(wood: string, data: number): { name: string; properties: Record<string, string> } {
  if ((data & 8) !== 0) {
    const hinge = (data & 1) !== 0 ? 'right' : 'left'
    return {
      name: `minecraft:${wood}_door`,
      properties: { half: 'upper', hinge },
    }
  }
  const facingMap = ['east', 'south', 'west', 'north']
  const facing = facingMap[data & 3] ?? 'north'
  const open = (data & 4) !== 0 ? 'true' : 'false'
  return {
    name: `minecraft:${wood}_door`,
    properties: { half: 'lower', facing, open },
  }
}

function parseTrapdoor(name: string, data: number) {
  const facingMap = ['north', 'south', 'west', 'east']
  const facing = facingMap[data & 3] ?? 'north'
  const open = (data & 4) !== 0 ? 'true' : 'false'
  const half = (data & 8) !== 0 ? 'top' : 'bottom'
  return {
    name,
    properties: { facing, open, half },
  }
}

function parseTorch(data: number) {
  if (data === 5 || data === 0) {
    return { name: 'minecraft:torch' }
  }
  const map: Record<number, string> = {
    1: 'east',
    2: 'west',
    3: 'south',
    4: 'north',
  }
  const facing = map[data] ?? 'north'
  return {
    name: 'minecraft:wall_torch',
    properties: { facing },
  }
}

export function mapLegacyBlock(
  id: number,
  data: number,
): { name: string; properties?: Record<string, string> } {
  switch (id) {
    case 0:
      return { name: 'minecraft:air' }
    case 1:
      return { name: `minecraft:${STONE_TYPES[data] ?? 'stone'}` }
    case 2:
      return { name: 'minecraft:grass_block' }
    case 3:
      return { name: `minecraft:${DIRT_TYPES[data] ?? 'dirt'}` }
    case 4:
      return { name: 'minecraft:cobblestone' }
    case 5:
      return { name: `minecraft:${WOOD_TYPES[data] ?? 'oak'}_planks` }
    case 7:
      return { name: 'minecraft:bedrock' }
    case 8:
    case 9:
      return { name: 'minecraft:water' }
    case 10:
    case 11:
      return { name: 'minecraft:lava' }
    case 12:
      return { name: `minecraft:${SAND_TYPES[data] ?? 'sand'}` }
    case 13:
      return { name: 'minecraft:gravel' }
    case 14:
      return { name: 'minecraft:gold_ore' }
    case 15:
      return { name: 'minecraft:iron_ore' }
    case 16:
      return { name: 'minecraft:coal_ore' }
    case 17:
      return parseLog(false, data)
    case 18:
      return parseLeaves(false, data)
    case 19:
      return { name: data === 1 ? 'minecraft:wet_sponge' : 'minecraft:sponge' }
    case 20:
      return { name: 'minecraft:glass' }
    case 21:
      return { name: 'minecraft:lapis_ore' }
    case 22:
      return { name: 'minecraft:lapis_block' }
    case 23:
      return { name: 'minecraft:dispenser' }
    case 24:
      return { name: `minecraft:${SANDSTONE_TYPES[data] ?? 'sandstone'}` }
    case 25:
      return { name: 'minecraft:note_block' }
    case 26:
      return { name: 'minecraft:red_bed' }
    case 27:
      return { name: 'minecraft:powered_rail' }
    case 28:
      return { name: 'minecraft:detector_rail' }
    case 29:
      return { name: 'minecraft:sticky_piston' }
    case 30:
      return { name: 'minecraft:cobweb' }
    case 31:
      return { name: data === 2 ? 'minecraft:fern' : 'minecraft:short_grass' }
    case 32:
      return { name: 'minecraft:dead_bush' }
    case 33:
      return { name: 'minecraft:piston' }
    case 35:
      return { name: `minecraft:${WOOL_COLORS[data & 15]}_wool` }
    case 37:
      return { name: 'minecraft:dandelion' }
    case 38: {
      const flowers = [
        'poppy',
        'blue_orchid',
        'allium',
        'azure_bluet',
        'red_tulip',
        'orange_tulip',
        'white_tulip',
        'pink_tulip',
        'oxeye_daisy',
      ]
      return { name: `minecraft:${flowers[data] ?? 'poppy'}` }
    }
    case 41:
      return { name: 'minecraft:gold_block' }
    case 42:
      return { name: 'minecraft:iron_block' }
    case 43: {
      const slabTypes = [
        'stone_slab',
        'sandstone_slab',
        'petrified_oak_slab',
        'cobblestone_slab',
        'brick_slab',
        'stone_brick_slab',
        'nether_brick_slab',
        'quartz_slab',
      ]
      return {
        name: `minecraft:${slabTypes[data & 7] ?? 'stone_slab'}`,
        properties: { type: 'double' },
      }
    }
    case 44: {
      const slabTypes = [
        'stone_slab',
        'sandstone_slab',
        'petrified_oak_slab',
        'cobblestone_slab',
        'brick_slab',
        'stone_brick_slab',
        'nether_brick_slab',
        'quartz_slab',
      ]
      const half = (data & 8) !== 0 ? 'top' : 'bottom'
      return {
        name: `minecraft:${slabTypes[data & 7] ?? 'stone_slab'}`,
        properties: { type: half },
      }
    }
    case 45:
      return { name: 'minecraft:bricks' }
    case 46:
      return { name: 'minecraft:tnt' }
    case 47:
      return { name: 'minecraft:bookshelf' }
    case 48:
      return { name: 'minecraft:mossy_cobblestone' }
    case 49:
      return { name: 'minecraft:obsidian' }
    case 50:
      return parseTorch(data)
    case 51:
      return { name: 'minecraft:fire' }
    case 52:
      return { name: 'minecraft:spawner' }
    case 53:
      return parseStairs('oak', data)
    case 54: {
      const facingMap = ['north', 'north', 'north', 'south', 'west', 'east']
      return {
        name: 'minecraft:chest',
        properties: { facing: facingMap[data] ?? 'north' },
      }
    }
    case 56:
      return { name: 'minecraft:diamond_ore' }
    case 57:
      return { name: 'minecraft:diamond_block' }
    case 58:
      return { name: 'minecraft:crafting_table' }
    case 60:
      return { name: 'minecraft:farmland' }
    case 61:
    case 62:
      return { name: 'minecraft:furnace' }
    case 64:
      return parseDoor('oak', data)
    case 65: {
      const facingMap = ['north', 'north', 'north', 'south', 'west', 'east']
      return {
        name: 'minecraft:ladder',
        properties: { facing: facingMap[data] ?? 'north' },
      }
    }
    case 66:
      return { name: 'minecraft:rail' }
    case 67:
      return parseStairs('cobblestone', data)
    case 68:
      return { name: 'minecraft:oak_wall_sign' }
    case 69:
      return { name: 'minecraft:lever' }
    case 70:
      return { name: 'minecraft:stone_pressure_plate' }
    case 71:
      return parseDoor('iron', data)
    case 72:
      return { name: 'minecraft:oak_pressure_plate' }
    case 73:
    case 74:
      return { name: 'minecraft:redstone_ore' }
    case 76:
      return { name: 'minecraft:redstone_torch' }
    case 77:
      return { name: 'minecraft:stone_button' }
    case 78:
      return { name: 'minecraft:snow' }
    case 79:
      return { name: 'minecraft:ice' }
    case 80:
      return { name: 'minecraft:snow_block' }
    case 81:
      return { name: 'minecraft:cactus' }
    case 82:
      return { name: 'minecraft:clay' }
    case 85:
      return { name: 'minecraft:oak_fence' }
    case 86:
      return { name: 'minecraft:carved_pumpkin' }
    case 87:
      return { name: 'minecraft:netherrack' }
    case 88:
      return { name: 'minecraft:soul_sand' }
    case 89:
      return { name: 'minecraft:glowstone' }
    case 91:
      return { name: 'minecraft:jack_o_lantern' }
    case 95:
      return { name: `minecraft:${WOOL_COLORS[data & 15]}_stained_glass` }
    case 96:
      return parseTrapdoor('minecraft:oak_trapdoor', data)
    case 97:
      return { name: 'minecraft:infested_stone' }
    case 98:
      return { name: `minecraft:${STONE_BRICK_TYPES[data] ?? 'stone_bricks'}` }
    case 101:
      return { name: 'minecraft:iron_bars' }
    case 102:
      return { name: 'minecraft:glass_pane' }
    case 103:
      return { name: 'minecraft:melon' }
    case 106:
      return { name: 'minecraft:vine' }
    case 107:
      return { name: 'minecraft:oak_fence_gate' }
    case 108:
      return parseStairs('brick', data)
    case 109:
      return parseStairs('stone_brick', data)
    case 110:
      return { name: 'minecraft:mycelium' }
    case 111:
      return { name: 'minecraft:lily_pad' }
    case 112:
      return { name: 'minecraft:nether_bricks' }
    case 113:
      return { name: 'minecraft:nether_brick_fence' }
    case 114:
      return parseStairs('nether_brick', data)
    case 116:
      return { name: 'minecraft:enchanting_table' }
    case 118:
      return { name: 'minecraft:cauldron' }
    case 120:
      return { name: 'minecraft:end_portal_frame' }
    case 121:
      return { name: 'minecraft:end_stone' }
    case 123:
    case 124:
      return { name: 'minecraft:redstone_lamp' }
    case 125: {
      const wood = WOOD_TYPES[data & 7] ?? 'oak'
      return {
        name: `minecraft:${wood}_slab`,
        properties: { type: 'double' },
      }
    }
    case 126: {
      const wood = WOOD_TYPES[data & 7] ?? 'oak'
      const half = (data & 8) !== 0 ? 'top' : 'bottom'
      return {
        name: `minecraft:${wood}_slab`,
        properties: { type: half },
      }
    }
    case 128:
      return parseStairs('sandstone', data)
    case 129:
      return { name: 'minecraft:emerald_ore' }
    case 130:
      return { name: 'minecraft:ender_chest' }
    case 131:
      return { name: 'minecraft:tripwire_hook' }
    case 133:
      return { name: 'minecraft:emerald_block' }
    case 134:
      return parseStairs('spruce', data)
    case 135:
      return parseStairs('birch', data)
    case 136:
      return parseStairs('jungle', data)
    case 137:
      return { name: 'minecraft:command_block' }
    case 138:
      return { name: 'minecraft:beacon' }
    case 139:
      return {
        name: data === 1 ? 'minecraft:mossy_cobblestone_wall' : 'minecraft:cobblestone_wall',
      }
    case 143:
      return { name: 'minecraft:oak_button' }
    case 145:
      return { name: 'minecraft:anvil' }
    case 146:
      return { name: 'minecraft:trapped_chest' }
    case 151:
      return { name: 'minecraft:daylight_detector' }
    case 152:
      return { name: 'minecraft:redstone_block' }
    case 153:
      return { name: 'minecraft:nether_quartz_ore' }
    case 154:
      return { name: 'minecraft:hopper' }
    case 155:
      return { name: `minecraft:${QUARTZ_TYPES[data] ?? 'quartz_block'}` }
    case 156:
      return parseStairs('quartz', data)
    case 157:
      return { name: 'minecraft:activator_rail' }
    case 158:
      return { name: 'minecraft:dropper' }
    case 159:
      return { name: `minecraft:${WOOL_COLORS[data & 15]}_terracotta` }
    case 160:
      return { name: `minecraft:${WOOL_COLORS[data & 15]}_stained_glass_pane` }
    case 161:
      return parseLeaves(true, data)
    case 162:
      return parseLog(true, data)
    case 163:
      return parseStairs('acacia', data)
    case 164:
      return parseStairs('dark_oak', data)
    case 165:
      return { name: 'minecraft:slime_block' }
    case 166:
      return { name: 'minecraft:barrier' }
    case 167:
      return parseTrapdoor('minecraft:iron_trapdoor', data)
    case 168:
      return { name: `minecraft:${PRISMARINE_TYPES[data] ?? 'prismarine'}` }
    case 169:
      return { name: 'minecraft:sea_lantern' }
    case 170:
      return { name: 'minecraft:hay_block' }
    case 171:
      return { name: `minecraft:${WOOL_COLORS[data & 15]}_carpet` }
    case 172:
      return { name: 'minecraft:terracotta' }
    case 173:
      return { name: 'minecraft:coal_block' }
    case 174:
      return { name: 'minecraft:packed_ice' }
    case 179:
      return { name: 'minecraft:red_sandstone' }
    case 180:
      return parseStairs('red_sandstone', data)
    case 182: {
      const half = (data & 8) !== 0 ? 'top' : 'bottom'
      return {
        name: 'minecraft:red_sandstone_slab',
        properties: { type: half },
      }
    }
    case 183:
      return { name: 'minecraft:spruce_fence_gate' }
    case 184:
      return { name: 'minecraft:birch_fence_gate' }
    case 185:
      return { name: 'minecraft:jungle_fence_gate' }
    case 186:
      return { name: 'minecraft:dark_oak_fence_gate' }
    case 187:
      return { name: 'minecraft:acacia_fence_gate' }
    case 188:
      return { name: 'minecraft:spruce_fence' }
    case 189:
      return { name: 'minecraft:birch_fence' }
    case 190:
      return { name: 'minecraft:jungle_fence' }
    case 191:
      return { name: 'minecraft:dark_oak_fence' }
    case 192:
      return { name: 'minecraft:acacia_fence' }
    case 193:
      return parseDoor('spruce', data)
    case 194:
      return parseDoor('birch', data)
    case 195:
      return parseDoor('jungle', data)
    case 196:
      return parseDoor('acacia', data)
    case 197:
      return parseDoor('dark_oak', data)
    case 198:
      return { name: 'minecraft:end_rod' }
    case 201:
      return { name: 'minecraft:purpur_block' }
    case 202:
      return { name: 'minecraft:purpur_pillar' }
    case 203:
      return parseStairs('purpur', data)
    case 204:
      return {
        name: 'minecraft:purpur_slab',
        properties: { type: 'double' },
      }
    case 205: {
      const half = (data & 8) !== 0 ? 'top' : 'bottom'
      return {
        name: 'minecraft:purpur_slab',
        properties: { type: half },
      }
    }
    case 206:
      return { name: 'minecraft:end_stone_bricks' }
    case 208:
      return { name: 'minecraft:dirt_path' }
    case 213:
      return { name: 'minecraft:magma_block' }
    case 214:
      return { name: 'minecraft:nether_wart_block' }
    case 215:
      return { name: 'minecraft:red_nether_bricks' }
    case 216:
      return { name: 'minecraft:bone_block' }
    case 218:
      return { name: 'minecraft:observer' }
    case 219:
      return { name: 'minecraft:white_shulker_box' }
    case 251:
      return { name: `minecraft:${WOOL_COLORS[data & 15]}_concrete` }
    case 252:
      return { name: `minecraft:${WOOL_COLORS[data & 15]}_concrete_powder` }
    default:
      if (id >= 220 && id <= 234) {
        const color = WOOL_COLORS[id - 219] ?? 'purple'
        return { name: `minecraft:${color}_shulker_box` }
      }
      if (id >= 235 && id <= 250) {
        const color = WOOL_COLORS[id - 235] ?? 'white'
        return { name: `minecraft:${color}_glazed_terracotta` }
      }
      return { name: 'minecraft:stone' }
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

export function convertLegacySchematicToVanilla(root: NbtRecord): ConvertedStructure {
  const width = Number(root.Width ?? 0)
  const height = Number(root.Height ?? 0)
  const length = Number(root.Length ?? 0)

  if (width < 1 || height < 1 || length < 1) {
    throw new Error(
      `Dimensiones inválidas en archivo .schematic: ${width}x${height}x${length}`,
    )
  }

  const rawBlocks = root.Blocks
  const rawData = root.Data
  if (!rawBlocks || !rawData) {
    throw new Error('El archivo .schematic no contiene los arrays Blocks o Data.')
  }

  const blocksBytes = toUint8Array(rawBlocks)
  const dataBytes = toUint8Array(rawData)
  const addBlocksBytes = root.AddBlocks ? toUint8Array(root.AddBlocks) : null

  // TileEntities
  const rawEntities = root.TileEntities
  const tileEntityMap = new Map<string, NbtRecord>()
  if (Array.isArray(rawEntities)) {
    for (const rawBe of rawEntities) {
      if (!rawBe || typeof rawBe !== 'object') continue
      const be = { ...(rawBe as NbtRecord) }
      const x = Number(be.x ?? 0)
      const y = Number(be.y ?? 0)
      const z = Number(be.z ?? 0)

      delete be.x
      delete be.y
      delete be.z

      let id = typeof be.id === 'string' ? be.id : ''
      if (id && !id.includes(':')) {
        id = 'minecraft:' + id.toLowerCase()
      }
      be.id = id

      tileEntityMap.set(`${x},${y},${z}`, be)
    }
  }

  // Palette building
  const palette: NbtRecord[] = []
  const paletteKeyToIndex = new Map<string, number>()

  function getOrAddPaletteEntry(entry: { name: string; properties?: Record<string, string> }): number {
    const props = entry.properties
    const propPairs = props
      ? Object.entries(props)
          .map(([k, v]) => `${k}=${v}`)
          .sort()
          .join(',')
      : ''
    const key = `${entry.name}[${propPairs}]`

    let index = paletteKeyToIndex.get(key)
    if (index === undefined) {
      index = palette.length
      paletteKeyToIndex.set(key, index)
      const record: NbtRecord = { Name: entry.name }
      if (props) record.Properties = props
      palette.push(record)
    }
    return index
  }

  // Pre-add air at 0
  getOrAddPaletteEntry({ name: 'minecraft:air' })

  const blocks: NbtRecord[] = []
  const totalVolume = width * height * length

  for (let y = 0; y < height; y++) {
    for (let z = 0; z < length; z++) {
      for (let x = 0; x < width; x++) {
        const index = (y * length + z) * width + x
        if (index >= totalVolume) continue

        let blockId = blocksBytes[index] ?? 0
        if (addBlocksBytes) {
          const addByte = addBlocksBytes[index >> 1] ?? 0
          const shift = (index & 1) !== 0 ? 4 : 0
          blockId |= ((addByte >> shift) & 0x0f) << 8
        }
        const blockData = (dataBytes[index] ?? 0) & 0x0f

        const modernState = mapLegacyBlock(blockId, blockData)
        const paletteId = getOrAddPaletteEntry(modernState)

        const blockEntry: NbtRecord = {
          pos: [new Int32(x), new Int32(y), new Int32(z)],
          state: new Int32(paletteId),
        }

        const te = tileEntityMap.get(`${x},${y},${z}`)
        if (te) {
          blockEntry.nbt = te
        }

        blocks.push(blockEntry)
      }
    }
  }

  const vanillaRoot: NbtRecord = {
    size: [new Int32(width), new Int32(height), new Int32(length)],
    palette,
    blocks,
    DataVersion: new Int32(3955),
  }

  return {
    format: 'legacy_schematic',
    root: vanillaRoot,
    warnings: [],
  }
}
