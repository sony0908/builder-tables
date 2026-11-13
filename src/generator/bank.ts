import type { GeneratedStructure } from './nbt'
import type { TextFileWriter } from './preview'
import type { JsonFileWriter } from './controller'

export const BANK_CARD_ITEM = 'minecraft:paper'
export const BANK_CARD_CUSTOM_DATA = 'builder_tables_bank_card'

function mcfunction(lines: string[]) {
  return lines.join('\n') + '\n'
}

export function bankCardComponents() {
  return {
    'minecraft:max_stack_size': 1,
    'minecraft:custom_data': { [BANK_CARD_CUSTOM_DATA]: true },
    'minecraft:item_name': {
      text: 'Tarjeta Bancaria',
      color: 'gold',
      bold: true,
      italic: false,
    },
    'minecraft:lore': [
      {
        text: 'Builder Tables Bank',
        color: 'dark_aqua',
        italic: false,
      },
      {
        text: 'Haz clic derecho para abrir tu cuenta',
        color: 'gray',
        italic: false,
      },
      {
        text: 'Llévala contigo para pagar construcciones grandes',
        color: 'dark_gray',
        italic: false,
      },
    ],
    'minecraft:consumable': {
      consume_seconds: 1000,
      animation: 'none',
      has_consume_particles: false,
      sound: 'minecraft:ui.button.click',
    },
  }
}

export function bankCardItemSnbt() {
  return (
    'minecraft:paper[max_stack_size=1,custom_data={builder_tables_bank_card:1b},' +
    'item_name={text:"Tarjeta Bancaria",color:"gold",bold:true,italic:false},' +
    'lore=[{text:"Builder Tables Bank",color:"dark_aqua",italic:false},' +
    '{text:"Haz clic derecho para abrir tu cuenta",color:"gray",italic:false},' +
    '{text:"Llévala contigo para pagar construcciones grandes",color:"dark_gray",italic:false}],' +
    'consumable={consume_seconds:1000.0f,animation:"none",has_consume_particles:false,sound:"minecraft:ui.button.click"}]'
  )
}

function addBankDialog(putJson: JsonFileWriter) {
  putJson('data/builder_tables/dialog/bank_menu.json', {
    type: 'minecraft:multi_action',
    title: { text: 'Cuenta Bancaria - Builder Tables', color: 'gold' },
    body: {
      type: 'minecraft:plain_message',
      contents: {
        text:
          'Gestiona el saldo de tu Tarjeta Bancaria.\n' +
          'Puedes depositar esmeraldas y bloques para pagar construcciones de alto costo sin saturar tu inventario.',
      },
    },
    columns: 2,
    actions: [
      {
        label: { text: 'Depositar 64 Esmeraldas (+64)', color: 'green' },
        action: { type: 'run_command', command: 'trigger bt_deposit set 1' },
      },
      {
        label: { text: 'Depositar 64 Bloques (+576)', color: 'green' },
        action: { type: 'run_command', command: 'trigger bt_deposit set 2' },
      },
      {
        label: { text: 'Depositar TODO el inventario', color: 'dark_green' },
        action: { type: 'run_command', command: 'trigger bt_deposit set 3' },
      },
      {
        label: { text: 'Consultar Saldo Actual', color: 'aqua' },
        action: { type: 'run_command', command: 'trigger bt_balance set 1' },
      },
      {
        label: { text: 'Retirar 64 Esmeraldas (-64)', color: 'yellow' },
        action: { type: 'run_command', command: 'trigger bt_withdraw set 1' },
      },
      {
        label: { text: 'Retirar 64 Bloques (-576)', color: 'gold' },
        action: { type: 'run_command', command: 'trigger bt_withdraw set 2' },
      },
    ],
    exit_action: {
      label: { text: 'Cerrar' },
    },
  })
}

function addBankAdvancement(putJson: JsonFileWriter) {
  putJson('data/builder_tables_generated/advancement/used_bank_card.json', {
    criteria: {
      use_card: {
        trigger: 'minecraft:using_item',
        conditions: {
          item: {
            predicates: {
              'minecraft:custom_data': {
                [BANK_CARD_CUSTOM_DATA]: true,
              },
            },
          },
        },
      },
    },
    rewards: {
      function: 'builder_tables_generated:bank/open',
    },
  })
}

