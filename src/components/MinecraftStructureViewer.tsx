import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ACESFilmicToneMapping,
  AmbientLight,
  Box3,
  BoxGeometry,
  Color,
  DirectionalLight,
  GridHelper,
  HemisphereLight,
  InstancedMesh,
  MathUtils,
  Matrix4,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Plane,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Layers,
  Maximize2,
  RotateCcw,
  SunMedium,
} from 'lucide-react'
import type { ViewerModel } from '../generator/types'
import type { MinecraftVersion } from '../generator/version-profiles'
import {
  getMinecraftRenderer,
  getPreparedAssets,
  type MinecraftSceneBlock,
  type MinecraftSceneHandle,
} from './minecraft-renderer'
import './MinecraftStructureViewer.css'

type StructureViewerProps = {
  model: ViewerModel
  theme: 'light' | 'dark'
  assetFile: File | null
  version: MinecraftVersion
}

type ViewPreset = 'isometric' | 'top' | 'front' | 'right'

export type LightingMode = 'clear' | 'shadows'

export type SlicingMode = 'all' | 'cumulative' | 'single'

export type SlicingAxis = 'y' | 'x' | 'z'

type ViewerController = {
  reset: () => void
  setView: (view: ViewPreset) => void
  toggleFullscreen: () => void
}

type RenderMode = 'simple' | 'loading' | 'textured' | 'fallback'

function hasWebGl() {
  const canvas = document.createElement('canvas')
  return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
}
function modelBounds(model: ViewerModel) {
  const bounds = new Box3().makeEmpty()
  const point = new Vector3()

  for (let index = 0; index < model.states.length; index += 1) {
    const offset = index * 3
    point.set(
      model.positions[offset],
      model.positions[offset + 1],
      model.positions[offset + 2],
    )
    bounds.expandByPoint(point)
  }

  if (bounds.isEmpty()) {
    bounds.set(new Vector3(-0.5, -0.5, -0.5), new Vector3(0.5, 0.5, 0.5))
    return bounds
  }

  bounds.min.addScalar(-0.5)
  bounds.max.addScalar(0.5)
  return bounds
}

function viewDirection(view: ViewPreset) {
  if (view === 'top') return new Vector3(0, 1, 0.001)
  if (view === 'front') return new Vector3(0, 0.28, 1)
  if (view === 'right') return new Vector3(1, 0.28, 0)
  return new Vector3(1, 0.78, 1)
}

function formatProgress(stage: string, done: number, total: number) {
  const label =
    stage === 'parse'
      ? 'Leyendo modelos'
      : stage === 'light'
        ? 'Calculando luz'
        : stage === 'build'
          ? 'Construyendo geometría'
          : 'Optimizando escena'
  const percent = total > 0 ? Math.round((done / total) * 100) : 0
  return label + '… ' + percent + '%'
}

function useHoldRepeat(action: () => void, delay = 240, interval = 50) {
  const timerRef = useRef<number | null>(null)
  const intervalRef = useRef<number | null>(null)
  const actionRef = useRef(action)
  actionRef.current = action

  const stop = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const start = (e?: React.PointerEvent) => {
    if (e && e.button !== 0) return
    stop()
    actionRef.current()
    timerRef.current = window.setTimeout(() => {
      intervalRef.current = window.setInterval(() => {
        actionRef.current()
      }, interval)
    }, delay)
  }

  useEffect(() => {
    return () => stop()
  }, [])

  return {
    onPointerDown: start,
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
  }
}

type AxisStats = {
  min: number
  max: number
  total: number
  counts: number[]
  cumulative: number[]
}

