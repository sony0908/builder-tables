import { useId, useMemo, useState } from 'react'
import {
  ArrowRight,
  Copy,
  Layers,
  Paintbrush,
  RotateCcw,
  Search,
  Sparkles,
  X,
} from 'lucide-react'
import type { MaterialCount } from '../generator/types'
import {
  COMMON_BLOCKS,
  formatBlockDisplayName,
  normalizeBlockName,
  isValidVanillaBlock,
} from '../generator/block-search'
import { VANILLA_BLOCK_IDS_26_2 } from '../generator/vanilla-blocks-26_2'
import { BlockPriceIcon } from './BlockPriceIcon'
import './BlockReplacementPanel.css'

export type BlockReplacementStructure = {
  id: string
  name: string
  materials: MaterialCount[]
  replacements: Record<string, string>
}

type BlockReplacementPanelProps = {
  structures: BlockReplacementStructure[]
  selectedStructureId: string
  onSelectStructure: (id: string) => void
  onUpdateReplacements: (
    structureId: string,
    replacements: Record<string, string>,
  ) => void
  onApplyReplacementsToAll: (replacements: Record<string, string>) => void
  assetFile: File | null
}

export function BlockReplacementPanel({
  structures,
  selectedStructureId,
  onSelectStructure,
  onUpdateReplacements,
  onApplyReplacementsToAll,
  assetFile,
}: BlockReplacementPanelProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const datalistId = useId()

  const currentStructure = useMemo(
    () =>
      structures.find((s) => s.id === selectedStructureId) ?? structures[0],
    [structures, selectedStructureId],
  )

  const activeReplacements = useMemo(
    () => currentStructure?.replacements ?? {},
    [currentStructure?.replacements],
  )
  const replacementCount = Object.keys(activeReplacements).length

  const filteredMaterials = useMemo(() => {
    if (!currentStructure?.materials) return []
    const term = searchTerm.trim().toLowerCase()
    if (!term) return currentStructure.materials

    return currentStructure.materials.filter((m) => {
      const name = m.name.toLowerCase()
      const display = formatBlockDisplayName(m.name).toLowerCase()
      const target = (activeReplacements[m.name] ?? '').toLowerCase()
      return (
        name.includes(term) || display.includes(term) || target.includes(term)
      )
    })
  }, [currentStructure, searchTerm, activeReplacements])

  const handleBlockChange = (sourceBlock: string, rawTarget: string) => {
    if (!currentStructure) return
    const next = { ...activeReplacements }

    const normalized = normalizeBlockName(rawTarget)
    if (!normalized || normalized === sourceBlock) {
      delete next[sourceBlock]
    } else if (isValidVanillaBlock(normalized)) {
      next[sourceBlock] = normalized
    }

    onUpdateReplacements(currentStructure.id, next)
  }

  const handleResetBlock = (sourceBlock: string) => {
    if (!currentStructure) return
    const next = { ...activeReplacements }
    delete next[sourceBlock]
    onUpdateReplacements(currentStructure.id, next)
  }

  const handleResetAll = () => {
    if (!currentStructure) return
    onUpdateReplacements(currentStructure.id, {})
  }

  const handleCopyAll = () => {
    if (!currentStructure) return
    onApplyReplacementsToAll(activeReplacements)
  }

  if (!structures.length) return null

  return (
    <section className="replacement-card" aria-label="Sustitución de bloques">
      <div className="replacement-header">
        <div className="replacement-intro">
          <span className="section-icon section-icon-blue">
            <Paintbrush size={22} />
          </span>
          <div>
            <span className="eyebrow">Personalización</span>
            <h2>Cambiar tipos de bloques</h2>
            <p>
              Reemplaza bloques en lote antes de generar el paquete (ej: cambiar
              todos los tablones de roble por abeto o piedra por pizarra).
            </p>
          </div>
        </div>
        <div className="replacement-badges">
          {replacementCount > 0 && (
            <span className="replacement-count-badge">
              <Sparkles size={13} />
              {replacementCount}{' '}
              {replacementCount === 1 ? 'bloque cambiado' : 'bloques cambiados'}
            </span>
          )}
        </div>
      </div>

      <div className="replacement-controls">
        {structures.length > 1 ? (
          <label className="replacement-structure-select">
            <Layers size={15} />
            <span>Construcción:</span>
            <select
              value={currentStructure?.id}
              onChange={(e) => onSelectStructure(e.target.value)}
            >
              {structures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.materials.length} tipos de bloque)
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="replacement-structure-select">
            <Layers size={15} />
            <strong>{currentStructure?.name}</strong>
          </div>
        )}

        <div className="replacement-search-box">
          <Search size={14} className="replacement-search-icon" />
          <input
            type="text"
            placeholder="Buscar bloque..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="replacement-bulk-actions">
          {structures.length > 1 && replacementCount > 0 && (
            <button
              className="replacement-btn-ghost"
              type="button"
              onClick={handleCopyAll}
              title="Aplica las mismas sustituciones a todas las construcciones del proyecto"
            >
              <Copy size={13} />
              Copiar a todas
            </button>
          )}
          {replacementCount > 0 && (
            <button
              className="replacement-btn-ghost"
              type="button"
              onClick={handleResetAll}
              title="Restablecer todos los bloques a sus valores originales"
            >
              <RotateCcw size={13} />
              Restablecer
            </button>
          )}
        </div>
      </div>

      <div className="replacement-list">
        {filteredMaterials.length === 0 ? (
          <div className="replacement-empty">
            No se encontraron bloques con ese criterio.
          </div>
        ) : (
          filteredMaterials.map((material) => {
            const currentReplacement = activeReplacements[material.name]
            const isReplaced = Boolean(currentReplacement)
            const activeId = currentReplacement || material.name

            return (
              <div
                key={material.name}
                className={`replacement-item ${isReplaced ? 'is-replaced' : ''}`}
              >
                <div className="replacement-source">
                  <BlockPriceIcon
                    blockId={activeId}
                    assetFile={assetFile}
                  />
                  <div className="replacement-source-info">
                    <span className="replacement-source-title">
                      {formatBlockDisplayName(material.name)}
                    </span>
                    <span className="replacement-source-id">
                      {material.name.replace(/^minecraft:/, '')}
                    </span>
                  </div>
                  <span className="replacement-source-count">
                    ×{material.count}
                  </span>
                </div>

                <ArrowRight size={14} className="replacement-arrow" />

                <div className="replacement-target">
                  <div className="replacement-input-wrapper">
                    <input
                      className={`replacement-input ${isReplaced ? 'is-active' : ''}`}
                      type="text"
                      list={datalistId}
                      placeholder={material.name}
                      value={currentReplacement ?? ''}
                      onChange={(e) =>
                        handleBlockChange(material.name, e.target.value)
                      }
                      spellCheck={false}
                    />
                  </div>
                  {isReplaced && (
                    <button
                      className="replacement-reset-btn"
                      type="button"
                      onClick={() => handleResetBlock(material.name)}
                      title="Quitar sustitución"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      <datalist id={datalistId}>
        {COMMON_BLOCKS.map((id) => (
          <option key={id} value={id}>
            {formatBlockDisplayName(id)}
          </option>
        ))}
        {VANILLA_BLOCK_IDS_26_2.map((id) => (
          <option key={'vanilla-' + id} value={id} />
        ))}
      </datalist>
    </section>
  )
}
