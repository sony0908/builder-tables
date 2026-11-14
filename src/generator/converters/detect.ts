import type { NbtRecord, SourceFormat } from './types'

export function detectNbtFormat(
  root: NbtRecord,
  filename?: string,
): SourceFormat {
  // 1. Direct inspection of root NBT tags
  if (
    Object.hasOwn(root, 'size') &&
    Object.hasOwn(root, 'palette') &&
    Object.hasOwn(root, 'blocks')
  ) {
    return 'vanilla'
  }

  if (
    Object.hasOwn(root, 'Regions') ||
    (Object.hasOwn(root, 'Metadata') && Object.hasOwn(root, 'MinecraftDataVersion'))
  ) {
    return 'litematic'
  }

  if (
    Object.hasOwn(root, 'Schematic') ||
    (Object.hasOwn(root, 'Width') &&
      (Object.hasOwn(root, 'Palette') ||
        Object.hasOwn(root, 'BlockPalette') ||
        Object.hasOwn(root, 'Blocks') ||
        Object.hasOwn(root, 'BlockData') ||
        Object.hasOwn(root, 'Data')))
  ) {
    return 'schem'
  }

  // 2. Fallback to filename extension
  if (filename) {
    const lower = filename.toLowerCase()
    if (lower.endsWith('.litematic')) return 'litematic'
    if (lower.endsWith('.schem') || lower.endsWith('.schematic')) return 'schem'
    if (lower.endsWith('.nbt')) return 'vanilla'
  }

  return 'vanilla'
}
