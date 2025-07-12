import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface TermsOfServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TermsOfServiceModal({ isOpen, onClose }: TermsOfServiceModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-white/80 backdrop-blur-xl border-stone-200/50">
        <DialogHeader>
          <DialogTitle className="text-stone-800">Terms of Service</DialogTitle>
          <DialogDescription className="text-stone-600">
            Last updated: {new Date().toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm text-stone-600">
          <section>
            <h3 className="font-semibold text-stone-800 mb-2">1. Acceptance of Terms</h3>
            <p>
              By accessing and using Caishen, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-stone-800 mb-2">2. Use License</h3>
            <p>
              Permission is granted to temporarily use Caishen for personal, non-commercial purposes. This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Modify or copy the materials</li>
              <li>Use the materials for any commercial purpose</li>
              <li>Attempt to decompile or reverse engineer any software contained in Caishen</li>
              <li>Remove any copyright or other proprietary notations from the materials</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-stone-800 mb-2">3. Financial Information</h3>
            <p>
              Caishen provides financial management tools and insights. While we strive to provide accurate information, we do not guarantee the accuracy of financial calculations or predictions. Users should verify all financial information independently.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-stone-800 mb-2">4. User Responsibilities</h3>
            <p>
              You are responsible for maintaining the confidentiality of your account and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-stone-800 mb-2">5. Service Modifications</h3>
            <p>
              Caishen reserves the right to modify or discontinue, temporarily or permanently, the service with or without notice. We shall not be liable to you or any third party for any modification, suspension, or discontinuance of the service.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
} 