import fixturesData from './data/survival-policy-26_2.fixtures.json'
import { getBlockPricePoints } from './pricing'
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
    replaced?: string[]
  }
}

type FixtureData = { fixtures: Fixture[] }

const fixtures = (fixturesData as FixtureData).fixtures

function includesAll(values: readonly string[], expected: readonly string[]) {
  return expected.every((entry) => values.includes(entry))
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
      Items: [{ id: 'minecraft:dragon_egg', count: 2 }],
    },
    'el cofre de huevos',
    eggAccumulator,
  )
  const eggResult = finalizePolicy(eggAccumulator)
  if (eggError || !eggResult.error?.includes('máximo de 1')) {
    throw new Error('El límite de dragon_egg dentro de un inventario no se aplicó.')
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
  if (getBlockPricePoints('minecraft:frogspawn') !== 400) {
    throw new Error('frogspawn no conserva el precio alto provisional.')
  }

  return fixtures.length + ' fixtures de política survival y 5 de NBT interno superadas.'
}