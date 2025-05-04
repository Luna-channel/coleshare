import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { X, Save } from "lucide-react"

interface SiteSettingsFormProps {
  onSuccess: () => void
  onCancel: () => void
}

interface SiteSettings {
  site_name: string
  show_download_link: boolean
  page_title: string
  meta_description: string
}

export function SiteSettingsForm({ onSuccess, onCancel }: SiteSettingsFormProps) {
  const [settings, setSettings] = useState<SiteSettings>({
    site_name: "",
    show_download_link: true,
    page_title: "",
    meta_description: ""
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 加载当前站点设置
  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true)
      try {
        const response = await fetch("/api/site-settings")
        if (!response.ok) {
          throw new Error("获取站点设置失败")
        }
        const data = await response.json()
        setSettings({
          site_name: data.site_name || "OMateShare",
          show_download_link: data.show_download_link !== undefined ? data.show_download_link : true,
          page_title: data.page_title || "OMateShare",
          meta_description: data.meta_description || "管理角色卡、知识库、事件书和提示注入"
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : "获取站点设置失败")
      } finally {
        setIsLoading(false)
      }
    }

    fetchSettings()
  }, [])

  // 处理提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/site-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
        },
        body: JSON.stringify(settings),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "更新站点设置失败")
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新站点设置失败")
    } finally {
      setIsLoading(false)
    }
  }

  // 处理表单字段变更
  const handleChange = (field: keyof SiteSettings, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>网站设置</CardTitle>
        <CardDescription>自定义网站显示和行为</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="site_name">网站名称</Label>
            <Input
              id="site_name"
              value={settings.site_name}
              onChange={(e) => handleChange("site_name", e.target.value)}
              placeholder="网站名称"
            />
            <p className="text-sm text-gray-500">显示在网站标题和页面中的名称</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="page_title">页面标题</Label>
            <Input
              id="page_title"
              value={settings.page_title}
              onChange={(e) => handleChange("page_title", e.target.value)}
              placeholder="页面标题"
            />
            <p className="text-sm text-gray-500">浏览器标签页显示的标题</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="meta_description">网站描述</Label>
            <Textarea
              id="meta_description"
              value={settings.meta_description}
              onChange={(e) => handleChange("meta_description", e.target.value)}
              placeholder="网站描述"
              rows={3}
            />
            <p className="text-sm text-gray-500">用于SEO的网站描述</p>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="show_download_link">显示下载OMate链接</Label>
              <p className="text-sm text-gray-500">是否在网站标题旁边显示下载OMate链接</p>
            </div>
            <Switch
              id="show_download_link"
              checked={settings.show_download_link}
              onCheckedChange={(checked) => handleChange("show_download_link", checked)}
            />
          </div>

          {error && <div className="text-sm font-medium text-red-500">{error}</div>}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            <X className="mr-2 h-4 w-4" />
            取消
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent rounded-full"></div>
                <span>保存中...</span>
              </div>
            ) : (
              <div className="flex items-center">
                <Save className="mr-2 h-4 w-4" />
                <span>保存设置</span>
              </div>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
} 