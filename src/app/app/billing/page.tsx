"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CreditCard, Package } from "lucide-react"

export default function BillingPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">Billing</h1>
        <p className="text-lg text-gray-500">Manage your subscription and payment methods</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-white p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold tracking-tight text-gray-900">Current Plan</h2>
            <Badge variant="default">Pro</Badge>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Package className="h-8 w-8 text-[#061B78]" />
              <div>
                <p className="font-medium text-gray-900">Pro Plan</p>
                <p className="text-sm text-gray-500">$29/month</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Features included:</p>
              <ul className="list-disc list-inside text-sm text-gray-500 space-y-1">
                <li>Unlimited expenses tracking</li>
                <li>Advanced analytics</li>
                <li>Priority support</li>
                <li>Custom categories</li>
              </ul>
            </div>
            <Button variant="outline" className="w-full">Change Plan</Button>
          </div>
        </Card>

        <Card className="bg-white p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold tracking-tight text-gray-900">Payment Method</h2>
            <Badge variant="secondary">Active</Badge>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <CreditCard className="h-8 w-8 text-[#061B78]" />
              <div>
                <p className="font-medium text-gray-900">Visa ending in 4242</p>
                <p className="text-sm text-gray-500">Expires 12/2024</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Next billing date: January 1, 2024</p>
              <p className="text-sm text-gray-500">Amount: $29.00</p>
            </div>
            <Button variant="outline" className="w-full">Update Payment Method</Button>
          </div>
        </Card>
      </div>
    </div>
  )
} 