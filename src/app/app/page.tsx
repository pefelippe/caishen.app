"use client"

import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Brain, MessageSquare, Wallet } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function LandingPage() {
  const router = useRouter()
  const [isLocalhost, setIsLocalhost] = useState(true)

  useEffect(() => {
    setIsLocalhost(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  }, [])

  const handleGetStarted = () => {
    if (isLocalhost) {
      router.push('/login')
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  Smart Expense Control
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  Take control of your finances with our intelligent expense tracking system
                </p>
              </div>
              <div className="space-y-4">
                {isLocalhost ? (
                  <Button onClick={handleGetStarted} className="bg-[#061B78] text-white hover:bg-[#061B78]/90">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <div className="text-center space-y-2">
                    <p className="text-lg font-medium text-gray-900">Early Access Coming Soon</p>
                    <p className="text-sm text-gray-500">We're working hard to bring you the best financial management experience.</p>
                    <p className="text-sm text-gray-500">Join our waitlist to be the first to know when we launch!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-50">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-3 lg:gap-12">
              <Card className="flex flex-col items-center text-center">
                <CardHeader>
                  <Brain className="h-12 w-12 mx-auto text-[#061B78]" />
                  <CardTitle>AI-Powered Insights</CardTitle>
                  <CardDescription>
                    Get intelligent insights and recommendations to optimize your spending
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="flex flex-col items-center text-center">
                <CardHeader>
                  <Wallet className="h-12 w-12 mx-auto text-[#061B78]" />
                  <CardTitle>Smart Expense Control</CardTitle>
                  <CardDescription>
                    Track and categorize your expenses automatically with smart AI
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="flex flex-col items-center text-center">
                <CardHeader>
                  <MessageSquare className="h-12 w-12 mx-auto text-[#061B78]" />
                  <CardTitle>WhatsApp Integration</CardTitle>
                  <CardDescription>
                    Receive updates and insights directly through WhatsApp
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Everything you need to know about Caishen - Track your money
                </h2>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  Your Financial Journey Starts Here
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
} 