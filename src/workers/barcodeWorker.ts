/**
 * 条码生成 Web Worker
 * 在后台线程处理条码生成，避免阻塞 UI
 */

// Worker 消息类型
interface GenerateBarcodeMessage {
  type: 'generate'
  id: string
  content: string
  barcodeType: 'code128' | 'qrcode' | 'ean13' | 'upc'
  options?: {
    width?: number
    height?: number
    displayValue?: boolean
    fontSize?: number
    margin?: number
  }
}

interface BatchGenerateMessage {
  type: 'batch'
  items: Array<{
    id: string
    content: string
    barcodeType: 'code128' | 'qrcode' | 'ean13' | 'upc'
  }>
  options?: {
    width?: number
    height?: number
    displayValue?: boolean
    fontSize?: number
    margin?: number
  }
}

type WorkerMessage = GenerateBarcodeMessage | BatchGenerateMessage

interface WorkerResponse {
  type: 'success' | 'error' | 'progress' | 'complete'
  id?: string
  dataUrl?: string
  error?: string
  progress?: number
  total?: number
  results?: Array<{ id: string; dataUrl: string; error?: string }>
}

// 简单的 Code128 编码表（子集 B）
const CODE128_B: Record<string, string> = {
  ' ': '11011001100', '!': '11001101100', '"': '11001100110', '#': '10010011000',
  '$': '10010001100', '%': '10001001100', '&': '10011001000', "'": '10011000100',
  '(': '10001100100', ')': '11001001000', '*': '11001000100', '+': '11000100100',
  ',': '10110011100', '-': '10011011100', '.': '10011001110', '/': '10111001100',
  '0': '10011101100', '1': '10011100110', '2': '11001110010', '3': '11001011100',
  '4': '11001001110', '5': '11011100100', '6': '11001110100', '7': '11101101110',
  '8': '11101001100', '9': '11100101100', ':': '11100100110', ';': '11101100100',
  '<': '11100110100', '=': '11100110010', '>': '11011011000', '?': '11011000110',
  '@': '11000110110', 'A': '10100011000', 'B': '10001011000', 'C': '10001000110',
  'D': '10110001000', 'E': '10001101000', 'F': '10001100010', 'G': '11010001000',
  'H': '11000101000', 'I': '11000100010', 'J': '10110111000', 'K': '10110001110',
  'L': '10001101110', 'M': '10111011000', 'N': '10111000110', 'O': '10001110110',
  'P': '11101110110', 'Q': '11010001110', 'R': '11000101110', 'S': '11011101000',
  'T': '11011100010', 'U': '11011101110', 'V': '11101011000', 'W': '11101000110',
  'X': '11100010110', 'Y': '11101101000', 'Z': '11101100010', '[': '11100011010',
  '\\': '11101111010', ']': '11001000010', '^': '11110001010', '_': '10100110000',
  '`': '10100001100', 'a': '10010110000', 'b': '10010000110', 'c': '10000101100',
  'd': '10000100110', 'e': '10110010000', 'f': '10110000100', 'g': '10011010000',
  'h': '10011000010', 'i': '10000110100', 'j': '10000110010', 'k': '11000010010',
  'l': '11001010000', 'm': '11110111010', 'n': '11000010100', 'o': '10001111010',
  'p': '10100111100', 'q': '10010111100', 'r': '10010011110', 's': '10111100100',
  't': '10011110100', 'u': '10011110010', 'v': '11110100100', 'w': '11110010100',
  'x': '11110010010', 'y': '11011011110', 'z': '11011110110', '{': '11110110110',
  '|': '10101111000', '}': '10100011110', '~': '10001011110',
}

const START_B = '11010010000'
const STOP = '1100011101011'

/**
 * 生成 Code128 条码的二进制模式
 */
function generateCode128Pattern(content: string): string {
  let pattern = START_B
  let checksum = 104 // Start B 的值

  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    const code = CODE128_B[char]
    if (!code) {
      throw new Error(`不支持的字符: ${char}`)
    }
    pattern += code
    checksum += (i + 1) * (char.charCodeAt(0) - 32)
  }

  // 添加校验位
  const checksumChar = String.fromCharCode((checksum % 103) + 32)
  pattern += CODE128_B[checksumChar] || CODE128_B[' ']
  pattern += STOP

  return pattern
}

