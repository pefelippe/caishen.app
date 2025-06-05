"use client"

import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Bell, Mail, MessageSquare, CreditCard } from "lucide-react"

export default function NotificationsPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">Notifications</h1>
        <p className="text-lg text-gray-500">Manage your notification preferences</p>
      </div>

      <Card className="bg-white p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Bell className="h-5 w-5 text-[#061B78]" />
              <div>
                <Label htmlFor="push-notifications" className="text-base font-medium text-gray-900">
                  Push Notifications
                </Label>
                <p className="text-sm text-gray-500">Receive notifications in your browser</p>
              </div>
            </div>
            <Switch id="push-notifications" />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Mail className="h-5 w-5 text-[#061B78]" />
              <div>
                <Label htmlFor="email-notifications" className="text-base font-medium text-gray-900">
                  Email Notifications
                </Label>
                <p className="text-sm text-gray-500">Receive notifications via email</p>
              </div>
            </div>
            <Switch id="email-notifications" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <MessageSquare className="h-5 w-5 text-[#061B78]" />
              <div>
                <Label htmlFor="marketing-notifications" className="text-base font-medium text-gray-900">
                  Marketing Communications
                </Label>
                <p className="text-sm text-gray-500">Receive updates about new features and promotions</p>
              </div>
            </div>
            <Switch id="marketing-notifications" />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CreditCard className="h-5 w-5 text-[#061B78]" />
              <div>
                <Label htmlFor="billing-notifications" className="text-base font-medium text-gray-900">
                  Billing Notifications
                </Label>
                <p className="text-sm text-gray-500">Receive notifications about your subscription and payments</p>
              </div>
            </div>
            <Switch id="billing-notifications" defaultChecked />
          </div>
        </div>
      </Card>
    </div>
  )
} 