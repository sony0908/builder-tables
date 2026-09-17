import priceData from './data/block-prices-26_2.json'
import { VANILLA_BLOCK_IDS_26_2 } from './vanilla-blocks-26_2'
import type { PolicyPricing } from './survival-policy'

/** Ten points equal one emerald. The final structure total is rounded up. */
export const PRICE_POINTS_PER_EMERALD = 10
/** Minecraft scoreboards cannot safely store a value above this signed int. */
export const MAX_MINECRAFT_SCORE = 2_147_483_647

export type PriceCatalogGroup = {
  id: string
  label: string
  description: string
  points: number
  blocks: readonly string[]
}

type PriceRule = Omit<PriceCatalogGroup, 'blocks'> & {
  matches: (id: string) => boolean
}

type CountedMaterial = { name: string; count: number }
type PriceOverride = { id: string; points: number; label?: string }
type RecipeIngredient = { id: string; count: number }
type RecipeFloor = {
  id: string
  outputCount?: number
  ingredients: RecipeIngredient[]
}
type PriceData = {
  pointsPerEmerald: number
  recipeFloorPremium?: number
  overrides: PriceOverride[]
  recipeFloors?: RecipeFloor[]
}

const pathOf = (id: string) => id.replace(/^minecraft:/, '')
const has = (value: string, pattern: RegExp) => pattern.test(value)
const technical = new Set(['air', 'cave_air', 'void_air', 'structure_void'])
const special = new Set([
  'beacon',
  'conduit',
  'dragon_egg',
  'dragon_head',
  'dragon_wall_head',
  'elytra',
  'enchanted_golden_apple',
  'end_portal_frame',
  'frogspawn',
  'heart_of_the_sea',
  'heavy_core',
  'lodestone',
  'mace',
  'nautilus_shell',
  'nether_star',
  'respawn_anchor',
  'shulker_shell',
  'sniffer_egg',
  'spawner',
  'totem_of_undying',
  'trial_spawner',
  'trident',
  'turtle_egg',
  'vault',
  'wither_skeleton_skull',
])
const configuredPriceData = priceData as PriceData

if (configuredPriceData.pointsPerEmerald !== PRICE_POINTS_PER_EMERALD) {
  throw new Error('La unidad de precios 26.2 no coincide con el generador.')
}

export const PRICE_RECIPE_FLOOR_PREMIUM =
  configuredPriceData.recipeFloorPremium ?? 1

if (
  !Number.isFinite(PRICE_RECIPE_FLOOR_PREMIUM) ||
  PRICE_RECIPE_FLOOR_PREMIUM < 1
) {
  throw new Error('El recargo de fabricación 26.2 es inválido.')
}

