import { addDynamicAssets } from './dynamics'
import { addControllerAssets } from './controller'
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
    !rotate
  ) {
    throw new Error('Faltan las funciones del cobro compacto.')
  }

  const chargeLines = charge.split(/\r?\n/).filter(Boolean)
  if (chargeLines.length > 10) {
    throw new Error('El cobro principal no tiene tamaño constante.')
  }
  assertIncludes(pay, 'scoreboard players set #nine bt_price 9')
  assertIncludes(charge, 'score @s bt_emeralds >= @s bt_price')
  assertIncludes(charge, 'charge_blocks_payment_fixture')
  assertIncludes(chargeBlocks, 'scoreboard players add @s bt_blocks_to_pay 8')
  assertIncludes(chargeBlocks, 'function builder_tables_generated:payment/consume_blocks with storage builder_tables_generated:payment runtime')
  assertIncludes(chargeBlocks, 'execute if score @s bt_change matches 1.. run function builder_tables_generated:payment/give_change with storage builder_tables_generated:payment runtime')
  assertIncludes(consumeBlocks, '$clear @s minecraft:emerald_block $(blocks)')
  assertIncludes(giveChange, '$give @s minecraft:emerald $(change)')
  assertIncludes(controllerInit, 'scoreboard objectives add bt_owner0 dummy')
  assertIncludes(controllerInit, 'scoreboard objectives add bt_owner3 dummy')
  assertIncludes(captureOwner, 'data get entity @s UUID[0]')
  assertIncludes(captureOwner, 'data get entity @s UUID[3]')
  assertIncludes(foundPlace, 'bt_plan_owner_match')
  assertIncludes(select, 'controller_block/owner/check_plan')
  assertIncludes(rotate, 'controller_block/owner/check_plan')
  assertIncludes(pay, 'controller_block/owner/check_plan')
  assertIncludes(buildDo, 'bt_owned_undo_anchor')
  assertIncludes(buildDo, 'bt_new_undo_anchor')
  assertIncludes(undo, 'bt_undo_owner_match')
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

  return 'Cobro compacto validado para ' + price + ' esmeraldas.'
}
