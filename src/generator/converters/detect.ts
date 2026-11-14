import type { NbtRecord, SourceFormat } from './types'

export function detectNbtFormat(
  root: NbtRecord,
  filename?: string,
): SourceFormat {
  // 1. Vanilla Structure NBT
  if (
    Object.hasOwn(root, 'size') &&
    Object.hasOwn(root, 'palette') &&
    Object.hasOwn(root, 'blocks')
  ) {
    return 'vanilla'
  }

  // 2. Litematica (.litematic)
  if (
    Object.hasOwn(root, 'Regions') ||
    (Object.hasOwn(root, 'Metadata') && Object.hasOwn(root, 'MinecraftDataVersion'))
  ) {
    return 'litematic'
  }

  // 3. Modern WorldEdit Sponge (.schem)
  const isModernSponge =
    Object.hasOwn(root, 'Palette') ||
    Object.hasOwn(root, 'BlockPalette') ||
    (typeof root.Blocks === 'object' &&
      root.Blocks !== null &&
      !ArrayBuffer.isView(root.Blocks) &&
      !Array.isArray(root.Blocks)) ||
    Object.hasOwn(root, 'BlockData')

  if (isModernSponge) {
    return 'schem'
  }

  if (Object.hasOwn(root, 'Schematic') && typeof root.Schematic === 'object') {
    return 'schem'
  }

  // 4. Legacy MCEdit / WorldEdit (.schematic)
  // Contiene Width, Height, Length y arrays de bytes Blocks y Data sin paleta
  if (
    Object.hasOwn(root, 'Width') &&
    Object.hasOwn(root, 'Height') &&
    Object.hasOwn(root, 'Length') &&
    Object.hasOwn(root, 'Blocks') &&
    Object.hasOwn(root, 'Data')
  ) {
    return 'legacy_schematic'
  }

  // 5. Fallback por extensión de archivo
  if (filename) {
    const lower = filename.toLowerCase()
    if (lower.endsWith('.litematic')) return 'litematic'
    if (lower.endsWith('.schematic')) return 'legacy_schematic'
    if (lower.endsWith('.schem')) return 'schem'
    if (lower.endsWith('.nbt')) return 'vanilla'
  }

  return 'vanilla'
}
