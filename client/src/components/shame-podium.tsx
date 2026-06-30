
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { User } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { BeerOff } from "lucide-react";

interface Ranking {
  userId: number;
  username: string;
  photoId: number;
  imageUrl: string;
  caption: string | null;
  cheaterCount: number;
}

export function ShamePodium() {
  const { data: rankings = [] } = useQuery<Ranking[]>({
    queryKey: ["/api/cheater-rankings"],
  });

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0:
        return "text-red-600";
      case 1:
        return "text-red-500";
      case 2:
        return "text-red-400";
      default:
        return "text-red-300";
    }
  };

  if (rankings.length === 0) {
    return (
      <div className="text-center p-4 text-muted-foreground">
        Aucun tricheur détecté pour le moment
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rankings.map((ranking, index) => (
        <div
          key={ranking.userId}
          className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
        >
          <div className="flex items-center gap-3">
            <div className={`font-bold ${getMedalColor(index)} flex items-center`}>
              <BeerOff className="h-4 w-4" />
            </div>
            <Link href={`/profile/${ranking.userId}`}>
              <div className="flex items-center gap-2 cursor-pointer">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={ranking.imageUrl}
                    alt={ranking.username}
                  />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{ranking.username}</span>
              </div>
            </Link>
          </div>
          <div className="text-red-500 font-semibold">
            {ranking.cheaterCount} 🤥
          </div>
        </div>
      ))}
    </div>
  );
}
