import fixturesData from './data/survival-policy-26_2.fixtures.json'
import {
  calculateStructurePrice,
  getBlockPricePoints,
  getPricePoints,
} from './pricing'
import { validateEmbeddedItemsForPolicy } from './nbt'
import {
  applyPolicyEntity,
  applyPolicyState,
  createPolicyAccumulator,
  finalizePolicy,
  type PolicyBlockState,
} from './survival-policy'

type Fixture = {
  name: string
  states: Array<{ name: string; properties: Record<string, string> }>
  expect: {
    decision: 'allow' | 'reject'
    contains?: string
    dependencies?: string[]
    notDependencies?: string[]
    replaced?: string[]
  }
}

type FixtureData = { fixtures: Fixture[] }

const fixtures = (fixturesData as FixtureData).fixtures

function includesAll(values: readonly string[], expected: readonly string[]) {
  return expected.every((entry) => values.includes(entry))
}

function countFor(
  values: ReadonlyArray<{ name: string; count: number }>,
  name: string,
) {
  return values.find((entry) => entry.name === name)?.count ?? 0
}

function expectBlockPrice(id: string, expected: number) {
  const actual = getBlockPricePoints(id)
  if (actual !== expected) {
    throw new Error(id + ': se esperaba ' + expected + ' puntos y se obtuvo ' + actual + '.')
  }
}

