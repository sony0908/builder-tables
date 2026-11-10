export type MinecraftVersion =
  | '26.2'
  | '1.21.4'
  | '1.21.2'
  | '1.21'
  | '26.1'
  | '26.3'

export type VersionProfile = {
  id: MinecraftVersion
  label: string
  packFormat: readonly [number, number]
  packFormatNumber?: number
  supportedFormats?:
    | readonly [number, number]
    | { min_inclusive: number; max_inclusive: number }
  stability: 'stable' | 'experimental'
  baseArchive: string
  generatedArchive: string
  storageKey: string
}

/**
 * Cada versión de Minecraft recibe su propio perfil, archivo base y formato
 * exacto de paquete para garantizar compatibilidad nativa en clientes y plataformas.
 */
export const VERSION_PROFILES: readonly VersionProfile[] = [
  {
    id: '26.2',
    label: 'Java 26.2 (Principal)',
    packFormat: [107, 1],
    packFormatNumber: 107,
    stability: 'stable',
    baseArchive: '/downloads/BuilderTables_26.2_controller_menu_v2.zip',
    generatedArchive: 'BuilderTables_26.2_generated.zip',
    storageKey: 'builder-tables-base-26-2',
  },
  {
    id: '1.21.4',
    label: 'Java 1.21.4 (Modrinth / CurseForge)',
    packFormat: [61, 0],
    packFormatNumber: 61,
    supportedFormats: { min_inclusive: 48, max_inclusive: 61 },
    stability: 'stable',
    baseArchive: '/downloads/BuilderTables_1.21.4_controller_menu_v2.zip',
    generatedArchive: 'BuilderTables_1.21.4_generated.zip',
    storageKey: 'builder-tables-base-1-21-4',
  },
  {
    id: '1.21.2',
    label: 'Java 1.21.2 - 1.21.3',
    packFormat: [57, 0],
    packFormatNumber: 57,
    supportedFormats: { min_inclusive: 48, max_inclusive: 57 },
    stability: 'stable',
    baseArchive: '/downloads/BuilderTables_1.21.2_controller_menu_v2.zip',
    generatedArchive: 'BuilderTables_1.21.2_generated.zip',
    storageKey: 'builder-tables-base-1-21-2',
  },
  {
    id: '1.21',
    label: 'Java 1.21 - 1.21.1',
    packFormat: [48, 0],
    packFormatNumber: 48,
    supportedFormats: { min_inclusive: 48, max_inclusive: 48 },
    stability: 'stable',
    baseArchive: '/downloads/BuilderTables_1.21_controller_menu_v2.zip',
    generatedArchive: 'BuilderTables_1.21_generated.zip',
    storageKey: 'builder-tables-base-1-21',
  },
  {
    id: '26.1',
    label: 'Java 26.1',
    packFormat: [101, 1],
    packFormatNumber: 101,
    stability: 'experimental',
    baseArchive: '/downloads/BuilderTables_26.1_controller_menu_v2.zip',
    generatedArchive: 'BuilderTables_26.1_generated.zip',
    storageKey: 'builder-tables-base-26-1',
  },
  {
    id: '26.3',
    label: 'Java 26.3',
    packFormat: [121, 0],
    packFormatNumber: 121,
    stability: 'experimental',
    baseArchive: '/downloads/BuilderTables_26.3_controller_menu_v2.zip',
    generatedArchive: 'BuilderTables_26.3_generated.zip',
    storageKey: 'builder-tables-base-26-3',
  },
]

export function getVersionProfile(id: MinecraftVersion) {
  const profile = VERSION_PROFILES.find((candidate) => candidate.id === id)
  if (!profile) throw new Error('Versión de Minecraft no compatible: ' + id)
  return profile
}
