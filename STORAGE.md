# 存储配置指南

本项目支持多种存储方式，包括 Vercel Blob、Cloudflare R2 和本地文件系统存储。

## 存储类型对比

| 存储类型 | 适用场景 | 优点 | 缺点 |
|---------|---------|------|------|
| **本地文件系统** | 开发环境、小型部署 | 速度快、无网络延迟、成本低 | 不支持多服务器、需要备份 |
| **Vercel Blob** | 生产环境、Vercel部署 | 全球CDN、高可用、易集成 | 按使用量计费 |
| **Cloudflare R2** | 大规模部署、高性能需求 | 成本效益高、全球分布、高性能 | 配置复杂 |

## 配置方法

### 1. 本地文件系统存储

**适合场景**：开发环境、单机部署、小型项目

```bash
# .env.local
STORAGE_TYPE="local"
LOCAL_STORAGE_DIR="./public/uploads"  # 可选，默认值
LOCAL_STORAGE_URL_PREFIX="/uploads"   # 可选，默认值
```

**特点**：
- ✅ 最快的读写速度
- ✅ 无网络依赖
- ✅ 零成本
- ✅ 易于调试
- ❌ 不支持多服务器部署
- ❌ 需要手动备份

### 2. Vercel Blob 存储

**适合场景**：生产环境、Vercel 平台部署

```bash
# .env.local
STORAGE_TYPE="vercel"
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_xxxxxxxxxx"
BLOB_PREFIX="oshare"  # 可选，存储前缀
```

**特点**：
- ✅ 全球 CDN 加速
- ✅ 高可用性
- ✅ 与 Vercel 深度集成
- ✅ 自动备份
- ❌ 按使用量计费
- ❌ 依赖 Vercel 平台

### 3. Cloudflare R2 存储

**适合场景**：大规模部署、成本敏感项目

```bash
# .env.local
STORAGE_TYPE="r2"
R2_ACCOUNT_ID="your_account_id"
R2_ACCESS_KEY_ID="your_access_key_id"
R2_SECRET_ACCESS_KEY="your_secret_access_key"
R2_BUCKET_NAME="your_bucket_name"
R2_PUBLIC_URL="https://your-bucket.your-domain.com"
```

**特点**：
- ✅ 成本效益高
- ✅ 全球分布
- ✅ 高性能
- ✅ S3 兼容 API
- ❌ 配置相对复杂
- ❌ 需要域名配置

## 快速开始

### 开发环境设置（推荐）

1. 复制环境变量文件：
```bash
cp env.example .env.local
```

2. 编辑 `.env.local`，设置为本地存储：
```bash
# 数据库配置
DATABASE_URL="sqlite://./data/database.db"

# 存储配置
STORAGE_TYPE="local"

# 其他必要配置
ADMIN_KEY="your-admin-key"
MEMBER_KEY="your-member-key"
NEXT_PUBLIC_URL="http://localhost:3000"
```

3. 启动开发服务器：
```bash
npm run dev
```

### 生产环境设置

1. 设置数据库（推荐 PostgreSQL）：
```bash
DATABASE_URL="postgres://username:password@host/database"
```

2. 设置存储（推荐 Vercel Blob）：
```bash
STORAGE_TYPE="vercel"
BLOB_READ_WRITE_TOKEN="your-token"
```

3. 部署到 Vercel 或其他平台

## 测试存储功能

### 测试本地存储
```bash
npm run test:local-storage
```

这个命令会：
1. 创建测试文件
2. 测试文件上传功能
3. 验证缩略图生成
4. 测试文件删除功能

### 手动测试

1. 启动开发服务器
2. 访问 http://localhost:3000
3. 尝试上传一个角色卡文件
4. 检查文件是否正确保存到指定位置

## 文件结构

### 本地存储文件结构
```
public/
└── uploads/
    ├── character_card_abc123.png
    ├── thumbnail_character_card_def456.jpg
    ├── knowledge_base_ghi789.json
    └── ...
```

### 云存储文件结构
```
bucket/
└── oshare/  # BLOB_PREFIX
    ├── character_card_abc123.png
    ├── thumbnail_character_card_def456.jpg
    ├── knowledge_base_ghi789.json
    └── ...
```

## 迁移指南

### 从云存储迁移到本地存储

1. 下载现有文件到本地
2. 更改环境变量：
```bash
STORAGE_TYPE="local"
```
3. 重启应用
4. 更新数据库中的文件URL（如需要）

### 从本地存储迁移到云存储

1. 设置云存储配置
2. 上传本地文件到云存储
3. 更改环境变量
4. 重启应用
5. 更新数据库中的文件URL（如需要）

## 性能优化

### 本地存储优化
- 使用 SSD 硬盘提高读写速度
- 定期清理无用文件
- 考虑使用 nginx 等反向代理服务静态文件

### 云存储优化
- 启用 CDN 加速
- 设置合适的缓存策略
- 压缩图片文件
- 使用 WebP 格式（如支持）

## 故障排除

### 本地存储问题

**文件上传失败**
- 检查目录权限：`chmod 755 public/uploads`
- 检查磁盘空间：`df -h`
- 检查目录是否存在：`ls -la public/`

**文件访问失败**
- 确认 Next.js 静态文件服务正常
- 检查文件路径是否正确
- 验证文件确实存在

### 云存储问题

**Vercel Blob 上传失败**
- 检查 token 是否正确
- 验证网络连接
- 检查文件大小限制

**R2 配置问题**
- 验证所有环境变量
- 检查 bucket 权限
- 确认公开访问 URL 配置

## 安全考虑

### 本地存储安全
- 设置合适的文件权限
- 定期备份重要文件
- 考虑文件加密（敏感数据）

### 云存储安全
- 使用强密码和访问密钥
- 启用访问日志
- 设置合适的 CORS 策略
- 定期轮换访问密钥

## 监控和维护

### 本地存储监控
- 监控磁盘使用率
- 定期检查文件完整性
- 设置自动备份

### 云存储监控
- 监控使用量和费用
- 检查访问日志
- 设置使用量告警

## 最佳实践

1. **开发阶段**：使用本地存储，快速迭代
2. **测试阶段**：使用与生产环境相同的存储类型
3. **生产环境**：根据需求选择合适的云存储
4. **备份策略**：无论使用哪种存储，都要定期备份
5. **监控告警**：设置存储使用量和错误率告警
6. **成本控制**：定期审查存储成本，优化不必要的开支