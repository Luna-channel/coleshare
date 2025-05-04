# Omate Share


一个基于 Next.js 构建的 OMate 资源分发网站，支持多种类型内容的上传、管理和分享。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Feasychen%2Fomateshare&env=DATABASE_URL,BLOB_READ_WRITE_TOKEN,ADMIN_KEY,MEMBER_KEY&envDescription=环境变量配置指南&envLink=https%3A%2F%2Fgithub.com%2Feasychen%2Fomateshare%23%E7%8E%AF%E5%A2%83%E5%8F%98%E9%87%8F)

## 功能特性

- 支持多种内容类型：角色卡、知识库、事件簿、故事书等
- 文件上传与存储（使用Vercel Blob Storage）
- 内容管理和共享
- 响应式设计，支持移动设备访问
- 访问日志记录
- 数据库自动初始化功能

## 技术栈

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- NeonDB (PostgreSQL)
- Vercel Blob Storage

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

在项目根目录创建`.env.local`文件，添加以下环境变量：

```env
# 数据库连接URL (Neon Database)
DATABASE_URL="postgres://username:password@your-neon-db-host/dbname"

# Vercel Blob存储令牌
BLOB_READ_WRITE_TOKEN="your-blob-token"

# 管理员访问令牌
ADMIN_KEY="your-admin-token"

# 会员访问令牌 (可选，如不设置则内容公开)
MEMBER_KEY="your-member-token"
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

| 变量名 | 描述 | 示例 |
|--------|------|------|
| DATABASE_URL | NeonDB数据库连接字符串 | postgres://user:password@host:port/database |
| BLOB_READ_WRITE_TOKEN | Vercel Blob存储读写令牌 | vercel_blob_rw_token123... |
| ADMIN_KEY | 管理员访问令牌 | your_admin_token |
| MEMBER_KEY | 会员访问令牌 (可选) | your_member_token |

## 数据库配置

本项目使用[Neon](https://neon.tech)提供的PostgreSQL数据库。你需要：

1. 在Neon控制台创建一个新项目
2. 获取连接字符串
3. 在环境变量中设置`DATABASE_URL`

## Blob存储配置

本项目使用[Vercel Blob](https://vercel.com/docs/storage/vercel-blob)存储文件。配置步骤：

1. 登录Vercel控制台
2. 进入Storage部分创建一个Blob存储
3. 获取读写令牌
4. 在环境变量中设置`BLOB_READ_WRITE_TOKEN`

## 问题排查

### 数据库连接问题

- 确认DATABASE_URL环境变量格式正确
- 检查Neon数据库是否正常运行
- 检查IP访问限制设置
- 确保数据库用户有创建表的权限

### Blob存储问题

- 确认BLOB_READ_WRITE_TOKEN环境变量有效
- 检查Vercel Blob存储配额是否用尽
- 检查文件大小是否超出限制


## 许可证

GPLv3 