import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Trash2 } from 'lucide-react'
import { getMinecraftRenderer, getPreparedAssets } from './minecraft-renderer'
import { formatBlockDisplayName } from '../generator/block-search'
import type { MinecraftVersion } from '../generator/version-profiles'
import './Block3DPreview.css'

type Block3DPreviewProps = {
  blockId: string | null
  assetFile: File | null
  size?: number
  count?: number
  subtitle?: string
  version?: MinecraftVersion
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

function detectOrGetVersion(assetFile: File, version?: MinecraftVersion): MinecraftVersion {
  if (version) return version
  const name = assetFile.name.toLowerCase()
  if (name.includes('1.21.4')) return '1.21.4'
  if (name.includes('1.21.2') || name.includes('1.21.3')) return '1.21.2'
  if (name.includes('1.21')) return '1.21'
  if (name.includes('26.1')) return '26.1'
  if (name.includes('26.3')) return '26.3'
  return '26.2'
}

function blockTint(blockId: string) {
  let value = 0
  for (const character of blockId) {
    value = (value * 31 + character.charCodeAt(0)) | 0
  }
  return `hsl(${Math.abs(value) % 360} 32% 52%)`
}

function getLargeThumbnail(
  assetFile: File,
  blockId: string,
  size: number,
  version: MinecraftVersion = '26.2',
) {
  let byBlock = thumbnailCache.get(assetFile)
  if (!byBlock) {
    byBlock = new Map()
    thumbnailCache.set(assetFile, byBlock)
  }

  const effectiveVersion = detectOrGetVersion(assetFile, version)
  const cacheKey = `${blockId}:${size}:${effectiveVersion}`
  let thumbnail = byBlock.get(cacheKey)
  if (!thumbnail) {
    thumbnail = enqueueRender(async () => {
      const renderer = await getMinecraftRenderer()
      const assets = await getPreparedAssets(renderer, assetFile, effectiveVersion)
      return renderer.renderBlock({
        id: blockId,
        assets,
        width: size,
        height: size,
        version: effectiveVersion,
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
  version = '26.2',
}: Block3DPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [texturedKey, setTexturedKey] = useState('')
  const [failedKey, setFailedKey] = useState('')

  const isHologram = !blockId
  const iconKey =
    assetFile && blockId
      ? `${blockId}:${size}:${assetFile.name}:${assetFile.size}:${version}`
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

    void getLargeThumbnail(assetFile, blockId, size, version)
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
  }, [assetFile, blockId, iconKey, size, version])

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

  if (blockId === 'minecraft:air' || blockId === 'air') {
    return (
      <div className="block-3d-box is-air-deleted">
        <div className="hologram-cube-wrap">
          <div className="air-delete-icon-wrap">
            <Trash2 size={44} color="#ef4444" />
          </div>
          <span className="hologram-text" style={{ color: '#ef4444' }}>
            Aire (Bloque Eliminado)
          </span>
          <span className="hologram-subtext">
            {subtitle || 'Este bloque será eliminado completamente de la construcción.'}
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
  version = '26.2',
}: {
  blockId: string
  assetFile: File | null
  size?: number
  version?: MinecraftVersion
}) {
  if (blockId === 'minecraft:air' || blockId === 'air') {
    return (
      <div
        className="block-3d-stage block-3d-stage-compact is-air-icon"
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(239, 68, 68, 0.1)',
          borderRadius: '4px',
          border: '1px dashed rgba(239, 68, 68, 0.4)',
        }}
        title="Aire (Eliminar bloque)"
      >
        <Trash2 size={Math.max(14, Math.round(size * 0.45))} color="#ef4444" />
      </div>
    )
  }
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [texturedKey, setTexturedKey] = useState('')
  const [failedKey, setFailedKey] = useState('')

  const iconKey =
    assetFile && blockId
      ? `${blockId}:${size}:${assetFile.name}:${assetFile.size}:${version}`
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

    void getLargeThumbnail(assetFile, blockId, size, version)
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
  }, [assetFile, blockId, iconKey, size, version])

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
