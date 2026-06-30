import { Photo, User } from "@shared/schema";
import { PhotoCard } from "./photo-card";

interface PhotoGridProps {
  photos: Photo[];
  users: Record<number, User>;
}

export function PhotoGrid({ photos, users }: PhotoGridProps) {
  return (
    <div className="space-y-8 py-8 rounded-lg">
      {photos.map((photo) => (
        <PhotoCard
          key={photo.id}
          photo={photo}
          author={users[photo.userId]}
          users={users}
        />
      ))}
    </div>
  );
}