export function runSurvivalPolicyFixtures() {
  fixtures.forEach((fixture) => {
    const accumulator = createPolicyAccumulator()
    let denial: string | undefined

    fixture.states.forEach((state) => {
      if (denial) return
      denial = applyPolicyState(accumulator, {
        name: state.name,
        properties: Object.entries(state.properties),
      } satisfies PolicyBlockState)
    })

    const result = finalizePolicy(accumulator)
    const error = denial ?? result.error
    const decision = error ? 'reject' : 'allow'

    if (decision !== fixture.expect.decision) {
      throw new Error(
        fixture.name + ': se esperaba ' + fixture.expect.decision + ' y se obtuvo ' + decision + '.',
      )
    }
    if (fixture.expect.contains && !error?.includes(fixture.expect.contains)) {
      throw new Error(fixture.name + ': falta el texto de diagnóstico esperado.')
    }

    const dependencies = result.summary.dependencies.map((entry) => entry.id)
    if (
      fixture.expect.dependencies &&
      !includesAll(dependencies, fixture.expect.dependencies)
    ) {
      throw new Error(fixture.name + ': faltan dependencias explícitas.')
    }
    if (
      fixture.expect.notDependencies?.some((entry) => dependencies.includes(entry))
    ) {
      throw new Error(fixture.name + ': incluye una dependencia que no corresponde.')
    }

    const replaced = result.pricing.replacements.map((entry) => entry.name)
    if (
      fixture.expect.replaced &&
      !includesAll(replaced, fixture.expect.replaced)
    ) {
      throw new Error(fixture.name + ': faltan sustituciones de precio.')
    }
  })

  const chestAccumulator = createPolicyAccumulator()
  const chestError = validateEmbeddedItemsForPolicy(
    {
      id: 'minecraft:chest',
      Items: [{ id: 'minecraft:barrier', count: 1 }],
    },
    'el cofre de prueba',
    chestAccumulator,
  )
  if (!chestError?.includes('minecraft:barrier')) {
    throw new Error('Un cofre con barrier no fue rechazado.')
  }

  const spawnEggAccumulator = createPolicyAccumulator()
  const spawnEggError = validateEmbeddedItemsForPolicy(
    { id: 'minecraft:chest', Items: [{ id: 'minecraft:wither_spawn_egg', count: 1 }] },
    'el cofre con huevo de aparición',
    spawnEggAccumulator,
  )
  if (!spawnEggError?.includes('minecraft:wither_spawn_egg')) {
    throw new Error('Un huevo de aparición no survival no fue rechazado.')
  }

  const lootTableAccumulator = createPolicyAccumulator()
  const lootTableError = validateEmbeddedItemsForPolicy(
    {
      id: 'minecraft:chest',
      LootTable: 'minecraft:chests/end_city_treasure',
    },
    'el cofre con botín generado',
    lootTableAccumulator,
  )
  if (!lootTableError?.includes('LootTable')) {
    throw new Error('Un cofre con loot table no fue rechazado.')
  }

  const entityLootAccumulator = createPolicyAccumulator()
  const entityLootError = validateEmbeddedItemsForPolicy(
    {
      id: 'minecraft:armor_stand',
      loot_table: 'minecraft:chests/end_city_treasure',
    },
    'la entidad con botín generado',
    entityLootAccumulator,
  )
  if (!entityLootError?.includes('loot_table')) {
    throw new Error('Una entidad con loot table no fue rechazada.')
  }

  const deathLootAccumulator = createPolicyAccumulator()
  const deathLootError = validateEmbeddedItemsForPolicy(
    { id: 'minecraft:armor_stand', DeathLootTable: 'minecraft:chests/end_city_treasure' },
    'la entidad con botín al morir',
    deathLootAccumulator,
  )
  if (!deathLootError?.includes('DeathLootTable')) {
    throw new Error('Una entidad con botín al morir no fue rechazada.')
  }

  const passengerAccumulator = createPolicyAccumulator()
  const passengerError = validateEmbeddedItemsForPolicy(
    {
      id: 'minecraft:armor_stand',
      Passengers: [{ id: 'minecraft:command_block_minecart' }],
    },
    'la entidad con pasajero',
    passengerAccumulator,
  )
  if (!passengerError?.includes('Passengers')) {
    throw new Error('Una entidad con pasajero no autorizado no fue rechazada.')
  }

  const beehiveAccumulator = createPolicyAccumulator()
  const beehiveError = validateEmbeddedItemsForPolicy(
    {
      id: 'minecraft:beehive',
      Bees: [{ EntityData: { id: 'minecraft:bee' } }],
    },
    'la colmena con abeja almacenada',
    beehiveAccumulator,
  )
  if (!beehiveError?.includes('Bees')) {
    throw new Error('Una colmena con entidad almacenada no fue rechazada.')
  }

  const equipmentAccumulator = createPolicyAccumulator()
  const equipmentError = validateEmbeddedItemsForPolicy(
    {
      id: 'minecraft:armor_stand',
      equipment: { mainhand: { id: 'minecraft:command_block' } },
    },
    'la entidad con equipamiento moderno',
    equipmentAccumulator,
  )
  if (!equipmentError?.includes('minecraft:command_block')) {
    throw new Error('El equipamiento moderno no se validó como stack.')
  }

  const remainderAccumulator = createPolicyAccumulator()
  const remainderError = validateEmbeddedItemsForPolicy(
    {
      id: 'minecraft:chest',
      Items: [
        {
          id: 'minecraft:apple',
          components: {
            'minecraft:use_remainder': { id: 'minecraft:command_block' },
          },
        },
      ],
    },
    'el cofre con use remainder',
    remainderAccumulator,
  )
  if (!remainderError?.includes('minecraft:use_remainder')) {
    throw new Error('use_remainder no fue rechazado como componente funcional.')
  }

  const trialKeyAccumulator = createPolicyAccumulator()
  const trialKeyError = validateEmbeddedItemsForPolicy(
    { id: 'minecraft:chest', Items: [{ id: 'minecraft:trial_key', count: 1 }] },
    'el cofre con trial key',
    trialKeyAccumulator,
  )
  if (!trialKeyError?.includes('minecraft:trial_key')) {
    throw new Error('Una trial key no fue rechazada.')
  }

  const forbiddenEntityAccumulator = createPolicyAccumulator()
  const forbiddenEntityError = applyPolicyEntity(
    forbiddenEntityAccumulator,
    'minecraft:command_block_minecart',
    'la entidad técnica',
  )
  if (!forbiddenEntityError?.includes('minecraft:command_block_minecart')) {
    throw new Error('Una entidad técnica no fue rechazada por la allowlist.')
  }
  const decorativeEntityAccumulator = createPolicyAccumulator()
  const decorativeEntityError = applyPolicyEntity(
    decorativeEntityAccumulator,
    'minecraft:armor_stand',
    'la entidad decorativa',
  )
  if (decorativeEntityError) {
    throw new Error('Una entidad decorativa survival fue rechazada.')
  }

  const enchantedItemAccumulator = createPolicyAccumulator()
  const enchantedItemError = validateEmbeddedItemsForPolicy(
    {
      id: 'minecraft:chest',
      Items: [
        {
          id: 'minecraft:diamond_sword',
          components: { 'minecraft:enchantments': { levels: { sharpness: 5 } } },
        },
      ],
    },
    'el cofre con espada encantada',
    enchantedItemAccumulator,
  )
  if (!enchantedItemError?.includes('minecraft:enchantments')) {
    throw new Error('Un ítem encantado no tasado no fue rechazado.')
  }

  const enchantedBookAccumulator = createPolicyAccumulator()
  const enchantedBookError = validateEmbeddedItemsForPolicy(
    {
      id: 'minecraft:chest',
      Items: [
        {
          id: 'minecraft:enchanted_book',
          components: {
            'minecraft:stored_enchantments': { levels: { mending: 1 } },
          },
        },
      ],
    },
    'el cofre con libro encantado',
    enchantedBookAccumulator,
  )
  if (!enchantedBookError?.includes('minecraft:stored_enchantments')) {
    throw new Error('Un libro encantado con encantamientos no tasados no fue rechazado.')
  }

  const gliderAccumulator = createPolicyAccumulator()
  const gliderError = validateEmbeddedItemsForPolicy(
    {
      id: 'minecraft:chest',
      Items: [
        {
          id: 'minecraft:diamond_chestplate',
          components: { 'minecraft:glider': {} },
        },
      ],
    },
    'el cofre con pechera funcional',
    gliderAccumulator,
  )
  if (!gliderError?.includes('minecraft:glider')) {
    throw new Error('Un componente funcional nuevo no fue rechazado.')
  }

  const unpricedItemAccumulator = createPolicyAccumulator()
  const unpricedItemError = validateEmbeddedItemsForPolicy(
    {
      id: 'minecraft:chest',
      Items: [{ id: 'minecraft:netherite_spear', count: 1 }],
    },
    'el cofre con ítem sin tarifario',
    unpricedItemAccumulator,
  )
  if (!unpricedItemError?.includes('sin precio survival explícito')) {
    throw new Error('Un ítem vanilla sin precio explícito fue aceptado.')
  }

  const technicalItemAccumulator = createPolicyAccumulator()
  const technicalItemError = validateEmbeddedItemsForPolicy(
    {
      id: 'minecraft:chest',
      Items: [{ id: 'minecraft:debug_stick', count: 1 }],
    },
    'el cofre técnico de prueba',
    technicalItemAccumulator,
  )
  if (!technicalItemError?.includes('minecraft:debug_stick')) {
    throw new Error('Un ítem técnico interno no fue rechazado.')
  }

  const bundleAccumulator = createPolicyAccumulator()
  const bundleError = validateEmbeddedItemsForPolicy(
    {
      id: 'minecraft:chest',
      Items: [
        {
          id: 'minecraft:bundle',
          count: 1,
          components: {
            'minecraft:bundle_contents': [
              { id: 'minecraft:command_block', count: 1 },
            ],
          },
        },
      ],
    },
    'el bundle de prueba',
    bundleAccumulator,
  )
  if (!bundleError?.includes('minecraft:command_block')) {
    throw new Error('Un ítem prohibido dentro de un bundle no fue rechazado.')
  }

  const entityAccumulator = createPolicyAccumulator()
  const entityError = validateEmbeddedItemsForPolicy(
    { id: 'minecraft:armor_stand', Attributes: [], HandItems: [] },
    'la entidad de prueba',
    entityAccumulator,
  )
  if (entityError) {
    throw new Error('El ID de una entidad se interpretó erróneamente como ítem.')
  }

  const eggAccumulator = createPolicyAccumulator()
  const eggError = validateEmbeddedItemsForPolicy(
    {
      id: 'minecraft:chest',
      Items: [{ id: 'minecraft:dragon_egg', count: 1 }],
    },
    'el cofre de huevos',
    eggAccumulator,
  )
  if (eggError) {
    throw new Error('dragon_egg único dentro de un inventario fue rechazado: ' + eggError)
  }
  const eggPolicy = finalizePolicy(eggAccumulator)
  const eggLimit = eggPolicy.summary.worldLimits.find(
    (limit) => limit.id === 'minecraft:dragon_egg',
  )
  if (eggLimit?.count !== 1 || eggLimit.maximum !== 1) {
    throw new Error('dragon_egg no conserva su límite de uno por mundo.')
  }

  const portalAndFireAccumulator = createPolicyAccumulator()
  for (const name of ['minecraft:nether_portal', 'minecraft:fire']) {
    const policyError = applyPolicyState(portalAndFireAccumulator, {
      name,
      properties: [],
    })
    if (policyError) throw new Error(policyError)
  }
  const portalAndFire = finalizePolicy(portalAndFireAccumulator)
  if (
    portalAndFire.summary.dependencies.find(
      (dependency) => dependency.id === 'minecraft:flint_and_steel',
    )?.count !== 1
  ) {
    throw new Error('Portal y fuego deben compartir un solo pedernal y acero.')
  }

  const malformedAccumulator = createPolicyAccumulator()
  const malformedError = validateEmbeddedItemsForPolicy(
    { id: 'minecraft:chest', Items: [{ id: 'minecraft:stone', count: 0 }] },
    'el cofre malformado',
    malformedAccumulator,
  )
  if (!malformedError?.includes('cantidad inválida')) {
    throw new Error('Una cantidad interna inválida no fue rechazada.')
  }

  const contentsAccumulator = createPolicyAccumulator()
  const contentsError = validateEmbeddedItemsForPolicy(
    {
      id: 'minecraft:chest',
      Items: [
        {
          id: 'minecraft:bundle',
          count: 2,
          components: {
            'minecraft:bundle_contents': [
              { id: 'minecraft:diamond', count: 3 },
            ],
          },
        },
        { id: 'minecraft:ender_pearl', count: 1 },
      ],
    },
    'el cofre con contenido permitido',
    contentsAccumulator,
  )
  if (contentsError) throw new Error(contentsError)

  const contents = finalizePolicy(contentsAccumulator)
  if (
    countFor(contents.summary.embeddedItems, 'minecraft:bundle') !== 2 ||
    countFor(contents.summary.embeddedItems, 'minecraft:diamond') !== 6 ||
    countFor(contents.summary.embeddedItems, 'minecraft:ender_pearl') !== 1
  ) {
    throw new Error('El contenido interno no se contó con el multiplicador correcto.')
  }
  const expectedContentPrice = Math.ceil(
    (2 * getPricePoints('minecraft:bundle') +
      6 * getPricePoints('minecraft:diamond') +
      getPricePoints('minecraft:ender_pearl')) /
      10,
  )
  if (calculateStructurePrice([], contents.pricing) !== expectedContentPrice) {
    throw new Error('El contenido interno permitido no se agregó al precio.')
  }

  const selectedPriceChecks: ReadonlyArray<readonly [string, number]> = [
    ['minecraft:stone', 5],
    ['minecraft:oak_planks', 10],
    ['minecraft:glass', 20],
    ['minecraft:bookshelf', 180],
    ['minecraft:lectern', 253],
    ['minecraft:composter', 81],
    ['minecraft:redstone_lamp', 364],
    ['minecraft:bell', 720],
    ['minecraft:white_bed', 60],
    ['minecraft:yellow_candle', 45],
    ['minecraft:tube_coral_block', 60],
    ['minecraft:blue_ice', 207],
    ['minecraft:obsidian', 80],
    ['minecraft:emerald_block', 125],
    ['minecraft:iron_block', 207],
    ['minecraft:gold_block', 311],
    ['minecraft:diamond_block', 828],
    ['minecraft:netherite_block', 10951],
    ['minecraft:beacon', 6400],
    ['minecraft:frogspawn', 1280],
    ['minecraft:water_bucket', 70],
    ['minecraft:lava_bucket', 150],
    ['minecraft:powder_snow_bucket', 100],
    ['minecraft:cauldron', 160],
    ['minecraft:flint_and_steel', 30],
    ['minecraft:piston', 120],
    ['minecraft:hopper', 300],
    ['minecraft:observer', 100],
    ['minecraft:comparator', 120],
    ['minecraft:crying_obsidian', 300],
    ['minecraft:ender_chest', 1000],
    ['minecraft:shulker_box', 1400],
    ['minecraft:respawn_anchor', 3023],
    ['minecraft:conduit', 4000],
    ['minecraft:heavy_core', 10000],
    ['minecraft:lodestone', 2560],
    ['minecraft:sponge', 640],
    ['minecraft:wet_sponge', 640],
    ['minecraft:sulfur_spike', 10],
    ['minecraft:sulfur', 40],
    ['minecraft:potent_sulfur', 400],
    ['minecraft:cinnabar', 30],
    ['minecraft:creeper_head', 1000],
    ['minecraft:creeper_wall_head', 1000],
    ['minecraft:wither_skeleton_skull', 1000],
    ['minecraft:wither_skeleton_wall_skull', 1000],
    ['minecraft:dragon_egg', 20000],
    ['minecraft:dried_ghast', 1173],
    ['minecraft:blue_ice', 207],
    ['minecraft:beehive', 138],
    ['minecraft:glowstone', 276],
    ['minecraft:magma_block', 276],
    ['minecraft:trapped_chest', 164],
    ['minecraft:copper_chest', 198],
    ['minecraft:waxed_copper_block', 143],
    ['minecraft:iron_trapdoor', 92],
    ['minecraft:copper_bulb', 110],
    ['minecraft:calibrated_sculk_sensor', 242],
  ]
  selectedPriceChecks.forEach(([id, points]) => expectBlockPrice(id, points))
  ;[
    'minecraft:sulfur_slab',
    'minecraft:sulfur_stairs',
    'minecraft:sulfur_wall',
    'minecraft:polished_sulfur',
    'minecraft:polished_sulfur_slab',
    'minecraft:polished_sulfur_stairs',
    'minecraft:polished_sulfur_wall',
    'minecraft:sulfur_bricks',
    'minecraft:sulfur_brick_slab',
    'minecraft:sulfur_brick_stairs',
    'minecraft:sulfur_brick_wall',
    'minecraft:chiseled_sulfur',
  ].forEach((id) => expectBlockPrice(id, 50))

  ;[
    'minecraft:cinnabar_slab',
    'minecraft:cinnabar_stairs',
    'minecraft:cinnabar_wall',
    'minecraft:polished_cinnabar',
    'minecraft:polished_cinnabar_slab',
    'minecraft:polished_cinnabar_stairs',
    'minecraft:polished_cinnabar_wall',
    'minecraft:cinnabar_bricks',
    'minecraft:cinnabar_brick_slab',
    'minecraft:cinnabar_brick_stairs',
    'minecraft:cinnabar_brick_wall',
    'minecraft:chiseled_cinnabar',
  ].forEach((id) => expectBlockPrice(id, 40))

  if (getPricePoints('minecraft:diamond') !== 80) {
    throw new Error('Los ítems permitidos no heredan la categoría de precio correcta.')
  }
  if (getPricePoints('minecraft:elytra') !== 2560) {
    throw new Error('Los ítems de progreso no heredan el tier especial.')
  }

  const compactedMaterials: ReadonlyArray<readonly [string, string]> = [
    ['minecraft:emerald_block', 'minecraft:emerald'],
    ['minecraft:iron_block', 'minecraft:iron_ingot'],
    ['minecraft:gold_block', 'minecraft:gold_ingot'],
    ['minecraft:diamond_block', 'minecraft:diamond'],
    ['minecraft:netherite_block', 'minecraft:netherite_ingot'],
  ]
  compactedMaterials.forEach(([blockId, unitId]) => {
    if (getPricePoints(blockId) < 9 * getPricePoints(unitId)) {
      throw new Error(blockId + ' no cubre sus nueve unidades de ' + unitId + '.')
    }
  })

  const progressionChain = [
    'minecraft:emerald_block',
    'minecraft:iron_block',
    'minecraft:gold_block',
    'minecraft:diamond_block',
    'minecraft:netherite_block',
  ].map(getPricePoints)
  for (let index = 1; index < progressionChain.length; index += 1) {
    if (progressionChain[index] <= progressionChain[index - 1]) {
      throw new Error('La jerarquía mineral estricta no se conserva.')
    }
  }

  const hopperRecipeFloor = Math.ceil(
    (getPricePoints('minecraft:chest') + 5 * getPricePoints('minecraft:iron_ingot')) *
      1.15,
  )
  if (getPricePoints('minecraft:hopper') < hopperRecipeFloor) {
    throw new Error('El hopper queda por debajo de sus ingredientes.')
  }

  const diamondPickaxeFloor =
    3 * getPricePoints('minecraft:diamond') +
    2 * getPricePoints('minecraft:stick')
  if (getPricePoints('minecraft:diamond_pickaxe') < diamondPickaxeFloor) {
    throw new Error('El pico de diamante queda por debajo de sus ingredientes.')
  }
  if (
    getPricePoints('minecraft:netherite_pickaxe') <=
    getPricePoints('minecraft:diamond_pickaxe')
  ) {
    throw new Error('La mejora de netherita no supera al pico de diamante.')
  }
  const diamondChestplateFloor = 8 * getPricePoints('minecraft:diamond')
  if (getPricePoints('minecraft:diamond_chestplate') < diamondChestplateFloor) {
    throw new Error('La pechera de diamante queda por debajo de sus ingredientes.')
  }
  const netheriteChestplateFloor =
    getPricePoints('minecraft:diamond_chestplate') +
    getPricePoints('minecraft:netherite_ingot') +
    getPricePoints('minecraft:netherite_upgrade_smithing_template')
  if (getPricePoints('minecraft:netherite_chestplate') < netheriteChestplateFloor) {
    throw new Error('La pechera de netherita queda por debajo de su mejora survival.')
  }
  if (getPricePoints('minecraft:disc_fragment_5') < 80) {
    throw new Error('El fragmento del disco 5 quedó por debajo de su precio estricto.')
  }
  if (getPricePoints('minecraft:music_disc_5') < 640) {
    throw new Error('El disco 5 no conserva su tier de artefacto.')
  }

  const endCrystalFloor =
    7 * getPricePoints('minecraft:glass') +
    getPricePoints('minecraft:ender_eye') +
    getPricePoints('minecraft:ghast_tear')
  if (getPricePoints('minecraft:end_crystal') < endCrystalFloor) {
    throw new Error('El cristal del End queda por debajo de sus ingredientes.')
  }
  return fixtures.length + ' fixtures de política survival y validaciones de NBT interno superadas.'
}
