import policyData from './data/survival-policy-26_2.json'
import type {
  MaterialCount,
  PolicyDependency,
  PolicySummary,
  PolicyWorldLimit,
} from './types'

type RequirementScope = 'block' | 'structure'
type PriceMode = 'add' | 'keep' | 'replace'
type SourceTransform =
  | 'candle_from_cake'
  | 'map'
  | 'potted_plant'
  | 'wall_attachment'

type PolicyRequirement = {
  id: string
  count: number
  billable?: boolean
  scope?: RequirementScope
}

type PolicyRule = {
  id: string
  classification: 'dependency' | 'derived' | 'fluid' | 'special'
  match: {
    ids?: string[]
    prefix?: string
    suffix?: string
    contains?: string
    properties?: Record<string, string>
  }
  priceMode: PriceMode
  notice: string
  requirements: PolicyRequirement[]
  sourceTransform?: SourceTransform
  sourceMap?: Record<string, string>
  worldLimit?: {
    scope: 'world'
    maximum: number
    note: string
  }
}

type SurvivalPolicyData = {
  schemaVersion: number
  minecraftVersion: string
  mode: string
  deny: Array<{ id: string; reason: string }>
  rules: PolicyRule[]
}

export type PolicyBlockState = {
  name: string
  properties: ReadonlyArray<readonly [string, string]>
}

export type PolicyPricing = {
  replacements: MaterialCount[]
  dependencies: MaterialCount[]
}

export type PolicyEvaluation = {
  summary: PolicySummary
  pricing: PolicyPricing
  error?: string
}

type PolicyAccumulator = {
  dependencies: Map<string, PolicyDependency>
  priceDependencies: Map<string, number>
  replacements: Map<string, number>
  notices: Set<string>
  worldLimits: Map<string, PolicyWorldLimit>
  structureRequirements: Set<string>
}

const policy = policyData as SurvivalPolicyData
const deniedById = new Map(policy.deny.map((entry) => [entry.id, entry.reason]))

export const SURVIVAL_POLICY_METADATA = {
  schemaVersion: policy.schemaVersion,
  minecraftVersion: policy.minecraftVersion,
  mode: policy.mode,
}

function addCount(map: Map<string, number>, id: string, count: number) {
  map.set(id, (map.get(id) ?? 0) + count)
}

function materialCounts(map: Map<string, number>) {
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => left.name.localeCompare(right.name))
}

function matchesRule(rule: PolicyRule, state: PolicyBlockState) {
  const { match } = rule

  if (match.ids && !match.ids.includes(state.name)) return false
  if (match.prefix && !state.name.startsWith(match.prefix)) return false
  if (match.suffix && !state.name.endsWith(match.suffix)) return false
  if (match.contains && !state.name.includes(match.contains)) return false

  if (!match.properties) return true

  const properties = new Map(state.properties)
  return Object.entries(match.properties).every(
    ([key, value]) => properties.get(key) === value,
  )
}

function transformedRequirement(rule: PolicyRule, state: PolicyBlockState) {
  if (!rule.sourceTransform) return undefined

  const path = state.name.replace(/^minecraft:/, '')
  let id: string | undefined

  if (rule.sourceTransform === 'potted_plant' && path.startsWith('potted_')) {
    id = 'minecraft:' + path.slice('potted_'.length)
  }

  if (
    rule.sourceTransform === 'candle_from_cake' &&
    path.endsWith('_cake')
  ) {
    id = 'minecraft:' + path.slice(0, -'_cake'.length)
  }

  if (rule.sourceTransform === 'wall_attachment') {
    if (path.startsWith('wall_')) {
      id = 'minecraft:' + path.slice('wall_'.length)
    } else if (path.includes('_wall_')) {
      id = 'minecraft:' + path.replace('_wall_', '_')
    }
  }

  if (rule.sourceTransform === 'map') {
    id = rule.sourceMap?.[state.name]
  }

  return id ? { id, count: 1 } satisfies PolicyRequirement : undefined
}

