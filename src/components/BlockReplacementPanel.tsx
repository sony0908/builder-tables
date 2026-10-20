import { useId, useMemo, useState } from 'react'
import {
  ArrowRight,
  Check,
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
import { Block3DPreview } from './Block3DPreview'
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

/**
 * Sugerencias contextuales según la familia del bloque original
 */
function getSmartFamilySuggestions(sourceBlock: string): string[] {
  const name = sourceBlock.toLowerCase()

  if (name.includes('planks') || name.includes('wood') || name.includes('log')) {
    return [
      'minecraft:oak_planks',
      'minecraft:spruce_planks',
      'minecraft:birch_planks',
      'minecraft:jungle_planks',
      'minecraft:acacia_planks',
      'minecraft:dark_oak_planks',
      'minecraft:mangrove_planks',
      'minecraft:cherry_planks',
      'minecraft:bamboo_planks',
    ].filter((id) => id !== sourceBlock)
  }

  if (
    name.includes('stone') ||
    name.includes('deepslate') ||
    name.includes('brick') ||
    name.includes('cobble')
  ) {
    return [
      'minecraft:stone',
      'minecraft:stone_bricks',
      'minecraft:cobblestone',
      'minecraft:deepslate',
      'minecraft:cobbled_deepslate',
      'minecraft:deepslate_bricks',
      'minecraft:deepslate_tiles',
      'minecraft:bricks',
      'minecraft:quartz_block',
    ].filter((id) => id !== sourceBlock)
  }

  if (name.includes('glass')) {
    return [
      'minecraft:glass',
      'minecraft:tinted_glass',
      'minecraft:white_stained_glass',
      'minecraft:light_blue_stained_glass',
      'minecraft:gray_stained_glass',
      'minecraft:black_stained_glass',
    ].filter((id) => id !== sourceBlock)
  }

  if (name.includes('concrete')) {
    return [
      'minecraft:white_concrete',
      'minecraft:light_gray_concrete',
      'minecraft:gray_concrete',
      'minecraft:black_concrete',
      'minecraft:light_blue_concrete',
      'minecraft:blue_concrete',
    ].filter((id) => id !== sourceBlock)
  }

  return COMMON_BLOCKS.slice(0, 8).filter((id) => id !== sourceBlock)
}

export function BlockReplacementPanel({
  structures,
  selectedStructureId,
  onSelectStructure,
  onUpdateReplacements,
  onApplyReplacementsToAll,
  assetFile,
}: BlockReplacementPanelProps) {
  const [filterQuery, setFilterQuery] = useState('')
  const [activeModalBlock, setActiveModalBlock] = useState<MaterialCount | null>(null)
  const [modalSearchTerm, setModalSearchTerm] = useState('')
  const [pendingTargetBlock, setPendingTargetBlock] = useState<string | null>(null)

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
    const term = filterQuery.trim().toLowerCase()
    if (!term) return currentStructure.materials

    return currentStructure.materials.filter((m) => {
      const name = m.name.toLowerCase()
      const display = formatBlockDisplayName(m.name).toLowerCase()
      const target = (activeReplacements[m.name] ?? '').toLowerCase()
      return (
        name.includes(term) || display.includes(term) || target.includes(term)
      )
    })
  }, [currentStructure, filterQuery, activeReplacements])

  // Abre el modal para configurar el bloque seleccionado
  const handleOpenModal = (material: MaterialCount) => {
    setActiveModalBlock(material)
    const existingReplacement = activeReplacements[material.name] ?? null
    setPendingTargetBlock(existingReplacement)
    setModalSearchTerm(existingReplacement ? formatBlockDisplayName(existingReplacement) : '')
  }

  const handleCloseModal = () => {
    setActiveModalBlock(null)
    setPendingTargetBlock(null)
    setModalSearchTerm('')
  }

  const handleModalSearchChange = (value: string) => {
    setModalSearchTerm(value)
    const normalized = normalizeBlockName(value)
    if (normalized && isValidVanillaBlock(normalized)) {
      setPendingTargetBlock(normalized)
    } else if (!value.trim()) {
      setPendingTargetBlock(null)
    }
  }

  const handleSelectQuickSuggestion = (targetId: string) => {
    setPendingTargetBlock(targetId)
    setModalSearchTerm(formatBlockDisplayName(targetId))
  }

  const handleSaveModalReplacement = () => {
    if (!currentStructure || !activeModalBlock) return
    const next = { ...activeReplacements }

    if (!pendingTargetBlock || pendingTargetBlock === activeModalBlock.name) {
      delete next[activeModalBlock.name]
    } else if (isValidVanillaBlock(pendingTargetBlock)) {
      next[activeModalBlock.name] = pendingTargetBlock
    }

    onUpdateReplacements(currentStructure.id, next)
    handleCloseModal()
  }

  const handleResetModalReplacement = () => {
    if (!currentStructure || !activeModalBlock) return
    const next = { ...activeReplacements }
    delete next[activeModalBlock.name]
    onUpdateReplacements(currentStructure.id, next)
    handleCloseModal()
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

  const smartSuggestions = activeModalBlock
    ? getSmartFamilySuggestions(activeModalBlock.name)
    : []

  return (
    <section className="replacement-section" aria-label="Sustitución de bloques">
      <div className="replacement-header">
        <div className="replacement-intro">
          <span className="section-icon section-icon-blue">
            <Paintbrush size={22} />
          </span>
          <div>
            <span className="eyebrow">Personalización</span>
            <h2>Cambiar tipos de bloques</h2>
            <p>
              Haz clic en cualquier bloque de la construcción para abrir la
              ventana de cambio y previsualizar la sustitución en 3D.
            </p>
          </div>
        </div>
        <div className="replacement-badges">
          {replacementCount > 0 && (
            <span className="replacement-count-badge">
              <Sparkles size={14} />
              {replacementCount}{' '}
              {replacementCount === 1 ? 'bloque cambiado' : 'bloques cambiados'}
            </span>
          )}
        </div>
      </div>

      <div className="replacement-toolbar">
        {structures.length > 1 ? (
          <label className="replacement-structure-selector">
            <Layers size={15} />
            <span>Construcción:</span>
            <select
              value={currentStructure?.id}
              onChange={(e) => onSelectStructure(e.target.value)}
            >
              {structures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.materials.length} bloques)
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="replacement-structure-selector">
            <Layers size={15} />
            <strong>{currentStructure?.name}</strong>
          </div>
        )}

        <div className="replacement-search-bar">
          <Search size={14} className="replacement-search-icon" />
          <input
            type="text"
            placeholder="Buscar entre los bloques..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
          />
        </div>

        <div className="replacement-badges">
          {structures.length > 1 && replacementCount > 0 && (
            <button
              className="btn-secondary"
              type="button"
              onClick={handleCopyAll}
              title="Aplica las mismas sustituciones a todas las construcciones"
            >
              <Copy size={13} style={{ marginRight: '0.35rem' }} />
              Copiar a todas
            </button>
          )}
          {replacementCount > 0 && (
            <button
              className="btn-secondary"
              type="button"
              onClick={handleResetAll}
              title="Restablecer todos los bloques originales"
            >
              <RotateCcw size={13} style={{ marginRight: '0.35rem' }} />
              Restablecer todo
            </button>
          )}
        </div>
      </div>

      {/* Lista visual con iconos grandes */}
      <div className="block-grid">
        {filteredMaterials.map((material) => {
          const replacement = activeReplacements[material.name]
          const isReplaced = Boolean(replacement)
          const displayId = replacement || material.name

          return (
            <div
              key={material.name}
              className={`block-card ${isReplaced ? 'has-replacement' : ''}`}
              onClick={() => handleOpenModal(material)}
              title="Haz clic para cambiar este bloque"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleOpenModal(material)
                }
              }}
            >
              <span className="block-card-badge">×{material.count}</span>

              <div className="block-card-icon-wrap">
                <Block3DPreview
                  blockId={displayId}
                  assetFile={assetFile}
                  size={72}
                />
              </div>

              <div className="block-card-info">
                <span className="block-card-name">
                  {formatBlockDisplayName(material.name)}
                </span>
                <span className="block-card-sub">
                  {material.name.replace(/^minecraft:/, '')}
                </span>

                {isReplaced && (
                  <span className="block-card-replacement-indicator">
                    ➔ {formatBlockDisplayName(replacement!)}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* =========================================================================
          VENTANA MODAL FLOTANTE CON LOS DOS CUADROS COMPARATIVOS
          ========================================================================= */}
      {activeModalBlock && (
        <div
          className="replacement-modal-backdrop"
          onClick={handleCloseModal}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="replacement-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="replacement-modal-header">
              <div className="replacement-modal-title">
                <Paintbrush size={18} color="var(--primary)" />
                <h3>Cambiar bloque en la construcción</h3>
              </div>
              <button
                className="replacement-modal-close"
                type="button"
                onClick={handleCloseModal}
                aria-label="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            <div className="replacement-modal-body">
              {/* LOS DOS CUADROS: IZQUIERDA (ORIGINAL) Y DERECHA (REEMPLAZO O HOLOGRAMA) */}
              <div className="comparison-container">
                {/* Cuadro Izquierdo: Original en Grande */}
                <div className="comparison-column">
                  <span className="comparison-column-label">
                    Bloque de la construcción
                  </span>
                  <Block3DPreview
                    blockId={activeModalBlock.name}
                    assetFile={assetFile}
                    size={160}
                    count={activeModalBlock.count}
                    subtitle="Bloque original presente"
                  />
                </div>

                {/* Flecha central de transformación */}
                <div className="comparison-arrow-wrap">
                  <ArrowRight size={28} />
                </div>

                {/* Cuadro Derecho: Nuevo Bloque en Grande o Holograma vacío */}
                <div className="comparison-column">
                  <span className="comparison-column-label">
                    Nuevo bloque
                  </span>
                  <Block3DPreview
                    blockId={pendingTargetBlock}
                    assetFile={assetFile}
                    size={160}
                    subtitle={
                      pendingTargetBlock
                        ? 'Sustituirá a todos los originales'
                        : undefined
                    }
                  />
                </div>
              </div>

              {/* Selector y buscador del nuevo bloque */}
              <div className="target-picker-section">
                <label className="target-picker-label">
                  Buscar o seleccionar el nuevo bloque:
                </label>
                <div className="target-picker-input-wrap">
                  <Search
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '0.75rem',
                      color: 'var(--text-muted)',
                      pointerEvents: 'none',
                    }}
                  />
                  <input
                    className="target-picker-input"
                    type="text"
                    list={datalistId}
                    placeholder="Escribe el nombre (ej: pino, cristal, deepslate...)"
                    value={modalSearchTerm}
                    onChange={(e) => handleModalSearchChange(e.target.value)}
                    autoFocus
                    spellCheck={false}
                  />
                  {modalSearchTerm && (
                    <button
                      className="target-picker-clear-btn"
                      type="button"
                      onClick={() => {
                        setModalSearchTerm('')
                        setPendingTargetBlock(null)
                      }}
                      title="Limpiar búsqueda"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Sugerencias contextuales rápidas */}
                {smartSuggestions.length > 0 && (
                  <div className="quick-suggestions">
                    <span className="quick-suggestions-label">Sugerencias:</span>
                    {smartSuggestions.map((id) => (
                      <button
                        key={id}
                        type="button"
                        className={`quick-pill ${pendingTargetBlock === id ? 'is-active' : ''}`}
                        onClick={() => handleSelectQuickSuggestion(id)}
                      >
                        {formatBlockDisplayName(id)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="replacement-modal-footer">
              <div>
                {activeReplacements[activeModalBlock.name] && (
                  <button
                    className="btn-danger-ghost"
                    type="button"
                    onClick={handleResetModalReplacement}
                  >
                    Restaurar original
                  </button>
                )}
              </div>
              <div className="modal-actions-right">
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={handleCloseModal}
                >
                  Cancelar
                </button>
                <button
                  className="btn-primary"
                  type="button"
                  onClick={handleSaveModalReplacement}
                >
                  <Check size={16} />
                  Confirmar cambio
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
