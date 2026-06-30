import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import ProfilePage from "@/pages/profile-page";
import FriendsPage from "@/pages/friends-page";
import PhotoDetailPage from "@/pages/photo-detail-page";
import RecipesPage from "@/pages/recipes-page";
import RecipeDetailPage from "@/pages/recipe-detail-page";
import CreateRecipePage from "@/pages/create-recipe-page";
import { AuthProvider } from "./hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import ResetPasswordPage from "./pages/reset-password-page";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/home" component={HomePage} />
      <ProtectedRoute path="/profile/:id" component={ProfilePage} />
      <ProtectedRoute path="/photos/:id" component={PhotoDetailPage} />
      <ProtectedRoute path="/friends" component={FriendsPage} />
      <ProtectedRoute path="/recipes" component={RecipesPage} />
      <ProtectedRoute path="/recipes/new" component={CreateRecipePage} />
      <ProtectedRoute path="/recipes/:recipeId" component={RecipeDetailPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
