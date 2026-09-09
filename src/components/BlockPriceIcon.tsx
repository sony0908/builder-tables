import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { getMinecraftRenderer, getPreparedAssets } from './minecraft-renderer'
import './BlockPriceIcon.css'

type BlockPriceIconProps = {
  blockId: string
  assetFile: File | null
}

const thumbnailCache = new WeakMap<File, Map<string, Promise<HTMLCanvasElement>>>()
let renderQueue: Promise<void> = Promise.resolve()

function blockTint(blockId: string) {
  let value = 0
  for (const character of blockId) {
    value = (value * 31 + character.charCodeAt(0)) | 0
  }
  return `hsl(${Math.abs(value) % 360} 30% 53%)`
}

function enqueueRender<T>(task: () => Promise<T>) {
  const result = renderQueue.then(task, task)
  renderQueue = result.then(
    () => undefined,
    () => undefined,
  )
  return result
}

function getThumbnail(assetFile: File, blockId: string) {
  let byBlock = thumbnailCache.get(assetFile)
  if (!byBlock) {
    byBlock = new Map()
    thumbnailCache.set(assetFile, byBlock)
  }

  let thumbnail = byBlock.get(blockId)
  if (!thumbnail) {
    thumbnail = enqueueRender(async () => {
      const renderer = await getMinecraftRenderer()
      const assets = await getPreparedAssets(renderer, assetFile)
      return renderer.renderBlock({
        id: blockId,
        assets,
        width: 56,
        height: 56,
        version: '26.2',
        defaults: 'game',
      })
    })
    byBlock.set(blockId, thumbnail)
    void thumbnail.catch(() => byBlock?.delete(blockId))
  }

  return thumbnail
}

export function BlockPriceIcon({ blockId, assetFile }: BlockPriceIconProps) {
  const rootRef = useRef<HTMLSpanElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [visible, setVisible] = useState(
    () => typeof IntersectionObserver === 'undefined',
  )
  const [texturedKey, setTexturedKey] = useState('')
  const [failedKey, setFailedKey] = useState('')
  const iconKey = assetFile
    ? `${blockId}:${assetFile.name}:${assetFile.size}:${assetFile.lastModified}`
    : ''
  const iconState =
    !assetFile || !visible || failedKey === iconKey
      ? 'fallback'
      : texturedKey === iconKey
        ? 'textured'
        : 'loading'

  useEffect(() => {
    const root = rootRef.current
    if (!root || !('IntersectionObserver' in window)) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        setVisible(true)
        observer.disconnect()
      },
      { rootMargin: '220px' },
    )
    observer.observe(root)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    context?.clearRect(0, 0, canvas.width, canvas.height)

    if (!assetFile || !visible) return

    let cancelled = false

    void getThumbnail(assetFile, blockId)
      .then((thumbnail) => {
        if (cancelled || !context) return
        context.clearRect(0, 0, canvas.width, canvas.height)
        context.drawImage(thumbnail, 0, 0, canvas.width, canvas.height)
        setTexturedKey(iconKey)
      })
      .catch(() => {
        if (!cancelled) setFailedKey(iconKey)
      })

    return () => {
      cancelled = true
    }
  }, [assetFile, blockId, iconKey, visible])

  return (
    <span
      ref={rootRef}
      className="block-price-icon"
      data-state={iconState}
      aria-hidden="true"
      style={{ '--block-tint': blockTint(blockId) } as CSSProperties}
    >
      <canvas ref={canvasRef} width="56" height="56" />
    </span>
  )
}
