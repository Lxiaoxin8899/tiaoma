/**
 * 条码缓存模块
 * 使用 LRU 策略缓存生成的条码图片，避免重复生成
 */

interface CacheEntry {
  dataUrl: string
  timestamp: number
}

class BarcodeCache {
  private cache: Map<string, CacheEntry>
  private maxSize: number
  private maxAge: number // 毫秒

  constructor(maxSize = 500, maxAgeMinutes = 30) {
    this.cache = new Map()
    this.maxSize = maxSize
    this.maxAge = maxAgeMinutes * 60 * 1000
  }

  /**
   * 生成缓存键
   */
  private generateKey(
    content: string,
    type: string,
    options?: Record<string, any>
  ): string {
    const optStr = options ? JSON.stringify(options) : ''
    return `${type}:${content}:${optStr}`
  }

  /**
   * 获取缓存的条码
   */
  get(
    content: string,
    type: string,
    options?: Record<string, any>
  ): string | null {
    const key = this.generateKey(content, type, options)
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    // 检查是否过期
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key)
      return null
    }

    // LRU: 移动到末尾（最近使用）
    this.cache.delete(key)
    this.cache.set(key, entry)

    return entry.dataUrl
  }

  /**
   * 设置缓存
   */
  set(
    content: string,
    type: string,
    dataUrl: string,
    options?: Record<string, any>
  ): void {
    const key = this.generateKey(content, type, options)

    // 如果已存在，先删除（为了更新位置）
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }

    // 检查容量，移除最旧的条目
    while (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(key, {
      dataUrl,
      timestamp: Date.now(),
    })
  }

  /**
   * 检查是否存在缓存
   */
  has(
    content: string,
    type: string,
    options?: Record<string, any>
  ): boolean {
    return this.get(content, type, options) !== null
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * 清除过期缓存
   */
  clearExpired(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.maxAge) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    }
  }
}

// 导出单例实例
export const barcodeCache = new BarcodeCache(500, 30)

// 导出类以便测试或创建新实例
export { BarcodeCache }
