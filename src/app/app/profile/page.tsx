"use client"

import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"

export default function ProfilePage() {
  const { displayName, email } = useAuth()

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">Profile</h1>
        <p className="text-lg text-gray-500">Manage your account settings and preferences</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-white p-6">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-6">Personal Information</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" defaultValue={displayName || ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" defaultValue={email || ''} disabled />
            </div>
            <Button className="w-full">Save Changes</Button>
          </div>
        </Card>

        <Card className="bg-white p-6">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-6">Security</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input id="current-password" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input id="new-password" type="password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input id="confirm-password" type="password" />
            </div>
            <Button className="w-full">Update Password</Button>
          </div>
        </Card>
      </div>
    </div>
  )
} 