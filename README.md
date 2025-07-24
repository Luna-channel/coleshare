# Omate Share


一个基于 Next.js 构建的 OMate 资源分发网站，支持多种类型内容的上传、管理和分享。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Feasychen%2Fomateshare&env=DATABASE_URL,BLOB_READ_WRITE_TOKEN,ADMIN_KEY,MEMBER_KEY&envDescription=环境变量配置指南&envLink=https%3A%2F%2Fgithub.com%2Feasychen%2Fomateshare%23%E7%8E%AF%E5%A2%83%E5%8F%98%E9%87%8F)

## 功能特性

- 支持多种内容类型：角色卡、知识库、事件簿、故事书等
- 多种存储方案：本地文件存储、Vercel Blob、Cloudflare R2
- 多种数据库支持：SQLite（本地开发）、PostgreSQL（生产环境）
- 内容管理和共享
- 响应式设计，支持移动设备访问
- 访问日志记录
- 数据库自动初始化功能
- 本地化开发支持，无需外部服务即可运行

## 技术栈

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- 数据库：SQLite（本地开发）/ PostgreSQL（生产环境，推荐 NeonDB）
- 存储：本地文件系统（开发）/ Vercel Blob（生产，默认）/ Cloudflare R2（可选）

## 安装指南

### 本地开发环境设置

1. 克隆代码库

```bash
git clone https://github.com/easychen/omateshare.git
cd omateshare
```

2. 安装依赖

```bash
# 使用npm
npm install

# 使用pnpm
pnpm install

# 使用Yarn
yarn install
```

3. 创建并配置环境变量文件

在项目根目录创建`.env.local`文件，根据需要选择配置方案：

#### 方案一：本地化开发（推荐用于开发环境）

使用 SQLite 数据库和本地文件存储，无需外部服务：

```env
# 数据库配置 - 使用本地 SQLite
DATABASE_URL="sqlite://./data/database.db"

# 存储配置 - 使用本地文件系统
STORAGE_TYPE="local"

# 管理员访问令牌
ADMIN_KEY="your-admin-token"

# 会员访问令牌 (可选，如不设置则内容公开)
MEMBER_KEY="your-member-token"

# 网站URL (开发环境)
NEXT_PUBLIC_URL="http://localhost:3000"

# 访问日志开关 (可选，设为1开启日志记录，默认为0不记录)
ACCESS_LOG_ON="0"
```

#### 方案二：云服务配置（用于生产环境或需要云服务的开发）

使用 PostgreSQL 数据库和 Vercel Blob 存储：

```env
# 数据库连接URL (Neon Database)
DATABASE_URL="postgres://username:password@your-neon-db-host/dbname"

# 存储配置 - 使用 Vercel Blob
STORAGE_TYPE="vercel"
BLOB_READ_WRITE_TOKEN="your-blob-token"

# Vercel Blob存储前缀 (可选，用于多项目共享存储，默认为"oshare")
BLOB_PREFIX="oshare"

# 管理员访问令牌
ADMIN_KEY="your-admin-token"

# 会员访问令牌 (可选，如不设置则内容公开)
MEMBER_KEY="your-member-token"

# 访问日志开关 (可选，设为1开启日志记录，默认为0不记录)
ACCESS_LOG_ON="0"
```

4. 启动开发服务器

```bash
npm run dev
# 或
pnpm dev
# 或
yarn dev
```

访问 http://localhost:3000 查看应用。

## 部署到Vercel

### 前提条件

在部署前，你需要准备：