function addRequirement(
  accumulator: PolicyAccumulator,
  rule: PolicyRule,
  requirement: PolicyRequirement,
) {
  const scope = requirement.scope ?? 'block'
  const key = rule.id + ':' + requirement.id

  if (scope === 'structure') {
    if (accumulator.structureRequirements.has(key)) return
    accumulator.structureRequirements.add(key)
  }

  const billable = requirement.billable !== false
  const current = accumulator.dependencies.get(requirement.id)
  accumulator.dependencies.set(requirement.id, {
    id: requirement.id,
    count: (current?.count ?? 0) + requirement.count,
    billable: current?.billable === true || billable,
  })

  if (billable) {
    addCount(
      accumulator.priceDependencies,
      requirement.id,
      requirement.count,
    )
  }
}

export function createPolicyAccumulator(): PolicyAccumulator {
  return {
    dependencies: new Map(),
    priceDependencies: new Map(),
    replacements: new Map(),
    notices: new Set(),
    worldLimits: new Map(),
    structureRequirements: new Set(),
  }
}

export function applyPolicyItem(
  accumulator: PolicyAccumulator,
  id: string,
  count: number,
  location: string,
) {
  if (!Number.isSafeInteger(count) || count < 1) {
    return 'El ítem ' + id + ' tiene una cantidad inválida en ' + location + '.'
  }

  if (!id.startsWith('minecraft:')) {
    return 'Ítem no vanilla no permitido en ' + location + ': ' + id + '.'
  }

  const denyReason = deniedById.get(id)
  if (denyReason) {
    return (
      'Ítem no permitido por la política survival: ' +
      id +
      ' en ' +
      location +
      '. ' +
      denyReason
    )
  }

  for (const rule of policy.rules) {
    if (!rule.worldLimit) continue
    if (!matchesRule(rule, { name: id, properties: [] })) continue

    accumulator.notices.add(rule.notice)
    const current = accumulator.worldLimits.get(id)
    accumulator.worldLimits.set(id, {
      id,
      count: (current?.count ?? 0) + count,
      maximum: rule.worldLimit.maximum,
      scope: rule.worldLimit.scope,
      note: rule.worldLimit.note,
    })
  }

  return undefined
}
export function applyPolicyState(
  accumulator: PolicyAccumulator,
  state: PolicyBlockState,
) {
  const denyReason = deniedById.get(state.name)
  if (denyReason) {
    return 'Bloque no permitido por la política survival: ' + state.name + '. ' + denyReason
  }

  let replaced = false

  for (const rule of policy.rules) {
    if (!matchesRule(rule, state)) continue

    accumulator.notices.add(rule.notice)

    if (rule.priceMode === 'replace' && !replaced) {
      addCount(accumulator.replacements, state.name, 1)
      replaced = true
    }

    rule.requirements.forEach((requirement) =>
      addRequirement(accumulator, rule, requirement),
    )

    const derived = transformedRequirement(rule, state)
    if (derived) addRequirement(accumulator, rule, derived)

    if (rule.worldLimit) {
      const current = accumulator.worldLimits.get(state.name)
      accumulator.worldLimits.set(state.name, {
        id: state.name,
        count: (current?.count ?? 0) + 1,
        maximum: rule.worldLimit.maximum,
        scope: rule.worldLimit.scope,
        note: rule.worldLimit.note,
      })
    }
  }

  return undefined
}

export function finalizePolicy(
  accumulator: PolicyAccumulator,
): PolicyEvaluation {
  const worldLimits = [...accumulator.worldLimits.values()].sort((left, right) =>
    left.id.localeCompare(right.id),
  )
  const exceeded = worldLimits.find((limit) => limit.count > limit.maximum)

  return {
    summary: {
      dependencies: [...accumulator.dependencies.values()].sort((left, right) =>
        left.id.localeCompare(right.id),
      ),
      notices: [...accumulator.notices].toSorted(),
      worldLimits,
    },
    pricing: {
      replacements: materialCounts(accumulator.replacements),
      dependencies: materialCounts(accumulator.priceDependencies),
    },
    error: exceeded
      ? 'El NBT contiene ' +
        exceeded.count +
        ' × ' +
        exceeded.id +
        '; el máximo de ' +
        exceeded.maximum +
        ' permitido por mundo es ' +
        exceeded.maximum +
        '.'
      : undefined,
  }
}