function addBankFunctions(
  put: TextFileWriter,
  structures: GeneratedStructure[],
) {
  const root = 'data/builder_tables_generated/function/bank/'

  // Apertura y consulta
  put(
    root + 'open.mcfunction',
    mcfunction([
      'advancement revoke @s only builder_tables_generated:used_bank_card',
      'function builder_tables_generated:bank/balance',
      'dialog show @s builder_tables:bank_menu',
    ]),
  )

  put(
    root + 'balance.mcfunction',
    mcfunction([
      'tellraw @s [{"text":"[Banco] Saldo actual: ","color":"gold"},{"score":{"name":"@s","objective":"bt_bank"},"color":"green"},{"text":" esmeraldas.","color":"gold"}]',
      'title @s actionbar [{"text":"Saldo Tarjeta: ","color":"gold"},{"score":{"name":"@s","objective":"bt_bank"},"color":"green"},{"text":" esmeraldas","color":"gold"}]',
    ]),
  )

  // Depósitos
  put(
    root + 'deposit_64_emeralds.mcfunction',
    mcfunction([
      'execute store result score @s bt_temp run clear @s minecraft:emerald 0',
      'execute if score @s bt_temp matches 64.. run clear @s minecraft:emerald 64',
      'execute if score @s bt_temp matches 64.. run scoreboard players add @s bt_bank 64',
      'execute if score @s bt_temp matches 64.. run playsound minecraft:entity.experience_orb.pickup player @s ~ ~ ~ 1 1.2',
      'execute if score @s bt_temp matches 64.. run tellraw @s [{"text":"[Banco] +64 esmeraldas depositadas. Nuevo saldo: ","color":"green"},{"score":{"name":"@s","objective":"bt_bank"},"color":"gold"}]',
      'execute unless score @s bt_temp matches 64.. run tellraw @s {"text":"[Banco] No tienes 64 esmeraldas sueltas en tu inventario.","color":"red"}',
    ]),
  )

  put(
    root + 'deposit_64_blocks.mcfunction',
    mcfunction([
      'execute store result score @s bt_temp run clear @s minecraft:emerald_block 0',
      'execute if score @s bt_temp matches 64.. run clear @s minecraft:emerald_block 64',
      'execute if score @s bt_temp matches 64.. run scoreboard players add @s bt_bank 576',
      'execute if score @s bt_temp matches 64.. run playsound minecraft:entity.experience_orb.pickup player @s ~ ~ ~ 1 1.2',
      'execute if score @s bt_temp matches 64.. run tellraw @s [{"text":"[Banco] +64 bloques depositados (+576 esmeraldas). Nuevo saldo: ","color":"green"},{"score":{"name":"@s","objective":"bt_bank"},"color":"gold"}]',
      'execute unless score @s bt_temp matches 64.. run tellraw @s {"text":"[Banco] No tienes 64 bloques de esmeralda en tu inventario.","color":"red"}',
    ]),
  )

  put(
    root + 'deposit_all.mcfunction',
    mcfunction([
      'scoreboard players set #nine bt_price 9',
      'execute store result score @s bt_temp_emeralds run clear @s minecraft:emerald',
      'execute store result score @s bt_temp_blocks run clear @s minecraft:emerald_block',
      'scoreboard players operation @s bt_temp_blocks *= #nine bt_price',
      'scoreboard players operation @s bt_temp_emeralds += @s bt_temp_blocks',
      'execute if score @s bt_temp_emeralds matches 1.. run scoreboard players operation @s bt_bank += @s bt_temp_emeralds',
      'execute if score @s bt_temp_emeralds matches 1.. run playsound minecraft:entity.experience_orb.pickup player @s ~ ~ ~ 1 1.2',
      'execute if score @s bt_temp_emeralds matches 1.. run tellraw @s [{"text":"[Banco] Se han depositado ","color":"green"},{"score":{"name":"@s","objective":"bt_temp_emeralds"},"color":"gold"},{"text":" esmeraldas en total. Saldo actual: ","color":"green"},{"score":{"name":"@s","objective":"bt_bank"},"color":"gold"}]',
      'execute unless score @s bt_temp_emeralds matches 1.. run tellraw @s {"text":"[Banco] No tienes esmeraldas ni bloques en el inventario.","color":"red"}',
    ]),
  )

  // Retiros
  put(
    root + 'withdraw_64_emeralds.mcfunction',
    mcfunction([
      'execute if score @s bt_bank matches 64.. run scoreboard players remove @s bt_bank 64',
      'execute if score @s bt_bank matches 64.. run give @s minecraft:emerald 64',
      'execute if score @s bt_bank matches 64.. run playsound minecraft:entity.item.pickup player @s ~ ~ ~ 1 1',
      'execute if score @s bt_bank matches 64.. run tellraw @s [{"text":"[Banco] Has retirado 64 esmeraldas. Saldo restante: ","color":"yellow"},{"score":{"name":"@s","objective":"bt_bank"},"color":"gold"}]',
      'execute unless score @s bt_bank matches 64.. run tellraw @s {"text":"[Banco] Saldo insuficiente para retirar 64 esmeraldas.","color":"red"}',
    ]),
  )

  put(
    root + 'withdraw_64_blocks.mcfunction',
    mcfunction([
      'execute if score @s bt_bank matches 576.. run scoreboard players remove @s bt_bank 576',
      'execute if score @s bt_bank matches 576.. run give @s minecraft:emerald_block 64',
      'execute if score @s bt_bank matches 576.. run playsound minecraft:entity.item.pickup player @s ~ ~ ~ 1 1',
      'execute if score @s bt_bank matches 576.. run tellraw @s [{"text":"[Banco] Has retirado 64 bloques de esmeralda. Saldo restante: ","color":"yellow"},{"score":{"name":"@s","objective":"bt_bank"},"color":"gold"}]',
      'execute unless score @s bt_bank matches 576.. run tellraw @s {"text":"[Banco] Saldo insuficiente para retirar 64 bloques (requiere 576 esmeraldas).","color":"red"}',
    ]),
  )

  // Intereses bancarios diarios (1% diario, tope 250, notificación por actionbar)
  put(
    root + 'apply_interest.mcfunction',
    mcfunction([
      'execute as @a run function builder_tables_generated:bank/player_interest',
    ]),
  )

  put(
    root + 'player_interest.mcfunction',
    mcfunction([
      'scoreboard players operation @s bt_interest = @s bt_bank',
      'scoreboard players operation @s bt_interest /= #hundred bt_interest_math',
      'execute if score @s bt_interest matches 251.. run scoreboard players operation @s bt_interest = #cap bt_interest_math',
      'execute if score @s bt_interest matches 1.. run scoreboard players operation @s bt_bank += @s bt_interest',
      'execute if score @s bt_interest matches 1.. run playsound minecraft:block.amethyst_block.chime player @s ~ ~ ~ 0.8 1.2',
      'execute if score @s bt_interest matches 1.. run title @s actionbar [{"text":"+ ","color":"green","bold":true},{"score":{"name":"@s","objective":"bt_interest"},"color":"green","bold":true},{"text":" esmeraldas en intereses bancarios","color":"gold"}]',
    ]),
  )

  // Cobro específico por estructura mediante saldo de tarjeta
  structures.forEach((structure) => {
    const { id } = structure.analysis

    put(
      root + 'charge_' + id + '.mcfunction',
      mcfunction([
        '# Capturar cuánto cubre el banco ANTES de modificarlo',
        'scoreboard players operation @s bt_temp = @s bt_bank',
        '# Caso 1: el banco cubre el total',
        'execute if score @s bt_bank >= @s bt_price run scoreboard players operation @s bt_bank -= @s bt_price',
        'execute if score @s bt_temp >= @s bt_price run tellraw @s [{"text":"[Banco] Pago completado con tu Tarjeta Bancaria. Saldo restante: ","color":"green"},{"score":{"name":"@s","objective":"bt_bank"},"color":"gold"}]',
        'execute if score @s bt_temp >= @s bt_price run function builder_tables:dynamic/build_' +
          id,
        'execute if score @s bt_temp >= @s bt_price run return 1',
        '# Caso 2: el banco cubre solo una parte — descontar del banco y cobrar el resto del inventario',
        'scoreboard players operation @s bt_price -= @s bt_bank',
        'scoreboard players set @s bt_bank 0',
        'tellraw @s [{"text":"[Banco] Se aplicaron ","color":"yellow"},{"score":{"name":"@s","objective":"bt_temp"},"color":"gold"},{"text":" esmeraldas de tu Tarjeta Bancaria. El resto se cobrará del inventario.","color":"yellow"}]',
      ]),
    )
  })
}

export function addBankAssets(
  put: TextFileWriter,
  putJson: JsonFileWriter,
  structures: GeneratedStructure[],
) {
  // Receta crafteable: solo papel, esmeralda, hierro y redstone
  putJson('data/builder_tables/recipe/bank_card.json', {
    type: 'minecraft:crafting_shapeless',
    category: 'equipment',
    ingredients: [
      'minecraft:paper',
      'minecraft:emerald',
      'minecraft:iron_ingot',
      'minecraft:redstone',
    ],
    result: {
      id: BANK_CARD_ITEM,
      count: 1,
      components: bankCardComponents(),
    },
  })

  // Comando directo para obtener la tarjeta en creativo / pruebas
  put(
    'data/builder_tables/function/give_card.mcfunction',
    '# Tarjeta Bancaria para Builder Tables.\ngive @s ' +
      bankCardItemSnbt() +
      '\n',
  )

  addBankDialog(putJson)
  addBankAdvancement(putJson)
  addBankFunctions(put, structures)
}
