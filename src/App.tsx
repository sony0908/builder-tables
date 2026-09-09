import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import {
  ArrowRight,
  Box,
  Check,
  ChevronRight,
  Download,
  FileArchive,
  FileBox,
  FilePlus2,
  FolderOpen,
  Info,
  Layers3,
  LoaderCircle,
  Moon,
  PackageOpen,
  ShieldCheck,
  Sparkles,
  Sun,
  UploadCloud,
  X,
} from 'lucide-react'
import type {
  StructureAnalysis,
  ViewerModel,
  WorkerResponse,
  WorkerStructureInput,
} from './generator/types'
import { PriceCatalog } from './components/PriceCatalog'
import './App.css'

type StructurePhase = 'queued' | 'analyzing' | 'ready' | 'rejected'
type GenerationState = 'idle' | 'generating' | 'ready' | 'error'

type UploadedStructure = {
  id: string
  file: File
  metadataFile?: File
  nameOverride?: string
  analysis?: StructureAnalysis
  phase: StructurePhase
}

const BASE_PACK = '/downloads/BuilderTables_26.2_controller_menu_v2.zip'
const GENERATED_PACK = 'BuilderTables_26.2_generated.zip'

const StructureViewer = lazy(async () => {
  const module = await import('./components/MinecraftStructureViewer')
  return { default: module.MinecraftStructureViewer }
})

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  return (bytes / 1024).toFixed(1) + ' KB'
}

function stem(fileName: string, extension: string) {
  return fileName.replace(new RegExp('\\' + extension + '$', 'i'), '')
}

function nbtStem(fileName: string) {
  return stem(fileName, '.nbt')
}

function fileKey(fileName: string, extension: string) {
  return stem(fileName, extension).toLocaleLowerCase()
}

function displayName(structure: UploadedStructure) {
  return (
    structure.nameOverride ||
    structure.analysis?.name ||
    nbtStem(structure.file.name)
  )
}

function phaseLabel(structure: UploadedStructure) {
  if (structure.phase === 'analyzing') return 'Analizando'
  if (structure.phase === 'ready') {
    return structure.analysis?.removed.length
      ? 'Listo con ajustes'
      : 'Compatible'
  }
  if (structure.phase === 'rejected') return 'Rechazado'
  return 'En cola'
}

function downloadArchive(url: string) {
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = GENERATED_PACK
  anchor.click()
}

async function buildWorkerInputs(
  structures: UploadedStructure[],
): Promise<WorkerStructureInput[]> {
  return Promise.all(
    structures.map(async (structure) => ({
      key: structure.id,
      sourceName: structure.file.name,
      bytes: await structure.file.arrayBuffer(),
      metadataText: structure.metadataFile
        ? await structure.metadataFile.text()
        : undefined,
      nameOverride: structure.nameOverride,
    })),
  )
}

