import Database from 'better-sqlite3'
import { nanoid } from "nanoid"
import { DatabaseAdapter } from './db-adapter'
import { ContentType } from './db'
import { existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'

export class SQLiteAdapter implements DatabaseAdapter {
  private db: Database.Database | null = null
  private dbPath: string

  constructor(dbPath: string) {
    this.dbPath = dbPath
  }

  async connect(): Promise<void> {
    try {
      // 确保数据库文件的目录存在
      const dir = dirname(this.dbPath)
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
      
      this.db = new Database(this.dbPath)
      
      // 启用外键约束
      this.db.pragma('foreign_keys = ON')
      
      console.log("SQLite数据库连接初始化成功")
    } catch (error) {
      console.error("SQLite数据库连接初始化失败:", error)
      throw error
    }
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }

  async checkAndInitDatabase(): Promise<void> {
    if (!this.db) {
      throw new Error("数据库连接未初始化")
    }

    try {
      console.log("正在检查SQLite数据库结构...")
      
      // 检查contents表是否存在
      const tableExists = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='contents'
      `).get()
      
      if (tableExists) {
        console.log("数据库结构已存在，无需初始化")
        return
      }
      
      console.log("数据库表不存在，开始初始化...")
      
      // 1. 创建contents表
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS contents (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uuid TEXT UNIQUE,
          name TEXT NOT NULL,
          description TEXT,
          content_type TEXT NOT NULL CHECK (content_type IN (
            'character_card',
            'knowledge_base', 
            'event_book',
            'prompt_injection',
            'story_book',
            'other'
          )),
          blob_url TEXT NOT NULL,
          thumbnail_url TEXT,
          metadata TEXT,
          tags TEXT,
          sort_order INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)
      
      // 2. 创建access_logs表
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS access_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content_id INTEGER REFERENCES contents(id),
          access_type TEXT NOT NULL,
          ip_address TEXT,
          user_agent TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)
      
      // 3. 创建site_settings表
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS site_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          site_name TEXT DEFAULT 'OMateShare',
          show_download_link INTEGER DEFAULT 1,
          page_title TEXT DEFAULT 'OMateShare',
          meta_description TEXT DEFAULT '管理角色卡、知识库、事件书和提示注入',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)
      
      // 4. 检查site_settings表是否有记录，没有则插入默认记录
      const settingsExist = this.db.prepare(`
        SELECT COUNT(*) as count FROM site_settings
      `).get() as { count: number }
      
      if (settingsExist.count === 0) {
        this.db.prepare(`
          INSERT INTO site_settings (site_name, show_download_link, page_title, meta_description)
          VALUES (?, ?, ?, ?)
        `).run('OMateShare', 1, 'OMateShare', '管理角色卡、知识库、事件书和提示注入')
      }
      
      // 5. 创建索引
      this.db.exec(`CREATE INDEX IF NOT EXISTS idx_contents_content_type ON contents(content_type)`)
      this.db.exec(`CREATE INDEX IF NOT EXISTS idx_access_logs_content_id ON access_logs(content_id)`)
      this.db.exec(`CREATE INDEX IF NOT EXISTS idx_contents_created_at ON contents(created_at)`)
      this.db.exec(`CREATE INDEX IF NOT EXISTS idx_contents_updated_at ON contents(updated_at)`)
      
      console.log("SQLite数据库初始化完成！")
    } catch (error) {
      console.error("SQLite数据库初始化失败:", error)
      throw error
    }
  }

  async getContents(type?: ContentType): Promise<any[]> {
    if (!this.db) {
      throw new Error("数据库连接未初始化")
    }

    let query = `
      SELECT * FROM contents 
      ORDER BY 
        CASE WHEN sort_order IS NULL THEN 1 ELSE 0 END,
        sort_order ASC,
        updated_at DESC
    `
    
    if (type) {
      query = `
        SELECT * FROM contents 
        WHERE content_type = ?
        ORDER BY 
          CASE WHEN sort_order IS NULL THEN 1 ELSE 0 END,
          sort_order ASC,
          updated_at DESC
      `
      return this.db.prepare(query).all(type).map(this.parseRow)
    } else {
      return this.db.prepare(query).all().map(this.parseRow)
    }
  }

  async getContent(id: number): Promise<any | null> {
    if (!this.db) {
      throw new Error("数据库连接未初始化")
    }

    const result = this.db.prepare(`
      SELECT * FROM contents WHERE id = ?
    `).get(id)
    
    return result ? this.parseRow(result) : null
  }

  async createContent(data: {
    name: string
    description?: string
    content_type: ContentType
    blob_url: string
    thumbnail_url?: string
    metadata?: any
    tags?: string[]
  }): Promise<any> {
    if (!this.db) {
      throw new Error("数据库连接未初始化")
    }

    const uuid = nanoid(21)
    const metadata = data.metadata ? JSON.stringify(data.metadata) : null
    const tags = data.tags ? JSON.stringify(data.tags) : null
    
    const stmt = this.db.prepare(`
      INSERT INTO contents (
        uuid, name, description, content_type, blob_url, 
        thumbnail_url, metadata, tags
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    const result = stmt.run(
      uuid,
      data.name,
      data.description || "",
      data.content_type,
      data.blob_url,
      data.thumbnail_url || null,
      metadata,
      tags
    )
    
    if (result.lastInsertRowid) {
      return await this.getContent(Number(result.lastInsertRowid))
    }
    
    throw new Error("创建内容失败")
  }

  async updateContent(id: number, data: {
    name?: string
    description?: string
    blob_url?: string
    thumbnail_url?: string
    metadata?: any
    tags?: string[]
  }): Promise<any | null> {
    if (!this.db) {
      throw new Error("数据库连接未初始化")
    }

    const updates: string[] = []
    const values: any[] = []

    if (data.name !== undefined) {
      updates.push('name = ?')
      values.push(data.name)
    }
    if (data.description !== undefined) {
      updates.push('description = ?')
      values.push(data.description)
    }
    if (data.blob_url !== undefined) {
      updates.push('blob_url = ?')
      values.push(data.blob_url)
    }
    if (data.thumbnail_url !== undefined) {
      updates.push('thumbnail_url = ?')
      values.push(data.thumbnail_url)
    }
    if (data.metadata !== undefined) {
      updates.push('metadata = ?')
      values.push(data.metadata ? JSON.stringify(data.metadata) : null)
    }
    if (data.tags !== undefined) {
      updates.push('tags = ?')
      values.push(data.tags ? JSON.stringify(data.tags) : null)
    }

    if (updates.length === 0) {
      return await this.getContent(id)
    }

    updates.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    const query = `
      UPDATE contents 
      SET ${updates.join(', ')}
      WHERE id = ?
    `
    
    this.db.prepare(query).run(...values)
    
    return await this.getContent(id)
  }

  async deleteContent(id: number): Promise<any | null> {
    if (!this.db) {
      throw new Error("数据库连接未初始化")
    }

    // 先获取要删除的内容
    const content = await this.getContent(id)
    
    if (!content) {
      return null
    }

    // 先删除关联的访问日志记录
    this.db.prepare(`
      DELETE FROM access_logs WHERE content_id = ?
    `).run(id)
    
    // 然后删除内容本身
    this.db.prepare(`
      DELETE FROM contents WHERE id = ?
    `).run(id)
    
    return content
  }

  async logAccess(data: {
    content_id: number
    access_type: string
    ip_address?: string
    user_agent?: string
  }): Promise<any | null> {
    if (process.env.ACCESS_LOG_ON !== "1") {
      return null
    }
    
    if (!this.db) {
      throw new Error("数据库连接未初始化")
    }

    const stmt = this.db.prepare(`
      INSERT INTO access_logs (
        content_id, access_type, ip_address, user_agent
      )
      VALUES (?, ?, ?, ?)
    `)
    
    const result = stmt.run(
      data.content_id,
      data.access_type,
      data.ip_address || null,
      data.user_agent || null
    )
    
    if (result.lastInsertRowid) {
      return { id: Number(result.lastInsertRowid) }
    }
    
    return null
  }

  async getSiteSettings(): Promise<any | null> {
    if (!this.db) {
      throw new Error("数据库连接未初始化")
    }

    const result = this.db.prepare(`
      SELECT * FROM site_settings 
      ORDER BY id ASC 
      LIMIT 1
    `).get()
    
    if (result) {
      return {
        ...result,
        show_download_link: Boolean((result as any).show_download_link)
      }
    }
    
    return null
  }

  async updateSiteSettings(data: {
    site_name?: string
    show_download_link?: boolean
    page_title?: string
    meta_description?: string
  }): Promise<any | null> {
    if (!this.db) {
      throw new Error("数据库连接未初始化")
    }

    const currentSettings = await this.getSiteSettings()
    const id = currentSettings?.id || 1
    
    const updates: string[] = []
    const values: any[] = []

    if (data.site_name !== undefined) {
      updates.push('site_name = ?')
      values.push(data.site_name)
    }
    if (data.show_download_link !== undefined) {
      updates.push('show_download_link = ?')
      values.push(data.show_download_link ? 1 : 0)
    }
    if (data.page_title !== undefined) {
      updates.push('page_title = ?')
      values.push(data.page_title)
    }
    if (data.meta_description !== undefined) {
      updates.push('meta_description = ?')
      values.push(data.meta_description)
    }

    if (updates.length === 0) {
      return currentSettings
    }

    updates.push('updated_at = CURRENT_TIMESTAMP')
    values.push(id)

    const query = `
      UPDATE site_settings 
      SET ${updates.join(', ')}
      WHERE id = ?
    `
    
    this.db.prepare(query).run(...values)
    
    return await this.getSiteSettings()
  }

  // 辅助方法：解析SQLite行数据
  private parseRow(row: any): any {
    if (!row) return row
    
    const parsed = { ...row }
    
    // 解析JSON字段
    if (parsed.metadata && typeof parsed.metadata === 'string') {
      try {
        parsed.metadata = JSON.parse(parsed.metadata)
      } catch (e) {
        parsed.metadata = null
      }
    }
    
    if (parsed.tags && typeof parsed.tags === 'string') {
      try {
        parsed.tags = JSON.parse(parsed.tags)
      } catch (e) {
        parsed.tags = []
      }
    }
    
    return parsed
  }
}