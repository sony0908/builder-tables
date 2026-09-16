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
  const [visionPrompt, setVisionPrompt] = useState('Analiza esta construcción de Minecraft de la imagen. Traduce su diseño a una matriz 3D simplificada (máx 16x16x16). Devuelve estrictamente un JSON con "dimensiones": [x, y, z] y "estructura": [capas Y de matrices 2D con nombres de bloques de Minecraft, ej: minecraft:white_concrete, minecraft:glass]. Solo JSON puro sin markdown.')

  // Local KoboldCpp settings
  const [endpoint, setEndpoint] = useState('http://localhost:5001/v1')
  const [localPrompt, setLocalPrompt] = useState('Diseña una torre moderna de cuarzo y cristal de 3x5x3 bloques. Devuelve estrictamente un JSON válido con dimensiones [3, 5, 3] y la estructura en capas Y.')

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

      let cleaned = textResponse.trim()
      cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '')
      const parsed = JSON.parse(cleaned)

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
      let reply = data.choices[0].message.content.trim()
      
      reply = reply.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '')
      const parsed = JSON.parse(reply)

      await processAndExportNbt(parsed, 'local_ai_structure.nbt')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido al generar con IA local.')
    } finally {
      setLoading(false)
    }
  }

  const processAndExportNbt = async (parsedJson: any, fileName: string) => {
    const { dimensiones, estructura } = parsedJson
    const [sizeX, sizeY, sizeZ] = dimensiones

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

    for (let y = 0; y < estructura.length; y++) {
      const layer = estructura[y]
      if (!layer) continue
      for (let z = 0; z < layer.length; z++) {
        const row = layer[z]
        if (!row) continue
        for (let x = 0; x < row.length; x++) {
          const blockName = row[x]
          if (blockName && blockName !== 'minecraft:air' && blockName !== 'air') {
            const pIdx = getPaletteIndex(blockName)
            blocks.push({
              pos: [new Int32(x), new Int32(y), new Int32(z)],
              state: new Int32(pIdx)
            })
          }
        }
      }
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
    setSuccess('¡Estructura NBT generada y añadida al proyecto correctamente!')
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
