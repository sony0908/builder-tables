import { addDynamicAssets } from './dynamics'
import { addControllerAssets } from './controller'
import { addBankAssets } from './bank'
import {
  normalizeBlockName,
  isValidVanillaBlock,
  formatBlockDisplayName,
} from './block-search'
import type { GeneratedStructure } from './nbt'

function fixtureStructure(price: number): GeneratedStructure {
  return {
    analysis: {
      key: 'payment-fixture',
      sourceName: 'payment-fixture.nbt',
      id: 'payment_fixture',
      name: 'Pago de prueba',
      size: [1, 1, 1],
      count: 1,
      price,
      stateCount: 1,
      materials: [],
      removed: [],
      removedEntities: 0,
      status: 'ready',
    },
    states: [],
    construction: new Uint8Array(),
    previewParts: [],
  }
}

function assertIncludes(value: string, fragment: string) {
  if (!value.includes(fragment)) {
    throw new Error('Falta el fragmento de cobro esperado: ' + fragment)
  }
}

function paymentFor(emeralds: number, price: number) {
  if (emeralds >= price) {
    return { emeraldsCleared: price, blocksCleared: 0, change: 0 }
  }

  const remaining = price - emeralds
  const blocksCleared = Math.ceil(remaining / 9)
  return {
    emeraldsCleared: emeralds,
    blocksCleared,
    change: blocksCleared * 9 - remaining,
  }
}

