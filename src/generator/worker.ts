import { generateArchive } from './datapack'
import { analyzeInputs } from './nbt'
import type { WorkerRequest, WorkerResponse } from './types'

type WorkerScope = {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null
  postMessage: (
    message: WorkerResponse,
    transfer?: Transferable[],
  ) => void
}

const scope = self as unknown as WorkerScope

scope.onmessage = (event) => {
  void handle(event.data)
}

async function handle(request: WorkerRequest) {
  try {
    if (request.type === 'analyze') {
      const result = await analyzeInputs(request.structures)
      const transfers: Transferable[] = []
      result.viewerModels.forEach((model) => {
        transfers.push(model.positions.buffer as ArrayBuffer)
        transfers.push(model.states.buffer as ArrayBuffer)
      })
      scope.postMessage(
        {
          type: 'analysis',
          requestId: request.requestId,
          structures: result.structures,
          viewerModels: result.viewerModels,
        },
        transfers,
      )
      return
    }

    const result = await generateArchive(request.structures)
    scope.postMessage(
      {
        type: 'generated',
        requestId: request.requestId,
        archive: result.archive,
        report: result.report,
        structures: result.structures,
      },
      [result.archive],
    )
  } catch (error) {
    scope.postMessage({
      type: 'error',
      requestId: request.requestId,
      message:
        error instanceof Error
          ? error.message
          : 'No se pudo generar el paquete.',
    })
  }
}