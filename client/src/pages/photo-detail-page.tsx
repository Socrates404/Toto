import { useParams, Redirect, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { MainNav } from "@/components/main-nav";
import { Loader2, ArrowLeft } from "lucide-react";
import { Photo, User, Comment } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { PhotoCard } from "@/components/photo-card";

export default function PhotoDetailPage() {
  const params = useParams<{ id: string }>();
  const { id } = params;
  const { user: currentUser, isLoading: authLoading } = useAuth();
  
  const photoId = id ? parseInt(id) : undefined;

  // Query photo data with better error handling
  const {
    data: photo,
    isLoading: photoLoading,
    error: photoError,
  } = useQuery<Photo>({
    queryKey: [`/api/photos/${photoId}`],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/photos/${photoId}`);
        if (!res.ok) {
          throw new Error("Photo not found");
        }
        return await res.json();
      } catch (error) {
        console.error("Error fetching photo:", error);
        throw error;
      }
    },
    enabled: !!photoId,
    retry: false,  // Don't retry if photo not found
  });

  // Query photo author
  const {
    data: author,
    isLoading: authorLoading,
  } = useQuery<User>({
    queryKey: [`/api/users/${photo?.userId}`],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/users/${photo?.userId}`);
        if (!res.ok) {
          throw new Error("User not found");
        }
        return await res.json();
      } catch (error) {
        console.error("Error fetching user:", error);
        throw error;
      }
    },
    enabled: !!photo?.userId,
  });

  // Query all users for comments display
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: !!photo,
  });

  // Convert users array to map for easy lookup
  const userMap: Record<number, User> = {};
  users.forEach(user => {
    userMap[user.id] = user;
  });
  
  // Loading state
  if ((photoLoading && !photoError) || authLoading || (authorLoading && photo)) {
    return (
      <>
        <MainNav />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-orange-700" />
        </div>
      </>
    );
  }

  // Error or not found state
  if (!photo || !photoId || photoError) {
    return (
      <>
        <MainNav />
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-8 bg-gradient-to-b from-orange-50 to-orange-100/30">
          <div className="bg-gradient-to-r from-orange-100/80 to-orange-200/60 rounded-xl p-6 sm:p-8 shadow-lg max-w-md w-full text-center">
            <p className="text-xl font-medium text-orange-800 mb-6">Photo non trouvée</p>
            <p className="text-sm text-orange-700 mb-8">Cette photo n'existe pas ou a été supprimée.</p>
            <Link href="/home">
              <Button className="bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour à l'accueil
              </Button>
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <MainNav />
      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 bg-gradient-to-b from-orange-50 to-orange-100/30 min-h-[calc(100vh-4rem)]">
        <div className="mb-6 flex items-center">
          <Link href={author ? `/profile/${author.id}` : "/home"}>
            <Button variant="ghost" className="text-orange-700 hover:text-orange-800 hover:bg-orange-100">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {author ? `Retour au profil de ${author.username}` : "Retour"}
            </Button>
          </Link>
        </div>
        
        <div className="bg-gradient-to-r from-orange-100/80 to-orange-200/60 rounded-xl p-4 sm:p-6 shadow-lg">
          <div className="max-w-3xl mx-auto">
            {photo && author && (
              <PhotoCard 
                photo={photo} 
                author={author} 
                users={userMap} 
              />
            )}
          </div>
        </div>
      </main>
    </>
  );
}