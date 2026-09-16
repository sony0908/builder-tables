import { useState } from 'react'
import { Sparkles, Bot, LoaderCircle, Check, Wand2, Image as ImageIcon } from 'lucide-react'
import { write, Int32 } from 'nbtify'
import './AiStructureGenerator.css'

type AiStructureGeneratorProps = {
  onStructureGenerated: (files: File[]) => void
}

export function AiStructureGenerator({ onStructureGenerated }: AiStructureGeneratorProps) {
  const [mode, setMode] = useState<'vision' | 'local'>('vision')
  
  // Gemini Vision settings
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('builder-tables-gemini-key') || '')
  const [geminiModel, setGeminiModel] = useState(() => localStorage.getItem('builder-tables-gemini-model') || 'gemini-3.6-flash')
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [visionPrompt, setVisionPrompt] = useState('Analiza esta construcción de Minecraft de la imagen. Traduce su diseño a una matriz 3D simplificada (máx 12x12x12). REGLA CRÍTICA: "dimensiones" [x,y,z] debe ser EXACTAMENTE igual al tamaño real de "estructura": x = largo de cada fila, y = número de capas, z = número de filas por capa. "estructura" es un array de Y capas (abajo hacia arriba), cada capa un array de Z filas, cada fila un array de X nombres vanilla con namespace (ej: minecraft:white_concrete, minecraft:glass, minecraft:quartz_block). No uses aire en los bordes. Solo JSON puro sin markdown.')

  // Local KoboldCpp settings
  const [endpoint, setEndpoint] = useState('http://localhost:5001/v1')
  const [localPrompt, setLocalPrompt] = useState('Diseña una torre moderna de cuarzo y cristal de 3x5x3 bloques. REGLA CRÍTICA: "dimensiones" [3,5,3] debe coincidir exactamente con "estructura": 5 capas, 3 filas por capa, 3 bloques por fila. Usa solo IDs vanilla con namespace (minecraft:quartz_block, minecraft:glass). Solo JSON puro.')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onload = (uploadEvent) => {
        setImagePreview(uploadEvent.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const extractJson = (raw: string) => {
    let cleaned = raw.trim()
      .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim()
    // Si la IA agregó texto antes/después, recorta al primer { y último }
    const first = cleaned.indexOf('{')
    const last = cleaned.lastIndexOf('}')
    if (first !== -1 && last !== -1 && last > first) {
      cleaned = cleaned.slice(first, last + 1)
    }
    return JSON.parse(cleaned)
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const generateFromVision = async () => {
    if (!selectedImage) {
      setError('Por favor selecciona una imagen de referencia.')
      return
    }
    if (!geminiKey) {
      setError('Por favor ingresa tu API Key de Gemini.')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      localStorage.setItem('builder-tables-gemini-key', geminiKey)
      localStorage.setItem('builder-tables-gemini-model', geminiModel)
      const base64Image = await fileToBase64(selectedImage)
      const mimeType = selectedImage.type || 'image/jpeg'

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: visionPrompt },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Image
                  }
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2
          }
        })
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error?.message || 'Error en la API de Gemini')
      }

      const data = await response.json()
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!textResponse) throw new Error('No se recibió respuesta válida de Gemini.')

      const parsed = extractJson(textResponse)

      await processAndExportNbt(parsed, 'image_structure.nbt')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar la imagen con IA.')
    } finally {
      setLoading(false)
    }
  }

  const generateFromLocal = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${endpoint}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "qwen",
          messages: [
            { role: "system", content: "Eres un generador de estructuras de Minecraft. Responde únicamente con JSON válido sin bloques markdown ni texto adicional." },
            { role: "user", content: localPrompt }
          ],
          temperature: 0.1
        })
      })

      if (!response.ok) throw new Error("Error HTTP: " + response.status)
      const data = await response.json()
      const reply = data.choices[0].message.content
      const parsed = extractJson(reply)

      await processAndExportNbt(parsed, 'local_ai_structure.nbt')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido al generar con IA local.')
    } finally {
      setLoading(false)
    }
  }

  const processAndExportNbt = async (parsedJson: any, fileName: string) => {
    if (!parsedJson || !Array.isArray(parsedJson.estructura)) {
      throw new Error('La IA no devolvió un JSON válido con el campo "estructura". Reintenta con un prompt más estricto.')
    }
    const estructura = parsedJson.estructura

    const normalizeBlockName = (raw: unknown): string | null => {
      if (typeof raw !== 'string') return null
      let name = raw.trim().toLowerCase()
      if (!name || name === 'air' || name === 'minecraft:air' || name === '0' || name === 'null' || name === 'vacio' || name === 'vacío') return null
      if (!name.includes(':')) name = 'minecraft:' + name
      // Mapeo rápido de nombres en español comunes a IDs vanilla
      const aliases: Record<string, string> = {
        'minecraft:cuarzo': 'minecraft:quartz_block',
        'minecraft:roble': 'minecraft:oak_planks',
        'minecraft:cristal': 'minecraft:glass',
        'minecraft:vidrio': 'minecraft:glass',
        'minecraft:piedra': 'minecraft:stone',
        'minecraft:madera': 'minecraft:oak_planks',
      }
      return aliases[name] ?? name
    }

    // Dimensiones reales medidas desde la matriz (autoritativas)
    const actualY = estructura.length
    let actualZ = 0
    let actualX = 0
    for (const layer of estructura) {
      if (!Array.isArray(layer)) continue
      actualZ = Math.max(actualZ, layer.length)
      for (const row of layer) {
        if (!Array.isArray(row)) continue
        actualX = Math.max(actualX, row.length)
      }
    }
    if (actualX < 1 || actualY < 1 || actualZ < 1) {
      throw new Error('La matriz de la IA está vacía. Pide una estructura de al menos 1x1x1.')
    }

    // Dimensiones declaradas por la IA (pueden venir mal) -> se reconcilian con las reales
    const declared = Array.isArray(parsedJson.dimensiones) ? parsedJson.dimensiones : []
    const sizeX = Math.max(Number(declared[0]) || 0, actualX)
    const sizeY = Math.max(Number(declared[1]) || 0, actualY)
    const sizeZ = Math.max(Number(declared[2]) || 0, actualZ)
    if (!Number.isInteger(sizeX) || !Number.isInteger(sizeY) || !Number.isInteger(sizeZ) || sizeX < 1 || sizeY < 1 || sizeZ < 1) {
      throw new Error('Dimensiones inválidas devueltas por la IA.')
    }
    if (sizeX > 48 || sizeY > 48 || sizeZ > 48) {
      throw new Error(`Estructura de ${sizeX}x${sizeY}x${sizeZ}: excede el límite de 48 bloques por eje del Structure Block. Pide una versión simplificada.`)
    }

    const paletteMap = new Map<string, number>()
    const palette: Array<{ Name: string }> = []
    const blocks: Array<{ pos: unknown; state: unknown }> = []

    function getPaletteIndex(name: string) {
      if (paletteMap.has(name)) return paletteMap.get(name)!
      const idx = palette.length
      palette.push({ Name: name })
      paletteMap.set(name, idx)
      return idx
    }

    for (let y = 0; y < estructura.length && y < sizeY; y++) {
      const layer = estructura[y]
      if (!Array.isArray(layer)) continue
      for (let z = 0; z < layer.length && z < sizeZ; z++) {
        const row = layer[z]
        if (!Array.isArray(row)) continue
        for (let x = 0; x < row.length && x < sizeX; x++) {
          const blockName = normalizeBlockName(row[x])
          if (!blockName) continue
          const pIdx = getPaletteIndex(blockName)
          blocks.push({
            pos: [new Int32(x), new Int32(y), new Int32(z)],
            state: new Int32(pIdx)
          })
        }
      }
    }

    if (!blocks.length) {
      throw new Error('La IA solo devolvió aire. Reintenta pidiendo bloques sólidos (ej: quartz_block, glass).')
    }

    const nbtRoot = {
      DataVersion: 3953,
      size: [new Int32(sizeX), new Int32(sizeY), new Int32(sizeZ)],
      palette,
      blocks,
      entities: []
    }

    const nbtBytes = await write(nbtRoot, { endian: 'big', rootName: '' })
    const nbtFile = new File([nbtBytes as Uint8Array<ArrayBuffer>], fileName, { type: 'application/octet-stream' })

    onStructureGenerated([nbtFile])
    setSuccess(`¡Estructura ${sizeX}x${sizeY}x${sizeZ} con ${blocks.length} bloques añadida al proyecto!`)
  }

  return (
    <section className="ai-generator-card">
      <div className="card-intro">
        <span className="section-icon section-icon-gold">
          <Sparkles size={22} />
        </span>
        <div>
          <span className="eyebrow">Inteligencia Artificial</span>
          <h2>Generar Estructura desde Imagen o Prompt</h2>
          <p>
            Transforma una foto de Pinterest o una descripción en una estructura NBT para tu proyecto de Minecraft.
          </p>
        </div>
      </div>

      <div className="ai-tabs">
        <button
          type="button"
          className={'ai-tab' + (mode === 'vision' ? ' active' : '')}
          onClick={() => setMode('vision')}
        >
          <ImageIcon size={16} /> Imagen a Estructura (Gemini Vision)
        </button>
        <button
          type="button"
          className={'ai-tab' + (mode === 'local' ? ' active' : '')}
          onClick={() => setMode('local')}
        >
          <Bot size={16} /> Prompt Local (KoboldCpp / Qwen)
        </button>
      </div>

      <div className="ai-form">
        {mode === 'vision' ? (
          <>
            <div className="ai-field-group">
              <label htmlFor="gemini-key">API Key de Gemini:</label>
              <input
                id="gemini-key"
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
              />
              <small className="ai-hint">Tu clave se guarda únicamente en el almacenamiento local de tu navegador.</small>
            </div>

            <div className="ai-field-group">
              <label htmlFor="gemini-model">Modelo (gratuitos):</label>
              <select
                id="gemini-model"
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
              >
                <option value="gemini-3.6-flash">gemini-3.6-flash (recomendado)</option>
                <option value="gemini-flash-latest">gemini-flash-latest (siempre vigente)</option>
                <option value="gemini-2.5-flash">gemini-2.5-flash (alternativa gratuita)</option>
                <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (rápido / económico)</option>
              </select>
              <small className="ai-hint">Si un modelo da error 404 (retirado), cambia a gemini-flash-latest.</small>
            </div>

            <div className="ai-field-group">
              <label>Imagen de referencia (ej. Pinterest):</label>
              <div className="ai-image-dropzone">
                {imagePreview ? (
                  <div className="ai-preview-container">
                    <img src={imagePreview} alt="Preview" className="ai-preview-img" />
                    <button type="button" className="secondary-button" onClick={() => { setSelectedImage(null); setImagePreview(null); }}>
                      Cambiar imagen
                    </button>
                  </div>
                ) : (
                  <label className="ai-file-label">
                    <ImageIcon size={28} />
                    <span>Sube o arrastra la foto del edificio</span>
                    <input type="file" accept="image/*" onChange={handleImageSelect} className="visually-hidden" />
                  </label>
                )}
              </div>
            </div>

            <div className="ai-field-group">
              <label htmlFor="vision-prompt">Instrucción para Gemini Vision:</label>
              <textarea
                id="vision-prompt"
                rows={3}
                value={visionPrompt}
                onChange={(e) => setVisionPrompt(e.target.value)}
              />
            </div>

            <button
              className="primary-button ai-submit-btn"
              type="button"
              disabled={loading || !selectedImage || !geminiKey}
              onClick={generateFromVision}
            >
              {loading ? (
                <>
                  <LoaderCircle className="spin-icon" size={17} />
                  Analizando imagen y generando NBT...
                </>
              ) : (
                <>
                  <Wand2 size={17} />
                  Analizar Imagen y Añadir al Proyecto
                </>
              )}
            </button>
          </>
        ) : (
          <>
            <div className="ai-field-group">
              <label htmlFor="ai-endpoint">Endpoint KoboldCpp:</label>
              <input
                id="ai-endpoint"
                type="text"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="http://localhost:5001/v1"
              />
            </div>

            <div className="ai-field-group">
              <label htmlFor="ai-prompt">Prompt / Descripción:</label>
              <textarea
                id="ai-prompt"
                rows={3}
                value={localPrompt}
                onChange={(e) => setLocalPrompt(e.target.value)}
              />
            </div>

            <button
              className="primary-button ai-submit-btn"
              type="button"
              disabled={loading}
              onClick={generateFromLocal}
            >
              {loading ? (
                <>
                  <LoaderCircle className="spin-icon" size={17} />
                  Generando con IA local...
                </>
              ) : (
                <>
                  <Wand2 size={17} />
                  Generar con Qwen y Añadir
                </>
              )}
            </button>
          </>
        )}

        {success && (
          <div className="ai-alert ai-success">
            <Check size={16} /> {success}
          </div>
        )}

        {error && (
          <div className="ai-alert ai-error">
            <Bot size={16} /> {error}
          </div>
        )}
      </div>
    </section>
  )
}
