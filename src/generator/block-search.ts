import { VANILLA_BLOCK_IDS_26_2 } from './vanilla-blocks-26_2'

export const VANILLA_BLOCK_SET = new Set<string>(VANILLA_BLOCK_IDS_26_2)

/**
 * Bloques más comunes para sugerencias rápidas y datalist.
 * Basado en las plantillas y bloques usados en generador-de-NBT.
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
 * Atajos y alias en español para que el usuario pueda escribir términos comunes
 * sin necesidad de recordar el ID técnico exacto en inglés.
 */
const ALIASES: Record<string, string> = {
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

  // Concretos / Hormigones
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
 * Soporta IDs con y sin namespace 'minecraft:', así como alias en español.
 */
export function normalizeBlockName(raw: string): string | null {
  if (!raw || typeof raw !== 'string') return null
  let name = raw.trim().toLowerCase()
  if (!name || name === 'air' || name === 'minecraft:air' || name === '0' || name === 'null' || name === 'vacio' || name === 'vacío' || name === 'none') {
    return null
  }

  // Verificar alias directos
  if (ALIASES[name]) return ALIASES[name]

  // Si no tiene namespace, probar con 'minecraft:'
  if (!name.includes(':')) {
    const withNamespace = 'minecraft:' + name
    if (ALIASES[name]) return ALIASES[name]
    if (VANILLA_BLOCK_SET.has(withNamespace)) return withNamespace
    name = withNamespace
  }

  if (VANILLA_BLOCK_SET.has(name)) return name

  // Probar limpiando guiones o espacios
  const clean = name.replace(/^minecraft:/, '').replace(/\s+/g, '_')
  if (ALIASES[clean]) return ALIASES[clean]
  if (VANILLA_BLOCK_SET.has('minecraft:' + clean)) return 'minecraft:' + clean

  return null
}

export function isValidVanillaBlock(name: string): boolean {
  return VANILLA_BLOCK_SET.has(name)
}

/**
 * Convierte un ID de bloque en un nombre legible para el usuario.
 * Ej: 'minecraft:deepslate_bricks' -> 'Deepslate Bricks'
 */
export function formatBlockDisplayName(blockId: string): string {
  const withoutNamespace = blockId.replace(/^minecraft:/, '')
  return withoutNamespace
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
