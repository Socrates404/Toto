import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { ProtectedLayout } from "./protected-layout";

type ProtectedRouteProps = {
  path: string;
  component: React.ComponentType<any>;
  params?: Record<string, string>;
};

export function ProtectedRoute({ path, component: Component, params }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user) {
    console.log("ProtectedRoute: Redirecting to auth - no user");
    return <Redirect to="/auth" />;
  }

  return (
    <Route path={path}>
      {(routeParams) => (
        <ProtectedLayout>
          <Component {...routeParams} {...params} />
        </ProtectedLayout>
      )}
    </Route>
  );
}
