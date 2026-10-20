import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { getMinecraftRenderer, getPreparedAssets } from './minecraft-renderer'
import { formatBlockDisplayName } from '../generator/block-search'
import './Block3DPreview.css'

type Block3DPreviewProps = {
  blockId: string | null
  assetFile: File | null
  size?: number
  count?: number
  subtitle?: string
}

const renderQueue: Promise<void> = Promise.resolve()
let activeQueue = renderQueue
const thumbnailCache = new WeakMap<File, Map<string, Promise<HTMLCanvasElement>>>()

function enqueueRender<T>(task: () => Promise<T>) {
  const result = activeQueue.then(task, task)
  activeQueue = result.then(
    () => undefined,
    () => undefined,
  )
  return result
}

function blockTint(blockId: string) {
  let value = 0
  for (const character of blockId) {
    value = (value * 31 + character.charCodeAt(0)) | 0
  }
  return `hsl(${Math.abs(value) % 360} 32% 52%)`
}

function getLargeThumbnail(assetFile: File, blockId: string, size: number) {
  let byBlock = thumbnailCache.get(assetFile)
  if (!byBlock) {
    byBlock = new Map()
    thumbnailCache.set(assetFile, byBlock)
  }

  const cacheKey = `${blockId}:${size}`
  let thumbnail = byBlock.get(cacheKey)
  if (!thumbnail) {
    thumbnail = enqueueRender(async () => {
      const renderer = await getMinecraftRenderer()
      const assets = await getPreparedAssets(renderer, assetFile, '26.2')
      return renderer.renderBlock({
        id: blockId,
        assets,
        width: size,
        height: size,
        version: '26.2',
        defaults: 'game',
      })
    })
    byBlock.set(cacheKey, thumbnail)
    void thumbnail.catch(() => byBlock?.delete(cacheKey))
  }

  return thumbnail
}

export function Block3DPreview({
  blockId,
  assetFile,
  size = 160,
  count,
  subtitle,
}: Block3DPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [texturedKey, setTexturedKey] = useState('')
  const [failedKey, setFailedKey] = useState('')

  const isHologram = !blockId
  const iconKey =
    assetFile && blockId
      ? `${blockId}:${size}:${assetFile.name}:${assetFile.size}`
      : ''

  const state =
    !assetFile || !blockId || failedKey === iconKey
      ? 'fallback'
      : texturedKey === iconKey
        ? 'textured'
        : 'loading'

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    context?.clearRect(0, 0, canvas.width, canvas.height)

    if (!assetFile || !blockId) return

    let cancelled = false

    void getLargeThumbnail(assetFile, blockId, size)
      .then((renderedCanvas) => {
        if (cancelled || !context) return
        context.clearRect(0, 0, canvas.width, canvas.height)
        context.drawImage(renderedCanvas, 0, 0, canvas.width, canvas.height)
        setTexturedKey(iconKey)
      })
      .catch(() => {
        if (!cancelled) setFailedKey(iconKey)
      })

    return () => {
      cancelled = true
    }
  }, [assetFile, blockId, iconKey, size])

  if (isHologram) {
    return (
      <div className="block-3d-box is-hologram">
        <div className="hologram-cube-wrap">
          <svg
            className="hologram-cube-svg"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Cara superior isométrica */}
            <polygon className="cube-top" points="50,15 85,35 50,55 15,35" />
            {/* Cara izquierda */}
            <polygon className="cube-left" points="15,35 50,55 50,95 15,75" />
            {/* Cara derecha */}
            <polygon className="cube-right" points="50,55 85,35 85,75 50,95" />
            {/* Líneas internas / cuadrícula holográfica */}
            <line className="inner-grid" x1="32.5" y1="25" x2="67.5" y2="45" />
            <line className="inner-grid" x1="67.5" y1="25" x2="32.5" y2="45" />
            <line className="inner-grid" x1="50" y1="55" x2="50" y2="95" />
            <line className="inner-grid" x1="15" y1="55" x2="50" y2="75" />
            <line className="inner-grid" x1="50" y1="75" x2="85" y2="55" />
          </svg>
          <span className="hologram-text">Bloque sin asignar</span>
          <span className="hologram-subtext">
            Selecciona un bloque en el selector para ver el reemplazo
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="block-3d-box is-active">
      <div
        className="block-3d-stage"
        data-state={state}
        style={
          {
            width: size,
            height: size,
            '--block-tint': blockTint(blockId),
          } as CSSProperties
        }
      >
        <canvas ref={canvasRef} width={size} height={size} />
      </div>

      <div className="block-3d-info">
        <span className="block-3d-title">
          {formatBlockDisplayName(blockId)}
        </span>
        <span className="block-3d-id">
          {blockId.replace(/^minecraft:/, '')}
        </span>
        {count !== undefined && (
          <span className="block-3d-count-pill">×{count} bloques</span>
        )}
        {subtitle && <span className="hologram-subtext">{subtitle}</span>}
      </div>
    </div>
  )
}

/**
 * Icono 3D ligero exclusivo para tarjetas y listas, sin texto ni contenedores grandes.
 */
export function Block3DIcon({
  blockId,
  assetFile,
  size = 56,
}: {
  blockId: string
  assetFile: File | null
  size?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [texturedKey, setTexturedKey] = useState('')
  const [failedKey, setFailedKey] = useState('')

  const iconKey =
    assetFile && blockId
      ? `${blockId}:${size}:${assetFile.name}:${assetFile.size}`
      : ''

  const state =
    !assetFile || !blockId || failedKey === iconKey
      ? 'fallback'
      : texturedKey === iconKey
        ? 'textured'
        : 'loading'

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    context?.clearRect(0, 0, canvas.width, canvas.height)

    if (!assetFile || !blockId) return

    let cancelled = false

    void getLargeThumbnail(assetFile, blockId, size)
      .then((renderedCanvas) => {
        if (cancelled || !context) return
        context.clearRect(0, 0, canvas.width, canvas.height)
        context.drawImage(renderedCanvas, 0, 0, canvas.width, canvas.height)
        setTexturedKey(iconKey)
      })
      .catch(() => {
        if (!cancelled) setFailedKey(iconKey)
      })

    return () => {
      cancelled = true
    }
  }, [assetFile, blockId, iconKey, size])

  return (
    <div
      className="block-3d-stage block-3d-stage-compact"
      data-state={state}
      style={
        {
          width: size,
          height: size,
          '--block-tint': blockTint(blockId),
        } as CSSProperties
      }
    >
      <canvas ref={canvasRef} width={size} height={size} />
    </div>
  )
}
