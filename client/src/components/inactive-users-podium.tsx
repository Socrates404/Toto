import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { User, Moon } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { differenceInDays } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

interface InactiveUser {
  id: number;
  username: string;
  avatarUrl: string | null;
  lastPhotoTimestamp: Date;
  daysSinceLastPost: number;
}

export function InactiveUsersPodium() {
  const { data: inactiveUsers = [] } = useQuery<InactiveUser[]>({
    queryKey: ["/api/users/inactive"],
    queryFn: async () => {
      // Fetch all users
      const users = await apiRequest<any[]>({ 
        url: "/api/users", 
        method: "GET" 
      });
      
      // For each user, get their latest photo
      const usersWithLastPhoto = await Promise.all(
        users.map(async (user) => {
          try {
            const photos = await apiRequest<any[]>({ 
              url: `/api/photos/user/${user.id}`, 
              method: "GET" 
            });
            if (photos && photos.length > 0) {
              // Sort photos by timestamp descending to get the most recent one
              photos.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
              const lastPhoto = photos[0];
              const lastTimestamp = new Date(lastPhoto.timestamp);
              const daysSince = differenceInDays(new Date(), lastTimestamp);
              
              return {
                ...user,
                lastPhotoTimestamp: lastTimestamp,
                daysSinceLastPost: daysSince
              };
            }
            return null;
          } catch (error) {
            console.error(`Error fetching photos for user ${user.id}:`, error);
            return null;
          }
        })
      );
      
      // Filter out users with no photos and those active within the last week
      const inactive = usersWithLastPhoto
        .filter(user => user && user.daysSinceLastPost > 7)
        .sort((a, b) => b!.daysSinceLastPost - a!.daysSinceLastPost);
      
      return inactive as InactiveUser[];
    }
  });



  // Helper function to get inactivity level description
  const getInactivityLevel = (days: number) => {
    if (days > 30) return "En grève de cuisine";
    if (days > 21) return "A perdu sa cuisine";
    if (days > 14) return "Manque d'inspiration";
    return "Besoin de motivation";
  };

  if (inactiveUsers.length === 0) {
    return (
      <div className="text-center p-4 text-muted-foreground">
        Aucun utilisateur inactif pour le moment
      </div>
    );
  }

  return (
    <Card className="shadow-md">
      <CardContent className="p-4">
        <div className="space-y-4">
          {inactiveUsers.map((inactiveUser, index) => (
            <div
              key={inactiveUser.id}
              className="flex items-center justify-between p-2 rounded-lg bg-orange-50 border border-orange-100"
            >
              <div className="flex items-center gap-3">
                <div className="font-bold text-gray-500 flex items-center">
                  <Moon className="h-4 w-4" />
                </div>
                <Link href={`/profile/${inactiveUser.id}`}>
                  <div className="flex items-center gap-2 cursor-pointer">
                    <Avatar className="h-8 w-8">
                      {inactiveUser.avatarUrl ? (
                        <AvatarImage
                          src={inactiveUser.avatarUrl}
                          alt={inactiveUser.username}
                        />
                      ) : (
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium">{inactiveUser.username}</span>
                      <span className="text-xs text-muted-foreground">
                        {getInactivityLevel(inactiveUser.daysSinceLastPost)}
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-orange-600 font-semibold">
                  {inactiveUser.daysSinceLastPost} jours
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}