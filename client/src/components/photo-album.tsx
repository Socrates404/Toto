import { Photo } from "@shared/schema";
import { Link } from "wouter";

interface PhotoAlbumProps {
  photos: Photo[];
}

export function PhotoAlbum({ photos }: PhotoAlbumProps) {
  if (photos.length === 0) {
    return (
      <div className="text-center py-10 text-orange-700">
        <p>Aucune publication pour le moment</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
      {photos.map((photo) => (
        <Link key={photo.id} href={`/photos/${photo.id}`} className="aspect-square group">
          <div className="w-full h-full overflow-hidden rounded-lg border border-orange-200 shadow-sm hover:shadow-md transition-all duration-300">
            <img
              src={photo.imageUrl}
              alt={photo.caption || "Photo de plat"}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        </Link>
      ))}
    </div>
  );
}