function App() {
  const [structures, setStructures] = useState<UploadedStructure[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () =>
      localStorage.getItem('builder-tables-theme') === 'dark'
        ? 'dark'
        : 'light',
  )
  const [baseDownloaded, setBaseDownloaded] = useState(
    () => localStorage.getItem('builder-tables-base-26-2') === 'true',
  )
  const [revision, setRevision] = useState(0)
  const [analysisError, setAnalysisError] = useState('')
  const [generationError, setGenerationError] = useState('')
  const [generationState, setGenerationState] =
    useState<GenerationState>('idle')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [viewerModels, setViewerModels] = useState<ViewerModel[]>([])
  const [selectedViewerKey, setSelectedViewerKey] = useState('')
  const [viewerAssetFile, setViewerAssetFile] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const viewerAssetInputRef = useRef<HTMLInputElement>(null)
  const workerRef = useRef<Worker | null>(null)
  const analysisRequestRef = useRef('')
  const generationRequestRef = useRef('')
  const downloadUrlRef = useRef('')
  const structuresRef = useRef<UploadedStructure[]>([])

  const clearGeneratedDownload = () => {
    if (downloadUrlRef.current) {
      URL.revokeObjectURL(downloadUrlRef.current)
      downloadUrlRef.current = ''
    }
    setDownloadUrl('')
    setGenerationState('idle')
    setGenerationError('')
  }

  const touchFiles = () => {
    analysisRequestRef.current = ''
    generationRequestRef.current = ''
    clearGeneratedDownload()
    setAnalysisError('')
    setViewerModels([])
    setSelectedViewerKey('')
    setRevision((current) => current + 1)
  }

  useEffect(() => {
    structuresRef.current = structures
  }, [structures])

  useEffect(() => {
    const worker = new Worker(
      new URL('./generator/worker.ts', import.meta.url),
      { type: 'module' },
    )
    workerRef.current = worker

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data

      if (
        response.type === 'analysis' &&
        response.requestId === analysisRequestRef.current
      ) {
        const byKey = new Map(
          response.structures.map((analysis) => [analysis.key, analysis]),
        )
        setStructures((current) =>
          current.map((structure) => {
            const analysis = byKey.get(structure.id)
            if (!analysis) return structure

            return {
              ...structure,
              analysis,
              phase: analysis.status === 'ready' ? 'ready' : 'rejected',
            }
          }),
        )
        setViewerModels(response.viewerModels)
        setSelectedViewerKey((current) =>
          response.viewerModels.some((model) => model.key === current)
            ? current
            : (response.viewerModels[0]?.key ?? ''),
        )
        return
      }

      if (
        response.type === 'generated' &&
        response.requestId === generationRequestRef.current
      ) {
        const nextUrl = URL.createObjectURL(
          new Blob([response.archive], { type: 'application/zip' }),
        )

        if (downloadUrlRef.current) {
          URL.revokeObjectURL(downloadUrlRef.current)
        }
        downloadUrlRef.current = nextUrl
        setDownloadUrl(nextUrl)
        setGenerationError('')
        setGenerationState('ready')
        downloadArchive(nextUrl)
        return
      }

      if (response.type === 'error') {
        if (response.requestId === analysisRequestRef.current) {
          setAnalysisError(response.message)
          setViewerModels([])
          setSelectedViewerKey('')
          setStructures((current) =>
            current.map((structure) => ({
              ...structure,
              phase: 'rejected',
              analysis: {
                key: structure.id,
                sourceName: structure.file.name,
                id: '',
                name: displayName(structure),
                size: [0, 0, 0],
                count: 0,
                price: 0,
                stateCount: 0,
                materials: [],
                removed: [],
                status: 'rejected',
                error: response.message,
              },
            })),
          )
        }

        if (response.requestId === generationRequestRef.current) {
          setGenerationError(response.message)
          setGenerationState('error')
        }
      }
    }

    return () => {
      worker.terminate()
      workerRef.current = null
      if (downloadUrlRef.current) {
        URL.revokeObjectURL(downloadUrlRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const snapshot = structuresRef.current
    if (!snapshot.length || !workerRef.current) return

    const requestId = 'analysis-' + crypto.randomUUID()
    let cancelled = false
    analysisRequestRef.current = requestId

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const inputs = await buildWorkerInputs(snapshot)
          if (
            cancelled ||
            analysisRequestRef.current !== requestId ||
            !workerRef.current
          ) {
            return
          }

          workerRef.current.postMessage(
            {
              type: 'analyze',
              requestId,
              structures: inputs,
            },
            inputs.map((input) => input.bytes),
          )
        } catch {
          if (!cancelled && analysisRequestRef.current === requestId) {
            setAnalysisError('No se pudieron leer los archivos seleccionados.')
          }
        }
      })()
    }, 180)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [revision])

  const addFiles = (files: FileList | File[]) => {
    const allFiles = Array.from(files)
    const nbtFiles = allFiles.filter((file) =>
      file.name.toLowerCase().endsWith('.nbt'),
    )
    const sidecars = new Map<string, File>()

    allFiles
      .filter((file) => file.name.toLowerCase().endsWith('.json'))
      .forEach((file) => {
        sidecars.set(fileKey(file.name, '.json'), file)
      })

    setStructures((current) => {
      const known = new Set(
        current.map(
          (structure) =>
            structure.file.name.toLowerCase() + ':' + structure.file.size,
        ),
      )
      const next = current.map((structure) => {
        const metadata = sidecars.get(fileKey(structure.file.name, '.nbt'))
        return metadata
          ? {
              ...structure,
              metadataFile: metadata,
              analysis: undefined,
              phase: 'queued' as StructurePhase,
            }
          : structure
      })

      nbtFiles.forEach((file) => {
        const identity = file.name.toLowerCase() + ':' + file.size
        if (known.has(identity)) return

        next.push({
          id: crypto.randomUUID(),
          file,
          metadataFile: sidecars.get(fileKey(file.name, '.nbt')),
          phase: 'queued',
        })
        known.add(identity)
      })

      return next
    })
    touchFiles()
  }
  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) addFiles(event.target.files)
    event.target.value = ''
  }

  const onViewerAssetFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !/\.(jar|zip)$/i.test(file.name)) return
    setViewerAssetFile(file)
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    addFiles(event.dataTransfer.files)
  }

  const removeStructure = (id: string) => {
    setStructures((current) =>
      current.filter((structure) => structure.id !== id),
    )
    touchFiles()
  }

  const renameStructure = (id: string, name: string) => {
    setStructures((current) =>
      current.map((structure) =>
        structure.id === id
          ? {
              ...structure,
              nameOverride: name,
              analysis: undefined,
              phase: 'queued',
            }
          : structure,
      ),
    )
    touchFiles()
  }

  const rememberBaseDownload = () => {
    localStorage.setItem('builder-tables-base-26-2', 'true')
    setBaseDownloaded(true)
  }

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light'
    localStorage.setItem('builder-tables-theme', nextTheme)
    setTheme(nextTheme)
  }

  const hasStructures = structures.length > 0
  const analyzing = structures.some(
    (structure) =>
      structure.phase === 'queued' || structure.phase === 'analyzing',
  )
  const rejected = structures.some(
    (structure) => structure.phase === 'rejected',
  )
  const allReady =
    hasStructures &&
    structures.every(
      (structure) =>
        structure.phase === 'ready' &&
        structure.analysis?.status === 'ready',
    )
  const hasRemovedBlocks = structures.some(
    (structure) => (structure.analysis?.removed.length ?? 0) > 0,
  )
  const canGenerate = allReady && generationState !== 'generating'
  const selectedViewer =
    viewerModels.find((model) => model.key === selectedViewerKey) ??
    viewerModels[0]
  const selectedViewerAnalysis = selectedViewer
    ? structures.find((structure) => structure.id === selectedViewer.key)
        ?.analysis
    : undefined

  const reviewStatus = !hasStructures
    ? 'Esperando archivos'
    : analyzing
      ? 'Analizando'
      : rejected
        ? 'Revisión requerida'
        : hasRemovedBlocks
          ? 'Listo con ajustes'
          : 'Compatible'

  const reviewStatusClass = !hasStructures
    ? ''
    : analyzing
      ? ' status-pending'
      : rejected
        ? ' status-rejected'
        : hasRemovedBlocks
          ? ' status-warning'
          : ' status-ready'

  const generatePackage = async () => {
    if (!canGenerate || !workerRef.current) return

    const requestId = 'generate-' + crypto.randomUUID()
    generationRequestRef.current = requestId
    setGenerationState('generating')
    setGenerationError('')

    try {
      const inputs = await buildWorkerInputs(structures)
      if (!workerRef.current || generationRequestRef.current !== requestId) {
        return
      }

      workerRef.current.postMessage(
        {
          type: 'generate',
          requestId,
          structures: inputs,
        },
        inputs.map((input) => input.bytes),
      )
    } catch {
      setGenerationState('error')
      setGenerationError('No se pudieron preparar los archivos para generar.')
    }
  }

  return (
    <div className={'app-shell theme-' + theme}>
      <header className="topbar">
        <a className="brand" href="#workspace" aria-label="Builder Tables">
          <span className="brand-mark">
            <Box size={27} strokeWidth={1.75} />
          </span>
          <span className="brand-copy">
            <strong>Builder Tables</strong>
            <small>Generador de datapacks</small>
          </span>
        </a>

        <nav className="topnav" aria-label="Navegación principal">
          <a className="nav-link nav-link-active" href="#workspace">
            <Layers3 size={17} />
            Proyecto actual
          </a>
          <a className="nav-link" href="#guide">
            <Info size={17} />
            Documentación
          </a>
          <a className="nav-link" href="#prices">
            <Sparkles size={17} />
            Precios
          </a>
        </nav>

        <div className="header-actions">
          <span className="version-badge">Java 26.2</span>
          <button
            className="theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={
              theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'
            }
            aria-pressed={theme === 'dark'}
            title={
              theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'
            }
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <a
            className="base-download"
            href={BASE_PACK}
            download
            onClick={rememberBaseDownload}
          >
            <Download size={16} />
            {baseDownloaded ? 'Descargar base de nuevo' : 'Descargar base'}
          </a>
        </div>
      </header>

      <main id="workspace" className="workspace">
        <aside className="project-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Proyecto actual</span>
              <h1>Mi paquete</h1>
            </div>
            <span className="count-badge">{structures.length}</span>
          </div>

          <div className="project-list">
            {!hasStructures ? (
              <div className="empty-project">
                <span className="empty-icon">
                  <FilePlus2 size={22} />
                </span>
                <p>Aún no hay construcciones.</p>
                <small>Sube uno o varios archivos NBT para comenzar.</small>
              </div>
            ) : (
              structures.map((structure) => (
                <article className="structure-item" key={structure.id}>
                  <span className="structure-icon">
                    <FileBox size={19} />
                  </span>
                  <div className="structure-copy">
                    <input
                      aria-label="Nombre de construcción"
                      value={displayName(structure)}
                      onChange={(event) =>
                        renameStructure(structure.id, event.target.value)
                      }
                    />
                    <small>
                      {formatBytes(structure.file.size)} · {phaseLabel(structure)}
                      {structure.metadataFile ? ' · JSON de precio' : ''}
                    </small>
                  </div>
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => removeStructure(structure.id)}
                    aria-label="Quitar construcción"
                  >
                    <X size={16} />
                  </button>
                </article>
              ))
            )}
          </div>

          <div className="project-footnote">
            <ShieldCheck size={18} />
            <p>
              Tus archivos se procesan en este navegador. No se suben a ningún
              servidor.
            </p>
          </div>
        </aside>

        <section className="workbench" aria-label="Generador de datapacks">
          <ol className="stepper">
            <li className="step step-current">
              <span>1</span>
              <div>
                <strong>Subir</strong>
                <small>Archivos NBT</small>
              </div>
            </li>
            <ChevronRight className="step-arrow" size={20} />
            <li className={'step' + (allReady ? ' step-ready' : '')}>
              <span>{allReady ? <Check size={15} /> : '2'}</span>
              <div>
                <strong>Revisar</strong>
                <small>Compatibilidad</small>
              </div>
            </li>
            <ChevronRight className="step-arrow" size={20} />
            <li
              className={
                'step' + (generationState === 'ready' ? ' step-ready' : '')
              }
            >
              <span>
                {generationState === 'ready' ? <Check size={15} /> : '3'}
              </span>
              <div>
                <strong>Generar</strong>
                <small>Paquete ZIP</small>
              </div>
            </li>
          </ol>

          <section className="upload-card">
            <div className="card-intro">
              <span className="section-icon section-icon-blue">
                <UploadCloud size={22} />
              </span>
              <div>
                <span className="eyebrow">Paso 1</span>
                <h2>Añade tus estructuras</h2>
                <p>
                  Selecciona NBT de Minecraft Java y, opcionalmente, un JSON
                  con el mismo nombre para fijar el título o sobrescribir el precio.
                </p>
              </div>
            </div>

            <div
              className={'dropzone' + (isDragging ? ' dropzone-active' : '')}
              onDragEnter={(event) => {
                event.preventDefault()
                setIsDragging(true)
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
            >
              <span className="dropzone-icon">
                <FolderOpen size={29} />
              </span>
              <strong>Arrastra tus archivos .nbt aquí</strong>
              <span>
                Puedes añadir un .json del mismo nombre para un título o precio manual.
              </span>
              <button
                className="secondary-button"
                type="button"
                onClick={() => inputRef.current?.click()}
              >
                Seleccionar archivos
              </button>
              <input
                ref={inputRef}
                className="visually-hidden"
                type="file"
                accept=".nbt,.json"
                multiple
                onChange={onFileChange}
              />
            </div>

            <div className="upload-details">
              <span>
                <ShieldCheck size={16} />
                Procesamiento local y privado
              </span>
              <span>
                <PackageOpen size={16} />
                Compatible con Java 26.2
              </span>
              <span>
                <FileArchive size={16} />
                Salida: {GENERATED_PACK}
              </span>
            </div>
          </section>

          <section className="viewer-card" aria-label="Visor 3D de estructuras">
            <div className="viewer-card-header">
              <div className="card-intro viewer-intro">
                <span className="section-icon section-icon-blue">
                  <Box size={22} />
                </span>
                <div>
                  <span className="eyebrow">Vista previa</span>
                  <h2>Visor 3D de la construcción</h2>
                  <p>
                    Muestra los bloques que se conservarán. Carga tu archivo
                    local de Minecraft para ver modelos y texturas reales.
                  </p>
                </div>
              </div>
              <div className="viewer-card-actions">
                <div className="viewer-assets">
                  <div>
                    <span>Recursos visuales</span>
                    <strong>
                      {viewerAssetFile
                        ? viewerAssetFile.name
                        : 'Vista simplificada'}
                    </strong>
                    <small>
                      {viewerAssetFile
                        ? formatBytes(viewerAssetFile.size) + ' · solo en este navegador'
                        : 'Selecciona client.jar 26.2 para usar modelos y texturas'}
                    </small>
                  </div>
                  <div className="viewer-assets-actions">
                    <button
                      className="viewer-assets-button"
                      type="button"
                      onClick={() => viewerAssetInputRef.current?.click()}
                    >
                      {viewerAssetFile ? 'Cambiar' : 'Cargar client.jar'}
                    </button>
                    {viewerAssetFile ? (
                      <button
                        className="viewer-assets-clear"
                        type="button"
                        onClick={() => setViewerAssetFile(null)}
                        aria-label="Quitar recursos visuales locales"
                        title="Quitar recursos visuales locales"
                      >
                        <X size={15} />
                      </button>
                    ) : null}
                    <input
                      ref={viewerAssetInputRef}
                      className="visually-hidden"
                      type="file"
                      accept=".jar,.zip,application/java-archive,application/zip"
                      onChange={onViewerAssetFileChange}
                    />
                  </div>
                </div>
                {viewerModels.length > 1 && selectedViewer ? (
                  <label className="viewer-selector">
                    <span>Construcción</span>
                    <select
                      value={selectedViewer.key}
                      onChange={(event) => setSelectedViewerKey(event.target.value)}
                    >
                      {viewerModels.map((model) => {
                        const structure = structures.find(
                          (entry) => entry.id === model.key,
                        )
                        return (
                          <option key={model.key} value={model.key}>
                            {structure ? displayName(structure) : model.key}
                          </option>
                        )
                      })}
                    </select>
                  </label>
                ) : null}
              </div>
            </div>

            {selectedViewer ? (
              <Suspense
                fallback={
                  <div className="viewer-pending viewer-loading">
                    <span className="empty-icon">
                      <LoaderCircle className="spin-icon" size={22} />
                    </span>
                    <div>
                      <strong>Abriendo el visor 3D…</strong>
                      <p>Se está cargando la vista interactiva de la estructura.</p>
                    </div>
                  </div>
                }
              >
                <StructureViewer
                  model={selectedViewer}
                  theme={theme}
                  assetFile={viewerAssetFile}
                />
              </Suspense>
            ) : (
              <div className="viewer-pending">
                <span className="empty-icon">
                  {analyzing ? <LoaderCircle className="spin-icon" size={22} /> : <Box size={22} />}
                </span>
                <div>
                  <strong>
                    {analyzing
                      ? 'Preparando la vista 3D…'
                      : 'Añade un NBT para ver su volumen'}
                  </strong>
                  <p>
                    {analyzing
                      ? 'El visor aparecerá al terminar la revisión local.'
                      : 'El modelo se crea directamente desde la paleta y los bloques del archivo.'}
                  </p>
                </div>
              </div>
            )}

            {selectedViewer ? (
              <div className="viewer-summary">
                <span>
                  <strong>{selectedViewer.size.join(' × ')}</strong>
                  dimensiones
                </span>
                <span>
                  <strong>{selectedViewer.states.length.toLocaleString('es-CL')}</strong>
                  bloques visibles
                </span>
                <span>
                  <strong>{selectedViewerAnalysis?.stateCount ?? 0}</strong>
                  estados de bloque
                </span>
                <span>
                  {viewerAssetFile
                    ? 'Recursos locales: ' + viewerAssetFile.name
                    : 'Carga client.jar para ver texturas reales'}
                </span>
                <span>Bloques de mod se excluyen automáticamente</span>
              </div>
            ) : null}
          </section>
          <section className="review-card">
            <div className="review-header">
              <div>
                <span className="eyebrow">Paso 2</span>
                <h2>Revisión del paquete</h2>
              </div>
              <span className={'status-pill' + reviewStatusClass}>
                {reviewStatus}
              </span>
            </div>

            {!hasStructures ? (
              <div className="review-empty">
                <Sparkles size={23} />
                <p>
                  Aquí aparecerán las dimensiones, el precio, los materiales y
                  los bloques no compatibles de cada construcción.
                </p>
              </div>
            ) : (
              <div className="pending-table">
                <div className="pending-head">
                  <span>Construcción</span>
                  <span>Dimensiones</span>
                  <span>Precio</span>
                  <span>Estado</span>
                </div>
                {structures.map((structure) => {
                  const analysis = structure.analysis
                  return (
                    <div className="review-entry" key={structure.id}>
                      <div className="pending-row">
                        <span className="file-name">
                          <FileBox size={17} />
                          {structure.file.name}
                        </span>
                        <span>
                          {analysis?.status === 'ready'
                            ? analysis.size.join(' × ')
                            : '—'}
                        </span>
                        <span>
                          {analysis?.status === 'ready'
                            ? analysis.price + ' esmeraldas'
                            : '—'}
                        </span>
                        <span
                          className={
                            'pending-label phase-' + structure.phase
                          }
                        >
                          {structure.phase === 'analyzing' ? (
                            <LoaderCircle size={14} />
                          ) : null}
                          {phaseLabel(structure)}
                        </span>
                      </div>
                      {analysis?.status === 'ready' && analysis.removed.length ? (
                        <div className="removed-blocks-note">
                          Se quitarán del resultado:{' '}
                          {analysis.removed
                            .map(
                              (material) =>
                                material.name + ' × ' + material.count,
                            )
                            .join(', ')}
                        </div>
                      ) : null}
                      {analysis?.error ? (
                        <div className="review-error">{analysis.error}</div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            )}
            {analysisError ? (
              <div className="review-error review-error-global">
                {analysisError}
              </div>
            ) : null}
          </section>

          <section className="generate-card">
            <div className="generate-copy">
              <span className="section-icon section-icon-gold">
                <FileArchive size={21} />
              </span>
              <div>
                <h2>Generar datapack</h2>
                <p>
                  {!hasStructures
                    ? 'Añade una estructura para habilitar la generación.'
                    : analyzing
                      ? 'Estamos revisando los archivos localmente.'
                      : rejected
                        ? 'Corrige o elimina las estructuras rechazadas.'
                        : generationState === 'ready'
                          ? 'El ZIP generado está listo para descargar.'
                          : 'El ZIP contiene solo el contenido generado, no el datapack base.'}
                </p>
              </div>
            </div>
            <div className="generate-actions">
              {downloadUrl ? (
                <a
                  className="generated-download"
                  href={downloadUrl}
                  download={GENERATED_PACK}
                >
                  <Download size={16} />
                  Descargar ZIP
                </a>
              ) : null}
              <button
                className="primary-button"
                type="button"
                disabled={!canGenerate}
                onClick={generatePackage}
              >
                {generationState === 'generating'
                  ? 'Generando…'
                  : generationState === 'ready'
                    ? 'Generar de nuevo'
                    : 'Generar paquete'}
                {generationState === 'generating' ? (
                  <LoaderCircle className="spin-icon" size={17} />
                ) : (
                  <ArrowRight size={17} />
                )}
              </button>
            </div>
            {generationError ? (
              <div className="review-error generate-error">
                {generationError}
              </div>
            ) : null}
          </section>
        </section>
      </main>

      <PriceCatalog assetFile={viewerAssetFile} />

      <section id="guide" className="installation-guide">
        <div>
          <span className="eyebrow">Instalación</span>
          <h2>Listo para Aternos</h2>
        </div>
        <ol>
          <li>
            <span>1</span>
            <p>
              Descarga el datapack base <strong>una sola vez</strong>.
            </p>
          </li>
          <li>
            <span>2</span>
            <p>Genera y descarga el ZIP de contenido para tus estructuras.</p>
          </li>
          <li>
            <span>3</span>
            <p>Sube ambos ZIP al mundo de Aternos, con el generado por encima.</p>
          </li>
        </ol>
      </section>
    </div>
  )
}

export default App
