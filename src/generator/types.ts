export type MaterialCount = {
  name: string
  count: number
}

export type PolicyDependency = {
  id: string
  count: number
  billable: boolean
}

export type PolicyWorldLimit = {
  id: string
  count: number
  maximum: number
  scope: 'world'
  note: string
}

export type PolicySummary = {
  dependencies: PolicyDependency[]
  notices: string[]
  worldLimits: PolicyWorldLimit[]
}

export type ViewerPaletteEntry = {
  name: string
  color: string
  properties: Record<string, string>
}

export type ViewerModel = {
  key: string
  size: [number, number, number]
  positions: Int32Array
  states: Uint32Array
  palette: ViewerPaletteEntry[]
}

export type StructureAnalysis = {
  key: string
  sourceName: string
  id: string
  name: string
  size: [number, number, number]
  count: number
  price: number
  stateCount: number
  materials: MaterialCount[]
  removed: MaterialCount[]
  policy?: PolicySummary
  status: 'ready' | 'rejected'
  error?: string
}

export type WorkerStructureInput = {
  key: string
  sourceName: string
  bytes: ArrayBuffer
  metadataText?: string
  nameOverride?: string
}

export type AnalysisResponse = {
  type: 'analysis'
  requestId: string
  structures: StructureAnalysis[]
  viewerModels: ViewerModel[]
}

export type GenerationResponse = {
  type: 'generated'
  requestId: string
  archive: ArrayBuffer
  report: string
  structures: StructureAnalysis[]
}

export type WorkerErrorResponse = {
  type: 'error'
  requestId: string
  message: string
}

export type WorkerResponse =
  | AnalysisResponse
  | GenerationResponse
  | WorkerErrorResponse

export type AnalyzeRequest = {
  type: 'analyze'
  requestId: string
  structures: WorkerStructureInput[]
}

export type GenerateRequest = {
  type: 'generate'
  requestId: string
  structures: WorkerStructureInput[]
}

export type WorkerRequest = AnalyzeRequest | GenerateRequest