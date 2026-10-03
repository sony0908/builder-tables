import { addDynamicAssets } from './dynamics'
import { addControllerAssets } from './controller'
import { addBankAssets } from './bank'
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

  // player_interest: cálculo 1% usando constante #hundred (÷100)
  assertIncludes(playerInterest, 'bt_interest /= #hundred bt_interest_math')
  // player_interest: aplica tope de 250 (#cap)
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
  assertIncludes(controllerInit, '#hundred bt_interest_math')
  assertIncludes(controllerInit, '#cap bt_interest_math')

  // ── Validación matemática del cálculo de intereses ───────────────────────
  // Replica la lógica de player_interest.mcfunction en JS
  // Minecraft usa división entera (trunca hacia cero, como Math.trunc)
  function calcInterest(balance: number): number {
    const interest = Math.trunc(balance / 100) // 1% entero
    const capped = interest > 250 ? 250 : interest // tope de 250
    return capped >= 1 ? capped : 0 // mínimo 1 para aplicar
  }

  // Saldo insuficiente → sin interés
  if (calcInterest(0) !== 0)   throw new Error('Saldo 0 no debe generar interés')
  if (calcInterest(99) !== 0)  throw new Error('Saldo 99 no debe generar interés (99÷100=0 entero)')

  // Mínimo para generar interés
  if (calcInterest(100) !== 1) throw new Error('Saldo 100 debe generar exactamente 1 esmeralda de interés')

  // Saldo típico
  if (calcInterest(1000) !== 10)   throw new Error('Saldo 1000 debe generar 10 esmeraldas')
  if (calcInterest(5000) !== 50)   throw new Error('Saldo 5000 debe generar 50 esmeraldas')

  // Justo en el tope: 25000 ÷ 100 = 250 (exacto, sin truncar)
  if (calcInterest(25000) !== 250) throw new Error('Saldo 25000 debe generar exactamente 250 (tope)')

  // Por encima del tope → se limita a 250
  if (calcInterest(25001) !== 250) throw new Error('Saldo 25001 debe limitarse a 250')
  if (calcInterest(100000) !== 250) throw new Error('Saldo muy alto debe limitarse a 250 por ciclo')

  // Caso real de la imagen: saldo 54144 → trunc(54144/100)=541 → tope → 250
  if (calcInterest(54144) !== 250) throw new Error('Saldo 54144 debe estar limitado a 250')

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

  return 'Cobro compacto e intereses bancarios validados para ' + price + ' esmeraldas.'
}
