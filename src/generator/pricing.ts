import { VANILLA_BLOCK_IDS_26_2 } from './vanilla-blocks-26_2'

/** Ten points equal one emerald. The final structure total is rounded up. */
export const PRICE_POINTS_PER_EMERALD = 10

export type PriceCatalogGroup = {
  id: string
  label: string
  description: string
  points: number
  blocks: readonly string[]
}

type PriceRule = Omit<PriceCatalogGroup, 'blocks'> & {
  matches: (blockId: string) => boolean
}

type CountedMaterial = { name: string; count: number }

const pathOf = (blockId: string) => blockId.replace(/^minecraft:/, '')
const has = (value: string, pattern: RegExp) => pattern.test(value)
const technical = new Set(['air', 'cave_air', 'void_air', 'structure_void'])
const special = new Set([
  'beacon',
  'conduit',
  'dragon_egg',
  'end_portal_frame',
  'heavy_core',
  'lodestone',
  'respawn_anchor',
  'spawner',
  'trial_spawner',
  'vault',
])

// The order is intentional: the first matching rule wins.
const PRICE_RULES: readonly PriceRule[] = [
  {
    id: 'technical',
    label: 'Técnicos no cobrables',
    description: 'Aire y structure void; se excluyen del resultado generado.',
    points: 0,
    matches: (id) => technical.has(pathOf(id)),
  },
  {
    id: 'special',
    label: 'Especiales y de estructura',
    description: 'Botín, exploración o progreso avanzado.',
    points: 30,
    matches: (id) => special.has(pathOf(id)),
  },
  {
    id: 'rare',
    label: 'Minerales raros',
    description: 'Diamante, esmeralda, netherita, amatista y equivalentes.',
    points: 12,
    matches: (id) =>
      has(pathOf(id), /diamond|emerald|netherite|ancient_debris|amethyst|ender_chest|shulker_box|gilded_blackstone/),
  },
  {
    id: 'redstone',
    label: 'Minerales y redstone',
    description: 'Metales, circuitos, raíles y automatización.',
    points: 6,
    matches: (id) =>
      has(pathOf(id), /redstone|copper|iron|gold|lapis|coal|piston|observer|hopper|dispenser|dropper|comparator|repeater|daylight_detector|lightning_rod|sculk_sensor|note_block|jukebox|target|tripwire|crafter|rail/),
  },
  {
    id: 'nether_end',
    label: 'Nether y End',
    description: 'Otras dimensiones y Deep Dark.',
    points: 5,
    matches: (id) =>
      has(pathOf(id), /nether|crimson|warped|basalt|blackstone|netherrack|soul_|glowstone|magma|quartz|chorus|purpur|end_stone|obsidian|sculk|resin/),
  },
  {
    id: 'wood',
    label: 'Madera y estaciones',
    description: 'Maderas, bambú, muebles y bloques de trabajo.',
    points: 2,
    matches: (id) =>
      has(pathOf(id), /oak|spruce|birch|jungle|acacia|mangrove|cherry|bamboo|log|wood|planks|bookshelf|lectern|barrel|chest|crafting_table|cartography_table|fletching_table|smithing_table|loom|composter|ladder|scaffolding/),
  },
  {
    id: 'construction',
    label: 'Construcción y decoración',
    description: 'Vidrio, colores, piedra trabajada, iluminación y detalles.',
    points: 3,
    matches: (id) =>
      has(pathOf(id), /glass|wool|carpet|terracotta|concrete|brick|tile|polished|chiseled|smooth_|cut_|slab|stairs|wall|fence|door|trapdoor|bed|banner|candle|lantern|torch|coral|flower|pot|chain|grindstone|stonecutter/),
  },
  {
    id: 'natural',
    label: 'Naturales y base',
    description: 'Terreno, piedra y cualquier bloque vanilla no clasificado arriba.',
    points: 1,
    matches: () => true,
  },
]

const groupForBlock = new Map<string, PriceRule>()
for (const blockId of VANILLA_BLOCK_IDS_26_2) {
  const group = PRICE_RULES.find((rule) => rule.matches(blockId))
  if (group) groupForBlock.set(blockId, group)
}

const groupById = new Map(PRICE_RULES.map((group) => [group.id, group]))
const DISPLAY_ORDER = [
  'natural',
  'wood',
  'construction',
  'redstone',
  'nether_end',
  'rare',
  'special',
  'technical',
]

export const PRICE_CATALOG_GROUPS: readonly PriceCatalogGroup[] = DISPLAY_ORDER.map(
  (id) => {
    const group = groupById.get(id)
    if (!group) throw new Error('El catálogo de precios tiene un grupo inválido.')
    return {
      id: group.id,
      label: group.label,
      description: group.description,
      points: group.points,
      blocks: VANILLA_BLOCK_IDS_26_2.filter(
        (blockId) => groupForBlock.get(blockId)?.id === group.id,
      ).toSorted((left, right) => left.localeCompare(right)),
    }
  },
)

export const PRICE_CATALOG_BLOCK_COUNT = VANILLA_BLOCK_IDS_26_2.length

export function getBlockPricePoints(blockId: string) {
  return groupForBlock.get(blockId)?.points ?? 1
}

export function calculateStructurePrice(materials: readonly CountedMaterial[]) {
  const points = materials.reduce(
    (total, material) =>
      total + Math.max(0, Math.trunc(material.count)) * getBlockPricePoints(material.name),
    0,
  )
  return Math.ceil(points / PRICE_POINTS_PER_EMERALD)
}

export function formatBlockPrice(points: number) {
  return (points / PRICE_POINTS_PER_EMERALD).toLocaleString('es-CL', {
    maximumFractionDigits: 1,
  })
}
