import type { TAG as TagType } from 'nbtify'

export type SourceFormat = 'vanilla' | 'schem' | 'litematic'

export type NbtRecord = Record<string, unknown>
export type NbtList = unknown[] & { [key: symbol]: TagType }

export type ConvertedStructure = {
  format: SourceFormat
  root: NbtRecord
  name?: string
  author?: string
  description?: string
  warnings: string[]
}
