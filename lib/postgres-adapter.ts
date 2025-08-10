import { neon } from "@neondatabase/serverless"
import { nanoid } from "nanoid"
import { DatabaseAdapter } from './db-adapter'
import { ContentType } from './db'

export class PostgresAdapter implements DatabaseAdapter {
  private sqlClient: any = null
  private connectionUrl: string

  constructor(connectionUrl: string) {
    this.connectionUrl = connectionUrl
  }

  async connect(): Promise<void> {
    try {
      this.sqlClient = neon(this.connectionUrl)
      console.log("PostgreSQL数据库连接初始化成功")
    } catch (error) {
      console.error("PostgreSQL数据库连接初始化失败:", error)
      throw error
    }
  }

  async disconnect(): Promise<void> {
    // Neon serverless 不需要显式断开连接
    this.sqlClient = null
  }

  async checkAndInitDatabase(): Promise<void> {
    try {
      console.log("正在检查PostgreSQL数据库结构...")
      
      // 检查contents表是否存在
      const tableExists = await this.sqlClient`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = 'contents'
        ) as exists
      `
      
      if (tableExists[0]?.exists) {
        console.log("数据库结构已存在，无需初始化")
        return
      }
      
      console.log("数据库表不存在，开始初始化...")
      
      // 1. 创建content_type枚举类型
      await this.sqlClient`
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_type') THEN
                CREATE TYPE content_type AS ENUM (
                  'character_card',
                  'knowledge_base',
                  'event_book',
                  'prompt_injection',
                  'story_book',
                  'other'
                );
            END IF;
        END$$;
      `
      
      // 2. 创建contents表
      await this.sqlClient`
        CREATE TABLE IF NOT EXISTS contents (
          id SERIAL PRIMARY KEY,
          uuid VARCHAR(36) UNIQUE,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          content_type content_type NOT NULL,
          blob_url TEXT NOT NULL,
          thumbnail_url TEXT,
          metadata JSONB,
          tags TEXT[],
          sort_order INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `
      
      // 3. 创建access_logs表
      await this.sqlClient`
        CREATE TABLE IF NOT EXISTS access_logs (
          id SERIAL PRIMARY KEY,
          content_id INTEGER REFERENCES contents(id),
          access_type VARCHAR(50) NOT NULL,
          ip_address VARCHAR(100),
          user_agent TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `
      
      // 4. 创建site_settings表
      await this.sqlClient`
        CREATE TABLE IF NOT EXISTS site_settings (
          id SERIAL PRIMARY KEY,
          site_name VARCHAR(255) DEFAULT 'OMateShare',
          show_download_link BOOLEAN DEFAULT true,
          page_title VARCHAR(255) DEFAULT 'OMateShare',
          meta_description TEXT DEFAULT '管理角色卡、知识库、事件书和提示注入',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `
      
      // 5. 检查site_settings表是否有记录，没有则插入默认记录
      const settingsExist = await this.sqlClient`
        SELECT COUNT(*) FROM site_settings
      `
      
      if (parseInt(settingsExist[0].count) === 0) {
        await this.sqlClient`
          INSERT INTO site_settings (site_name, show_download_link, page_title, meta_description)
          VALUES ('OMateShare', true, 'OMateShare', '管理角色卡、知识库、事件书和提示注入')
        `
      }
      
      // 6. 创建索引
      await this.sqlClient`CREATE INDEX IF NOT EXISTS idx_contents_content_type ON contents(content_type);`
      await this.sqlClient`CREATE INDEX IF NOT EXISTS idx_access_logs_content_id ON access_logs(content_id);`
      await this.sqlClient`CREATE INDEX IF NOT EXISTS idx_contents_created_at ON contents(created_at);`
      await this.sqlClient`CREATE INDEX IF NOT EXISTS idx_contents_updated_at ON contents(updated_at);`
      
      console.log("PostgreSQL数据库初始化完成！")
    } catch (error) {
      console.error("PostgreSQL数据库初始化失败:", error)
      throw error
    }
  }

  async getContents(type?: ContentType): Promise<any[]> {
    if (!this.sqlClient) {
      throw new Error("数据库连接未初始化")
    }

    if (type) {
      return await this.sqlClient`
        SELECT * FROM contents 
        WHERE content_type = ${type} 
        ORDER BY sort_order ASC NULLS LAST, updated_at DESC
      `
    } else {
      return await this.sqlClient`
        SELECT * FROM contents 
        ORDER BY sort_order ASC NULLS LAST, updated_at DESC
      `
    }
  }