const overriddenPoints = new Map(
  configuredPriceData.overrides.map((entry) => [entry.id, entry.points]),
)
const recipeFloors = new Map(
  (configuredPriceData.recipeFloors ?? []).map((entry) => [entry.id, entry]),
)

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
    label: 'Artefactos y progreso excepcional',
    description: 'Exploración única, jefes, End y objetos que no deben sustituir el progreso.',
    points: 640,
    matches: (id) =>
      special.has(pathOf(id)) ||
      has(pathOf(id), /music_disc|smithing_template|armor_trim|pottery_sherd|banner_pattern|spawn_egg/),
  },
  {
    id: 'rare',
    label: 'Minerales raros y exploración profunda',
    description: 'Diamante, esmeralda, netherita, amatista y materiales de alto progreso.',
    points: 200,
    matches: (id) =>
      has(pathOf(id), /diamond|emerald|netherite|ancient_debris|amethyst|ender_chest|shulker_box|gilded_blackstone/),
  },
  {
    id: 'nether_end',
    label: 'Nether, End y Deep Dark',
    description: 'Materiales de otras dimensiones y exploración de riesgo.',
    points: 60,
    matches: (id) =>
      has(pathOf(id), /nether|crimson|warped|basalt|blackstone|netherrack|soul_|glowstone|magma|quartz|chorus|purpur|end_stone|ender|obsidian|sculk|resin/),
  },
  {
    id: 'mechanisms',
    label: 'Mecanismos, metales y automatización',
    description: 'Circuitos, metales, raíles y bloques funcionales.',
    points: 50,
    matches: (id) =>
      has(pathOf(id), /redstone|copper|iron|gold|lapis|coal|piston|observer|hopper|dispenser|dropper|comparator|repeater|daylight_detector|lightning_rod|sculk_sensor|note_block|jukebox|target|tripwire|crafter|rail|bundle/),
  },
  {
    id: 'stations',
    label: 'Estaciones y almacenamiento',
    description: 'Mesas de trabajo, hornos, cofres y utilidades persistentes.',
    points: 40,
    matches: (id) =>
      has(pathOf(id), /crafting_table|stonecutter|smithing_table|cartography_table|fletching_table|loom|composter|grindstone|lectern|barrel|chest|furnace|smoker|brewing_stand|blast_furnace|chiseled_bookshelf/),
  },
  {
    id: 'wood',
    label: 'Madera y renovables',
    description: 'Maderas, bambú y componentes renovables.',
    points: 10,
    matches: (id) =>
      has(pathOf(id), /oak|spruce|birch|jungle|acacia|mangrove|cherry|bamboo|log|wood|planks|ladder|scaffolding/),
  },
  {
    id: 'construction',
    label: 'Construcción y decoración',
    description: 'Vidrio, colores, piedra trabajada, iluminación y detalles.',
    points: 20,
    matches: (id) =>
      has(pathOf(id), /glass|wool|carpet|terracotta|concrete|brick|tile|polished|chiseled|smooth_|cut_|slab|stairs|wall|fence|door|trapdoor|bed|banner|candle|lantern|torch|coral|flower|pot|chain/),
  },
  {
    id: 'natural',
    label: 'Naturales y base',
    description: 'Terreno, piedra y cualquier bloque vanilla no clasificado arriba.',
    points: 5,
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
  'stations',
  'mechanisms',
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

/**
 * Inventory items must be deliberately represented in the tariff. Blocks are
 * catalogued exhaustively; non-block items need an override or a recipe floor.
 */
export function hasExplicitSurvivalPrice(id: string) {
  return (
    groupForBlock.has(id) ||
    overriddenPoints.has(id) ||
    recipeFloors.has(id)
  )
}

function editorialPricePoints(id: string) {
  return (
    overriddenPoints.get(id) ??
    groupForBlock.get(id)?.points ??
    PRICE_RULES.find((rule) => rule.matches(id))?.points ??
    5
  )
}

function recipeFloorPoints(id: string, ancestry: ReadonlySet<string>): number | undefined {
  const recipe = recipeFloors.get(id)
  if (!recipe || ancestry.has(id)) return undefined

  const nextAncestry = new Set(ancestry)
  nextAncestry.add(id)
  const ingredientPoints: number = recipe.ingredients.reduce(
    (total, ingredient) =>
      total +
      Math.max(0, Math.trunc(ingredient.count)) *
        getPricePointsInternal(ingredient.id, nextAncestry),
    0,
  )
  const outputCount = Math.max(1, Math.trunc(recipe.outputCount ?? 1))
  return Math.ceil(
    (ingredientPoints / outputCount) * PRICE_RECIPE_FLOOR_PREMIUM,
  )
}

function getPricePointsInternal(id: string, ancestry: ReadonlySet<string>): number {
  const editorial = editorialPricePoints(id)
  const recipeFloor: number | undefined = recipeFloorPoints(id, ancestry)
  return recipeFloor === undefined ? editorial : Math.max(editorial, recipeFloor)
}

/** Uses the same strict rules for blocks and permitted vanilla inventory items. */
export function getPricePoints(id: string) {
  return getPricePointsInternal(id, new Set())
}

export function getBlockPricePoints(blockId: string) {
  return getPricePoints(blockId)
}

export function calculateStructurePrice(
  materials: readonly CountedMaterial[],
  policyPricing?: PolicyPricing,
) {
  const replaced = new Map(
    policyPricing?.replacements.map((entry) => [entry.name, entry.count]) ?? [],
  )
  const materialPoints = materials.reduce((total, material) => {
    const count = Math.max(
      0,
      Math.trunc(material.count) - (replaced.get(material.name) ?? 0),
    )
    return total + count * getPricePoints(material.name)
  }, 0)
  const dependencyPoints = (policyPricing?.dependencies ?? []).reduce(
    (total, dependency) =>
      total +
      Math.max(0, Math.trunc(dependency.count)) *
        getPricePoints(dependency.name),
    0,
  )
  const embeddedItemPoints = (policyPricing?.embeddedItems ?? []).reduce(
    (total, item) =>
      total + Math.max(0, Math.trunc(item.count)) * getPricePoints(item.name),
    0,
  )

  return Math.ceil(
    (materialPoints + dependencyPoints + embeddedItemPoints) /
      PRICE_POINTS_PER_EMERALD,
  )
}

export function formatBlockPrice(points: number) {
  return (points / PRICE_POINTS_PER_EMERALD).toLocaleString('es-CL', {
    maximumFractionDigits: 1,
  })
}
