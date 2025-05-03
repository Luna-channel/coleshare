"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Lock } from "lucide-react"

interface LoginFormProps {
  onCancel?: () => void;
  initialType?: "admin" | "member";
  disableMemberLogin?: boolean;
}

export function LoginForm({ onCancel, initialType = "member", disableMemberLogin = false }: LoginFormProps) {
  const [key, setKey] = useState("")
  const [type, setType] = useState<"admin" | "member">(initialType)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      console.log("登录请求:", { type, key: "***隐藏***" });
      
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ key, type }),
      })

      const data = await response.json()
      console.log("登录响应:", { status: response.status, success: data.success });

      if (!response.ok) {
        throw new Error(data.error || "登录失败")
      }

      const tokenName = type === "admin" ? "adminToken" : "memberToken"
      // 保存token到localStorage
      localStorage.setItem(tokenName, data.token)
      
      console.log("登录成功，准备重定向...");
      
      // 使用直接的方式重定向
      window.location.href = "/";
      
    } catch (err) {
      console.error("登录失败:", err);
      setError(err instanceof Error ? err.message : "登录失败")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>登录</CardTitle>
        <CardDescription>请输入访问密钥以{type === "admin" ? "管理" : "访问"}内容</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant={type === "member" ? "default" : "outline"}
                onClick={() => setType("member")}
                disabled={disableMemberLogin}
                title={disableMemberLogin ? "未设置成员密钥" : undefined}
              >
                成员访问
              </Button>
              <Button 
                type="button" 
                variant={type === "admin" ? "default" : "outline"} 
                onClick={() => setType("admin")}
              >
                管理员访问
              </Button>
            </div>
            {disableMemberLogin && type === "admin" && (
              <p className="text-xs text-amber-500 mt-1">未设置成员密钥，仅可使用管理员登录</p>
            )}
          </div>
          <div className="space-y-2">
            <Input
              id="key"
              type="password"
              placeholder={`请输入${type === "admin" ? "管理员" : "成员"}密钥`}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              required
            />
          </div>
          {error && <div className="text-sm font-medium text-red-500">{error}</div>}
        </CardContent>
        <CardFooter className="flex justify-between">
          {onCancel && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              className="mr-2"
            >
              返回
            </Button>
          )}
          <Button type="submit" className={`${onCancel ? 'flex-1' : 'w-full'}`} disabled={isLoading}>
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent rounded-full"></div>
                <span>登录中...</span>
              </div>
            ) : (
              <div className="flex items-center">
                <Lock className="mr-2 h-4 w-4" />
                <span>登录</span>
              </div>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
