import { useState } from "react";
import { useMutation } from "@tanstack/react-query";

// Helper function to resize images before upload
async function resizeImage(file: File, maxWidth: number): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Only resize if the image is larger than maxWidth
        const width = img.width;
        const height = img.height;
        let newWidth = width;
        let newHeight = height;

        if (width > maxWidth) {
          newWidth = maxWidth;
          newHeight = Math.floor(height * (maxWidth / width));
        }

        const canvas = document.createElement('canvas');
        canvas.width = newWidth;
        canvas.height = newHeight;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, newWidth, newHeight);

        // Convert to base64 with reduced quality (0.8 = 80% quality)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ImagePlus, Loader2 } from "lucide-react";

export function PhotoUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) return;

      // Resize and convert image to base64 for in-memory storage
      const imageUrl = await resizeImage(selectedFile, 1200); // Max width of 1200px

      await apiRequest("POST", "/api/photos", {
        imageUrl,
        caption: caption.trim() || undefined,
      });
    },
    onSuccess: () => {
      setSelectedFile(null);
      setCaption("");
      setPreviewUrl(null);
      queryClient.invalidateQueries({ queryKey: ["/api/photos/feed"] });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-center">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Aperçu"
                className="w-full aspect-square object-cover rounded-md"
              />
            ) : (
              <label className="w-full aspect-square flex items-center justify-center border-2 border-dashed rounded-md cursor-pointer hover:border-primary">
                <div className="text-center space-y-4">
                  <ImagePlus className="mx-auto h-12 w-12 text-muted-foreground" />
                  <div className="space-y-2">
                    <span className="block text-sm font-medium">
                      Téléchargez ou prenez une photo
                    </span>
                    <div className="flex justify-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id="fileInput"
                        onChange={handleFileChange}
                      />
                      <label
                        htmlFor="fileInput"
                        className="px-4 py-2 bg-orange-500 text-white rounded-md cursor-pointer hover:bg-orange-600 transition-colors duration-200 text-sm"
                      >
                        Parcourir
                      </label>
                      <Input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        id="cameraInput"
                        onChange={handleFileChange}
                      />
                      <label
                        htmlFor="cameraInput"
                        className="px-4 py-2 bg-orange-500 text-white rounded-md cursor-pointer hover:bg-orange-600 transition-colors duration-200 text-sm"
                      >
                        Appareil photo
                      </label>
                    </div>
                  </div>
                </div>
              </label>
            )}
          </div>

          <Textarea
            placeholder="Écrivez une légende..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        {previewUrl && (
          <Button variant="outline" onClick={() => {
            setSelectedFile(null);
            setPreviewUrl(null);
          }}>
            Annuler
          </Button>
        )}
        <Button
          className="ml-auto bg-orange-500 hover:bg-orange-600 text-white"
          disabled={!selectedFile || uploadMutation.isPending}
          onClick={() => uploadMutation.mutate()}
        >
          {uploadMutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Partager
        </Button>
      </CardFooter>
    </Card>
  );
}