import { VANILLA_BLOCK_IDS_26_2 } from './vanilla-blocks-26_2'

export const VANILLA_BLOCK_SET = new Set<string>(VANILLA_BLOCK_IDS_26_2)

/**
 * Bloques más comunes para sugerencias rápidas y datalist.
 */
export const COMMON_BLOCKS: string[] = [
  'minecraft:oak_planks',
  'minecraft:spruce_planks',
  'minecraft:birch_planks',
  'minecraft:jungle_planks',
  'minecraft:acacia_planks',
  'minecraft:dark_oak_planks',
  'minecraft:mangrove_planks',
  'minecraft:cherry_planks',
  'minecraft:bamboo_planks',
  'minecraft:crimson_planks',
  'minecraft:warped_planks',
  'minecraft:oak_log',
  'minecraft:spruce_log',
  'minecraft:birch_log',
  'minecraft:stone',
  'minecraft:stone_bricks',
  'minecraft:mossy_stone_bricks',
  'minecraft:cracked_stone_bricks',
  'minecraft:cobblestone',
  'minecraft:mossy_cobblestone',
  'minecraft:smooth_stone',
  'minecraft:deepslate',
  'minecraft:cobbled_deepslate',
  'minecraft:polished_deepslate',
  'minecraft:deepslate_bricks',
  'minecraft:deepslate_tiles',
  'minecraft:bricks',
  'minecraft:mud_bricks',
  'minecraft:quartz_block',
  'minecraft:smooth_quartz',
  'minecraft:white_concrete',
  'minecraft:light_gray_concrete',
  'minecraft:gray_concrete',
  'minecraft:black_concrete',
  'minecraft:red_concrete',
  'minecraft:orange_concrete',
  'minecraft:yellow_concrete',
  'minecraft:lime_concrete',
  'minecraft:green_concrete',
  'minecraft:cyan_concrete',
  'minecraft:light_blue_concrete',
  'minecraft:blue_concrete',
  'minecraft:purple_concrete',
  'minecraft:magenta_concrete',
  'minecraft:pink_concrete',
  'minecraft:brown_concrete',
  'minecraft:terracotta',
  'minecraft:white_terracotta',
  'minecraft:glass',
  'minecraft:tinted_glass',
  'minecraft:white_stained_glass',
  'minecraft:light_gray_stained_glass',
  'minecraft:gray_stained_glass',
  'minecraft:black_stained_glass',
  'minecraft:light_blue_stained_glass',
  'minecraft:sandstone',
  'minecraft:smooth_sandstone',
  'minecraft:red_sandstone',
  'minecraft:prismarine',
  'minecraft:prismarine_bricks',
  'minecraft:dark_prismarine',
  'minecraft:sea_lantern',
  'minecraft:glowstone',
  'minecraft:shroomlight',
  'minecraft:copper_block',
  'minecraft:iron_block',
  'minecraft:gold_block',
]

/**
 * Colores en español e inglés mapeados a palabras clave de Minecraft
 */
const COLOR_KEYWORDS: Record<string, string[]> = {
  // Blanco / White
  blanco: ['white', 'quartz', 'snow', 'diorite', 'calcite', 'bone_block', 'iron_block'],
  white: ['white', 'quartz', 'snow', 'diorite', 'calcite', 'bone_block', 'iron_block'],

  // Negro / Black
  negro: ['black', 'obsidian', 'netherite', 'blackstone', 'coal_block', 'basalt'],
  black: ['black', 'obsidian', 'netherite', 'blackstone', 'coal_block', 'basalt'],

  // Gris / Gray / Grey
  gris: ['gray', 'grey', 'stone', 'andesite', 'cobblestone', 'deepslate', 'gravel', 'tuff'],
  gray: ['gray', 'grey', 'stone', 'andesite', 'cobblestone', 'deepslate', 'gravel', 'tuff'],
  grey: ['gray', 'grey', 'stone', 'andesite', 'cobblestone', 'deepslate', 'gravel', 'tuff'],

  // Rojo / Red
  rojo: ['red', 'crimson', 'nether_brick', 'brick', 'redstone', 'magma'],
  red: ['red', 'crimson', 'nether_brick', 'brick', 'redstone', 'magma'],

  // Azul / Blue
  azul: ['blue', 'lapis', 'warped'],
  blue: ['blue', 'lapis', 'warped'],

  // Celeste / Light Blue / Cyan
  celeste: ['light_blue', 'cyan', 'prismarine'],
  'light blue': ['light_blue', 'cyan', 'prismarine'],
  cian: ['cyan', 'prismarine', 'light_blue', 'warped'],
  cyan: ['cyan', 'prismarine', 'light_blue', 'warped'],

  // Verde / Green / Lima / Lime
  verde: ['green', 'lime', 'moss', 'leaves', 'grass', 'emerald', 'melon', 'sculk'],
  green: ['green', 'lime', 'moss', 'leaves', 'grass', 'emerald', 'melon', 'sculk'],
  lima: ['lime'],
  lime: ['lime'],

  // Amarillo / Yellow
  amarillo: ['yellow', 'gold', 'sponge', 'hay_block', 'bamboo'],
  yellow: ['yellow', 'gold', 'sponge', 'hay_block', 'bamboo'],

  // Naranja / Orange
  naranja: ['orange', 'acacia', 'copper', 'pumpkin', 'honey'],
  orange: ['orange', 'acacia', 'copper', 'pumpkin', 'honey'],

  // Marrón / Brown
  marron: ['brown', 'oak', 'spruce', 'dark_oak', 'dirt', 'mud', 'mud_bricks', 'wood'],
  marrón: ['brown', 'oak', 'spruce', 'dark_oak', 'dirt', 'mud', 'mud_bricks', 'wood'],
  brown: ['brown', 'oak', 'spruce', 'dark_oak', 'dirt', 'mud', 'mud_bricks', 'wood'],

  // Morado / Púrpura / Purple / Magenta / Violeta
  morado: ['purple', 'magenta', 'purpur', 'amethyst', 'shulker'],
  purpura: ['purple', 'magenta', 'purpur', 'amethyst', 'shulker'],
  púrpura: ['purple', 'magenta', 'purpur', 'amethyst', 'shulker'],
  violeta: ['purple', 'magenta', 'amethyst'],
  purple: ['purple', 'magenta', 'purpur', 'amethyst', 'shulker'],
  magenta: ['magenta', 'purple'],

  // Rosa / Pink
  rosa: ['pink', 'cherry'],
  pink: ['pink', 'cherry'],
}

