import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Redirect } from "wouter";
import { MainNav } from "@/components/main-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User as UserIcon, Loader2, UserPlus, UserMinus } from "lucide-react";
import { Photo, User } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { EditProfileDialog } from "@/components/edit-profile-dialog";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { PhotoAlbum } from "@/components/photo-album";
import { useIsMobile } from "@/hooks/use-mobile";

export default function ProfilePage() {
  const params = useParams<{ id: string }>();
  const { id } = params;
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const userId = id ? parseInt(id) : undefined;

  // Handle auto-redirect for profile
  if (!id && currentUser) {
    return <Redirect to={`/profile/${currentUser.id}`} />;
  }

  // Query user data with enhanced error handling
  const {
    data: user,
    isLoading: userLoading,
    error: userError,
  } = useQuery<User>({
    queryKey: [`/api/users/${userId}`],
    enabled: !!userId && !authLoading,
  });

  // Query photos with enhanced error handling
  const {
    data: photos = [],
    isLoading: photosLoading,
    error: photosError,
  } = useQuery<Photo[]>({
    queryKey: [`/api/photos/user/${userId}`],
    enabled: !!userId && !!user,
  });

  // Query followers/following
  const { data: followers = [] } = useQuery<User[]>({
    queryKey: [`/api/users/${userId}/followers`],
    enabled: !!userId && !!user,
  });

  const { data: following = [] } = useQuery<User[]>({
    queryKey: [`/api/users/${userId}/following`],
    enabled: !!userId && !!user,
  });

  // Is current user following this profile?
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (followers && currentUser) {
      setIsFollowing(followers.some((f) => f.id === currentUser.id));
    }
  }, [followers, currentUser]);

  // Follow/unfollow mutation
  const followMutation = useMutation({
    mutationFn: async () => {
      await apiRequest(
        isFollowing ? "DELETE" : "POST",
        `/api/users/${userId}/follow`,
      );
    },
    onSuccess: () => {
      setIsFollowing(!isFollowing);
      queryClient.invalidateQueries({
        queryKey: [`/api/users/${userId}/followers`],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour l'abonnement",
        variant: "destructive",
      });
    },
  });

  // Loading state
  if (userLoading || authLoading) {
    return (
      <>
        <MainNav />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </>
    );
  }

  // Not found state
  if (!user || !userId) {
    return (
      <>
        <MainNav />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <p>Utilisateur non trouvé</p>
        </div>
      </>
    );
  }

  return (
    <>
      <MainNav />
      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 bg-gradient-to-b from-orange-50 to-orange-100/30 min-h-[calc(100vh-4rem)] rounded-xl">
        <div className="bg-gradient-to-r from-orange-100/80 to-orange-200/60 rounded-xl p-4 sm:p-6 shadow-lg">
          <Card className="mb-6 sm:mb-8 bg-gradient-to-br from-orange-100/90 to-orange-50 shadow-md border-orange-200">
            <CardContent className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 p-4 sm:p-6">
              <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-2 border-orange-200 shadow-md flex-shrink-0">
                {user.avatarUrl ? (
                  <AvatarImage src={user.avatarUrl} alt={user.username} />
                ) : null}
                <AvatarFallback className="bg-orange-200 text-orange-700">
                  <UserIcon className="h-10 w-10 sm:h-12 sm:w-12" />
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 w-full">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                  <h1 className="text-xl sm:text-2xl font-bold text-center sm:text-left">{user.username}</h1>
                  <div className="flex justify-center sm:justify-start">
                    {currentUser?.id === userId && (
                      <EditProfileDialog
                        user={user}
                        onSuccess={() => {
                          queryClient.invalidateQueries({
                            queryKey: [`/api/users/${userId}`],
                          });
                        }}
                      />
                    )}
                  </div>
                </div>

                <div className="flex justify-center sm:justify-start">
                  <div>
                    <span className="font-bold">{photos?.length || 0}</span> publications
                  </div>
                </div>

                {user.bio && (
                  <p className="mt-4 text-muted-foreground text-center sm:text-left">{user.bio}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="bg-gradient-to-r from-orange-100/80 to-orange-200/70 rounded-xl p-3 sm:p-4 shadow-md">
            <h2 className="text-lg font-semibold mb-4 text-orange-800 text-center sm:text-left">Plats de {user.username}</h2>
            <PhotoAlbum photos={photos} />
          </div>
        </div>
      </main>
    </>
  );
}