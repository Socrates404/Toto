import { ReactNode } from "react";
import { UpdatesBanner } from "@/components/updates-banner";
import { useAuth } from "@/hooks/use-auth";

interface ProtectedLayoutProps {
  children: ReactNode;
}

export function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const { user } = useAuth();

  // Ne render rien si l'utilisateur n'est pas connecté
  // (la redirection est gérée par ProtectedRoute)
  if (!user) {
    return null;
  }

  return (
    <div className="container py-4 px-4 md:px-6 max-w-7xl mx-auto">
      <UpdatesBanner />
      {children}
    </div>
  );
}