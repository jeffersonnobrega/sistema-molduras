import AdminSessionGuard from "@/components/admin/AdminSessionGuard";

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AdminSessionGuard>{children}</AdminSessionGuard>;
}
