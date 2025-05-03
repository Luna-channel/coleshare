# 安装指南

## 快速部署

[![使用Vercel部署](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgitlab.com%2Feasychen%2Fomateshare&env=DATABASE_URL,BLOB_READ_WRITE_TOKEN,ADMIN_KEY,MEMBER_KEY&envDescription=环境变量配置指南&envLink=https%3A%2F%2Fgitlab.com%2Feasychen%2Fomateshare%23%E7%8E%AF%E5%A2%83%E5%8F%98%E9%87%8F)

点击上方按钮，可一键部署到Vercel平台。应用将在首次访问时自动初始化数据库（如果需要）。

## 环境准备

在部署前，请准备以下资源：

1. [Neon数据库](https://neon.tech)账号 - 用于存储内容元数据
2. [Vercel](https://vercel.com)账号 - 用于部署应用和Blob存储

## 环境变量配置

部署时需要配置以下环境变量：

### 必需变量

- `DATABASE_URL`: Neon数据库连接字符串
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob存储令牌
- `ADMIN_KEY`: 管理员访问令牌（自定义安全字符串）

### 可选变量

- `MEMBER_KEY`: 会员访问令牌（如不设置则内容公开）
- `NEXT_PUBLIC_URL`: 应用公共URL，用于生成分享链接

## 部署步骤

### 1. 数据库配置

1. 注册[Neon](https://neon.tech)账号
2. 创建新项目和数据库
3. 在项目设置中获取连接字符串
4. 记下连接字符串，将在部署时使用

### 2. Blob存储配置

1. 登录[Vercel](https://vercel.com)控制台
2. 创建新的存储实例（Storage → Blob）
3. 获取读写令牌（Read & Write Token）
4. 记下令牌，将在部署时使用

### 3. 应用部署

#### 方式1：使用"Deploy with Vercel"按钮

1. 点击本文档顶部的"使用Vercel部署"按钮
2. 填写所需的环境变量
3. 点击部署

#### 方式2：手动部署

1. Fork或Clone仓库到你的GitLab/GitHub账号
2. 在Vercel控制台中导入项目
3. 配置环境变量
4. 部署应用

### 4. 数据库初始化

有两种方式可以初始化数据库：

#### 方式1：使用管理员界面初始化（推荐）

1. 部署完成后，访问应用
2. 使用配置的`ADMIN_KEY`登录（登录入口在页面右上角）
3. 登录后，页面右下角会出现"数据库管理"面板
4. 点击"初始化数据库"按钮

#### 方式2：直接访问初始化API

直接在浏览器中访问以下URL：

```
https://你的应用域名/api/init-db
```

访问后，API会自动检查并初始化数据库。

## 验证部署

访问应用URL，应该能看到主页。使用管理员令牌可以访问内容管理功能：

```
https://your-app-url.vercel.app/admin?token=your-admin-key
```

## 常见问题

### 数据库连接错误

1. 检查连接字符串格式
2. 确认数据库实例正在运行
3. 验证IP访问权限设置
4. 确保数据库用户有创建表的权限

### Blob存储问题

1. 确认令牌有效且具有读写权限
2. 检查存储配额是否已用尽
3. 文件上传大小是否超过限制（默认4MB）

## 本地开发

1. 克隆仓库
2. 安装依赖：`npm install`
3. 复制`env.example`为`.env.local`并填写所需变量
4. 启动开发服务器：`npm run dev`
5. 访问：http://localhost:3000

## 更新应用

1. 拉取最新代码：`git pull`
2. 安装依赖：`npm install`
3. 重新构建：`npm run build`
4. 如有数据库结构变更，应用会在重启后自动检测并更新 