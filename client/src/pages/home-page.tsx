import { useQuery } from "@tanstack/react-query";
import { MainNav } from "@/components/main-nav";
import { PhotoUpload } from "@/components/photo-upload";
import { PhotoGrid } from "@/components/photo-grid";

import { Photo, User } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function HomePage() {
  const { data: photos, isLoading: isLoadingPhotos } = useQuery<Photo[]>({
    queryKey: ["/api/photos/feed"],
  });

  const { data: userMap, isLoading: isLoadingUsers } = useQuery<
    Record<number, User>
  >({
    queryKey: ["users-for-feed"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      const users = await res.json();
      return Object.fromEntries(users.map((user: User) => [user.id, user]));
    },
  });

  if (isLoadingPhotos || isLoadingUsers || !photos || !userMap) {
    return (
      <>
        <MainNav />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </>
    );
  }

  return (
    <>
      <MainNav />
      <main className="container mx-auto px-4 py-6 bg-gradient-to-b from-orange-50 to-orange-100/30 min-h-[calc(100vh-4rem)]">
        <div className="max-w-2xl mx-auto mb-8">
          <h2 className="text-2xl font-bold text-orange-800 mb-4">Quelques règles</h2>
          <ul className="space-y-2 text-orange-700">
            <li>- Partagez les plats que vous concoctez</li>
            <li>- Si vous n'en êtes pas l'auteur, vous serez reporté comme tricheur</li>
            <li>- Si c'est l'apéro, il n'y a pas de triche, vous pouvez partager votre gnaule préférée</li>
          </ul>
        </div>

        <Tabs defaultValue="feed" className="mt-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 bg-gradient-to-r from-orange-100 to-orange-100/80 shadow-md rounded-xl overflow-hidden border border-orange-200 text-orange-700">
            <TabsTrigger value="feed" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-200 data-[state=active]:to-orange-300/60 data-[state=active]:text-orange-800 hover:text-orange-800 font-medium transition-all">Les derniers plats</TabsTrigger>
            <TabsTrigger value="upload" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-200 data-[state=active]:to-orange-300/60 data-[state=active]:text-orange-800 hover:text-orange-800 font-medium transition-all">Partager</TabsTrigger>
          </TabsList>
          <TabsContent value="feed">
            {photos && userMap && <PhotoGrid photos={photos} users={userMap} />}
          </TabsContent>
          <TabsContent value="upload">
            <PhotoUpload />
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}
