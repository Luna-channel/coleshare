import { DatabaseAdapter, DatabaseType, parseDatabaseUrl } from './db-adapter'

export class DatabaseFactory {
  static createAdapter(databaseUrl: string): DatabaseAdapter {
    // 确保只在服务器端运行
    if (typeof window !== 'undefined') {
      throw new Error('Database adapters can only be created on the server side')
    }
    
    const { type, config } = parseDatabaseUrl(databaseUrl)
    
    switch (type) {
      case DatabaseType.POSTGRES: {
        const { PostgresAdapter } = require('./postgres-adapter')
        return new PostgresAdapter(config.url)
      }
      
      case DatabaseType.SQLITE: {
        const { SQLiteAdapter } = require('./sqlite-adapter')
        return new SQLiteAdapter(config.path)
      }
      
      default:
        throw new Error(`不支持的数据库类型: ${type}`)
    }
  }
}