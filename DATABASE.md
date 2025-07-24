# 数据库和存储支持

本项目现在支持多种数据库类型和存储方式，包括 PostgreSQL、SQLite 数据库，以及 Vercel Blob、Cloudflare R2、本地文件系统存储。

## 支持的数据库

### PostgreSQL (Neon Database)
原有的 PostgreSQL 支持，适合生产环境使用。

```bash
DATABASE_URL="postgres://username:password@your-neon-db-host/dbname"
```

### SQLite
新增的 SQLite 支持，适合开发环境和小型部署。

```bash
DATABASE_URL="sqlite://./data/database.db"
```

## 支持的存储方式

### Vercel Blob (默认)
原有的 Vercel Blob 存储，适合生产环境使用。

```bash
STORAGE_TYPE="vercel"
BLOB_READ_WRITE_TOKEN="your-blob-token"
```

### Cloudflare R2
高性能对象存储，适合大规模部署。

```bash
STORAGE_TYPE="r2"
R2_ACCOUNT_ID="your_account_id"
R2_ACCESS_KEY_ID="your_access_key_id"
R2_SECRET_ACCESS_KEY="your_secret_access_key"
R2_BUCKET_NAME="your_bucket_name"
R2_PUBLIC_URL="https://your-bucket.your-domain.com"
```

### 本地文件系统
新增的本地存储支持，适合开发环境和小型部署。

```bash
STORAGE_TYPE="local"
LOCAL_STORAGE_DIR="./public/uploads"
LOCAL_STORAGE_URL_PREFIX="/uploads"
```

## 配置方法

1. 复制环境变量示例文件：
```bash
cp env.example .env.local
```

2. 编辑 `.env.local` 文件，设置 `DATABASE_URL`：

**使用 PostgreSQL：**
```bash
DATABASE_URL="postgres://username:password@your-neon-db-host/dbname"
```

**使用 SQLite：**
```bash
DATABASE_URL="sqlite://./data/database.db"
```

## 数据库初始化

数据库会在应用启动时自动初始化。如果数据库文件或表不存在，系统会自动创建。

### SQLite 特殊说明

- SQLite 数据库文件会自动创建在指定路径
- 如果目录不存在，会自动创建目录结构
- 数据存储在本地文件系统中

## 测试数据库连接

### 测试 SQLite
```bash
npm run test:sqlite
```

这个命令会：
1. 创建一个测试 SQLite 数据库
2. 测试所有基本数据库操作
3. 验证数据库功能是否正常

### 测试本地存储
```bash
npm run test:local-storage
```

这个命令会：
1. 测试本地文件系统存储功能
2. 验证文件上传和删除操作
3. 测试缩略图生成功能

## 数据库架构

项目使用适配器模式支持多种数据库：

```
lib/
├── db.ts              # 主要数据库接口
├── db-adapter.ts      # 数据库适配器接口
├── db-factory.ts      # 数据库工厂类
├── postgres-adapter.ts # PostgreSQL 适配器
└── sqlite-adapter.ts   # SQLite 适配器
```

## 数据库表结构

所有数据库类型都使用相同的表结构：

### contents 表
- `id`: 主键
- `uuid`: 唯一标识符
- `name`: 内容名称
- `description`: 内容描述
- `content_type`: 内容类型（枚举）
- `blob_url`: 文件URL
- `thumbnail_url`: 缩略图URL
- `metadata`: 元数据（JSON）
- `tags`: 标签数组
- `sort_order`: 排序顺序
- `created_at`: 创建时间
- `updated_at`: 更新时间

### access_logs 表
- `id`: 主键
- `content_id`: 关联内容ID
- `access_type`: 访问类型
- `ip_address`: IP地址
- `user_agent`: 用户代理
- `created_at`: 创建时间

### site_settings 表
- `id`: 主键
- `site_name`: 站点名称
- `show_download_link`: 是否显示下载链接
- `page_title`: 页面标题
- `meta_description`: 元描述
- `created_at`: 创建时间
- `updated_at`: 更新时间

## 迁移指南

### 从 PostgreSQL 迁移到 SQLite

1. 导出现有数据（如需要）
2. 更改 `DATABASE_URL` 为 SQLite 格式
3. 重启应用，数据库会自动初始化
4. 导入数据（如需要）

### 从 SQLite 迁移到 PostgreSQL

1. 设置 PostgreSQL 数据库
2. 导出 SQLite 数据（如需要）
3. 更改 `DATABASE_URL` 为 PostgreSQL 格式
4. 重启应用，数据库会自动初始化
5. 导入数据（如需要）

## 性能考虑

### 数据库性能

**PostgreSQL**
- 适合高并发访问
- 支持复杂查询
- 适合生产环境
- 需要外部数据库服务

**SQLite**
- 适合单用户或低并发
- 文件系统存储
- 适合开发和测试
- 无需外部服务
- 部署简单

### 存储性能

**Vercel Blob**
- 全球CDN加速
- 高可用性
- 适合生产环境
- 按使用量计费

**Cloudflare R2**
- 高性能对象存储
- 全球分布
- 成本效益高
- 适合大规模部署

**本地文件系统**
- 最快的读写速度
- 无网络延迟
- 适合开发和小型部署
- 需要考虑备份和容灾
- 不支持多服务器部署

## 故障排除

### SQLite 常见问题

1. **权限错误**：确保应用有写入数据库文件目录的权限
2. **文件锁定**：确保没有其他进程在使用数据库文件
3. **路径问题**：使用绝对路径或确保相对路径正确

### 本地存储常见问题

1. **权限错误**：确保应用有写入存储目录的权限
2. **磁盘空间不足**：检查存储目录所在磁盘的可用空间
3. **路径问题**：确保存储目录路径正确且可访问
4. **文件访问失败**：检查Next.js静态文件服务配置

### PostgreSQL 常见问题

1. **连接失败**：检查数据库URL和网络连接
2. **权限错误**：确保数据库用户有足够权限
3. **SSL问题**：检查SSL配置

## 开发建议

### 数据库选择
1. **开发环境**：推荐使用 SQLite，简单快速
2. **测试环境**：可以使用 SQLite 或 PostgreSQL
3. **生产环境**：推荐使用 PostgreSQL，性能和可靠性更好

### 存储方式选择
1. **开发环境**：推荐使用本地文件系统存储，快速便捷
2. **测试环境**：可以使用本地存储或云存储
3. **生产环境**：推荐使用 Vercel Blob 或 Cloudflare R2

### 组合建议
- **快速开发**：SQLite + 本地存储
- **生产部署**：PostgreSQL + Vercel Blob
- **高性能部署**：PostgreSQL + Cloudflare R2
- **简单部署**：SQLite + 本地存储（适合单机部署）

### 备份策略
1. **数据库备份**：定期备份数据库文件（SQLite）或数据库（PostgreSQL）
2. **文件备份**：定期备份上传的文件（本地存储时）
3. **云存储**：Vercel Blob 和 R2 自带高可用性，但仍建议定期备份重要数据