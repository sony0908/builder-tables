import { read, write } from 'nbtify'
import type { ConvertedStructure, NbtRecord } from './types'
import { detectNbtFormat } from './detect'
import { convertSchemToVanilla } from './schem'
import { convertLitematicToVanilla } from './litematic'

export * from './types'
export * from './detect'
export * from './schem'
export * from './litematic'

export function normalizeToVanilla(
  root: NbtRecord,
  filename?: string,
): ConvertedStructure {
  const format = detectNbtFormat(root, filename)

  if (format === 'litematic') {
    return convertLitematicToVanilla(root)
  }

  if (format === 'schem') {
    return convertSchemToVanilla(root)
  }

  return {
    format: 'vanilla',
    root,
    warnings: [],
  }
}

export async function convertNbtBufferToVanilla(
  buffer: Uint8Array | ArrayBuffer,
  filename?: string,
): Promise<{ bytes: Uint8Array; converted: ConvertedStructure }> {
  const decoded = await read(buffer, {
    endian: 'big',
    rootName: true,
  })

  const root = decoded.data as NbtRecord
  const converted = normalizeToVanilla(root, filename)

  if (converted.format === 'vanilla') {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
    return { bytes, converted }
  }

  const bytes = await write(converted.root, {
    endian: 'big',
    compression: 'gzip',
    rootName: '',
  })

  return { bytes, converted }
}
