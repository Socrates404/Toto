import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, insertUserSchema } from "@shared/schema";
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { User as UserIcon, ImagePlus, Trash2, Loader2 } from "lucide-react";

interface EditProfileDialogProps {
  user: User;
  onSuccess: () => void;
}

export function EditProfileDialog({ user, onSuccess }: EditProfileDialogProps) {
  const { toast } = useToast();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(user.avatarUrl);

  console.log("EditProfileDialog mounted/updated:", {
    userId: user.id,
    username: user.username,
    userEmail: user.email,
    userBio: user.bio,
    timestamp: new Date().toISOString()
  });

  const form = useForm({
    resolver: zodResolver(
      insertUserSchema
        .partial()
        .omit({ password: true, avatarUrl: true })
    ),
    defaultValues: {
      username: user.username,
      bio: user.bio ?? "",
      email: user.email ?? "",
    },
  });

  // Log form state after initialization
  console.log("Form state after initialization:", {
    values: form.getValues(),
    defaultValues: {
      username: user.username,
      email: user.email,
      bio: user.bio
    },
    timestamp: new Date().toISOString()
  });

  useEffect(() => {
    console.log("User prop changed:", {
      id: user.id,
      username: user.username,
      email: user.email,
      bio: user.bio,
      timestamp: new Date().toISOString()
    });

    const currentValues = form.getValues();
    console.log("Current form values before reset:", {
      username: currentValues.username,
      email: currentValues.email,
      bio: currentValues.bio,
      timestamp: new Date().toISOString()
    });

    form.reset({
      username: user.username,
      email: user.email ?? "",
      bio: user.bio ?? ""
    });

    const newValues = form.getValues();
    console.log("Form values after explicit reset:", {
      username: newValues.username,
      email: newValues.email,
      bio: newValues.bio,
      timestamp: new Date().toISOString()
    });
  }, [user, form.reset]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteAvatar = () => {
    setAvatarFile(null);
    setPreviewUrl(null);
  };

  const resizeImage = async (file: File, maxWidth: number): Promise<string | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg'));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };


  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<User>) => {
      let avatarUrl: string | null = null;

      if (avatarFile) {
        const resizedAvatarUrl = await resizeImage(avatarFile, 400);
        if (resizedAvatarUrl) {
          const res = await fetch('/api/users/' + user.id + '/avatar', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ avatarUrl: resizedAvatarUrl }),
          });
          if (!res.ok) {
            throw new Error('Failed to upload avatar');
          }
          const uploadResponse = await res.json();
          avatarUrl = uploadResponse.avatarUrl;
        }
      } else if (user.avatarUrl && avatarFile === null) {
        const res = await apiRequest("DELETE", `/api/users/${user.id}/avatar`);
        if (!res.ok) {
          throw new Error('Failed to delete avatar');
        }

      }

      const res = await apiRequest("PATCH", `/api/users/${user.id}`, {
        ...data,
        avatarUrl,
      });
      console.log("API response:", res); //added log to check api response
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Profil mis à jour",
        description: "Votre profil a été mis à jour avec succès.",
      });
      onSuccess();
    },
    onError: (err) => {
      toast({
        title: "Mise à jour échouée",
        description: "Échec de la mise à jour du profil. Veuillez réessayer." + err.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Modifier Profil</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogDescription id="profile-form-description">
          Effectuez des modifications à votre profil ci-dessous.
        </DialogDescription>
        <DialogHeader>
          <DialogTitle>Modifier Profil</DialogTitle>
          <DialogDescription id="profile-form-description">
            Mettez à jour vos informations de profil ci-dessous.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((data) => {
              console.log("Form data submitted:", data); // Added log to inspect submitted data
              updateProfileMutation.mutate(data);
            })}
            className="space-y-4"
          >
            <div className="flex items-center justify-center">
              {previewUrl ? (
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={previewUrl} alt="Aperçu de l'avatar" />
                    <AvatarFallback>
                      <UserIcon className="h-12 w-12" />
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                    onClick={() => {
                      handleDeleteAvatar();
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <Avatar className="h-24 w-24">
                    <AvatarFallback>
                      <ImagePlus className="h-12 w-12 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <Input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              )}
            </div>

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom d'utilisateur</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className="w-full"
            >
              {updateProfileMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Enregistrer les modifications
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}