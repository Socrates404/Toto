import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Home, User, Users, Utensils, LogOut } from "lucide-react";

export function MainNav() {
  const { user, logoutMutation } = useAuth();

  return (
    <nav className="border-b border-orange-200 bg-gradient-to-r from-orange-100 to-orange-200/70 shadow-sm rounded-xl">
      <div className="flex h-16 items-center px-4 container mx-auto">
        <Link href="/">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg">
              <Utensils className="h-6 w-6 text-orange-500" />
            </div>
            <span className="font-bold text-2xl cursor-pointer bg-gradient-to-r from-orange-500 to-red-600 text-transparent bg-clip-text">TOTO</span>
          </div>
        </Link>

        <div className="ml-auto flex items-center space-x-5">
          <Link href="/">
            <div className="flex flex-col items-center group">
              <div className="p-2 rounded-full transition-colors hover:bg-orange-200 cursor-pointer">
                <Home className="h-5 w-5 text-orange-600 group-hover:text-orange-700" />
              </div>
              <span className="text-[10px] font-medium text-orange-700">Accueil</span>
            </div>
          </Link>

          <Link href="/friends">
            <div className="flex flex-col items-center group">
              <div className="p-2 rounded-full transition-colors hover:bg-orange-200 cursor-pointer">
                <Users className="h-5 w-5 text-orange-600 group-hover:text-orange-700" />
              </div>
              <span className="text-[10px] font-medium text-orange-700">Amis</span>
            </div>
          </Link>

          {user && (
            <Link href={`/profile/${user.id}`}>
              <div className="flex flex-col items-center group">
                <Avatar className="h-9 w-9 cursor-pointer border-2 border-orange-300 hover:border-orange-400 transition-colors">
                  {user.avatarUrl ? (
                    <AvatarImage src={user.avatarUrl} alt={user.username} />
                  ) : null}
                  <AvatarFallback className="bg-orange-200 text-orange-700">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <span className="text-[10px] font-medium text-orange-700">Profil</span>
              </div>
            </Link>
          )}

          <div className="flex flex-col items-center">
            <Button 
              variant="ghost" 
              onClick={() => logoutMutation.mutate()}
              className="text-orange-600 hover:text-orange-800 hover:bg-orange-200 rounded-full p-2 h-auto"
            >
              <LogOut className="h-5 w-5" />
            </Button>
            <span className="text-[10px] font-medium text-orange-700">Déconnexion</span>
          </div>
        </div>
      </div>
    </nav>
  );
}