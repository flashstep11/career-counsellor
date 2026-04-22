export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex-1 overflow-visible px-4 md:px-8">
      {children}
    </main>
  );
}
