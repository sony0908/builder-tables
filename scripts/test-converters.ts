import { Int32, write } from 'nbtify'
import { convertSchemToVanilla } from '../src/generator/converters/schem'
import { convertLitematicToVanilla } from '../src/generator/converters/litematic'
import { detectNbtFormat, normalizeToVanilla } from '../src/generator/converters/index'
import { analyzeInputs } from '../src/generator/nbt'

async function runTests() {
  console.log('🧪 Iniciando tests de conversores (.schem y .litematic)...')

  // ── TEST 1: WorldEdit .schem con propiedades y tile entity ──────────────────
  // Simular .schem: Width=2, Height=1, Length=2 (4 bloques)
  // Bloque (0,0,0): stone
  // Bloque (1,0,0): oak_stairs[facing=north,half=bottom]
  // Bloque (0,0,1): air
  // Bloque (1,0,1): chest con tile entity
  const schemPalette: Record<string, number> = {
    'minecraft:stone': 0,
    'minecraft:oak_stairs[facing=north,half=bottom]': 1,
    'minecraft:air': 2,
    'minecraft:chest[facing=south]': 3,
  }

  // Sponge order: (y * length + z) * width + x
  // y=0:
  // z=0, x=0 -> stone (0)
  // z=0, x=1 -> stairs (1)
  // z=1, x=0 -> air (2)
  // z=1, x=1 -> chest (3)
  const schemBlockData = new Uint8Array([0, 1, 2, 3])

  const schemRoot = {
    Version: new Int32(2),
    DataVersion: new Int32(3955),
    Width: 2,
    Height: 1,
    Length: 2,
    Palette: schemPalette,
    BlockData: schemBlockData,
    BlockEntities: [
      {
        Pos: [1, 0, 1],
        Id: 'minecraft:chest',
        CustomName: 'Cofre Secreto',
      },
    ],
  }

  const format1 = detectNbtFormat(schemRoot, 'torre.schem')
  if (format1 !== 'schem') throw new Error(`Detección falló: esperado 'schem', obtenido '${format1}'`)

  const convertedSchem = convertSchemToVanilla(schemRoot)
  if (convertedSchem.format !== 'schem') throw new Error('Formato devuelto incorrecto')

  const sSize = convertedSchem.root.size as Int32[]
  if (sSize[0].valueOf() !== 2 || sSize[1].valueOf() !== 1 || sSize[2].valueOf() !== 2) {
    throw new Error(`Dimensiones de .schem incorrectas: ${sSize}`)
  }

  const sPalette = convertedSchem.root.palette as any[]
  if (sPalette.length !== 4) throw new Error(`Tamaño de paleta incorrecto: ${sPalette.length}`)
  if (sPalette[1].Name !== 'minecraft:oak_stairs') throw new Error('Nombre de escalera incorrecto')
  if (sPalette[1].Properties?.facing !== 'north' || sPalette[1].Properties?.half !== 'bottom') {
    throw new Error('Propiedades de escalera incorrectas')
  }

  const sBlocks = convertedSchem.root.blocks as any[]
  const chestBlock = sBlocks.find(b => b.pos[0].valueOf() === 1 && b.pos[2].valueOf() === 1)
  if (!chestBlock) throw new Error('Falta bloque cofre en (1,0,1)')
  if (chestBlock.nbt?.id !== 'minecraft:chest' || chestBlock.nbt?.CustomName !== 'Cofre Secreto') {
    throw new Error('TileEntity del cofre no se adjuntó correctamente')
  }

  console.log('✅ Test 1 (.schem básico + propiedades + tile entities) superado.')

  // ── TEST 2: Litematica .litematic con empaquetado de bits ───────────────────
  // Región de 2x2x2 = 8 bloques
  // Palette: [air (0), stone (1), oak_planks (2)] -> 3 entradas -> 2 bits por bloque
  // 8 bloques * 2 bits = 16 bits (cabe en 1 long)
  // Bloques: 0, 1, 2, 1, 0, 2, 1, 2
  // En binario: 10_01_10_00_01_10_01_00n = 0x9864n etc.
  const litematicPalette = [
    { Name: 'minecraft:air' },
    { Name: 'minecraft:stone' },
    { Name: 'minecraft:oak_planks' },
  ]

  let packedLong = 0n
  const blockSeq = [0, 1, 2, 1, 0, 2, 1, 2]
  blockSeq.forEach((val, idx) => {
    packedLong |= BigInt(val) << BigInt(idx * 2)
  })

  const litematicRoot = {
    MinecraftDataVersion: new Int32(3955),
    Version: new Int32(6),
    Metadata: {
      Name: 'Mi Casa Litematica',
      Author: 'Steve',
      Description: 'Casa de prueba',
    },
    Regions: {
      Main: {
        Position: { x: 0, y: 0, z: 0 },
        Size: { x: 2, y: 2, z: 2 },
        BlockStatePalette: litematicPalette,
        BlockStates: new BigInt64Array([packedLong]),
        TileEntities: [],
      },
    },
  }

  const format2 = detectNbtFormat(litematicRoot, 'casa.litematic')
  if (format2 !== 'litematic') throw new Error(`Detección falló: esperado 'litematic', obtenido '${format2}'`)

  const convertedLitematic = convertLitematicToVanilla(litematicRoot)
  const lSize = convertedLitematic.root.size as Int32[]
  if (lSize[0].valueOf() !== 2 || lSize[1].valueOf() !== 2 || lSize[2].valueOf() !== 2) {
    throw new Error(`Dimensiones de .litematic incorrectas: ${lSize}`)
  }

  const lBlocks = convertedLitematic.root.blocks as any[]
  if (lBlocks.length !== 8) throw new Error(`Bloques totales esperados 8, obtenidos: ${lBlocks.length}`)

  console.log('✅ Test 2 (.litematic básico + bit-unpacking) superado.')

  // ── TEST 3: Litematica con Size negativo ────────────────────────────────────
  // Size = { x: -2, y: 2, z: -2 }
  // Verificar que el bounding box se invierta y las coordenadas finales sean [0..1, 0..1, 0..1]
  const litematicNegativeRoot = {
    MinecraftDataVersion: new Int32(3955),
    Version: new Int32(6),
    Regions: {
      NegativeRegion: {
        Position: { x: 10, y: 5, z: 10 },
        Size: { x: -2, y: 2, z: -2 },
        BlockStatePalette: litematicPalette,
        BlockStates: new BigInt64Array([packedLong]),
        TileEntities: [],
      },
    },
  }

  const convertedNegative = convertLitematicToVanilla(litematicNegativeRoot)
  const nSize = convertedNegative.root.size as Int32[]
  if (nSize[0].valueOf() !== 2 || nSize[1].valueOf() !== 2 || nSize[2].valueOf() !== 2) {
    throw new Error(`Dimensiones de región negativa incorrectas: ${nSize}`)
  }
  const nBlocks = convertedNegative.root.blocks as any[]
  nBlocks.forEach((b) => {
    const [x, y, z] = b.pos.map((p: any) => p.valueOf())
    if (x < 0 || x > 1 || y < 0 || y > 1 || z < 0 || z > 1) {
      throw new Error(`Coordenada fuera de rango en región negativa: [${x}, ${y}, ${z}]`)
    }
  })

  console.log('✅ Test 3 (.litematic con selección negativa normalizada) superado.')

  // ── TEST 4: Prueba End-to-End con el Pipeline de análisis de la Web ────────
  // Escribir schemRoot y litematicRoot como archivos NBT nativos (.schem y .litematic)
  // y pasarlos por analyzeInputs() para verificar que processInput los convierte automáticamente!
  const rawSchemBytes = await write(schemRoot, {
    endian: 'big',
    compression: 'gzip',
    rootName: 'Schematic',
  })
  const rawLitematicBytes = await write(litematicRoot, {
    endian: 'big',
    compression: 'gzip',
    rootName: 'Litematica',
  })

  const analysis = await analyzeInputs([
    {
      key: 'test_schem',
      sourceName: 'torre_magica.schem',
      bytes: rawSchemBytes.buffer,
    },
    {
      key: 'test_litematic',
      sourceName: 'granja_hierro.litematic',
      bytes: rawLitematicBytes.buffer,
    },
  ])

  if (analysis.structures.length !== 2) {
    throw new Error(`Se esperaban 2 estructuras analizadas, se obtuvieron: ${analysis.structures.length}`)
  }

  const [resSchem, resLitematic] = analysis.structures
  if (resSchem.status !== 'ready') throw new Error(`Análisis schem falló: ${resSchem.error}`)
  if (resLitematic.status !== 'ready') throw new Error(`Análisis litematic falló: ${resLitematic.error}`)

  if (resSchem.id !== 'torre_magica') throw new Error(`ID incorrecto: ${resSchem.id}`)
  if (resLitematic.id !== 'granja_hierro') throw new Error(`ID incorrecto: ${resLitematic.id}`)

  if (resSchem.price <= 0) throw new Error(`Precio de schem inválido: ${resSchem.price}`)
  if (resLitematic.price <= 0) throw new Error(`Precio de litematic inválido: ${resLitematic.price}`)

  console.log(`✅ Test 4 (Pipeline completo de análisis) superado:`)
  console.log(`   - ${resSchem.name} (${resSchem.id}): ${resSchem.count} bloques, precio ${resSchem.price} esmeraldas`)
  console.log(`   - ${resLitematic.name} (${resLitematic.id}): ${resLitematic.count} bloques, precio ${resLitematic.price} esmeraldas`)

  // ── TEST 5: Legacy MCEdit .schematic (Minecraft 1.12 y anteriores) ──────────
  // Archivo con Width=2, Height=2, Length=2, Materials="Alpha", Blocks (byte[]), Data (byte[])
  // Bloques: stone (granite), wood (birch), glass, stairs (oak facing south), wool (red), log (oak), stone_bricks (mossy), chest
  const legacySchematicRoot = {
    Width: 2,
    Height: 2,
    Length: 2,
    Materials: 'Alpha',
    Blocks: new Uint8Array([1, 5, 20, 53, 35, 17, 98, 54]),
    Data: new Uint8Array([1, 2, 0, 2, 14, 0, 1, 3]),
    TileEntities: [
      {
        id: 'Chest',
        x: 1,
        y: 1,
        z: 1,
        CustomName: 'Cofre Antiguo',
      },
    ],
  }

  const format5 = detectNbtFormat(legacySchematicRoot, 'casamodernamodernhouseflp8536422.schematic')
  if (format5 !== 'legacy_schematic') {
    throw new Error(`Detección falló: esperado 'legacy_schematic', obtenido '${format5}'`)
  }

  const rawLegacyBytes = await write(legacySchematicRoot, {
    endian: 'big',
    compression: 'gzip',
    rootName: 'Schematic',
  })

  const legacyAnalysis = await analyzeInputs([
    {
      key: 'test_legacy',
      sourceName: 'casamodernamodernhouseflp8536422.schematic',
      bytes: rawLegacyBytes.buffer,
    },
  ])

  const resLegacy = legacyAnalysis.structures[0]
  if (!resLegacy || resLegacy.status !== 'ready') {
    throw new Error(`Análisis de .schematic antiguo falló: ${resLegacy?.error}`)
  }

  if (resLegacy.id !== 'casamodernamodernhouseflp8536422') {
    throw new Error(`ID incorrecto para .schematic: ${resLegacy.id}`)
  }
  if (resLegacy.sourceFormat !== 'legacy_schematic') {
    throw new Error(`sourceFormat incorrecto: ${resLegacy.sourceFormat}`)
  }

  const materialsList = resLegacy.materials.map(m => m.name)
  if (!materialsList.includes('minecraft:granite')) throw new Error('Falta minecraft:granite en materiales')
  if (!materialsList.includes('minecraft:birch_planks')) throw new Error('Falta minecraft:birch_planks en materiales')
  if (!materialsList.includes('minecraft:red_wool')) throw new Error('Falta minecraft:red_wool en materiales')
  if (!materialsList.includes('minecraft:mossy_stone_bricks')) throw new Error('Falta minecraft:mossy_stone_bricks en materiales')

  console.log(`✅ Test 5 (MCEdit .schematic clásico 1.12 convertido exitosamente):`)
  console.log(`   - ${resLegacy.name} (${resLegacy.id}): ${resLegacy.count} bloques, precio ${resLegacy.price} esmeraldas`)
  console.log('🎉 Todos los tests de conversores pasaron satisfactoriamente.')
}

runTests().catch((e) => {
  console.error('❌ Error en tests:', e)
  process.exit(1)
})
