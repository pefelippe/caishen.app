import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacyPolicyModal({ isOpen, onClose }: PrivacyPolicyModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Privacy Policy</DialogTitle>
          <DialogDescription>
            Last updated: {new Date().toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm text-gray-600">
          <section>
            <h3 className="font-semibold text-gray-900 mb-2">1. Information We Collect</h3>
            <p>
              We collect information that you provide directly to us, including:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Account information (name, email, profile picture)</li>
              <li>Financial information (expenses, income, savings goals)</li>
              <li>Usage data and preferences</li>
              <li>Communication data (WhatsApp messages, notifications)</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-2">2. How We Use Your Information</h3>
            <p>
              We use the collected information to:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Provide and maintain our services</li>
              <li>Process your transactions</li>
              <li>Send you notifications and updates</li>
              <li>Improve our services and user experience</li>
              <li>Detect and prevent fraud</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-2">3. Data Security</h3>
            <p>
              We implement appropriate security measures to protect your personal information. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-2">4. Data Sharing</h3>
            <p>
              We do not sell your personal information. We may share your information with:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Service providers who assist in our operations</li>
              <li>Legal authorities when required by law</li>
              <li>Third parties with your explicit consent</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-2">5. Your Rights</h3>
            <p>
              You have the right to:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Access your personal information</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Opt-out of marketing communications</li>
              <li>Export your data</li>
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
} 