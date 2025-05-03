"use client"

import { useState, useEffect } from "react"
import { ContentCard } from "@/components/content-card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { PlusIcon, LogOutIcon, QrCodeIcon, Lock, Download } from "lucide-react"
import { ContentUploadForm } from "@/components/content-upload-form"
import { LoginForm } from "@/components/login-form"
import { ContentType } from "@/lib/db"
import { CharacterList } from "@/components/character-list"
import { deleteCookie } from "@/lib/cookies"
import QRCode from "qrcode"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function Home() {
  const [activeTab, setActiveTab] = useState<ContentType | "all" | "characters">(ContentType.CHARACTER_CARD)
  const [contents, setContents] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isMember, setIsMember] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [editingContent, setEditingContent] = useState<any>(null)
  const [dbAvailable, setDbAvailable] = useState(true)
  const [showLoginForm, setShowLoginForm] = useState(false)
  
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
  
  // 二维码相关状态
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("")

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

  // 如果需要登录且未登录，或者显示登录表单，则显示登录表单
  if ((configState.hasMemberKey && !isMember && !isAdmin) || showLoginForm) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
        <div className="container mx-auto py-12 px-4">
          <div className="flex flex-col items-center justify-center">
            <h1 className="text-3xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
              OMateShare
            </h1>
            {!configState.hasAdminKey && (
              <div className="bg-red-500/20 border border-red-500 text-white p-4 rounded-lg mb-6 max-w-md">
                <p className="font-medium">警告: 未设置管理员密钥 (ADMIN_KEY)</p>
                <p className="text-sm mt-2">请在环境变量中设置 ADMIN_KEY 以启用管理功能。</p>
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

  // 如果正在显示上传表单
  if (showUploadForm) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
        <div className="container mx-auto py-12 px-4">
          <div className="flex flex-col items-center">
            <h1 className="text-3xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
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
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <div className="flex items-end">
            <h1 className="text-3xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
              OMateShare
            </h1>
            <a 
              href="https://help.omate.org/#%E4%B8%8B%E8%BD%BD" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-purple-400 hover:text-purple-300 transition-colors duration-200 flex items-center ml-4 mb-6"
            >
              <Download className="h-4 w-4 mr-1" />
              下载 OMate
            </a>
          </div>

          {!dbAvailable && (
            <div className="bg-amber-500/20 border border-amber-500 text-white p-4 rounded-lg mb-6">
              <p>数据库连接不可用。请检查环境变量配置。</p>
              <p className="text-sm mt-2">您仍然可以使用角色卡编辑器功能，但内容管理功能将不可用。</p>
            </div>
          )}
        </div>

        <Tabs
          defaultValue="all"
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as ContentType | "all" | "characters")}
        >
          <div className="flex justify-between items-center mb-8">
            <TabsList>
              <TabsTrigger value="all">全部</TabsTrigger>
              <TabsTrigger value={ContentType.CHARACTER_CARD}>角色卡</TabsTrigger>
              <TabsTrigger value={ContentType.KNOWLEDGE_BASE}>知识库</TabsTrigger>
              <TabsTrigger value={ContentType.EVENT_BOOK}>事件书</TabsTrigger>
              <TabsTrigger value={ContentType.STORY_BOOK}>故事书</TabsTrigger>
              <TabsTrigger value={ContentType.PROMPT_INJECTION}>注入提示词</TabsTrigger>
            </TabsList>
            
            <div className="flex gap-2">
              {isAdmin && (
                <Button onClick={() => setShowUploadForm(true)} className="flex items-center bg-purple-600 hover:bg-purple-700 text-white">
                  <PlusIcon className="mr-2 h-4 w-4" />
                  上传内容
                </Button>
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
                className="flex items-center bg-gray-800 text-white border-gray-600 hover:bg-gray-700 px-3"
                onClick={showQRCode}
              >
                <QrCodeIcon className="h-4 w-4" />
              </Button>
              
              {/* 根据配置状态和登录状态显示不同的按钮 */}
              {isAdmin ? (
                // 管理员已登录，显示登出按钮
                <Button 
                  variant="outline" 
                  className="flex items-center bg-gray-800 text-white border-gray-600 hover:bg-gray-700" 
                  onClick={handleLogout}
                >
                  <LogOutIcon className="mr-2 h-4 w-4" />
                  登出
                </Button>
              ) : configState.hasAdminKey && (!configState.hasMemberKey || !isMember) ? (
                // 有管理员密钥但未登录，显示管理员登录按钮
                <Button 
                  variant="outline" 
                  className="flex items-center bg-gray-800 text-white border-gray-600 hover:bg-gray-700"
                  onClick={() => setShowLoginForm(true)}
                >
                  <Lock className="mr-2 h-4 w-4" />
                  管理员登录
                </Button>
              ) : isMember && !configState.allowPublicAccess ? (
                // 成员已登录，显示登出按钮
                <Button 
                  variant="outline" 
                  className="flex items-center bg-gray-800 text-white border-gray-600 hover:bg-gray-700" 
                  onClick={handleLogout}
                >
                  <LogOutIcon className="mr-2 h-4 w-4" />
                  登出
                </Button>
              ) : null}
            </div>
          </div>

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
          
          <TabsContent value="characters" className="mt-0">
            <CharacterList />
          </TabsContent>
        </Tabs>

        {/* 二维码对话框 */}
        <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>角色卡访问二维码</DialogTitle>
              <DialogDescription>
                扫描下方二维码访问角色卡JSON数据
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex flex-col items-center justify-center py-4">
              {qrCodeDataUrl && (
                <img src={qrCodeDataUrl} alt="QR Code" className="w-64 h-64" />
              )}
              <p className="mt-4 text-sm text-center text-gray-500">
                扫描二维码添加角色列表到发现页面
              </p>
              
            </div>
          </DialogContent>
        </Dialog>
      </div>
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

    if (contents.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">暂无内容</p>
          {isAdmin && (
            <Button onClick={() => setShowUploadForm(true)} variant="outline">
              上传新内容
            </Button>
          )}
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {contents.map((content) => (
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