export function MinecraftStructureViewer({
  model,
  theme,
  assetFile,
  version,
}: StructureViewerProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const controllerRef = useRef<ViewerController | null>(null)
  const [renderMode, setRenderMode] = useState<RenderMode>('simple')
  const [isFullscreen, setIsFullscreen] = useState(false)

  const isLargeStructure = model.states.length > 2000
  const [brightness, setBrightness] = useState<number>(() => {
    const saved = localStorage.getItem('builder-tables-viewer-brightness')
    if (saved) {
      const num = Number(saved)
      if (!isNaN(num) && num >= 60 && num <= 250) return num
    }
    return isLargeStructure ? 140 : 125
  })
  const [lightingMode, setLightingMode] = useState<LightingMode>(() => {
    const saved = localStorage.getItem('builder-tables-viewer-lighting-mode')
    return saved === 'shadows' ? 'shadows' : 'clear'
  })
  const [showLightingMenu, setShowLightingMenu] = useState(false)
  const brightnessRef = useRef(brightness)
  brightnessRef.current = brightness
  const updateLightingRef = useRef<((level: number) => void) | null>(null)

  const axesData = useMemo(() => {
    const emptyAxis: AxisStats = { min: 0, max: 0, total: 1, counts: [0], cumulative: [0] }
    const result: Record<SlicingAxis, AxisStats> = {
      y: { ...emptyAxis },
      x: { ...emptyAxis },
      z: { ...emptyAxis },
    }

    if (!model.states.length || model.positions.length !== model.states.length * 3) {
      return result
    }

    const totalBlocks = model.states.length
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity
    let minZ = Infinity, maxZ = -Infinity

    for (let i = 0; i < totalBlocks; i++) {
      const px = model.positions[i * 3]
      const py = model.positions[i * 3 + 1]
      const pz = model.positions[i * 3 + 2]
      if (px < minX) minX = px
      if (px > maxX) maxX = px
      if (py < minY) minY = py
      if (py > maxY) maxY = py
      if (pz < minZ) minZ = pz
      if (pz > maxZ) maxZ = pz
    }

    if (minY === Infinity) return result

    const buildAxis = (minVal: number, maxVal: number, offset: number): AxisStats => {
      const rMin = Math.round(minVal)
      const rMax = Math.round(maxVal)
      const total = Math.max(1, rMax - rMin + 1)
      const counts = new Array<number>(total).fill(0)

      for (let i = 0; i < totalBlocks; i++) {
        const val = Math.round(model.positions[i * 3 + offset])
        const idx = val - rMin
        if (idx >= 0 && idx < total) {
          counts[idx]++
        }
      }

      const cumulative = new Array<number>(total).fill(0)
      let sum = 0
      for (let i = 0; i < total; i++) {
        sum += counts[i]
        cumulative[i] = sum
      }

      return { min: rMin, max: rMax, total, counts, cumulative }
    }

    result.y = buildAxis(minY, maxY, 1)
    result.x = buildAxis(minX, maxX, 0)
    result.z = buildAxis(minZ, maxZ, 2)

    return result
  }, [model])

  const [sliceAxis, setSliceAxis] = useState<SlicingAxis>('y')
  const [sliceMode, setSliceMode] = useState<SlicingMode>('all')
  const [showSliceGuide, setShowSliceGuide] = useState(true)
  const currentAxisData = axesData[sliceAxis]
  const [selectedLayer, setSelectedLayer] = useState<number>(currentAxisData.total)
  const [showLayerPanel, setShowLayerPanel] = useState(false)

  const sliceModeRef = useRef(sliceMode)
  sliceModeRef.current = sliceMode
  const sliceAxisRef = useRef(sliceAxis)
  sliceAxisRef.current = sliceAxis
  const selectedLayerRef = useRef(selectedLayer)
  selectedLayerRef.current = selectedLayer
  const showSliceGuideRef = useRef(showSliceGuide)
  showSliceGuideRef.current = showSliceGuide
  const updateClippingRef = useRef<
    ((mode: SlicingMode, axis: SlicingAxis, layer: number, guideVisible: boolean) => void) | null
  >(null)

  const stepLayer = (delta: number) => {
    setSelectedLayer((prev) => {
      const total = axesData[sliceAxisRef.current].total
      return Math.max(1, Math.min(total, prev + delta))
    })
  }

  const prevHold = useHoldRepeat(() => stepLayer(-1))
  const nextHold = useHoldRepeat(() => stepLayer(1))

  useEffect(() => {
    setSelectedLayer(axesData[sliceAxis].total)
  }, [sliceAxis, axesData])

  useEffect(() => {
    updateClippingRef.current?.(sliceMode, sliceAxis, selectedLayer, showSliceGuide)
  }, [sliceMode, sliceAxis, selectedLayer, showSliceGuide])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const handleWheel = (e: WheelEvent) => {
      if (sliceModeRef.current === 'all') return

      const isMiddleDown = (e.buttons & 4) === 4
      const target = e.target as HTMLElement
      const overLayerControls = Boolean(
        target?.closest(
          '.minecraft-viewer-layer-popover, .minecraft-viewer-compact-layer-bar, .minecraft-viewer-layer-btn'
        )
      )

      if (e.shiftKey || isMiddleDown || overLayerControls) {
        e.preventDefault()
        e.stopPropagation()
        stepLayer(e.deltaY < 0 ? 1 : -1)
      }
    }

    root.addEventListener('wheel', handleWheel, { passive: false })
    return () => root.removeEventListener('wheel', handleWheel)
  }, [axesData])

  useEffect(() => {
    if (!showLayerPanel) return
    const handleClickOutside = (e: PointerEvent) => {
      const target = e.target as HTMLElement
      if (
        !target.closest('.minecraft-viewer-layer-wrapper') &&
        !target.closest('.minecraft-viewer-layer-popover') &&
        !target.closest('.minecraft-viewer-compact-layer-bar')
      ) {
        setShowLayerPanel(false)
      }
    }
    document.addEventListener('pointerdown', handleClickOutside)
    return () => document.removeEventListener('pointerdown', handleClickOutside)
  }, [showLayerPanel])

  useEffect(() => {
    localStorage.setItem('builder-tables-viewer-brightness', String(brightness))
    updateLightingRef.current?.(brightness)
  }, [brightness])

  useEffect(() => {
    localStorage.setItem('builder-tables-viewer-lighting-mode', lightingMode)
  }, [lightingMode])

  useEffect(() => {
    if (!showLightingMenu) return
    const handleClickOutside = (e: PointerEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.minecraft-viewer-lighting-wrapper')) {
        setShowLightingMenu(false)
      }
    }
    document.addEventListener('pointerdown', handleClickOutside)
    return () => document.removeEventListener('pointerdown', handleClickOutside)
  }, [showLightingMenu])

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === rootRef.current)
    }

    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  useEffect(() => {
    const host = hostRef.current
    if (!host || !model.states.length) return

    const setLoading = (label?: string) => {
      if (!label) {
        delete host.dataset.loading
        delete host.dataset.loadingLabel
        return
      }
      host.dataset.loading = 'true'
      host.dataset.loadingLabel = label
    }

    if (!hasWebGl()) {
      host.textContent =
        'Este navegador no dispone de WebGL. El análisis y la generación siguen disponibles.'
      host.dataset.error = 'true'
      return
    }

    let renderer: WebGLRenderer
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: false })
    } catch {
      host.textContent =
        'No se pudo iniciar WebGL. El análisis y la generación siguen disponibles.'
      host.dataset.error = 'true'
      return
    }

    let disposed = false
    let renderFrame = 0
    let fillFrame = 0
    let needsTransparentSort = false
    let detailedHandle: MinecraftSceneHandle | null = null

    host.dataset.error = ''
    host.dataset.detailError = ''
    host.replaceChildren(renderer.domElement)
    setLoading(assetFile ? 'Preparando recursos visuales…' : 'Preparando bloques…')

    renderer.outputColorSpace = SRGBColorSpace
    renderer.toneMapping = ACESFilmicToneMapping
    renderer.toneMappingExposure = theme === 'dark' ? 1.38 : 1.3
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = PCFSoftShadowMap
    renderer.localClippingEnabled = true
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))

    const scene = new Scene()
    scene.background = new Color(theme === 'dark' ? '#111a28' : '#edf3fa')

    const fallbackBounds = modelBounds(model)
    const activeBounds = fallbackBounds.clone()
    const center = fallbackBounds.getCenter(new Vector3())
    const span = fallbackBounds.getSize(new Vector3())
    const radius = Math.max(span.x, span.y, span.z, 1)
    const camera = new PerspectiveCamera(38, 1, 0.02, radius * 40 + 400)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.zoomToCursor = true
    controls.screenSpacePanning = false
    controls.minDistance = Math.max(1.2, radius * 0.18)
    controls.maxDistance = radius * 26 + 320

    // Luz ambiental uniforme para que ningún bloque quede en oscuridad total
    const ambient = new AmbientLight('#ffffff', theme === 'dark' ? 1.6 : 1.3)
    scene.add(ambient)

    // Luz hemisférica con rebote claro desde el suelo para iluminar porches, aleros y partes bajas
    const hemisphere = new HemisphereLight(
      theme === 'dark' ? '#d6e8ff' : '#ffffff',
      theme === 'dark' ? '#687f9e' : '#94a3b8',
      1.8,
    )
    scene.add(hemisphere)

    // Luz solar principal (Key Light)
    const keyLight = new DirectionalLight('#fff9ee', 2.6)
    keyLight.position.set(center.x + radius * 1.3, center.y + radius * 2.4, center.z + radius * 1.2)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.set(1024, 1024)
    keyLight.shadow.bias = -0.0005
    scene.add(keyLight)

    // Luz de relleno frontal/lateral contraria para evitar caras en penumbra
    const fillLight = new DirectionalLight('#e0f2fe', 1.5)
    fillLight.position.set(center.x - radius * 1.2, center.y + radius * 1.4, center.z + radius * 1.1)
    scene.add(fillLight)

    // Luz de contorno trasera para definir la silueta y dar volumen 3D
    const rimLight = new DirectionalLight('#bae6fd', 1.3)
    rimLight.position.set(center.x - radius * 0.8, center.y + radius * 1.8, center.z - radius * 1.4)
    scene.add(rimLight)

    const gridSize = Math.max(span.x, span.z, 4) * 1.2
    const grid = new GridHelper(
      gridSize,
      Math.min(128, Math.max(Math.round(gridSize), 4)),
      theme === 'dark' ? '#4d78a7' : '#aac1db',
      theme === 'dark' ? '#263b57' : '#d2dee9',
    )
    grid.position.set(center.x, fallbackBounds.min.y - 0.51, center.z)
    scene.add(grid)

    // Cuadrícula dinámica del plano de corte / escáner (suave, difuminada y no oclusiva)
    const maxDimension = Math.max(span.x, span.y, span.z, 4) * 1.3
    const sliceGrid = new GridHelper(
      maxDimension,
      Math.min(48, Math.max(Math.round(maxDimension / 2), 4)),
      theme === 'dark' ? 0x38bdf8 : 0x0284c7,
      theme === 'dark' ? 0x075985 : 0x7dd3fc,
    )
    sliceGrid.position.set(center.x, fallbackBounds.min.y, center.z)
    sliceGrid.visible = false
    const sliceGridMats = Array.isArray(sliceGrid.material) ? sliceGrid.material : [sliceGrid.material]
    for (const m of sliceGridMats) {
      m.transparent = true
      m.opacity = 0.12
      m.depthWrite = false
    }
    scene.add(sliceGrid)

    const geometry = new BoxGeometry(0.96, 0.96, 0.96)
    const material = new MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.82,
      metalness: 0.03,
    })
    material.clipShadows = true
    const fallbackMesh = new InstancedMesh(geometry, material, model.states.length)
    fallbackMesh.count = 0
    fallbackMesh.castShadow = true
    fallbackMesh.receiveShadow = true
    scene.add(fallbackMesh)

    const focusCamera = (view: ViewPreset, saveState = false) => {
      const boundsCenter = activeBounds.getCenter(new Vector3())
      const boundsSize = activeBounds.getSize(new Vector3())
      const verticalFov = MathUtils.degToRad(camera.fov)
      const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect)
      const heightDistance = boundsSize.y / (2 * Math.tan(verticalFov / 2))
      const widthDistance = Math.max(boundsSize.x, boundsSize.z) /
        (2 * Math.tan(horizontalFov / 2))
      const largest = Math.max(boundsSize.x, boundsSize.y, boundsSize.z, 1)
      const distance = Math.max(heightDistance, widthDistance, largest * 1.2) * 1.48

      camera.position
        .copy(boundsCenter)
        .add(viewDirection(view).normalize().multiplyScalar(distance))
      camera.near = Math.max(0.02, distance / 1000)
      camera.far = Math.max(400, distance + largest * 36)
      camera.updateProjectionMatrix()
      controls.target.copy(boundsCenter)
      controls.minDistance = Math.max(1.1, largest * 0.16)
      controls.maxDistance = largest * 28 + 400
      controls.update()
      if (saveState) controls.saveState()
    }

    const render = () => {
      renderFrame = 0
      if (disposed) return
      const changing = controls.update()
      if (needsTransparentSort && detailedHandle) {
        detailedHandle.sortTranslucent(camera)
        needsTransparentSort = false
      }
      renderer.render(scene, camera)
      if (changing) requestRender()
    }

    const requestRender = () => {
      if (!renderFrame && !disposed) {
        renderFrame = window.requestAnimationFrame(render)
      }
    }

    const resize = () => {
      const bounds = host.getBoundingClientRect()
      const width = Math.max(Math.round(bounds.width), 1)
      const height = Math.max(Math.round(bounds.height), 1)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
      needsTransparentSort = true
      requestRender()
    }

    const onControlsChange = () => {
      needsTransparentSort = true
      requestRender()
    }

    const applyLighting = (level: number) => {
      if (disposed) return
      const factor = level / 100
      renderer.toneMappingExposure = (theme === 'dark' ? 1.45 : 1.35) * factor

      ambient.intensity = (theme === 'dark' ? 1.7 : 1.4) * factor
      hemisphere.intensity = 2.0 * factor
      keyLight.intensity = 2.8 * factor
      fillLight.intensity = 1.8 * factor
      rimLight.intensity = 1.5 * factor

      if (detailedHandle?.group) {
        detailedHandle.group.traverse((obj) => {
          const mesh = obj as unknown as { isMesh?: boolean; material?: unknown }
          if (mesh.isMesh && mesh.material) {
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
            for (const mat of mats) {
              const shaderMat = mat as { uniforms?: Record<string, { value: unknown }> }
              if (shaderMat.uniforms) {
                if (shaderMat.uniforms.brightness) {
                  shaderMat.uniforms.brightness.value = Math.min(1.0, 0.75 * factor)
                }
                if (shaderMat.uniforms.ambient) {
                  shaderMat.uniforms.ambient.value = Math.min(1.0, 0.5 * factor)
                }
                if (
                  shaderMat.uniforms.ambientColor &&
                  typeof (shaderMat.uniforms.ambientColor.value as Color)?.setRGB === 'function'
                ) {
                  const baseR = 0.35 * factor
                  const baseG = 0.42 * factor
                  const baseB = 0.50 * factor
                  ;(shaderMat.uniforms.ambientColor.value as Color).setRGB(
                    Math.min(1, baseR),
                    Math.min(1, baseG),
                    Math.min(1, baseB),
                  )
                }
                if (shaderMat.uniforms.d0) {
                  shaderMat.uniforms.d0.value = Math.min(1.0, 0.65 * factor)
                }
                if (shaderMat.uniforms.d1) {
                  shaderMat.uniforms.d1.value = Math.min(1.0, 0.65 * factor)
                }
              }
            }
          }
        })
      }

      needsTransparentSort = true
      requestRender()
    }

    let prevPlanesCount = -1

    const applyClipping = (
      mode: SlicingMode,
      axis: SlicingAxis,
      layer: number,
      guideVisible: boolean,
    ) => {
      if (disposed) return

      let planes: Plane[] = []
      const axisData = axesData[axis]
      const total = axisData.total

      if (mode !== 'all' && total > 0) {
        const clampedLayer = Math.max(1, Math.min(layer, total))

        if (axis === 'y') {
          const yBottom = activeBounds.min.y + (clampedLayer - 1) - 0.005
          const yTop = activeBounds.min.y + clampedLayer + 0.005

          if (mode === 'cumulative') {
            planes = [new Plane(new Vector3(0, -1, 0), yTop)]
            sliceGrid.position.set(center.x, yTop - 0.005, center.z)
          } else if (mode === 'single') {
            planes = [
              new Plane(new Vector3(0, -1, 0), yTop),
              new Plane(new Vector3(0, 1, 0), -yBottom),
            ]
            sliceGrid.position.set(center.x, yBottom + 0.005, center.z)
          }
          sliceGrid.rotation.set(0, 0, 0)
        } else if (axis === 'x') {
          const xBottom = activeBounds.min.x + (clampedLayer - 1) - 0.005
          const xTop = activeBounds.min.x + clampedLayer + 0.005

          if (mode === 'cumulative') {
            planes = [new Plane(new Vector3(-1, 0, 0), xTop)]
            sliceGrid.position.set(xTop - 0.005, center.y, center.z)
          } else if (mode === 'single') {
            planes = [
              new Plane(new Vector3(-1, 0, 0), xTop),
              new Plane(new Vector3(1, 0, 0), -xBottom),
            ]
            sliceGrid.position.set(xBottom + 0.005, center.y, center.z)
          }
          sliceGrid.rotation.set(0, 0, Math.PI / 2)
        } else if (axis === 'z') {
          const zBottom = activeBounds.min.z + (clampedLayer - 1) - 0.005
          const zTop = activeBounds.min.z + clampedLayer + 0.005

          if (mode === 'cumulative') {
            planes = [new Plane(new Vector3(0, 0, -1), zTop)]
            sliceGrid.position.set(center.x, center.y, zTop - 0.005)
          } else if (mode === 'single') {
            planes = [
              new Plane(new Vector3(0, 0, -1), zTop),
              new Plane(new Vector3(0, 0, 1), -zBottom),
            ]
            sliceGrid.position.set(center.x, center.y, zBottom + 0.005)
          }
          sliceGrid.rotation.set(Math.PI / 2, 0, 0)
        }

        sliceGrid.visible = guideVisible
      } else {
        sliceGrid.visible = false
      }

      const countChanged = planes.length !== prevPlanesCount
      prevPlanesCount = planes.length

      renderer.clippingPlanes = planes

      if (fallbackMesh.material) {
        const mat = fallbackMesh.material as MeshStandardMaterial
        mat.clipShadows = true
        mat.clippingPlanes = planes
        if (countChanged) mat.needsUpdate = true
      }

      if (detailedHandle?.group) {
        detailedHandle.group.traverse((obj) => {
          const mesh = obj as unknown as { isMesh?: boolean; material?: unknown }
          if (mesh.isMesh && mesh.material) {
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
            for (const mat of mats) {
              const anyMat = mat as {
                clipping?: boolean
                clipShadows?: boolean
                clippingPlanes?: Plane[]
                needsUpdate?: boolean
              }
              anyMat.clipping = true
              anyMat.clipShadows = true
              anyMat.clippingPlanes = planes
              if (countChanged) anyMat.needsUpdate = true
            }
          }
        })
      }

      needsTransparentSort = true
      requestRender()
    }

    updateLightingRef.current = applyLighting
    applyLighting(brightnessRef.current)

    updateClippingRef.current = applyClipping
    applyClipping(
      sliceModeRef.current,
      sliceAxisRef.current,
      selectedLayerRef.current,
      showSliceGuideRef.current,
    )

    const observer = new ResizeObserver(resize)
    observer.observe(host)
    controls.addEventListener('change', onControlsChange)
    focusCamera('isometric', true)
    resize()

    controllerRef.current = {
      reset: () => {
        controls.reset()
        needsTransparentSort = true
        requestRender()
      },
      setView: (view) => {
        focusCamera(view)
        needsTransparentSort = true
        requestRender()
      },
      toggleFullscreen: () => {
        const root = rootRef.current
        if (!root) return
        if (document.fullscreenElement === root) {
          void document.exitFullscreen()
          return
        }
        void root.requestFullscreen().catch(() => undefined)
      },
    }

    const matrix = new Matrix4()
    const color = new Color()
    let cursor = 0

    const fillChunk = () => {
      if (disposed) return

      const end = Math.min(cursor + 1400, model.states.length)
      for (let index = cursor; index < end; index += 1) {
        const point = index * 3
        const palette = model.palette[model.states[index]]
        matrix.makeTranslation(
          model.positions[point],
          model.positions[point + 1],
          model.positions[point + 2],
        )
        fallbackMesh.setMatrixAt(index, matrix)
        color.set(palette?.color ?? '#9da8b8')
        fallbackMesh.setColorAt(index, color)
      }

      fallbackMesh.count = end
      fallbackMesh.instanceMatrix.needsUpdate = true
      if (fallbackMesh.instanceColor) fallbackMesh.instanceColor.needsUpdate = true
      requestRender()
      cursor = end

      if (cursor < model.states.length) {
        fillFrame = window.requestAnimationFrame(fillChunk)
      } else if (!assetFile) {
        setLoading()
      }
    }

    fillFrame = window.requestAnimationFrame(fillChunk)

    if (assetFile) {
      void (async () => {
        try {
          const minecraftRenderer = await getMinecraftRenderer()
          const assets = await getPreparedAssets(minecraftRenderer, assetFile, version)
          if (disposed) return

          const blocks: MinecraftSceneBlock[] = []
          for (let index = 0; index < model.states.length; index += 1) {
            const palette = model.palette[model.states[index]]
            if (!palette) continue
            const point = index * 3
            blocks.push({
              id: palette.name,
              properties: palette.properties,
              pos: [
                model.positions[point],
                model.positions[point + 1],
                model.positions[point + 2],
              ],
            })
          }

          const computeVoxelLight = lightingMode === 'shadows'

          const handle = await minecraftRenderer.createScene(assets, blocks, {
            lighting: {
              brightness: Math.min(1.0, 0.85 * (brightnessRef.current / 100)),
              daytime: 6000,
              light: computeVoxelLight,
              dimension: {
                ambientColor: computeVoxelLight ? 0x3d4856 : 0x586475,
                skyLightColor: 0xffffff,
                skyLightFactor: 1.0,
                cardinalLight: { down: 0.74, up: 1.0, north: 0.88, south: 0.88, west: 0.84, east: 0.84 },
                hasSkyLight: true,
              },
            },
            version,
            defaults: 'game',
            optimize: true,
            shouldCancel: () => disposed,
            onProgress: (stage, done, total) => {
              if (!disposed) setLoading(formatProgress(stage.name, done, total))
            },
          })

          if (!handle || disposed) {
            handle?.dispose()
            return
          }

          detailedHandle = handle
          handle.group.scale.setScalar(1 / 16)
          handle.group.updateMatrixWorld(true)
          scene.add(handle.group)
          fallbackMesh.visible = false
          activeBounds.copy(new Box3().setFromObject(handle.group))
          focusCamera('isometric', true)
          needsTransparentSort = true
          applyLighting(brightnessRef.current)
          applyClipping(
            sliceModeRef.current,
            sliceAxisRef.current,
            selectedLayerRef.current,
            showSliceGuideRef.current,
          )
          setLoading()
          setRenderMode('textured')
          requestRender()
        } catch {
          if (disposed) return
          host.dataset.detailError = 'true'
          setLoading()
          setRenderMode('fallback')
          requestRender()
        }
      })()
    }

    return () => {
      disposed = true
      updateLightingRef.current = null
      updateClippingRef.current = null
      window.cancelAnimationFrame(renderFrame)
      window.cancelAnimationFrame(fillFrame)
      observer.disconnect()
      controls.removeEventListener('change', onControlsChange)
      controls.dispose()
      if (controllerRef.current) controllerRef.current = null
      detailedHandle?.dispose()
      scene.remove(fallbackMesh, grid, sliceGrid, ambient, hemisphere, keyLight, fillLight, rimLight)
      geometry.dispose()
      material.dispose()
      sliceGrid.geometry.dispose()
      if (Array.isArray(sliceGrid.material)) {
        sliceGrid.material.forEach((m) => m.dispose())
      } else {
        sliceGrid.material.dispose()
      }
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [assetFile, model, theme, version, lightingMode])

  if (model.positions.length !== model.states.length * 3) {
    return (
      <div className="minecraft-viewer-empty">
        El modelo 3D no contiene posiciones válidas.
      </div>
    )
  }

  if (!model.states.length) {
    return (
      <div className="minecraft-viewer-empty">
        Esta estructura no contiene bloques visibles después de aplicar la compatibilidad.
      </div>
    )
  }

  const statusCopy =
    renderMode === 'textured'
      ? 'Modelos y texturas del archivo local'
      : renderMode === 'loading'
        ? 'Cargando modelos y texturas…'
        : renderMode === 'fallback'
          ? 'Vista simplificada: no se pudieron usar esos recursos'
          : 'Vista simplificada por materiales'

  return (
    <div
      ref={rootRef}
      className={'minecraft-structure-viewer' + (isFullscreen ? ' is-fullscreen' : '')}
    >
      <div
        ref={hostRef}
        className="minecraft-viewer-canvas"
        aria-label="Visor 3D de la estructura"
        onPointerDown={(e) => {
          if (e.button === 1) {
            e.preventDefault()
            setSliceMode((m) => (m === 'all' ? 'single' : 'all'))
          }
        }}
      />
      <div className="minecraft-viewer-toolbar" aria-label="Controles del visor">
        <div className="minecraft-viewer-toolbar-group">
          <button type="button" onClick={() => controllerRef.current?.setView('isometric')}>
            3D
          </button>
          <button type="button" onClick={() => controllerRef.current?.setView('top')}>
            Superior
          </button>
          <button type="button" onClick={() => controllerRef.current?.setView('front')}>
            Frontal
          </button>
          <button type="button" onClick={() => controllerRef.current?.setView('right')}>
            Lateral
          </button>
        </div>

        <div className="minecraft-viewer-toolbar-group minecraft-viewer-lighting-wrapper">
          <button
            type="button"
            className={'minecraft-viewer-lighting-btn' + (showLightingMenu ? ' is-active' : '')}
            onClick={() => setShowLightingMenu((v) => !v)}
            title="Ajustar iluminación y sombras"
          >
            <SunMedium size={15} className="lighting-sun-icon" />
            <span>Luz: {brightness}%</span>
            <ChevronDown
              size={13}
              style={{
                transform: showLightingMenu ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.15s ease',
              }}
            />
          </button>

          {showLightingMenu ? (
            <div className="minecraft-viewer-lighting-popover">
              <div className="lighting-popover-header">
                <span className="lighting-popover-title">Control de Iluminación</span>
                <span className="lighting-popover-value">{brightness}%</span>
              </div>

              <div className="lighting-slider-row">
                <span className="lighting-slider-icon" title="Mínimo">☀️</span>
                <input
                  type="range"
                  min="60"
                  max="250"
                  step="5"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="minecraft-viewer-slider"
                />
                <span className="lighting-slider-icon-bright" title="Máximo">✨</span>
              </div>

              <div className="lighting-quick-presets">
                <button
                  type="button"
                  className={'lighting-preset-btn' + (brightness === 100 ? ' is-selected' : '')}
                  onClick={() => setBrightness(100)}
                >
                  Normal (100%)
                </button>
                <button
                  type="button"
                  className={'lighting-preset-btn' + (brightness === 140 ? ' is-selected' : '')}
                  onClick={() => setBrightness(140)}
                >
                  Brillante (140%)
                </button>
                <button
                  type="button"
                  className={'lighting-preset-btn' + (brightness === 190 ? ' is-selected' : '')}
                  onClick={() => setBrightness(190)}
                >
                  Máximo (190%)
                </button>
              </div>

              <div className="lighting-mode-section">
                <span className="lighting-mode-label">Modo de Sombras:</span>
                <div className="lighting-mode-buttons">
                  <button
                    type="button"
                    className={'lighting-mode-btn' + (lightingMode === 'clear' ? ' is-selected' : '')}
                    onClick={() => setLightingMode('clear')}
                  >
                    ☀️ Día claro (Sin zonas oscuras)
                  </button>
                  <button
                    type="button"
                    className={'lighting-mode-btn' + (lightingMode === 'shadows' ? ' is-selected' : '')}
                    onClick={() => setLightingMode('shadows')}
                  >
                    🌑 Sombras Vainilla
                  </button>
                </div>
                <small className="lighting-mode-hint">
                  {lightingMode === 'clear'
                    ? 'Recomendado para estructuras grandes: elimina penumbras negras en techos, árboles y porches.'
                    : 'Simula la oclusión ambiental y sombras oscuras del motor de Minecraft.'}
                </small>
              </div>
            </div>
          ) : null}
        </div>

        <div className="minecraft-viewer-toolbar-group minecraft-viewer-layer-wrapper">
          <button
            type="button"
            className={
              'minecraft-viewer-layer-btn' +
              (sliceMode !== 'all' ? ' is-slicing' : '') +
              (showLayerPanel ? ' is-active' : '')
            }
            onClick={() => setShowLayerPanel((v) => !v)}
            title="Inspeccionar la estructura por capas o cortes sagitales (Escáner 3D)"
          >
            <Layers size={15} className="layer-icon" />
            <span>
              Capas:{' '}
              {sliceMode === 'all'
                ? 'Todas'
                : `${sliceAxis === 'y' ? 'Y' : sliceAxis === 'x' ? 'Sagital X' : 'Frontal Z'}: ${selectedLayer}`}
            </span>
            <ChevronDown
              size={13}
              style={{
                transform: showLayerPanel ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.15s ease',
              }}
            />
          </button>

          {showLayerPanel ? (
            <div className="minecraft-viewer-layer-popover">
              <div className="layer-popover-header">
                <div className="layer-popover-title-row">
                  <span className="layer-popover-title">Corte por Capas (Escáner)</span>
                  <span className="layer-badge">
                    {sliceMode === 'all'
                      ? 'Todas'
                      : `${sliceAxis === 'y' ? 'Transversal Y' : sliceAxis === 'x' ? 'Sagital X' : 'Frontal Z'}: ${selectedLayer} / ${currentAxisData.total}`}
                  </span>
                </div>
                <span className="layer-coord-subtitle">
                  Posición relativa: {sliceAxis.toUpperCase()} = {currentAxisData.min + selectedLayer - 1} · {currentAxisData.total} cortes en este eje
                </span>
              </div>

              {/* Selector de plano / orientación del corte */}
              <div className="layer-axis-tabs" role="tablist" aria-label="Plano de corte">
                <button
                  type="button"
                  className={'layer-axis-tab' + (sliceAxis === 'y' ? ' is-active' : '')}
                  onClick={() => setSliceAxis('y')}
                  title="Corte horizontal de suelo a techo (Pisos)"
                >
                  ↕️ Transversal (Y)
                </button>
                <button
                  type="button"
                  className={'layer-axis-tab' + (sliceAxis === 'x' ? ' is-active' : '')}
                  onClick={() => setSliceAxis('x')}
                  title="Corte longitudinal de lado a lado"
                >
                  ↔️ Sagital (X)
                </button>
                <button
                  type="button"
                  className={'layer-axis-tab' + (sliceAxis === 'z' ? ' is-active' : '')}
                  onClick={() => setSliceAxis('z')}
                  title="Corte frontal de fachada a fondo"
                >
                  ↗️ Frontal (Z)
                </button>
              </div>

              <div className="layer-mode-tabs">
                <button
                  type="button"
                  className={'layer-mode-tab' + (sliceMode === 'cumulative' ? ' is-active' : '')}
                  onClick={() => setSliceMode('cumulative')}
                  title="Muestra acumulado desde el inicio hasta el corte elegido"
                >
                  🧱 Acumulado (1 a {sliceAxis.toUpperCase()})
                </button>
                <button
                  type="button"
                  className={'layer-mode-tab' + (sliceMode === 'single' ? ' is-active' : '')}
                  onClick={() => setSliceMode('single')}
                  title="Muestra únicamente la rebanada seleccionada como corte de escáner"
                >
                  🔬 Solo capa (Corte)
                </button>
                <button
                  type="button"
                  className={'layer-mode-tab' + (sliceMode === 'all' ? ' is-active' : '')}
                  onClick={() => setSliceMode('all')}
                  title="Muestra la estructura completa"
                >
                  🏛️ Ver todo
                </button>
              </div>

              {sliceMode !== 'all' ? (
                <>
                  <div className="layer-slider-section">
                    <div className="layer-slider-controls">
                      <button
                        type="button"
                        className="layer-nav-btn"
                        {...prevHold}
                        disabled={selectedLayer <= 1}
                        title="Retroceder corte (Mantén presionado para avance continuo)"
                      >
                        <ChevronLeft size={16} />
                      </button>

                      <div className="layer-range-wrapper">
                        <input
                          type="range"
                          min={1}
                          max={currentAxisData.total}
                          step={1}
                          value={selectedLayer}
                          onChange={(e) => setSelectedLayer(Number(e.target.value))}
                          className="minecraft-viewer-slider layer-slider"
                        />
                        <div className="layer-slider-ticks">
                          <span>1</span>
                          <span>{Math.max(1, Math.round(currentAxisData.total / 2))}</span>
                          <span>{currentAxisData.total}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="layer-nav-btn"
                        {...nextHold}
                        disabled={selectedLayer >= currentAxisData.total}
                        title="Avanzar corte (Mantén presionado para avance continuo)"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                    <small className="layer-scroll-hint">
                      💡 Tip: Mantén presionadas las flechas o usa Shift + Rueda del ratón para deslizar suavemente.
                    </small>
                  </div>

                  <div className="layer-stats-card">
                    <div className="layer-stat-row">
                      <span className="layer-stat-label">Bloques en este corte:</span>
                      <span className="layer-stat-value">
                        {currentAxisData.counts[selectedLayer - 1] ?? 0} bloques
                      </span>
                    </div>
                    <div className="layer-stat-row">
                      <span className="layer-stat-label">Total hasta este corte:</span>
                      <span className="layer-stat-value">
                        {currentAxisData.cumulative[selectedLayer - 1] ?? 0} / {model.states.length} ({Math.round(((currentAxisData.cumulative[selectedLayer - 1] ?? 0) / model.states.length) * 100)}%)
                      </span>
                    </div>
                  </div>

                  <div className="layer-shortcuts-row">
                    <button
                      type="button"
                      className="layer-shortcut-btn"
                      onClick={() => {
                        if (sliceAxis === 'y') controllerRef.current?.setView('top')
                        else if (sliceAxis === 'x') controllerRef.current?.setView('right')
                        else controllerRef.current?.setView('front')
                      }}
                      title="Alinear cámara de forma perpendicular al plano de corte"
                    >
                      📐 Vista {sliceAxis === 'y' ? 'Superior (Plano)' : sliceAxis === 'x' ? 'Lateral (Corte)' : 'Frontal (Corte)'}
                    </button>
                    <button
                      type="button"
                      className={'layer-shortcut-btn' + (showSliceGuide ? ' is-active' : '')}
                      onClick={() => setShowSliceGuide((v) => !v)}
                      title="Activar u ocultar la cuadrícula holográfica de escáner"
                    >
                      {showSliceGuide ? '👁️ Guía ON' : '👁️‍🗨️ Guía OFF'}
                    </button>
                    <button
                      type="button"
                      className="layer-shortcut-btn"
                      onClick={() => setSelectedLayer(1)}
                      disabled={selectedLayer === 1}
                    >
                      ⬇️ Inicio
                    </button>
                    <button
                      type="button"
                      className="layer-shortcut-btn"
                      onClick={() => setSelectedLayer(currentAxisData.total)}
                      disabled={selectedLayer === currentAxisData.total}
                    >
                      ⬆️ Fin
                    </button>
                  </div>
                </>
              ) : (
                <div className="layer-all-notice">
                  <p>Mostrando la construcción completa.</p>
                  <small>
                    Elige <strong>Acumulado</strong> para construir paso a paso o{' '}
                    <strong>Solo capa</strong> para ver cortes transversales, sagitales o frontales.
                  </small>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="minecraft-viewer-toolbar-group minecraft-viewer-toolbar-actions">
          <button type="button" onClick={() => controllerRef.current?.reset()} title="Restablecer vista">
            <RotateCcw size={15} />
            Restablecer
          </button>
          <button
            type="button"
            onClick={() => controllerRef.current?.toggleFullscreen()}
            title={isFullscreen ? 'Salir de pantalla completa' : 'Ver en pantalla completa'}
          >
            <Maximize2 size={15} />
            {isFullscreen ? 'Salir' : 'Pantalla completa'}
          </button>
        </div>
      </div>

      {sliceMode !== 'all' && !showLayerPanel ? (
        <div className="minecraft-viewer-compact-layer-bar">
          <button
            type="button"
            className="compact-step-btn"
            {...prevHold}
            disabled={selectedLayer <= 1}
            title="Corte anterior (Mantén presionado para avance rápido)"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            className="compact-layer-info-btn"
            onClick={() => setShowLayerPanel(true)}
            title="Abrir panel completo de cortes"
          >
            <span className="compact-layer-mode">
              {sliceAxis === 'y' ? 'Transversal Y' : sliceAxis === 'x' ? 'Sagital X' : 'Frontal Z'}:{' '}
            </span>
            <span className="compact-layer-num">{selectedLayer}</span>
            <span className="compact-layer-total"> / {currentAxisData.total}</span>
            <span className="compact-layer-count">
              (
              {sliceMode === 'cumulative'
                ? currentAxisData.cumulative[selectedLayer - 1]
                : currentAxisData.counts[selectedLayer - 1]}{' '}
              bloques)
            </span>
          </button>
          <button
            type="button"
            className="compact-step-btn"
            {...nextHold}
            disabled={selectedLayer >= currentAxisData.total}
            title="Corte siguiente (Mantén presionado para avance rápido)"
          >
            <ChevronRight size={14} />
          </button>
          <button
            type="button"
            className="compact-reset-btn"
            onClick={() => setSliceMode('all')}
            title="Ver estructura completa"
          >
            Ver todo
          </button>
        </div>
      ) : null}
      <div className="minecraft-viewer-guidance">
        Arrastra para rotar · Rueda para zoom · Shift+Rueda o mantener flechas para pasar cortes
      </div>
      <div
        className={'minecraft-viewer-status minecraft-viewer-status-' + renderMode}
        role="status"
      >
        {statusCopy}
      </div>
    </div>
  )
}
