import { ContentType } from './db'

// 数据库适配器接口
export interface DatabaseAdapter {
  // 连接和初始化
  connect(): Promise<void>
  disconnect(): Promise<void>
  checkAndInitDatabase(): Promise<void>
  
  // 内容操作
  getContents(type?: ContentType): Promise<any[]>
  getContent(id: number): Promise<any | null>
  createContent(data: {
    name: string
    description?: string
    content_type: ContentType
    blob_url: string
    thumbnail_url?: string
    metadata?: any
    tags?: string[]
  }): Promise<any>
  updateContent(id: number, data: {
    name?: string
    description?: string
    blob_url?: string
    thumbnail_url?: string
    metadata?: any
    tags?: string[]
  }): Promise<any | null>
  deleteContent(id: number): Promise<any | null>
  updateContentSortOrder(id: number, sortOrder: number): Promise<any | null>
  resetContentSortOrder(contentType: ContentType): Promise<void>
  
  // 访问日志
  logAccess(data: {
    content_id: number
    access_type: string
    ip_address?: string
    user_agent?: string
  }): Promise<any | null>
  
  // 站点设置
  getSiteSettings(): Promise<any | null>
  updateSiteSettings(data: {
    site_name?: string
    show_download_link?: boolean
    page_title?: string
    meta_description?: string
  }): Promise<any | null>
}

// 数据库类型枚举
export enum DatabaseType {
  POSTGRES = 'postgres',
  SQLITE = 'sqlite'
}

// 解析数据库URL
export function parseDatabaseUrl(url: string): { type: DatabaseType; config: any } {
  if (url.startsWith('postgres://') || url.startsWith('postgresql://')) {
    return {
      type: DatabaseType.POSTGRES,
      config: { url }
    }
  } else if (url.startsWith('sqlite://')) {
    const dbPath = url.replace('sqlite://', '')
    return {
      type: DatabaseType.SQLITE,
      config: { path: dbPath }
    }
  } else {
    throw new Error(`不支持的数据库URL格式: ${url}`)
  }
}