/**
 * Categorías y familias de materiales
 */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  madera: ['planks', 'log', 'wood', 'stem', 'hyphae'],
  wood: ['planks', 'log', 'wood', 'stem', 'hyphae'],
  tablones: ['planks'],
  planks: ['planks'],
  tronco: ['log', 'wood'],
  log: ['log', 'wood'],
  piedra: ['stone', 'cobblestone', 'deepslate', 'andesite', 'diorite', 'granite', 'tuff', 'basalt', 'blackstone'],
  stone: ['stone', 'cobblestone', 'deepslate', 'andesite', 'diorite', 'granite', 'tuff', 'basalt', 'blackstone'],
  pizarra: ['deepslate'],
  deepslate: ['deepslate'],
  vidrio: ['glass'],
  cristal: ['glass'],
  glass: ['glass'],
  ladrillo: ['brick', 'bricks'],
  ladrillos: ['brick', 'bricks'],
  bricks: ['brick', 'bricks'],
  hormigon: ['concrete'],
  hormigón: ['concrete'],
  concreto: ['concrete'],
  concrete: ['concrete'],
  terracota: ['terracotta'],
  terracotta: ['terracotta'],
  lana: ['wool'],
  wool: ['wool'],
  luz: ['sea_lantern', 'glowstone', 'shroomlight', 'lantern', 'redstone_lamp', 'froglight', 'ochre_froglight', 'pearlescent_froglight', 'verdant_froglight'],
  light: ['sea_lantern', 'glowstone', 'shroomlight', 'lantern', 'redstone_lamp', 'froglight'],
}

/**
 * Nombres y alias en español para resolución directa
 */
const SPANISH_NAMES: Record<string, string> = {
  // Maderas
  roble: 'minecraft:oak_planks',
  madera: 'minecraft:oak_planks',
  madera_roble: 'minecraft:oak_planks',
  pino: 'minecraft:spruce_planks',
  abeto: 'minecraft:spruce_planks',
  abedul: 'minecraft:birch_planks',
  jungla: 'minecraft:jungle_planks',
  acacia: 'minecraft:acacia_planks',
  roble_oscuro: 'minecraft:dark_oak_planks',
  mangle: 'minecraft:mangrove_planks',
  manglar: 'minecraft:mangrove_planks',
  cerezo: 'minecraft:cherry_planks',
  bambu: 'minecraft:bamboo_planks',
  bambú: 'minecraft:bamboo_planks',
  carmesí: 'minecraft:crimson_planks',
  carmesi: 'minecraft:crimson_planks',
  distorsionado: 'minecraft:warped_planks',

  // Piedras y derivados
  piedra: 'minecraft:stone',
  roca: 'minecraft:cobblestone',
  adoquin: 'minecraft:cobblestone',
  adoquín: 'minecraft:cobblestone',
  ladrillo: 'minecraft:bricks',
  ladrillos: 'minecraft:bricks',
  ladrillos_piedra: 'minecraft:stone_bricks',
  pizarra: 'minecraft:deepslate',
  pizarra_profunda: 'minecraft:deepslate',
  cuarzo: 'minecraft:quartz_block',
  arenisca: 'minecraft:sandstone',
  granito: 'minecraft:granite',
  diorita: 'minecraft:diorite',
  andesita: 'minecraft:andesite',
  basalto: 'minecraft:basalt',
  obsidiana: 'minecraft:obsidian',

  // Vidrios
  cristal: 'minecraft:glass',
  vidrio: 'minecraft:glass',
  cristal_blanco: 'minecraft:white_stained_glass',
  vidrio_blanco: 'minecraft:white_stained_glass',
  cristal_tintado: 'minecraft:tinted_glass',

  // Concretos
  hormigon: 'minecraft:white_concrete',
  hormigón: 'minecraft:white_concrete',
  concreto: 'minecraft:white_concrete',
  hormigon_blanco: 'minecraft:white_concrete',
  hormigon_gris: 'minecraft:gray_concrete',
  hormigon_negro: 'minecraft:black_concrete',
  terracota: 'minecraft:terracotta',

  // Luces
  linterna_marina: 'minecraft:sea_lantern',
  piedra_luminosa: 'minecraft:glowstone',
}

