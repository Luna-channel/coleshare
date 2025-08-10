import { DatabaseFactory } from './db-factory'
import { DatabaseAdapter } from './db-adapter'

// 数据库适配器实例
let dbAdapter: DatabaseAdapter | null = null

// 检查是否在服务器端
function isServerSide() {
  return typeof window === 'undefined'
}

// 初始化数据库连接
async function initializeDatabase() {
  if (!isServerSide()) {
    throw new Error('Database operations can only be performed on the server side')
  }
  
  if (dbAdapter) {
    return dbAdapter
  }

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required')
  }

  dbAdapter = DatabaseFactory.createAdapter(databaseUrl)
  await dbAdapter.connect()
  await dbAdapter.checkAndInitDatabase()
  
  return dbAdapter
}

// 获取数据库适配器实例
export async function getDbAdapter(): Promise<DatabaseAdapter> {
  if (!isServerSide()) {
    throw new Error('Database operations can only be performed on the server side')
  }
  
  if (!dbAdapter) {
    await initializeDatabase()
  }
  return dbAdapter!
}

// 内容类型枚举
export enum ContentType {
  CHARACTER_CARD = "character_card",
  KNOWLEDGE_BASE = "knowledge_base",
  EVENT_BOOK = "event_book",
  PROMPT_INJECTION = "prompt_injection",
  STORY_BOOK = "story_book",
  OTHER = "other",
}

// 站点设置类型定义
export interface SiteSettings {
  id: number;
  site_name: string;
  show_download_link: boolean;
  page_title: string;
  meta_description: string;
  created_at: Date;
  updated_at: Date;
}

// 内容查询函数
export async function getContents(type?: ContentType) {
  try {
    const adapter = await getDbAdapter()
    return await adapter.getContents(type)
  } catch (error) {
    console.error("获取内容失败:", error)
    throw error
  }
}

// 获取单个内容
export async function getContent(id: number) {
  try {
    const adapter = await getDbAdapter()

    console.log(`获取内容ID: ${id}`);
    
    const result = await adapter.getContent(id)
    console.log("getContent 结果:", result);
    
    return result
  } catch (error) {
    console.error("获取内容详情失败:", error)
    throw error
  }
}

// 批量获取内容（按ID数组）
export async function getContentsByIds(ids: string[]): Promise<any[]> {
  try {
    const adapter = await getDbAdapter()
    const results: any[] = []
    
    // 并行查询所有内容
    const promises = ids.map(id => {
      const numericId = parseInt(id, 10)
      if (isNaN(numericId)) {
        console.warn(`无效的内容ID: ${id}`)
        return Promise.resolve(null)
      }
      return adapter.getContent(numericId)
    })
    
    const contents = await Promise.all(promises)
    
    // 过滤掉null值
    contents.forEach(content => {
      if (content) {
        results.push(content)
      }
    })
    
    console.log(`批量查询返回 ${results.length} 条内容`)
    return results
  } catch (error) {
    console.error("批量获取内容失败:", error)
    throw error
  }
}

// 创建内容
export async function createContent(data: {
  name: string
  description?: string
  content_type: ContentType
  blob_url: string
  thumbnail_url?: string
  metadata?: any
  tags?: string[]
}) {
  try {
    const adapter = await getDbAdapter()

    console.log("创建内容参数:", data)

    const result = await adapter.createContent(data)
    
    console.log("数据库插入结果:", result);
    
    return result
  } catch (error) {
    console.error("创建内容失败:", error)
    throw error
  }
}

// 更新内容
export async function updateContent(
  id: number,
  data: {
    name?: string
    description?: string
    blob_url?: string
    thumbnail_url?: string
    metadata?: any
    tags?: string[]
  },
) {
  try {
    const adapter = await getDbAdapter()

    console.log(`更新内容ID: ${id}, 数据:`, data);
    
    const result = await adapter.updateContent(id, data)
    
    console.log(`更新内容结果:`, result);
    
    return result
  } catch (error) {
    console.error("更新内容失败:", error)
    throw error
  }
}

// 更新内容排序
export async function updateContentSortOrder(id: number, sortOrder: number) {
  try {
    const adapter = await getDbAdapter()
    return await adapter.updateContentSortOrder(id, sortOrder)
  } catch (error) {
    console.error("更新内容排序失败:", error)
    throw error
  }
}

// 删除内容
export async function deleteContent(id: number) {
  try {
    const adapter = await getDbAdapter()

    console.log(`删除内容ID: ${id}`);
    
    const result = await adapter.deleteContent(id)
    
    console.log("删除内容结果:", result);
    
    return result
  } catch (error) {
    console.error("删除内容失败:", error)
    throw error
  }
}

// 记录访问日志
export async function logAccess(data: {
  content_id: number
  access_type: string
  ip_address?: string
  user_agent?: string
}) {
  try {
    // 检查环境变量是否启用访问日志
    if (process.env.ACCESS_LOG_ON !== "1") {
      console.log("访问日志功能未启用，跳过记录");
      return null;
    }
    
    const adapter = await getDbAdapter()

    console.log("记录访问日志:", data);
    
    const result = await adapter.logAccess(data)
    
    console.log("记录访问日志结果:", result);
    
    return result
  } catch (error) {
    console.error("记录访问日志失败:", error)
    // 访问日志失败不应影响主要功能
    return null
  }
}

// 获取站点设置
export async function getSiteSettings(): Promise<SiteSettings | null> {
  try {
    const adapter = await getDbAdapter()

    const result = await adapter.getSiteSettings()
    
    return result
  } catch (error) {
    console.error("获取站点设置失败:", error)
    throw error
  }
}

// 更新站点设置
export async function updateSiteSettings(data: {
  site_name?: string;
  show_download_link?: boolean;
  page_title?: string;
  meta_description?: string;
}): Promise<SiteSettings | null> {
  try {
    const adapter = await getDbAdapter()

    console.log("更新站点设置数据:", data);
    
    const result = await adapter.updateSiteSettings(data)
    
    console.log("更新站点设置结果:", result);
    
    return result
  } catch (error) {
    console.error("更新站点设置失败:", error)
    throw error
  }
}

// 导出数据库适配器实例（用于测试或直接访问）
export function getDatabaseAdapter(): DatabaseAdapter | null {
  return dbAdapter
}
