import { useQuery, useMutation } from "@tanstack/react-query";
import { MainNav } from "@/components/main-nav";
import { User } from "@shared/schema";
import { Loader2, UserPlus, UserMinus, Star, Trophy, Beer } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { ShamePodium } from "@/components/shame-podium"; // Add this import

export default function FriendsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Query all users
  const { data: allUsers = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: !!user,
  });

  // Query following list
  const { data: following = [], isLoading: isLoadingFollowing } = useQuery<User[]>({
    queryKey: [`/api/users/${user?.id}/following`],
    enabled: !!user,
  });

  // Query average ratings
  const { data: averageRatings = {} } = useQuery<Record<number, number>>({
    queryKey: ["/api/users/ratings/average"],
    enabled: !!user,
  });

  // Follow mutation
  const followMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("POST", `/api/users/${userId}/follow`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/following`] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to follow user",
        variant: "destructive",
      });
    },
  });

  // Unfollow mutation
  const unfollowMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("DELETE", `/api/users/${userId}/follow`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/following`] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to unfollow user",
        variant: "destructive",
      });
    },
  });

  if (!user) {
    return (
      <>
        <MainNav />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <p>Veuillez vous connecter pour voir les autres utilisateurs.</p>
        </div>
      </>
    );
  }

  if (isLoadingUsers || isLoadingFollowing) {
    return (
      <>
        <MainNav />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </>
    );
  }

  const followingIds = following.map(f => f.id);

  // Create top 3 ranking
  const topUsers = [...allUsers]
    .sort((a, b) => (averageRatings[b.id] || 0) - (averageRatings[a.id] || 0))
    .slice(0, 3);

  return (
    <>
      <MainNav />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-center mb-2 text-orange-700">Amis et Chefs</h1>
          <p className="text-center text-muted-foreground">Découvrez qui sont les meilleurs cuisiniers et les plus grands tricheurs</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left column for Top 3 Chefs */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 rounded-xl p-6 shadow-sm">
              <h2 className="text-2xl font-bold mb-6 flex items-center border-b pb-2">
                <Trophy className="h-7 w-7 mr-2 text-amber-500" />
                Les Cuistos
              </h2>
              
              <div className="space-y-4">
                {topUsers.map((user, index) => {
                  const rating = averageRatings[user.id] || 0;
                  const medals = ['🥇', '🥈', '🥉'];
                  const bgColors = [
                    'bg-gradient-to-r from-amber-200 to-yellow-200 dark:from-amber-700/50 dark:to-yellow-700/40',
                    'bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-600/40 dark:to-slate-700/30',
                    'bg-gradient-to-r from-amber-800/40 to-amber-700/30 dark:from-amber-800/30 dark:to-amber-700/20'
                  ];
                  
                  return (
                    <Link href={`/profile/${user.id}`} key={user.id}>
                      <div className={`${bgColors[index]} rounded-lg p-4 flex items-center space-x-4 hover:opacity-90 transition-opacity cursor-pointer`}>
                        <div className="relative">
                          <Avatar className="h-14 w-14 border-2 border-white dark:border-slate-800">
                            {user.avatarUrl ? (
                              <AvatarImage src={user.avatarUrl} alt={user.username} />
                            ) : (
                              <AvatarFallback className="text-lg">
                                {user.username[0].toUpperCase()}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="absolute -top-2 -right-2 text-xl">
                            {medals[index]}
                          </div>
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{user.username}</h3>
                          <div className="flex items-center bg-white/50 dark:bg-slate-800/50 rounded-full px-3 py-1 text-sm">
                            <Star className="h-4 w-4 mr-1 fill-amber-400 text-amber-400" />
                            <span className="font-medium">{rating.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
                
                {topUsers.length === 0 && (
                  <div className="text-center p-4 text-muted-foreground">
                    Aucune notation pour le moment
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Center column for Wall of Shame */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 rounded-xl p-6 shadow-sm">
              <h2 className="text-2xl font-bold mb-4 flex items-center border-b pb-2 text-red-700 dark:text-red-400">
                <span className="text-2xl mr-2">🤥</span>
                Mur de la honte
              </h2>
              
              <ShamePodium />
            </div>
          </div>
          
          {/* Right column for User List */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 rounded-xl p-6 shadow-sm">
              <h2 className="text-2xl font-bold mb-6 flex items-center border-b pb-2">
                <UserPlus className="h-7 w-7 mr-2 text-blue-500" />
                Tous les utilisateurs
              </h2>
              
              {allUsers.length === 0 ? (
                <div className="text-center text-muted-foreground">
                  Aucun utilisateur trouvé.
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {allUsers.map((otherUser) => {
                    const isFollowing = followingIds.includes(otherUser.id);
                    const rating = averageRatings[otherUser.id] || 0;
                    const isCurrentUser = otherUser.id === user.id;

                    return (
                      <div 
                        key={otherUser.id}
                        className={`p-3 rounded-lg ${isCurrentUser ? "bg-primary/10" : "bg-white dark:bg-slate-800/50"} flex items-center justify-between`}
                      >
                        <Link href={`/profile/${otherUser.id}`}>
                          <div className="flex items-center space-x-3 cursor-pointer">
                            <Avatar className="h-10 w-10 border border-slate-200 dark:border-slate-700">
                              {otherUser.avatarUrl ? (
                                <AvatarImage
                                  src={otherUser.avatarUrl}
                                  alt={otherUser.username}
                                />
                              ) : (
                                <AvatarFallback>
                                  {otherUser.username[0].toUpperCase()}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div>
                              <h3 className="font-medium flex items-center">
                                {otherUser.username}
                                {isCurrentUser && (
                                  <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                                    Vous
                                  </span>
                                )}
                              </h3>
                              <div className="flex items-center text-xs text-muted-foreground">
                                <Star className="h-3 w-3 mr-1 inline" />
                                {rating.toFixed(1)}
                              </div>
                            </div>
                          </div>
                        </Link>
                        
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}