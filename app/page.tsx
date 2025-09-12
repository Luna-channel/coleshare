"use client"

import { useState, useEffect } from "react"
import { ContentCard } from "@/components/content-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { PlusIcon, LogOutIcon, QrCodeIcon, Lock, Download, Settings, ArrowUpDown, GripVertical, FileDown, Search } from "lucide-react"
import { ContentUploadForm } from "@/components/content-upload-form"
import { LoginForm } from "@/components/login-form"
import { ContentType } from "@/lib/db"
import { CharacterList } from "@/components/character-list"
import { deleteCookie } from "@/lib/cookies"
import QRCode from "qrcode"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SiteSettingsForm } from "@/components/site-settings-form"
import JSZip from "jszip"
import { createHash } from "crypto"

// 定义资源类型
interface Resource {
  name: string;
  path?: string;  // 允许 path 为可选
}

// 定义角色卡类型
interface CharacterCard {
  id: number;
  name: string;
  description?: string;
  coverPath?: string;
  filePath?: string;
  stories?: Resource[];
  knowledgeBases?: Resource[];
  eventBooks?: Resource[];
  promptInjections?: Resource[];
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<ContentType | "all" | "characters">(ContentType.CHARACTER_CARD)
  const [contents, setContents] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isMember, setIsMember] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [showSettingsForm, setShowSettingsForm] = useState(false)
  const [editingContent, setEditingContent] = useState<any>(null)
  const [dbAvailable, setDbAvailable] = useState(true)
  const [showLoginForm, setShowLoginForm] = useState(false)
  const [isSorting, setIsSorting] = useState(false)
  const [sortedContents, setSortedContents] = useState<any[]>([])
  const [draggedItem, setDraggedItem] = useState<number | null>(null)
  const [dragOverItem, setDragOverItem] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>("") 
  const [filteredContents, setFilteredContents] = useState<any[]>([])
  const [showSearchBox, setShowSearchBox] = useState<boolean>(false)
  
  // 环境变量配置状态
  const [configState, setConfigState] = useState<{
    hasMemberKey: boolean;
    hasAdminKey: boolean;
    allowPublicAccess: boolean;
  }>({
    hasMemberKey: false,
    hasAdminKey: false,
    allowPublicAccess: false
  })
  
  // 站点配置状态
  const [siteSettings, setSiteSettings] = useState<{
    site_name: string;
    show_download_link: boolean;
    page_title: string;
    meta_description: string;
  }>({
    site_name: "OMateShare",
    show_download_link: true,
    page_title: "OMateShare",
    meta_description: "管理角色卡、知识库、事件书和提示注入"
  })
  
  // 二维码相关状态
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("")

  // 导出相关状态
  const [exportProgress, setExportProgress] = useState<{
    total: number;
    current: number;
    message: string;
  } | null>(null);

  // 搜索过滤逻辑
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredContents(contents)
    } else {
      const filtered = contents.filter(content => {
        const query = searchQuery.toLowerCase()
        const name = (content.name || '').toLowerCase()
        const description = (content.description || '').toLowerCase()
        return name.includes(query) || description.includes(query)
      })
      setFilteredContents(filtered)
    }
  }, [contents, searchQuery])

  // 获取配置状态
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch("/api/config")
        if (response.ok) {
          const config = await response.json()
          setConfigState(config)
          
          // 如果没有设置管理员密钥，显示警告
          if (!config.hasAdminKey) {
            console.warn("未设置管理员密钥 (ADMIN_KEY)，无法使用管理功能")
          }
        }
      } catch (error) {
        console.error("获取配置状态失败:", error)
      }
    }
    
    fetchConfig()
  }, [])
  
  // 获取站点设置
  useEffect(() => {
    const fetchSiteSettings = async () => {
      try {
        const response = await fetch("/api/site-settings")
        if (response.ok) {
          const settings = await response.json()
          setSiteSettings(settings)
          
          // 更新页面标题
          if (settings.page_title) {
            document.title = settings.page_title
          }
        }
      } catch (error) {
        console.error("获取站点设置失败:", error)
      }
    }
    
    fetchSiteSettings()
  }, [])

  // 更新版权信息
  useEffect(() => {
    const hostname = window.location.hostname;
    const copyrightEl = document.getElementById('domainCopyright');
    if (copyrightEl) {
      // 如果有设置网站名称且不是omateshare，则使用网站名称，否则使用域名
      let displayName = '';
      if (siteSettings.site_name && siteSettings.site_name.toLowerCase() !== 'omateshare') {
        displayName = siteSettings.site_name;
      } else {
        displayName = hostname || '';
      }
      copyrightEl.textContent = `© ${displayName} All Rights Reserved`;
    }
  }, [siteSettings.site_name]);

  // 检查是否为管理员
  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) {
      setIsAdmin(true);
    }
  }, []);

  // 处理显示二维码
  const showQRCode = async () => {
    try {
      // 获取成员密钥
      let memberKey = localStorage.getItem("memberToken") || "";
      
      // 如果本地没有memberKey，尝试从API获取
      if (!memberKey) {
        try {
          const response = await fetch("/api/member-key");
          if (response.ok) {
            memberKey = await response.text();
            // 存储到本地存储中以便后续使用
            if (memberKey) {
              localStorage.setItem("memberToken", memberKey);
            }
          }
        } catch (error) {
          console.error("获取成员密钥失败:", error);
        }
      }
      
      // 创建基本URL
      const baseUrl = window.location.origin;
      let apiUrl;
      
      // 根据是否有memberKey决定使用哪种API路径
      if (memberKey) {
        // 使用带有memberKey的API路径（与客户端期望的cards.json兼容）
        apiUrl = new URL(`/api/${memberKey}`, baseUrl);
      } else {
        // 使用无需验证的API路径
        apiUrl = new URL('/api', baseUrl);
      }
      
      console.log("生成二维码URL:", apiUrl.toString());
      
      // 生成二维码
      const qrDataUrl = await QRCode.toDataURL(apiUrl.toString());
      setQrCodeDataUrl(qrDataUrl);
      
      // 打开对话框
      setQrDialogOpen(true);
    } catch (error) {
      console.error("生成二维码失败:", error);
      alert("生成二维码失败");
    }
  }

  // 处理登出
  const handleLogout = () => {
    // 清除localStorage中的token
    localStorage.removeItem("adminToken")
    localStorage.removeItem("memberToken")
    
    // 清除cookie
    deleteCookie("adminToken")
    deleteCookie("memberToken")
    
    // 重置状态
    setIsAdmin(false)
    setIsMember(false)
    
    // 刷新页面
    window.location.reload()
  }

  // 检查权限
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 检查管理员权限
        const adminToken = localStorage.getItem("adminToken")
        console.log("检查管理员权限:", adminToken ? "有token" : "无token");
        
        if (adminToken) {
          const adminResponse = await fetch("/api/auth/verify?permission=write", {
            headers: {
              Authorization: `Bearer ${adminToken}`,
            },
          })
          console.log("管理员权限检查结果:", adminResponse.status, adminResponse.ok);
          
          // 如果有管理员权限，则自动拥有成员权限
          if (adminResponse.ok) {
            setIsAdmin(true)
            setIsMember(true)
            return // 管理员权限验证通过，无需继续检查
          } else {
            setIsAdmin(false)
          }
        } else {
          setIsAdmin(false)
        }

        // 如果没有管理员权限，检查成员权限
        const memberToken = localStorage.getItem("memberToken")
        console.log("检查成员权限:", memberToken ? "有token" : "无token");
        
        if (memberToken) {
          const memberResponse = await fetch("/api/auth/verify?permission=read", {
            headers: {
              Authorization: `Bearer ${memberToken}`,
            },
          })
          console.log("成员权限检查结果:", memberResponse.status, memberResponse.ok);
          setIsMember(memberResponse.ok)
        } else {
          // 检查是否需要成员权限
          console.log("检查是否允许公开访问");
          const publicResponse = await fetch("/api/auth/verify?permission=read")
          console.log("公开访问检查结果:", publicResponse.status, publicResponse.ok);
          setIsMember(publicResponse.ok)
        }
      } catch (err) {
        console.error("权限检查失败:", err)
      }
    }

    checkAuth()
  }, [])

  // 加载内容
  useEffect(() => {
    const fetchContents = async () => {
      if (!isMember && !isAdmin) return
      if (activeTab === "characters") return // 不需要从数据库加载角色卡

      setIsLoading(true)
      setError(null)

      try {
        // 优先使用管理员令牌
        const token = localStorage.getItem("adminToken") || localStorage.getItem("memberToken") || ""
        console.log("使用token获取内容:", isAdmin ? "管理员token" : (isMember ? "成员token" : "无token"));
        
        const url = activeTab === "all" ? "/api/contents" : `/api/contents?type=${activeTab}`

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          if (response.status === 403) {
            console.error("权限不足，无法获取内容:", response.status);
            throw new Error("权限不足，请确认登录状态")
          }
          
          if (response.status === 500) {
            // 可能是数据库连接问题
            setDbAvailable(false)
            throw new Error("数据库连接失败，请检查环境变量配置")
          }
          throw new Error("获取内容失败")
        }

        const data = await response.json()
        console.log("获取内容成功，数量:", data.length);
        setContents(data)
        setDbAvailable(true)
      } catch (err) {
        console.error("获取内容失败:", err)
        
        // 特殊处理 story_book 类型的枚举错误
        if (err instanceof Error && 
            activeTab === ContentType.STORY_BOOK && 
            err.message.includes("invalid input value for enum")) {
          setError("故事书类型尚未在数据库中注册，管理员请访问 /api/db-update 更新数据库")
        } else {
          setError(err instanceof Error ? err.message : "获取内容失败")
        }

        // 检查是否是数据库连接问题
        if (err instanceof Error && err.message.includes("数据库")) {
          setDbAvailable(false)
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchContents()
  }, [activeTab, isMember, isAdmin])

  // 处理删除内容
  const handleDeleteContent = async (id: number) => {
    if (!confirm("确定要删除此内容吗？此操作不可撤销。")) {
      return
    }

    try {
      const response = await fetch(`/api/contents/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
        },
      })

      if (!response.ok) {
        throw new Error("删除内容失败")
      }

      // 更新内容列表
      setContents(contents.filter((content) => content.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : "删除内容失败")
    }
  }

  // 处理编辑内容
  const handleEditContent = (content: any) => {
    setEditingContent(content)
    setShowUploadForm(true)
  }

  // 处理显示上传表单
  const handleShowUploadForm = () => {
    setEditingContent(null)
    setShowUploadForm(true)
  }

  // 处理上传成功
  const handleUploadSuccess = () => {
    setShowUploadForm(false)
    setEditingContent(null)

    // 重新加载内容
    const fetchContents = async () => {
      setIsLoading(true)

      try {
        const token = localStorage.getItem("adminToken") || localStorage.getItem("memberToken") || ""
        console.log("上传成功后获取内容，使用token:", token ? "有token" : "无token");
        
        const url = activeTab === "all" ? "/api/contents" : `/api/contents?type=${activeTab}`

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          console.error("上传成功后获取内容失败:", response.status);
          throw new Error("获取内容失败")
        }

        const data = await response.json()
        console.log("上传成功后获取内容成功，数量:", data.length);
        setContents(data)
      } catch (err) {
        console.error("上传成功后获取内容失败详情:", err);
        setError(err instanceof Error ? err.message : "获取内容失败")
      } finally {
        setIsLoading(false)
      }
    }

    fetchContents()
  }

  // 显示设置表单
  const handleShowSettingsForm = () => {
    setShowSettingsForm(true);
  }

  // 处理设置成功
  const handleSettingsSuccess = () => {
    setShowSettingsForm(false);

    // 重新加载站点设置
    const fetchSiteSettings = async () => {
      try {
        const response = await fetch("/api/site-settings")
        if (response.ok) {
          const settings = await response.json()
          setSiteSettings(settings)
          
          // 更新页面标题
          if (settings.page_title) {
            document.title = settings.page_title
          }
          
          // 更新版权信息
          const hostname = window.location.hostname;
          const copyrightEl = document.getElementById('domainCopyright');
          if (copyrightEl) {
            // 如果有设置网站名称且不是omateshare，则使用网站名称，否则使用域名
            let displayName = '';
            if (settings.site_name && settings.site_name.toLowerCase() !== 'omateshare') {
              displayName = settings.site_name;
            } else {
              displayName = hostname || '';
            }
            copyrightEl.textContent = `© ${displayName} All Rights Reserved`;
          }
        }
      } catch (error) {
        console.error("获取站点设置失败:", error)
      }
    }
    
    fetchSiteSettings()
  }

  // 开始排序模式
  const handleStartSorting = () => {
    if (activeTab !== ContentType.CHARACTER_CARD) {
      // 切换到角色卡标签
      setActiveTab(ContentType.CHARACTER_CARD)
    }
    
    // 复制当前内容到可排序列表
    setSortedContents(
      // 如果有排序值使用排序值，否则使用索引
      contents.map((content, index) => ({
        ...content,
        sort_order: content.sort_order !== null ? content.sort_order : index
      }))
    )
    setIsSorting(true)
  }

  // 取消排序
  const handleCancelSorting = () => {
    setIsSorting(false)
    setSortedContents([])
  }

  // 保存排序
  const handleSaveSorting = async () => {
    try {
      // 准备API请求数据
      const items = sortedContents.map((content, index) => ({
        id: content.id,
        sort_order: index + 1 // 从1开始的排序值
      }))

      // 调用API保存排序
      const response = await fetch("/api/contents/sort", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
        },
        body: JSON.stringify({ items }),
      })

      if (!response.ok) {
        throw new Error("保存排序失败")
      }

      // 退出排序模式
      setIsSorting(false)
      
      // 重新加载内容
      const fetchContents = async () => {
        setIsLoading(true)
        try {
          const token = localStorage.getItem("adminToken") || localStorage.getItem("memberToken") || ""
          const url = `/api/contents?type=${ContentType.CHARACTER_CARD}`
          const response = await fetch(url, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
          if (!response.ok) {
            throw new Error("获取内容失败")
          }
          const data = await response.json()
          setContents(data)
        } catch (err) {
          setError(err instanceof Error ? err.message : "获取内容失败")
        } finally {
          setIsLoading(false)
        }
      }
      fetchContents()
      
      // 移除成功提示
      // alert("排序保存成功")
    } catch (err) {
      console.error("保存排序失败:", err)
      alert(err instanceof Error ? err.message : "保存排序失败")
    }
  }

  // 移动排序项
  const moveItem = (fromIndex: number, toIndex: number) => {
    // 确保索引在有效范围内
    if (
      fromIndex < 0 || 
      fromIndex >= sortedContents.length || 
      toIndex < 0 || 
      toIndex >= sortedContents.length
    ) {
      return
    }

    // 复制数组并移动项目
    const newItems = [...sortedContents]
    const [movedItem] = newItems.splice(fromIndex, 1)
    newItems.splice(toIndex, 0, movedItem)
    
    // 更新状态
    setSortedContents(newItems)
  }

  // 向上移动项目
  const moveItemUp = (index: number) => {
    if (index > 0) {
      moveItem(index, index - 1)
    }
  }

  // 向下移动项目
  const moveItemDown = (index: number) => {
    if (index < sortedContents.length - 1) {
      moveItem(index, index + 1)
    }
  }

  // 处理拖动开始
  const handleDragStart = (index: number) => {
    setDraggedItem(index)
  }

  // 处理拖动结束
  const handleDragEnd = () => {
    if (draggedItem !== null && dragOverItem !== null && draggedItem !== dragOverItem) {
      moveItem(draggedItem, dragOverItem)
    }
    setDraggedItem(null)
    setDragOverItem(null)
  }

  // 处理拖动进入
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverItem(index)
  }

  // 生成URL的hash值
  const getUrlHash = (url: string) => {
    return createHash('md5').update(url).digest('hex');
  };

  // 处理导出
  const handleExport = async () => {
    try {
      // 获取成员密钥
      let memberKey = localStorage.getItem("memberToken") || "";
      
      // 如果本地没有memberKey，尝试从API获取
      if (!memberKey) {
        try {
          const response = await fetch("/api/member-key");
          if (response.ok) {
            memberKey = await response.text();
          }
        } catch (error) {
          console.error("获取成员密钥失败:", error);
          return;
        }
      }
      
      // 创建基本URL
      const baseUrl = window.location.origin;
      let apiUrl;
      
      // 根据是否有memberKey决定使用哪种API路径
      if (memberKey) {
        apiUrl = new URL(`/api/${memberKey}/cards.json`, baseUrl);
      } else {
        apiUrl = new URL('/api/cards.json', baseUrl);
      }

      console.log("请求URL:", apiUrl.toString());

      // 获取cards.json数据
      const response = await fetch(apiUrl.toString());
      if (!response.ok) {
        throw new Error(`获取cards.json失败: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();

      // 检查数据格式
      if (!data || !data.cards || !Array.isArray(data.cards)) {
        throw new Error("cards.json 数据格式错误，期望 { cards: [...] }");
      }

      const cardsData = data.cards;

      // 创建zip实例
      const zip = new JSZip();

      // 用于存储已下载的资源
      const downloadedResources = new Map<string, string>();

      // 计算总文件数
      let totalFiles = 0;
      cardsData.forEach((card: CharacterCard) => {
        if (card.coverPath && (card.coverPath.startsWith('http') || card.coverPath.startsWith('/'))) totalFiles++;
        if (card.filePath && (card.filePath.startsWith('http') || card.filePath.startsWith('/'))) totalFiles++;
        ['stories', 'knowledgeBases', 'eventBooks', 'promptInjections'].forEach(type => {
          if (Array.isArray(card[type as keyof CharacterCard])) {
            totalFiles += (card[type as keyof CharacterCard] as Array<{ path?: string }>)
              .filter(r => r.path && (r.path.startsWith('http') || r.path.startsWith('/'))).length;
          }
        });
      });

      let processedFiles = 0;
      setExportProgress({ total: totalFiles, current: 0, message: "开始导出..." });

      // 处理每个角色卡中的资源文件
      const processedCards = await Promise.all(cardsData.map(async (card: CharacterCard) => {
        if (!card || typeof card !== 'object') {
          console.warn("跳过无效的角色卡数据:", card);
          return card;
        }

        const newCard = { ...card };
        
        // 处理封面（coverPath）
        if (card.coverPath && typeof card.coverPath === 'string' && (card.coverPath.startsWith('http') || card.coverPath.startsWith('/'))) {
          try {
            setExportProgress(prev => ({
              total: totalFiles,
              current: processedFiles,
              message: `下载封面: ${card.name}`
            }));

            // 构建完整URL
            const fullCoverUrl = card.coverPath.startsWith('http') ? card.coverPath : `${baseUrl}${card.coverPath}`;
            const coverHash = getUrlHash(fullCoverUrl);
            const coverFileName = `uploads/${coverHash}${card.coverPath.substring(card.coverPath.lastIndexOf('.'))}`;

            if (!downloadedResources.has(card.coverPath)) {
              const coverResponse = await fetch(fullCoverUrl);
              if (!coverResponse.ok) {
                throw new Error(`下载封面失败: ${coverResponse.status}`);
              }
              const coverBlob = await coverResponse.blob();
              zip.file(coverFileName, coverBlob);
              downloadedResources.set(card.coverPath, coverFileName);
            }

            newCard.coverPath = downloadedResources.get(card.coverPath);
            processedFiles++;
            setExportProgress(prev => ({
              total: totalFiles,
              current: processedFiles,
              message: `已下载: ${card.name} 的封面`
            }));
          } catch (error) {
            console.error(`下载封面失败: ${card.coverPath}`, error);
          }
        }

        // 处理角色卡图片（filePath）
        if (card.filePath && typeof card.filePath === 'string' && (card.filePath.startsWith('http') || card.filePath.startsWith('/'))) {
          try {
            setExportProgress(prev => ({
              total: totalFiles,
              current: processedFiles,
              message: `下载角色卡: ${card.name}`
            }));

            // 构建完整URL
            const fullCardUrl = card.filePath.startsWith('http') ? card.filePath : `${baseUrl}${card.filePath}`;
            const cardHash = getUrlHash(fullCardUrl);
            const cardFileName = `uploads/${cardHash}${card.filePath.substring(card.filePath.lastIndexOf('.'))}`;

            if (!downloadedResources.has(card.filePath)) {
              const cardResponse = await fetch(fullCardUrl);
              if (!cardResponse.ok) {
                throw new Error(`下载角色卡图片失败: ${cardResponse.status}`);
              }
              const cardBlob = await cardResponse.blob();
              zip.file(cardFileName, cardBlob);
              downloadedResources.set(card.filePath, cardFileName);
            }

            newCard.filePath = downloadedResources.get(card.filePath);
            processedFiles++;
            setExportProgress(prev => ({
              total: totalFiles,
              current: processedFiles,
              message: `已下载: ${card.name} 的角色卡`
            }));
          } catch (error) {
            console.error(`下载角色卡图片失败: ${card.filePath}`, error);
          }
        }

        // 处理关联资源
        const resourceTypes = ['stories', 'knowledgeBases', 'eventBooks', 'promptInjections'] as const;
        for (const type of resourceTypes) {
          const resources = card[type];
          if (Array.isArray(resources)) {
            newCard[type] = await Promise.all(resources.map(async (resource: Resource) => {
              if (resource.path && typeof resource.path === 'string' && (resource.path.startsWith('http') || resource.path.startsWith('/'))) {
                try {
                  setExportProgress(prev => ({
                    total: totalFiles,
                    current: processedFiles,
                    message: `下载${type}: ${card.name} - ${resource.name}`
                  }));

                  // 构建完整URL
                  const fullResourceUrl = resource.path.startsWith('http') ? resource.path : `${baseUrl}${resource.path}`;
                  const resourceHash = getUrlHash(fullResourceUrl);
                  const resourceFileName = `uploads/${resourceHash}${resource.path.substring(resource.path.lastIndexOf('.'))}`;

                  if (!downloadedResources.has(resource.path)) {
                    const resourceResponse = await fetch(fullResourceUrl);
                    if (!resourceResponse.ok) {
                      throw new Error(`下载${type}资源失败: ${resourceResponse.status}`);
                    }
                    const resourceBlob = await resourceResponse.blob();
                    zip.file(resourceFileName, resourceBlob);
                    downloadedResources.set(resource.path, resourceFileName);
                  }

                  processedFiles++;
                  setExportProgress(prev => ({
                    total: totalFiles,
                    current: processedFiles,
                    message: `已下载: ${card.name} - ${resource.name}`
                  }));

                  return { ...resource, path: downloadedResources.get(resource.path) };
                } catch (error) {
                  console.error(`下载${type}资源失败: ${resource.path}`, error);
                  return resource;
                }
              }
              return resource;
            }));
          }
        }

        return newCard;
      }));

      // 将处理后的cards.json添加到zip
      const finalJson = { cards: processedCards };
      zip.file("cards.json", JSON.stringify(finalJson, null, 2));

      setExportProgress(prev => ({
        total: totalFiles,
        current: totalFiles,
        message: "正在生成zip文件..."
      }));

      // 生成zip文件
      const content = await zip.generateAsync({ type: "blob" });
      
      // 创建下载链接
      const url = window.URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cards.zip";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportProgress(null);
    } catch (error) {
      console.error("导出失败:", error);
      alert("导出失败: " + (error instanceof Error ? error.message : String(error)));
      setExportProgress(null);
    }
  };

  // 如果需要登录且未登录，或者显示登录表单，则显示登录表单
  if ((configState.hasMemberKey && !isMember && !isAdmin) || showLoginForm) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
        <div className="container mx-auto py-8 sm:py-12 px-4">
          <div className="flex flex-col items-center justify-center">
            <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
              OMateShare
            </h1>
            {!configState.hasAdminKey && (
              <div className="bg-red-500/20 border border-red-500 text-white p-3 sm:p-4 rounded-lg mb-5 sm:mb-6 max-w-md w-full text-sm sm:text-base">
                <p className="font-medium">警告: 未设置管理员密钥 (ADMIN_KEY)</p>
                <p className="text-xs sm:text-sm mt-1 sm:mt-2">请在环境变量中设置 ADMIN_KEY 以启用管理功能。</p>
              </div>
            )}
            <div className="w-full max-w-md">
              <LoginForm 
                onCancel={showLoginForm ? () => setShowLoginForm(false) : undefined}
                initialType={configState.hasMemberKey ? "member" : "admin"}
                disableMemberLogin={!configState.hasMemberKey}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 如果正在显示设置表单
  if (showSettingsForm) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
        <div className="container mx-auto py-6 sm:py-12 px-3 sm:px-4">
          <div className="flex flex-col items-center">
            <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
              网站设置
            </h1>
            <div className="w-full max-w-3xl">
              <SiteSettingsForm
                onSuccess={handleSettingsSuccess}
                onCancel={() => setShowSettingsForm(false)}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 如果正在显示上传表单
  if (showUploadForm) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
        <div className="container mx-auto py-6 sm:py-12 px-3 sm:px-4">
          <div className="flex flex-col items-center">
            <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
              {editingContent ? "编辑内容" : "上传新内容"}
            </h1>
            <div className="w-full max-w-3xl">
              <ContentUploadForm
                onSuccess={handleUploadSuccess}
                onCancel={() => {
                  setShowUploadForm(false)
                  setEditingContent(null)
                }}
                initialData={editingContent}
                defaultContentType={typeof activeTab === 'string' && (activeTab !== 'all' && activeTab !== 'characters') ? activeTab as ContentType : undefined}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white flex flex-col">
      <div className="container mx-auto py-4 sm:py-8 px-3 sm:px-4 flex-grow">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end mb-4 sm:mb-0 w-full sm:w-auto">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-0 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400 text-center sm:text-left">
              {siteSettings.site_name || "OMateShare"}
            </h1>
            
            {/* 下载OMate链接，受站点设置控制 */}
            {siteSettings.show_download_link && (
              <a 
                href="https://help.omate.org/#%E4%B8%8B%E8%BD%BD" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-purple-400 hover:text-purple-300 transition-colors duration-200 flex items-center justify-center sm:justify-start sm:ml-4 sm:mb-1"
              >
                <Download className="h-4 w-4 mr-1" />
                下载 OMate
              </a>
            )}
          </div>

          {!dbAvailable && (
            <div className="bg-amber-500/20 border border-amber-500 text-white p-3 sm:p-4 rounded-lg mb-4 sm:mb-6 w-full sm:w-auto text-sm sm:text-base">
              <p>数据库连接不可用。请检查环境变量配置。</p>
              <p className="text-xs sm:text-sm mt-1 sm:mt-2">您仍然可以使用角色卡编辑器功能，但内容管理功能将不可用。</p>
            </div>
          )}
        </div>

        <Tabs
          defaultValue="all"
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as ContentType | "all" | "characters")}
          className="w-full"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div className="w-full sm:w-auto overflow-x-auto sm:overflow-visible pb-2 sm:pb-0 no-scrollbar">
              <TabsList className="h-auto sm:h-10 flex flex-nowrap sm:flex-wrap min-w-max sm:min-w-0 bg-gray-800/60">
                <TabsTrigger value="all" className="px-3 py-1.5 sm:py-2">全部</TabsTrigger>
                <TabsTrigger value={ContentType.CHARACTER_CARD} className="px-3 py-1.5 sm:py-2">角色卡</TabsTrigger>
                <TabsTrigger value={ContentType.KNOWLEDGE_BASE} className="px-3 py-1.5 sm:py-2">知识库</TabsTrigger>
                <TabsTrigger value={ContentType.EVENT_BOOK} className="px-3 py-1.5 sm:py-2">事件书</TabsTrigger>
                <TabsTrigger value={ContentType.STORY_BOOK} className="px-3 py-1.5 sm:py-2">故事书</TabsTrigger>
                <TabsTrigger value={ContentType.PROMPT_INJECTION} className="px-3 py-1.5 sm:py-2">注入提示词</TabsTrigger>
                <TabsTrigger value={ContentType.OTHER} className="px-3 py-1.5 sm:py-2">其他</TabsTrigger>
              </TabsList>
            </div>
            
            <div className="flex flex-wrap gap-2 justify-end">
              {/* 搜索按钮 */}
              <Button 
                  variant="outline" 
                  className="flex items-center bg-gray-800 text-white border-gray-600 hover:bg-gray-700 px-2 sm:px-3 text-sm sm:text-base min-w-[44px] sm:min-w-0"
                  onClick={() => {
                    setShowSearchBox(!showSearchBox)
                    if (showSearchBox) {
                      setSearchQuery("")
                    }
                  }}
                >
                  <Search className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              {isAdmin && (
                <>
                  <Button onClick={handleShowUploadForm} className="flex items-center bg-purple-600 hover:bg-purple-700 text-white text-sm sm:text-base px-2 sm:px-4 min-w-[44px] sm:min-w-0">
                    <PlusIcon className="sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">上传</span>
                  </Button>
                  <Button 
                    onClick={handleExport} 
                    className="flex items-center bg-green-600 hover:bg-green-700 text-white text-sm sm:text-base px-2 sm:px-4 min-w-[44px] sm:min-w-0"
                  >
                    <FileDown className="sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">导出</span>
                  </Button>
                  {isSorting ? (
                    <div className="flex gap-2">
                      <Button onClick={handleSaveSorting} className="flex items-center bg-green-600 hover:bg-green-700 text-white text-sm sm:text-base px-2 sm:px-4 min-w-[44px] sm:min-w-0">
                        <span className="hidden sm:inline">保存排序</span>
                        <span className="sm:hidden">保存</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={handleCancelSorting} 
                        className="bg-gray-800 text-white border-gray-700 hover:bg-gray-700 text-sm sm:text-base px-2 sm:px-4 min-w-[44px] sm:min-w-0"
                      >
                        <span className="hidden sm:inline">取消</span>
                        <span className="sm:hidden">×</span>
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      onClick={handleStartSorting} 
                      className="flex items-center bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base px-2 sm:px-4 min-w-[44px] sm:min-w-0"
                      disabled={activeTab !== ContentType.CHARACTER_CARD && activeTab !== "all" && contents.length === 0}
                    >
                      <ArrowUpDown className="sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">排序</span>
                    </Button>
                  )}
                  <Button onClick={handleShowSettingsForm} className="flex items-center bg-gray-600 hover:bg-gray-700 text-white text-sm sm:text-base px-2 sm:px-4 min-w-[44px] sm:min-w-0">
                    <Settings className="sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">设置</span>
                  </Button>
                </>
              )}
              {/* <Button 
                variant="outline" 
                className="flex items-center bg-gray-800 text-white border-gray-600 hover:bg-gray-700"
                onClick={() => setActiveTab("characters")}
              >
                <span>角色卡编辑器</span>
              </Button> */}
              <Button 
                variant="outline" 
                className="flex items-center bg-gray-800 text-white border-gray-600 hover:bg-gray-700 px-2 sm:px-3 text-sm sm:text-base min-w-[44px] sm:min-w-0"
                onClick={showQRCode}
              >
                <QrCodeIcon className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              
              {/* 根据配置状态和登录状态显示不同的按钮 */}
              {isAdmin ? (
                // 管理员已登录，显示登出按钮
                <Button 
                  variant="outline" 
                  className="flex items-center bg-gray-800 text-white border-gray-600 hover:bg-gray-700 text-sm sm:text-base px-2 sm:px-4 min-w-[44px] sm:min-w-0" 
                  onClick={handleLogout}
                >
                  <LogOutIcon className="sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">登出</span>
                </Button>
              ) : configState.hasAdminKey && (!configState.hasMemberKey || !isMember) ? (
                // 有管理员密钥但未登录，显示管理员登录按钮
                <Button 
                  variant="outline" 
                  className="flex items-center bg-gray-800 text-white border-gray-600 hover:bg-gray-700 text-sm sm:text-base px-2 sm:px-4 min-w-[44px] sm:min-w-0"
                  onClick={() => setShowLoginForm(true)}
                >
                  <Lock className="sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">管理员登录</span>
                </Button>
              ) : isMember && !configState.allowPublicAccess ? (
                // 成员已登录，显示登出按钮
                <Button 
                  variant="outline" 
                  className="flex items-center bg-gray-800 text-white border-gray-600 hover:bg-gray-700 text-sm sm:text-base px-2 sm:px-4 min-w-[44px] sm:min-w-0" 
                  onClick={handleLogout}
                >
                  <LogOutIcon className="sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">登出</span>
                </Button>
              ) : null}
            </div>
          </div>

          {/* 搜索框区域 - 在下一行全宽显示 */}
          {showSearchBox && (
            <div className="w-full mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="搜索内容..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full bg-gray-800/60 border-gray-700 text-white placeholder-gray-400 focus:border-purple-500"
                  autoFocus
                />
              </div>
            </div>
          )}

          <TabsContent value="all" className="mt-0">
            {renderContentGrid()}
          </TabsContent>

          <TabsContent value={ContentType.CHARACTER_CARD} className="mt-0">
            {renderContentGrid()}
          </TabsContent>

          <TabsContent value={ContentType.KNOWLEDGE_BASE} className="mt-0">
            {renderContentGrid()}
          </TabsContent>

          <TabsContent value={ContentType.EVENT_BOOK} className="mt-0">
            {renderContentGrid()}
          </TabsContent>

          <TabsContent value={ContentType.PROMPT_INJECTION} className="mt-0">
            {renderContentGrid()}
          </TabsContent>
          
          <TabsContent value={ContentType.STORY_BOOK} className="mt-0">
            {renderContentGrid()}
          </TabsContent>
          
          <TabsContent value={ContentType.OTHER} className="mt-0">
            {renderContentGrid()}
          </TabsContent>
          
          <TabsContent value="characters" className="mt-0">
            <CharacterList />
          </TabsContent>
        </Tabs>

        {/* 二维码对话框 */}
        <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
          <DialogContent className="w-[90vw] max-w-md mx-auto">
            <DialogHeader>
              <DialogTitle>角色卡访问二维码</DialogTitle>
              <DialogDescription>
                扫描下方二维码访问角色卡JSON数据
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex flex-col items-center justify-center py-3 sm:py-4">
              {qrCodeDataUrl && (
                <img src={qrCodeDataUrl} alt="QR Code" className="w-52 h-52 sm:w-64 sm:h-64" />
              )}
              <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-center text-gray-500">
                扫描二维码添加角色列表到发现页面
              </p>
              
            </div>
          </DialogContent>
        </Dialog>

        {/* 导出进度对话框 */}
        <Dialog open={!!exportProgress} onOpenChange={() => {}}>
          <DialogContent className="w-[90vw] max-w-md mx-auto">
            <DialogHeader>
              <DialogTitle>导出进度</DialogTitle>
              <DialogDescription>
                {exportProgress?.message}
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex flex-col items-center justify-center py-3 sm:py-4">
              <div className="w-full bg-gray-700 rounded-full h-2.5 mb-2">
                <div 
                  className="bg-purple-600 h-2.5 rounded-full transition-all duration-300" 
                  style={{ 
                    width: `${exportProgress ? (exportProgress.current / exportProgress.total * 100) : 0}%` 
                  }}
                ></div>
              </div>
              <p className="text-sm text-gray-400">
                {exportProgress ? `${exportProgress.current}/${exportProgress.total}` : '0/0'}
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* 页脚 */}
      <footer className="mt-auto py-6 sm:py-8 px-3 sm:px-4 text-center text-gray-400 text-xs sm:text-sm bg-gradient-to-b from-transparent to-gray-900 w-full">
        <div className="max-w-3xl mx-auto border-t border-gray-800 pt-6 sm:pt-8">
          <p>
            <span id="domainCopyright" className="text-gray-400">© All Rights Reserved</span>
            {/* 页脚的OMateShare链接始终显示，不受站点设置控制 */}
            · Powered By <a href="https://github.com/easychen/omateshare" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 transition-colors">OMateShare</a>
          </p>
          <p className="mb-2 mt-2 text-gray-500 text-xs sm:text-sm">请在严守当地法律法规和尊重知识产权的前提下使用OMateShare</p>
          <p className="text-gray-600 text-xs">OMate 不承担违规使用带来的任何连带责任</p>
        </div>
      </footer>
    </div>
  )

  // 渲染内容网格
  function renderContentGrid() {
    if (!dbAvailable) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">数据库连接不可用，无法显示内容。</p>
          <p className="text-sm text-gray-500">请切换到"角色卡编辑器"标签页使用离线功能。</p>
        </div>
      )
    }

    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      )
    }

    if (error) {
      return <div className="bg-red-500/20 border border-red-500 text-white p-4 rounded-lg mb-6">{error}</div>
    }

    if (filteredContents.length === 0 && !isSorting) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">{searchQuery.trim() ? '未找到匹配的内容' : '暂无内容'}</p>
          {isAdmin && !searchQuery.trim() && (
            <Button onClick={handleShowUploadForm} variant="outline" className="bg-gray-800 text-white border-gray-700 hover:bg-gray-700">
              <span>上传新内容</span>
            </Button>
          )}
        </div>
      )
    }

    // 如果在排序模式中
    if (isSorting) {
      return (
        <div className="flex flex-col">
          <div className="bg-purple-900/30 p-4 mb-6 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">角色卡排序模式</h3>
              <div className="flex gap-2">
                <Button onClick={handleSaveSorting} className="bg-green-600 hover:bg-green-700 text-white">
                  保存排序
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleCancelSorting} 
                  className="bg-gray-800 text-white border-gray-700 hover:bg-gray-700"
                >
                  取消
                </Button>
              </div>
            </div>
            <p className="text-sm text-gray-300 mb-2">拖动角色卡来调整顺序，或使用上下按钮移动。</p>
            <p className="text-sm text-purple-300">排序将影响首页显示顺序和API中的角色卡顺序。</p>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            {sortedContents.map((content, index) => (
              <div 
                key={content.id} 
                className={`bg-gray-800/80 rounded-lg p-3 flex items-center gap-3 cursor-move ${
                  draggedItem === index ? 'opacity-50' : ''
                } ${
                  dragOverItem === index ? 'border border-purple-500' : ''
                }`}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, index)}
              >
                <div className="font-mono text-gray-500 w-8 text-center">{index + 1}</div>
                <div className="flex-shrink-0 text-gray-400 mr-1">
                  <GripVertical className="h-5 w-5" />
                </div>
                <div className="flex-shrink-0 w-12 h-12 overflow-hidden rounded-md">
                  <img 
                    src={content.thumbnail_url || content.blob_url} 
                    alt={content.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-grow">
                  <h3 className="text-white font-medium truncate">{content.name}</h3>
                  <p className="text-gray-400 text-sm truncate">{content.description}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 px-2 py-0" 
                    disabled={index === 0}
                    onClick={() => moveItemUp(index)}
                  >
                    ↑
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-8 px-2 py-0" 
                    disabled={index === sortedContents.length - 1}
                    onClick={() => moveItemDown(index)}
                  >
                    ↓
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
        {filteredContents.map((content) => (
          <ContentCard
            key={content.id}
            content={content}
            onEdit={() => handleEditContent(content)}
            onDelete={() => handleDeleteContent(content.id)}
            isAdmin={isAdmin}
          />
        ))}
      </div>
    )
  }
}
