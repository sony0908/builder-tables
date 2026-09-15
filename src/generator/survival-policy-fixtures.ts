import fixturesData from './data/survival-policy-26_2.fixtures.json'
import {
  calculateStructurePrice,
  getBlockPricePoints,
  getPricePoints,
} from './pricing'
import { validateEmbeddedItemsForPolicy } from './nbt'
import {
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
    { id: 'minecraft:armor_stand', HandItems: [] },
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
  if (!eggError?.includes('minecraft:dragon_egg')) {
    throw new Error('dragon_egg dentro de un inventario no fue rechazado.')
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
    ['minecraft:stone', 1],
    ['minecraft:oak_planks', 3],
    ['minecraft:glass', 5],
    ['minecraft:obsidian', 10],
    ['minecraft:iron_block', 9],
    ['minecraft:diamond_block', 36],
    ['minecraft:beacon', 250],
    ['minecraft:frogspawn', 640],
    ['minecraft:water_bucket', 5],
    ['minecraft:lava_bucket', 20],
    ['minecraft:powder_snow_bucket', 10],
    ['minecraft:cauldron', 10],
    ['minecraft:flint_and_steel', 10],
    ['minecraft:piston', 18],
    ['minecraft:hopper', 32],
    ['minecraft:observer', 22],
    ['minecraft:comparator', 26],
    ['minecraft:crying_obsidian', 45],
    ['minecraft:ender_chest', 100],
    ['minecraft:shulker_box', 80],
    ['minecraft:respawn_anchor', 180],
    ['minecraft:conduit', 300],
    ['minecraft:heavy_core', 500],
    ['minecraft:lodestone', 250],
    ['minecraft:sponge', 120],
    ['minecraft:wet_sponge', 120],
    ['minecraft:sulfur_spike', 3],
    ['minecraft:sulfur', 12],
    ['minecraft:potent_sulfur', 108],
    ['minecraft:cinnabar', 8],
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
  ].forEach((id) => expectBlockPrice(id, 14))

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
  ].forEach((id) => expectBlockPrice(id, 10))

  if (getPricePoints('minecraft:diamond') !== 20) {
    throw new Error('Los ítems permitidos no heredan la categoría de precio correcta.')
  }
  if (getPricePoints('minecraft:elytra') !== 50) {
    throw new Error('Los ítems de progreso no heredan el tier especial.')
  }

  return fixtures.length + ' fixtures de política survival y 8 de NBT interno superadas.'
}