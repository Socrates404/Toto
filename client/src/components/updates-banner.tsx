import { useState, useEffect } from "react";
import { BellRing, X } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface Update {
  id: number;
  message: string;
  date: string;
}

const updates: Update[] = [
  {
    id: 1,
    message: "Mur de la honte ajouté, gare à vous les tricheurs ! \
      Nouveau design, j'espère qu'il vous plait.",
    date: "22/03/2025",
  }
  // Les futures mises à jour peuvent être ajoutées ici
];

export function UpdatesBanner() {
  const [showBanner, setShowBanner] = useState(true);
  const [currentUpdateIndex, setCurrentUpdateIndex] = useState(0);
  
  // Forcer l'affichage de la bannière à chaque chargement de la page
  useEffect(() => {
    setShowBanner(true);
  }, []);

  // Sauvegarde l'état du banner quand il change
  useEffect(() => {
    localStorage.setItem(
      "updatesBannerState",
      JSON.stringify({
        showBanner,
        lastSeenUpdateId: updates[updates.length - 1]?.id || 0,
      })
    );
  }, [showBanner]);

  if (!showBanner || updates.length === 0) {
    return null;
  }

  const currentUpdate = updates[currentUpdateIndex];

  return (
    <Alert className="relative mb-4 border-orange-200 bg-gradient-to-r from-orange-50 to-orange-100/80 shadow-md rounded-xl">
      <BellRing className="h-4 w-4 text-orange-600" />
      <AlertTitle className="flex items-center justify-between">
        <span className="text-orange-700 font-medium">Mise à jour TOTO</span>
        <span className="text-xs text-orange-600/80">
          {currentUpdate.date}
        </span>
      </AlertTitle>
      <AlertDescription className="mt-1 text-orange-800">
        {currentUpdate.message}
      </AlertDescription>
      
      <Button
        size="icon"
        variant="ghost"
        className="absolute right-2 top-2 h-8 w-8 text-muted-foreground/70 hover:text-foreground"
        onClick={() => setShowBanner(false)}
      >
        <X className="h-5 w-5" />
      </Button>
      
      {updates.length > 1 && (
        <div className="mt-2 flex justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => 
              setCurrentUpdateIndex((prev) => 
                prev > 0 ? prev - 1 : updates.length - 1
              )
            }
            disabled={updates.length <= 1}
          >
            Précédent
          </Button>
          <div className="flex items-center gap-1">
            {updates.map((_, index) => (
              <span
                key={index}
                className={`h-1.5 w-1.5 rounded-full ${
                  index === currentUpdateIndex
                    ? "bg-orange-600"
                    : "bg-orange-300/50"
                }`}
              />
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => 
              setCurrentUpdateIndex((prev) => 
                prev < updates.length - 1 ? prev + 1 : 0
              )
            }
            disabled={updates.length <= 1}
          >
            Suivant
          </Button>
        </div>
      )}
    </Alert>
  );
}