export function runDynamicsFixtures() {
  const files = new Map<string, string>()
  const price = 10_951
  const structure = fixtureStructure(price)
  addDynamicAssets(
    (path, content) => files.set(path, content),
    [structure],
  )
  addControllerAssets(
    (path, content) => files.set(path, content),
    () => undefined,
    [structure],
  )
  addBankAssets(
    (path, content) => files.set(path, content),
    () => undefined,
    [structure],
  )

  const pay = files.get(
    'data/builder_tables/function/dynamic/pay_payment_fixture.mcfunction',
  )
  const charge = files.get(
    'data/builder_tables/function/dynamic/charge_payment_fixture.mcfunction',
  )
  const chargeBlocks = files.get(
    'data/builder_tables/function/dynamic/charge_blocks_payment_fixture.mcfunction',
  )
  const consumeBlocks = files.get(
    'data/builder_tables_generated/function/payment/consume_blocks.mcfunction',
  )
  const giveChange = files.get(
    'data/builder_tables_generated/function/payment/give_change.mcfunction',
  )
  const buildDo = files.get(
    'data/builder_tables/function/dynamic/build_do_payment_fixture.mcfunction',
  )
  const undo = files.get(
    'data/builder_tables/function/dynamic/undo_payment_fixture.mcfunction',
  )
  const select = files.get(
    'data/builder_tables/function/dynamic/select_payment_fixture.mcfunction',
  )
  const controllerInit = files.get(
    'data/builder_tables_generated/function/controller_block/init.mcfunction',
  )
  const checkPlan = files.get(
    'data/builder_tables_generated/function/controller_block/owner/check_plan.mcfunction',
  )
  const captureOwner = files.get(
    'data/builder_tables_generated/function/controller_block/owner/capture.mcfunction',
  )
  const foundPlace = files.get(
    'data/builder_tables_generated/function/controller_block/found_place.mcfunction',
  )
  const rotate = files.get(
    'data/builder_tables_generated/function/controller_block/rotate.mcfunction',
  )
  const bankOpen = files.get(
    'data/builder_tables_generated/function/bank/open.mcfunction',
  )
  const bankCharge = files.get(
    'data/builder_tables_generated/function/bank/charge_payment_fixture.mcfunction',
  )
  const bankDepositAll = files.get(
    'data/builder_tables_generated/function/bank/deposit_all.mcfunction',
  )
  if (
    !pay ||
    !charge ||
    !chargeBlocks ||
    !consumeBlocks ||
    !giveChange ||
    !buildDo ||
    !undo ||
    !select ||
    !controllerInit ||
    !checkPlan ||
    !captureOwner ||
    !foundPlace ||
    !rotate ||
    !bankOpen ||
    !bankCharge ||
    !bankDepositAll
  ) {
    throw new Error('Faltan las funciones del cobro compacto o del banco.')
  }

  const chargeLines = charge.split(/\r?\n/).filter(Boolean)
  if (chargeLines.length > 10) {
    throw new Error('El cobro principal no tiene tamaño constante.')
  }
  assertIncludes(pay, 'scoreboard players set #nine bt_price 9')
  assertIncludes(pay, 'bt_has_card')
  assertIncludes(pay, 'bt_bank')
  assertIncludes(charge, 'score @s bt_emeralds >= @s bt_price')
  assertIncludes(charge, 'charge_blocks_payment_fixture')
  assertIncludes(charge, 'builder_tables_generated:bank/charge_payment_fixture')
  assertIncludes(chargeBlocks, 'scoreboard players add @s bt_blocks_to_pay 8')
  assertIncludes(chargeBlocks, 'function builder_tables_generated:payment/consume_blocks with storage builder_tables_generated:payment runtime')
  assertIncludes(chargeBlocks, 'execute if score @s bt_change matches 1.. run function builder_tables_generated:payment/give_change with storage builder_tables_generated:payment runtime')
  assertIncludes(consumeBlocks, '$clear @s minecraft:emerald_block $(blocks)')
  assertIncludes(giveChange, '$give @s minecraft:emerald $(change)')
  assertIncludes(controllerInit, 'scoreboard objectives add bt_owner0 dummy')
  assertIncludes(controllerInit, 'scoreboard objectives add bt_owner3 dummy')
  assertIncludes(controllerInit, 'scoreboard objectives add bt_bank dummy')
  assertIncludes(controllerInit, 'scoreboard objectives add bt_deposit trigger')
  assertIncludes(captureOwner, 'data get entity @s UUID[0]')
  assertIncludes(captureOwner, 'data get entity @s UUID[3]')
  assertIncludes(foundPlace, 'bt_plan_owner_match')
  assertIncludes(select, 'controller_block/owner/check_plan')
  assertIncludes(rotate, 'controller_block/owner/check_plan')
  assertIncludes(pay, 'controller_block/owner/check_plan')
  assertIncludes(buildDo, 'bt_owned_undo_anchor')
  assertIncludes(buildDo, 'bt_new_undo_anchor')
  assertIncludes(undo, 'bt_undo_owner_match')
  assertIncludes(undo, 'bt_has_card')
  assertIncludes(undo, 'bt_bank')
  if (undo.includes('controller_block/clear_preview')) {
    throw new Error('UNDO no debe borrar la preview activa de otro jugador.')
  }

  const exact = paymentFor(price, price)
  if (exact.emeraldsCleared !== price || exact.blocksCleared !== 0 || exact.change !== 0) {
    throw new Error('El cobro exacto en esmeraldas no conserva el saldo.')
  }
  const mixed = paymentFor(300, price)
  if (mixed.emeraldsCleared !== 300 || mixed.blocksCleared !== 1_184 || mixed.change !== 5) {
    throw new Error('El cobro mixto no devuelve el cambio correcto.')
  }
  const blocksOnly = paymentFor(0, price)
  if (blocksOnly.blocksCleared !== 1_217 || blocksOnly.change !== 2) {
    throw new Error('El cobro en bloques no devuelve el cambio correcto.')
  }
  const noChange = paymentFor(0, 9)
  if (noChange.blocksCleared !== 1 || noChange.change !== 0) {
    throw new Error('El cobro sin cambio no conserva el saldo.')
  }

  // ── Tests del sistema de intereses bancarios ─────────────────────────────

  // Las funciones de interés deben existir en el archivo generado
  const applyInterest = files.get('data/builder_tables_generated/function/bank/apply_interest.mcfunction')
  const playerInterest = files.get('data/builder_tables_generated/function/bank/player_interest.mcfunction')
  if (!applyInterest) throw new Error('Falta bank/apply_interest.mcfunction')
  if (!playerInterest) throw new Error('Falta bank/player_interest.mcfunction')

  // apply_interest debe ejecutarse sobre todos los jugadores
  assertIncludes(applyInterest, 'execute as @a run function builder_tables_generated:bank/player_interest')

  // player_interest: cálculo escalonado usando constantes #ten y #hundred
  assertIncludes(playerInterest, 'bt_interest /= #ten bt_interest_math')
  assertIncludes(playerInterest, 'bt_temp /= #hundred bt_interest_math')
  // player_interest: aplica tope global de 5000 (#cap)
  assertIncludes(playerInterest, '#cap bt_interest_math')
  // player_interest: suma intereses al saldo
  assertIncludes(playerInterest, 'bt_bank += @s bt_interest')
  // Notificación solo vía actionbar, nunca en el chat (tellraw llenaría el chat)
  assertIncludes(playerInterest, 'title @s actionbar')
  if (playerInterest.includes('tellraw')) {
    throw new Error('player_interest no debe usar tellraw — solo actionbar para no saturar el chat.')
  }

  // Timer en tick.mcfunction: 24000 ticks = 1 día Minecraft
  const tick = files.get('data/builder_tables/function/tick.mcfunction')
  if (!tick) throw new Error('Falta tick.mcfunction')
  assertIncludes(tick, 'scoreboard players add #timer bt_bank_timer 1')
  assertIncludes(tick, 'execute if score #timer bt_bank_timer matches 24000.. run function builder_tables_generated:bank/apply_interest')
  assertIncludes(tick, 'execute if score #timer bt_bank_timer matches 24000.. run scoreboard players set #timer bt_bank_timer 0')

  // Objetivos de intereses registrados en init
  assertIncludes(controllerInit, 'bt_bank_timer')
  assertIncludes(controllerInit, 'bt_interest')
  assertIncludes(controllerInit, '#ten bt_interest_math')
  assertIncludes(controllerInit, '#hundred bt_interest_math')
  assertIncludes(controllerInit, '#tier1_limit bt_interest_math')
  assertIncludes(controllerInit, '#tier1_max bt_interest_math')
  assertIncludes(controllerInit, '#cap bt_interest_math')

  // ── Validación matemática del cálculo de intereses ───────────────────────
  // Replica la lógica de player_interest.mcfunction en JS
  // Minecraft usa división entera (trunca hacia cero, como Math.trunc)
  function calcInterest(balance: number): number {
    if (balance <= 0) return 0
    let interest = 0
    if (balance <= 25000) {
      interest = Math.trunc(balance / 10) // Tramo 1: 10% entero
    } else {
      const excess = balance - 25000
      const excessInterest = Math.trunc(excess / 100) // Tramo 2: 1% entero sobre excedente
      interest = 2500 + excessInterest
    }
    const capped = interest > 5000 ? 5000 : interest // tope global de 5000
    return capped >= 1 ? capped : 0 // mínimo 1 para aplicar
  }

  // Saldo insuficiente → sin interés
  if (calcInterest(0) !== 0)   throw new Error('Saldo 0 no debe generar interés')
  if (calcInterest(9) !== 0)   throw new Error('Saldo 9 no debe generar interés (9÷10=0 entero)')

  // Mínimo para generar interés: 10 esmeraldas generan 1
  if (calcInterest(10) !== 1)  throw new Error('Saldo 10 debe generar exactamente 1 esmeralda de interés')

  // Saldo típico tramo 1 (10%)
  if (calcInterest(100) !== 10)     throw new Error('Saldo 100 debe generar 10 esmeraldas')
  if (calcInterest(1000) !== 100)   throw new Error('Saldo 1000 debe generar 100 esmeraldas')
  if (calcInterest(5000) !== 500)   throw new Error('Saldo 5000 debe generar 500 esmeraldas')

  // Justo en el límite del tramo 1: 25000 ÷ 10 = 2500
  if (calcInterest(25000) !== 2500) throw new Error('Saldo 25000 debe generar exactamente 2500')

  // Tramo 2: 2500 base + 1% del excedente
  if (calcInterest(25001) !== 2500) throw new Error('Saldo 25001 debe generar 2500 (excedente 1÷100=0)')
  if (calcInterest(25100) !== 2501) throw new Error('Saldo 25100 debe generar 2501')
  if (calcInterest(35000) !== 2600) throw new Error('Saldo 35000 debe generar 2600')
  if (calcInterest(54144) !== 2791) throw new Error('Saldo 54144 debe generar 2791 (2500 + 291)')
  if (calcInterest(100000) !== 3250) throw new Error('Saldo 100000 debe generar 3250 (2500 + 750)')

  // Tope global de 5000
  if (calcInterest(275000) !== 5000) throw new Error('Saldo 275000 debe generar 5000')
  if (calcInterest(300000) !== 5000) throw new Error('Saldo muy alto debe limitarse a 5000 por ciclo')

  // ── Corrección de cobro bancario: bt_temp como snapshot ──────────────────
  // bankCharge debe capturar bt_bank en bt_temp ANTES de modificarlo
  assertIncludes(bankCharge, 'scoreboard players operation @s bt_temp = @s bt_bank')
  // Las condiciones de "pago completo" deben usar bt_temp
  assertIncludes(bankCharge, 'execute if score @s bt_temp >= @s bt_price run')
  // Ninguna condición post-resta debe comparar bt_bank directamente
  const bankChargeLines = bankCharge.split(/\r?\n/).filter(Boolean)
  const badLines = bankChargeLines.filter(
    (line) =>
      line.includes('if score @s bt_bank >= @s bt_price') &&
      !line.includes('@s bt_bank -= @s bt_price'),
  )
  if (badLines.length > 0) {
    throw new Error(
      'bankCharge usa bt_bank en condiciones post-modificación (debe usar bt_temp): ' + badLines[0],
    )
  }

  // ── Sustitución de bloques y búsqueda / normalización ────────────────────
  if (normalizeBlockName('roble') !== 'minecraft:oak_planks') {
    throw new Error('normalizeBlockName debe resolver roble -> minecraft:oak_planks')
  }
  if (normalizeBlockName('cristal') !== 'minecraft:glass') {
    throw new Error('normalizeBlockName debe resolver cristal -> minecraft:glass')
  }
  if (normalizeBlockName('pino') !== 'minecraft:spruce_planks') {
    throw new Error('normalizeBlockName debe resolver pino -> minecraft:spruce_planks')
  }
  if (normalizeBlockName('stone_bricks') !== 'minecraft:stone_bricks') {
    throw new Error('normalizeBlockName debe resolver ID sin namespace')
  }
  if (normalizeBlockName('bloque_inexistente_123') !== null) {
    throw new Error('normalizeBlockName debe retornar null para bloques inválidos')
  }
  if (!isValidVanillaBlock('minecraft:deepslate_bricks')) {
    throw new Error('isValidVanillaBlock debe validar deepslate_bricks')
  }
  if (isValidVanillaBlock('minecraft:bloque_falso')) {
    throw new Error('isValidVanillaBlock debe rechazar bloque falso')
  }
  if (formatBlockDisplayName('minecraft:oak_planks') !== 'Oak Planks') {
    throw new Error('formatBlockDisplayName debe formatear a Oak Planks')
  }

  return 'Cobro compacto, intereses bancarios y sustitución de bloques validados para ' + price + ' esmeraldas.'
}