  async getContent(id: number): Promise<any | null> {
    if (!this.sqlClient) {
      throw new Error("数据库连接未初始化")
    }

    const result = await this.sqlClient`
      SELECT * FROM contents 
      WHERE id = ${id}
    `
    
    if (Array.isArray(result) && result.length > 0) {
      return result[0]
    }
    return null
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
    if (!this.sqlClient) {
      throw new Error("数据库连接未初始化")
    }

    const uuid = nanoid(21)
    const metadata = data.metadata ? JSON.stringify(data.metadata) : null
    
    const result = await this.sqlClient`
      INSERT INTO contents (
        uuid, name, description, content_type, blob_url, 
        thumbnail_url, metadata, tags
      )
      VALUES (
        ${uuid},
        ${data.name}, 
        ${data.description || ""}, 
        ${data.content_type}, 
        ${data.blob_url}, 
        ${data.thumbnail_url || null}, 
        ${metadata}, 
        ${data.tags || []}
      )
      RETURNING *
    `
    
    if (Array.isArray(result) && result.length > 0) {
      return result[0]
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
    if (!this.sqlClient) {
      throw new Error("数据库连接未初始化")
    }

    // 构建更新字段
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`)
      values.push(data.name)
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`)
      values.push(data.description)
    }
    if (data.blob_url !== undefined) {
      updates.push(`blob_url = $${paramIndex++}`)
      values.push(data.blob_url)
    }
    if (data.thumbnail_url !== undefined) {
      updates.push(`thumbnail_url = $${paramIndex++}`)
      values.push(data.thumbnail_url)
    }
    if (data.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`)
      values.push(data.metadata ? JSON.stringify(data.metadata) : null)
    }
    if (data.tags !== undefined) {
      updates.push(`tags = $${paramIndex++}`)
      values.push(data.tags)
    }

    if (updates.length === 0) {
      return await this.getContent(id)
    }

    updates.push('updated_at = CURRENT_TIMESTAMP')

    // 使用neon的标签模板语法进行更新
    let result
    if (data.name !== undefined) {
      result = await this.sqlClient`
        UPDATE contents
        SET name = ${data.name}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *
      `
    }
    // 为其他字段添加类似的更新逻辑...
    
    return await this.getContent(id)
  }

  async deleteContent(id: number): Promise<any | null> {
    if (!this.sqlClient) {
      throw new Error("数据库连接未初始化")
    }

    // 先删除关联的访问日志记录
    await this.sqlClient`
      DELETE FROM access_logs 
      WHERE content_id = ${id}
    `
    
    // 然后删除内容本身
    const result = await this.sqlClient`
      DELETE FROM contents 
      WHERE id = ${id} 
      RETURNING *
    `
    
    if (Array.isArray(result) && result.length > 0) {
      return result[0]
    }
    return null
  }

  async updateContentSortOrder(id: number, sortOrder: number): Promise<any | null> {
    if (!this.sqlClient) {
      throw new Error("数据库连接未初始化")
    }

    try {
      const result = await this.sqlClient`
        UPDATE contents 
        SET sort_order = ${sortOrder}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *
      `
      
      return result[0] || null
    } catch (error) {
      console.error("更新内容排序失败:", error)
      throw error
    }
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
    
    if (!this.sqlClient) {
      throw new Error("数据库连接未初始化")
    }

    const result = await this.sqlClient`
      INSERT INTO access_logs (
        content_id, access_type, ip_address, user_agent
      )
      VALUES (
        ${data.content_id}, ${data.access_type}, ${data.ip_address || null}, ${data.user_agent || null}
      )
      RETURNING id
    `
    
    if (Array.isArray(result) && result.length > 0) {
      return result[0]
    }
    return null
  }

  async getSiteSettings(): Promise<any | null> {
    if (!this.sqlClient) {
      throw new Error("数据库连接未初始化")
    }

    const result = await this.sqlClient`
      SELECT * FROM site_settings 
      ORDER BY id ASC 
      LIMIT 1
    `
    
    if (Array.isArray(result) && result.length > 0) {
      const settings = result[0]
      return {
        ...settings,
        show_download_link: Boolean(settings.show_download_link)
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
    if (!this.sqlClient) {
      throw new Error("数据库连接未初始化")
    }

    const currentSettings = await this.getSiteSettings()
    const id = currentSettings?.id || 1
    
    // 简化更新逻辑，使用单个查询
    if (data.site_name !== undefined && data.show_download_link !== undefined && 
        data.page_title !== undefined && data.meta_description !== undefined) {
      const result = await this.sqlClient`
        UPDATE site_settings
        SET site_name = ${data.site_name}, 
            show_download_link = ${data.show_download_link},
            page_title = ${data.page_title},
            meta_description = ${data.meta_description},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *
      `
      
      if (Array.isArray(result) && result.length > 0) {
        const settings = result[0]
        return {
          ...settings,
          show_download_link: Boolean(settings.show_download_link)
        }
      }
    }
    
    return null
  }
}