1. [Neon数据库](https://neon.tech)账号并创建数据库
2. [Vercel](https://vercel.com)账号

### 部署步骤

#### 方式1：使用Deploy按钮

点击上方的"Deploy with Vercel"按钮，按照提示操作。

#### 方式2：手动部署

1. 将代码推送到GitHub/GitLab仓库
2. 在Vercel控制台中导入项目
3. 配置所需环境变量
4. 部署应用

### 数据库初始化

部署后，有两种方式初始化数据库：

#### 方式1：管理员界面初始化（推荐）

1. 访问应用首页并使用ADMIN_KEY登录
2. 登录后，会在右下角显示数据库管理面板
3. 点击"初始化数据库"按钮

#### 方式2：API初始化

直接访问初始化API：`https://你的域名/api/init-db`

## 环境变量说明

### 核心配置

| 变量名 | 描述 | 示例 |
|--------|------|------|
| ADMIN_KEY | 管理员访问令牌 | your_admin_token |
| MEMBER_KEY | 会员访问令牌 (可选) | your_member_token |
| NEXT_PUBLIC_URL | 网站公开访问URL | http://localhost:3000 |
| ACCESS_LOG_ON | 是否记录访问日志 (可选，默认为0不记录) | 1 |

### 数据库配置

| 变量名 | 描述 | 示例 |
|--------|------|------|
| DATABASE_URL | 数据库连接字符串 | sqlite://./data/database.db 或 postgres://user:password@host:port/database |

### 存储配置

| 变量名 | 描述 | 示例 |
|--------|------|------|
| STORAGE_TYPE | 存储类型 (local/vercel/r2) | local |
| LOCAL_STORAGE_DIR | 本地存储目录 (可选，默认为./public/uploads) | ./public/uploads |
| LOCAL_STORAGE_URL_PREFIX | 本地存储URL前缀 (可选，默认为/uploads) | /uploads |
| BLOB_READ_WRITE_TOKEN | Vercel Blob存储读写令牌 | vercel_blob_rw_token123... |
| BLOB_PREFIX | Vercel Blob存储前缀 (可选) | oshare |
| R2_ACCOUNT_ID | Cloudflare R2账号ID | your_account_id |
| R2_ACCESS_KEY_ID | Cloudflare R2访问密钥ID | your_access_key_id |
| R2_SECRET_ACCESS_KEY | Cloudflare R2访问密钥 | your_secret_access_key |
| R2_BUCKET_NAME | Cloudflare R2存储桶名称 | your_bucket_name |
| R2_PUBLIC_URL | Cloudflare R2公开访问URL | https://your-bucket.r2.dev |

## 数据库配置

本项目支持两种数据库配置方案：

### 方案一：本地 SQLite 数据库（推荐用于开发环境）

使用本地 SQLite 数据库，无需外部服务：

```env
DATABASE_URL="sqlite://./data/database.db"
```

**优点：**
- 无需配置外部数据库服务
- 快速启动开发环境
- 数据存储在本地，便于调试
- 零成本

**注意事项：**
- 仅适用于开发环境和小型部署
- 不支持多服务器部署
- 需要定期备份数据文件

### 方案二：PostgreSQL 数据库（推荐用于生产环境）

本项目使用[Neon](https://neon.tech)提供的PostgreSQL数据库。你需要：

1. 在Neon控制台创建一个新项目
2. 获取连接字符串
3. 在环境变量中设置`DATABASE_URL`

```env
DATABASE_URL="postgres://username:password@your-neon-db-host/dbname"
```

## 存储配置

本项目支持多种存储方案：

### 方案一：本地文件存储（推荐用于开发环境）

使用本地文件系统存储上传的文件：

```env
STORAGE_TYPE="local"
LOCAL_STORAGE_DIR="./public/uploads"  # 可选，默认值
LOCAL_STORAGE_URL_PREFIX="/uploads"   # 可选，默认值
```

**优点：**
- 无需配置外部存储服务
- 最快的读写速度
- 零成本
- 便于开发调试

**注意事项：**
- 仅适用于开发环境和单机部署
- 需要定期备份文件
- 不支持多服务器部署

### 方案二：Vercel Blob 存储（推荐用于生产环境）

本项目使用[Vercel Blob](https://vercel.com/docs/storage/vercel-blob)存储文件。配置步骤：

1. 登录Vercel控制台
2. 进入Storage部分创建一个Blob存储
3. 获取读写令牌
4. 在环境变量中设置相关配置

```env
STORAGE_TYPE="vercel"
BLOB_READ_WRITE_TOKEN="your-blob-token"
BLOB_PREFIX="oshare"  # 可选，存储前缀
```

## 存储服务配置

本项目支持两种存储后端：
- Vercel Blob Storage
- Cloudflare R2 Storage

### 环境变量配置

1. 存储类型选择：
```env
# 可选值：vercel 或 r2
STORAGE_TYPE=vercel
```

2. Vercel Blob 配置（当 STORAGE_TYPE=vercel 时）：
```env
# 存储路径前缀，默认为 "oshare/"
BLOB_PREFIX=oshare
```

3. Cloudflare R2 配置（当 STORAGE_TYPE=r2 时）：
```env
# Cloudflare 账号 ID（S3 API URL的前缀）
R2_ACCOUNT_ID=your_account_id

# R2 API 访问密钥
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key

# R2 存储桶名称
R2_BUCKET_NAME=your_bucket_name

# R2 存储桶的公共访问 URL
R2_PUBLIC_URL=https://your-bucket.r2.dev
```

### 使用方法

1. 上传文件：
```typescript
import { uploadFile } from '@/lib/storage'

// 上传文件
const result = await uploadFile(file, contentType, filename)
// 返回结果包含：
// - url: 文件访问地址
// - thumbnailUrl: 缩略图地址（仅图片文件）
```

2. 删除文件：
```typescript
import { deleteFile } from '@/lib/storage'

// 删除文件
const success = await deleteFile(fileUrl)
```

### 支持的文件类型

系统预定义了以下文件类型：
- `character_card`: PNG 格式的角色卡图片
- `knowledge_base`: TXT 格式的知识库文件
- `event_book`: JSON 格式的事件书文件
- `prompt_injection`: JSON 格式的提示词注入文件

其他文件类型将使用原始文件扩展名。

### 缩略图功能

- 对于 `character_card` 类型的文件，系统会自动生成 JPG 格式的缩略图
- 其他图片文件（PNG、JPG、JPEG、GIF、WEBP、SVG）将使用原图作为缩略图
- 非图片文件不会生成缩略图

## 问题排查

### 本地化配置问题

**SQLite 数据库问题：**
- 确认 `data/` 目录存在且有写入权限
- 检查磁盘空间是否充足
- 确认 DATABASE_URL 格式：`sqlite://./data/database.db`

**本地存储问题：**
- 确认 `public/uploads/` 目录存在且有写入权限：`chmod 755 public/uploads`
- 检查磁盘空间：`df -h`
- 确认 STORAGE_TYPE 设置为 `local`
- 验证文件是否正确保存到指定目录

**测试本地配置：**
```bash
# 测试本地存储功能
npm run test:local-storage

# 检查数据库连接
npm run test:sqlite
```

### 云服务配置问题

**PostgreSQL 数据库连接问题：**
- 确认DATABASE_URL环境变量格式正确
- 检查Neon数据库是否正常运行
- 检查IP访问限制设置
- 确保数据库用户有创建表的权限

**Vercel Blob存储问题：**
- 确认BLOB_READ_WRITE_TOKEN环境变量有效
- 检查Vercel Blob存储配额是否用尽
- 检查文件大小是否超出限制
- 确认 STORAGE_TYPE 设置为 `vercel`

**Cloudflare R2存储问题：**
- 验证所有 R2 相关环境变量
- 检查 bucket 权限设置
- 确认公开访问 URL 配置正确
- 确认 STORAGE_TYPE 设置为 `r2`


## 详细配置文档

- [存储配置指南](./STORAGE.md) - 详细的存储配置说明和最佳实践
- [数据库配置指南](./DATABASE.md) - 数据库配置和故障排除

## 许可证

GPLv3