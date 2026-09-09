import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  formatBlockPrice,
  PRICE_CATALOG_BLOCK_COUNT,
  PRICE_CATALOG_GROUPS,
  PRICE_POINTS_PER_EMERALD,
} from '../generator/pricing'
import { BlockPriceIcon } from './BlockPriceIcon'
import './PriceCatalog.css'

function blockLabel(blockId: string) {
  return blockId
    .replace(/^minecraft:/, '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function priceLabel(points: number) {
  if (points === 0) return 'Sin cobro'
  return formatBlockPrice(points) + ' esmeraldas'
}

export function PriceCatalog({ assetFile }: { assetFile: File | null }) {
  const [query, setQuery] = useState('')
  const [openGroups, setOpenGroups] = useState<string[]>([])
  const normalizedQuery = query.trim().toLocaleLowerCase()

  const groups = useMemo(
    () =>
      PRICE_CATALOG_GROUPS.map((group) => {
        const blocks = normalizedQuery
          ? group.blocks.filter((blockId) => {
              const label = blockLabel(blockId).toLocaleLowerCase()
              return (
                blockId.includes(normalizedQuery) ||
                label.includes(normalizedQuery) ||
                group.label.toLocaleLowerCase().includes(normalizedQuery)
              )
            })
          : group.blocks

        return { ...group, blocks }
      }).filter((group) => group.blocks.length > 0),
    [normalizedQuery],
  )

  const setGroupOpen = (groupId: string, open: boolean) => {
    setOpenGroups((current) =>
      open
        ? current.includes(groupId)
          ? current
          : [...current, groupId]
        : current.filter((id) => id !== groupId),
    )
  }

  return (
    <section id="prices" className="price-catalog" aria-label="Catálogo de precios">
      <div className="price-catalog-heading">
        <div>
          <span className="eyebrow">Tarifario Java 26.2</span>
          <h2>Precio de cada bloque</h2>
          <p>
            El generador suma el valor de los bloques compatibles y redondea el
            resultado al siguiente esmeralda completo.
          </p>
        </div>
        <div className="price-catalog-stats" aria-label="Resumen del catálogo">
          <span><strong>{PRICE_CATALOG_BLOCK_COUNT.toLocaleString('es-CL')}</strong> bloques</span>
          <span><strong>{PRICE_POINTS_PER_EMERALD}</strong> puntos = 1 esmeralda</span>
          <span className="price-asset-status">{assetFile ? 'Texturas reales activas' : 'Carga client.jar para texturas'}</span>
        </div>
      </div>

      <div className="price-catalog-toolbar">
        <label className="price-search">
          <Search size={17} />
          <span className="visually-hidden">Buscar bloque</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar bloque, por ejemplo: vidrio"
          />
        </label>
        <p className="price-catalog-note">
          Un <code>price</code> en el JSON de una construcción sustituye este
          cálculo solo para esa construcción.
        </p>
      </div>

      <div className="price-groups">
        {groups.map((group) => {
          const open = normalizedQuery.length > 0 || openGroups.includes(group.id)
          return (
            <details
              className="price-group"
              key={group.id}
              open={open}
              onToggle={(event) => setGroupOpen(group.id, event.currentTarget.open)}
            >
              <summary>
                <span className="price-group-copy">
                  <strong>{group.label}</strong>
                  <small>{group.description}</small>
                </span>
                <span className="price-group-meta">
                  <span>{group.blocks.length.toLocaleString('es-CL')} bloques</span>
                  <b>{priceLabel(group.points)}</b>
                </span>
              </summary>
              {open ? (
                <div className="price-block-grid" role="list">
                  {group.blocks.map((blockId) => (
                    <div className="price-block" key={blockId} role="listitem">
                      <BlockPriceIcon blockId={blockId} assetFile={assetFile} />
                      <span className="price-block-copy">
                        <strong>{blockLabel(blockId)}</strong>
                        <small>{blockId}</small>
                      </span>
                      <b>{priceLabel(group.points)}</b>
                    </div>
                  ))}
                </div>
              ) : null}
            </details>
          )
        })}
      </div>

      {!groups.length ? (
        <p className="price-catalog-empty">No hay bloques que coincidan con esa búsqueda.</p>
      ) : null}
    </section>
  )
}
