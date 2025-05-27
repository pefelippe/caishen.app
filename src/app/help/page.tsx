import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Get Help</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">How do I add a new transaction?</h3>
              <p className="text-sm text-muted-foreground">
                You can add a new transaction by clicking the "+" button in the top right corner of the dashboard. 
                Fill in the transaction details and click "Save".
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium">How do I export my data?</h3>
              <p className="text-sm text-muted-foreground">
                Go to Settings > Export Data. You can choose to export your data in CSV or PDF format.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium">How do I set up recurring transactions?</h3>
              <p className="text-sm text-muted-foreground">
                When adding a new transaction, check the "Recurring" box and select the frequency (daily, weekly, monthly, etc.).
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Support</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject</label>
              <input
                type="text"
                className="w-full rounded-md border border-input bg-background px-3 py-2"
                placeholder="What do you need help with?"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 min-h-[100px]"
                placeholder="Describe your issue in detail..."
              />
            </div>
            <Button>Send Message</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Other Resources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Button variant="outline" className="w-full">
                Documentation
              </Button>
              <Button variant="outline" className="w-full">
                Video Tutorials
              </Button>
              <Button variant="outline" className="w-full">
                Community Forum
              </Button>
              <Button variant="outline" className="w-full">
                API Documentation
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 