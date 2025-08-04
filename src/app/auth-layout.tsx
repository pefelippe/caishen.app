export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ backgroundColor: '#FFFBF7' }} className="min-h-screen">
      {children}
    </div>
  );
} 