/**
 * Normaliza cualquier entrada del usuario a un ID de bloque vanilla válido.
 */
export function normalizeBlockName(raw: string): string | null {
  if (!raw || typeof raw !== 'string') return null
  let name = raw.trim().toLowerCase()
  if (!name || name === 'air' || name === 'minecraft:air' || name === '0' || name === 'null' || name === 'vacio' || name === 'vacío' || name === 'none') {
    return null
  }

  if (SPANISH_NAMES[name]) return SPANISH_NAMES[name]

  if (!name.includes(':')) {
    const withNamespace = 'minecraft:' + name
    if (SPANISH_NAMES[name]) return SPANISH_NAMES[name]
    if (VANILLA_BLOCK_SET.has(withNamespace)) return withNamespace
    name = withNamespace
  }

  if (VANILLA_BLOCK_SET.has(name)) return name

  const clean = name.replace(/^minecraft:/, '').replace(/\s+/g, '_')
  if (SPANISH_NAMES[clean]) return SPANISH_NAMES[clean]
  if (VANILLA_BLOCK_SET.has('minecraft:' + clean)) return 'minecraft:' + clean

  return null
}

export function isValidVanillaBlock(name: string): boolean {
  return VANILLA_BLOCK_SET.has(name)
}

/**
 * Formatea un ID a nombre legible (en inglés legible o enriquecido).
 */
export function formatBlockDisplayName(blockId: string): string {
  const withoutNamespace = blockId.replace(/^minecraft:/, '')
  return withoutNamespace
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export type BlockSearchResult = {
  id: string
  displayName: string
}

/**
 * Búsqueda inteligente por nombre en inglés, español, categoría o COLOR.
 * Permite buscar "rojo", "blue", "madera", "deepslate", "cristal", "white", etc.
 */
export function searchBlocks(query: string, limit: number = 30): BlockSearchResult[] {
  const q = query.trim().toLowerCase()
  if (!q) {
    return COMMON_BLOCKS.slice(0, limit).map((id) => ({
      id,
      displayName: formatBlockDisplayName(id),
    }))
  }

  // 1. Revisar si la consulta coincide con un color
  const colorMatches = COLOR_KEYWORDS[q]
  // 2. Revisar si coincide con una categoría de material
  const categoryMatches = CATEGORY_KEYWORDS[q]

  const results: BlockSearchResult[] = []
  const seen = new Set<string>()

  // Función auxiliar para agregar si no está duplicado y es vanilla válido
  const add = (id: string) => {
    if (!seen.has(id) && VANILLA_BLOCK_SET.has(id)) {
      seen.add(id)
      results.push({ id, displayName: formatBlockDisplayName(id) })
    }
  }

  // Coincidencia exacta o alias directo
  const direct = normalizeBlockName(q)
  if (direct) add(direct)

  // Coincidencias por palabras clave de color
  if (colorMatches) {
    for (const kw of colorMatches) {
      for (const id of COMMON_BLOCKS) {
        if (id.includes(kw)) add(id)
      }
      for (const id of VANILLA_BLOCK_IDS_26_2) {
        if (id.includes(kw) && results.length < limit * 2) add(id)
      }
    }
  }

  // Coincidencias por categoría
  if (categoryMatches) {
    for (const kw of categoryMatches) {
      for (const id of COMMON_BLOCKS) {
        if (id.includes(kw)) add(id)
      }
      for (const id of VANILLA_BLOCK_IDS_26_2) {
        if (id.includes(kw) && results.length < limit * 2) add(id)
      }
    }
  }

  // Búsqueda textual en bloques comunes primero
  for (const id of COMMON_BLOCKS) {
    const raw = id.replace(/^minecraft:/, '').toLowerCase()
    if (raw.includes(q) || raw.replace(/_/g, ' ').includes(q)) {
      add(id)
    }
  }

  // Búsqueda textual en todos los bloques vanilla
  for (const id of VANILLA_BLOCK_IDS_26_2) {
    if (results.length >= limit) break
    const raw = id.replace(/^minecraft:/, '').toLowerCase()
    if (raw.includes(q) || raw.replace(/_/g, ' ').includes(q)) {
      add(id)
    }
  }

  return results.slice(0, limit)
}
