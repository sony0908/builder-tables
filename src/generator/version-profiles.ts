export type MinecraftVersion = '26.1' | '26.2' | '26.3'

export type VersionProfile = {
  id: MinecraftVersion
  label: string
  packFormat: readonly [number, number]
  stability: 'stable' | 'experimental'
  baseArchive: string
  generatedArchive: string
  storageKey: string
}

/**
 * Each game release receives its own archive and exact pack format. Keeping
 * profiles separate avoids pretending that a newer data format is safe in an
 * older server before it has been tested there.
 */
export const VERSION_PROFILES: readonly VersionProfile[] = [
  {
    id: '26.1',
    label: 'Java 26.1',
    packFormat: [101, 1],
    stability: 'experimental',
    baseArchive: '/downloads/BuilderTables_26.1_controller_menu_v2.zip',
    generatedArchive: 'BuilderTables_26.1_generated.zip',
    storageKey: 'builder-tables-base-26-1',
  },
  {
    id: '26.2',
    label: 'Java 26.2',
    packFormat: [107, 1],
    stability: 'stable',
    baseArchive: '/downloads/BuilderTables_26.2_controller_menu_v2.zip',
    generatedArchive: 'BuilderTables_26.2_generated.zip',
    storageKey: 'builder-tables-base-26-2',
  },
  {
    id: '26.3',
    label: 'Java 26.3',
    packFormat: [121, 0],
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