/**
 * 将二进制模式渲染为 Canvas 并返回 DataURL
 */
function renderBarcodeToDataUrl(
  pattern: string,
  content: string,
  options: {
    width?: number
    height?: number
    displayValue?: boolean
    fontSize?: number
    margin?: number
  } = {}
): string {
  const {
    width = 2,
    height = 100,
    displayValue = true,
    fontSize = 14,
    margin = 10,
  } = options

  const barcodeWidth = pattern.length * width
  const textHeight = displayValue ? fontSize + 10 : 0
  const canvasWidth = barcodeWidth + margin * 2
  const canvasHeight = height + textHeight + margin * 2

  // 创建 OffscreenCanvas
  const canvas = new OffscreenCanvas(canvasWidth, canvasHeight)
  const ctx = canvas.getContext('2d')!

  // 白色背景
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  // 绘制条码
  ctx.fillStyle = '#000000'
  let x = margin
  for (const bit of pattern) {
    if (bit === '1') {
      ctx.fillRect(x, margin, width, height)
    }
    x += width
  }

  // 绘制文本
  if (displayValue) {
    ctx.fillStyle = '#000000'
    ctx.font = `${fontSize}px monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(content, canvasWidth / 2, margin + height + 5)
  }

  // 转换为 DataURL
  const blob = canvas.convertToBlob({ type: 'image/png' })
  return URL.createObjectURL(blob as unknown as Blob)
}

/**
 * 简化的条码生成（在 Worker 中使用）
 */
async function generateBarcode(
  content: string,
  type: string,
  options: any = {}
): Promise<string> {
  if (type === 'code128') {
    const pattern = generateCode128Pattern(content)

    // 使用 OffscreenCanvas
    const {
      width = 2,
      height = 100,
      displayValue = true,
      fontSize = 14,
      margin = 10,
    } = options

    const barcodeWidth = pattern.length * width
    const textHeight = displayValue ? fontSize + 10 : 0
    const canvasWidth = barcodeWidth + margin * 2
    const canvasHeight = height + textHeight + margin * 2

    const canvas = new OffscreenCanvas(canvasWidth, canvasHeight)
    const ctx = canvas.getContext('2d')!

    // 白色背景
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    // 绘制条码
    ctx.fillStyle = '#000000'
    let x = margin
    for (const bit of pattern) {
      if (bit === '1') {
        ctx.fillRect(x, margin, width, height)
      }
      x += width
    }

    // 绘制文本
    if (displayValue) {
      ctx.fillStyle = '#000000'
      ctx.font = `${fontSize}px monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(content, canvasWidth / 2, margin + height + 5)
    }

    const blob = await canvas.convertToBlob({ type: 'image/png' })
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
  }

  throw new Error(`Worker 暂不支持条码类型: ${type}`)
}

// Worker 消息处理
self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const message = e.data

  try {
    if (message.type === 'generate') {
      // 单个条码生成
      const dataUrl = await generateBarcode(
        message.content,
        message.barcodeType,
        message.options
      )

      self.postMessage({
        type: 'success',
        id: message.id,
        dataUrl,
      } as WorkerResponse)
    } else if (message.type === 'batch') {
      // 批量生成
      const results: Array<{ id: string; dataUrl: string; error?: string }> = []
      const total = message.items.length

      for (let i = 0; i < message.items.length; i++) {
        const item = message.items[i]

        try {
          const dataUrl = await generateBarcode(
            item.content,
            item.barcodeType,
            message.options
          )
          results.push({ id: item.id, dataUrl })
        } catch (err) {
          results.push({
            id: item.id,
            dataUrl: '',
            error: err instanceof Error ? err.message : '生成失败',
          })
        }

        // 发送进度
        self.postMessage({
          type: 'progress',
          progress: i + 1,
          total,
        } as WorkerResponse)
      }

      self.postMessage({
        type: 'complete',
        results,
      } as WorkerResponse)
    }
  } catch (err) {
    self.postMessage({
      type: 'error',
      error: err instanceof Error ? err.message : '未知错误',
    } as WorkerResponse)
  }
}

export {}
