import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Star,
  MessageCircle,
  User,
  Loader2,
  Trash2,
  Edit2,
  BeerOff, // Changed from CheerOff to BeerOff
  Moon, // For inactive users
  ThumbsUp, // For like comments
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Photo, Comment, Rating, User as UserType } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format, subDays, isAfter } from "date-fns";
import { fr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface PhotoCardProps {
  photo: Photo;
  author: UserType | undefined;
  users: Record<number, UserType>;
}

export function PhotoCard({ photo, author, users }: PhotoCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comment, setComment] = useState("");
  const [editedCaption, setEditedCaption] = useState(photo.caption);
  const [isEditingCaption, setIsEditingCaption] = useState(false);

  const { data: ratings = [] } = useQuery<Rating[]>({
    queryKey: [`/api/photos/${photo.id}/ratings`],
    enabled: !!photo.id, // Ne pas exécuter la requête si photo.id est undefined ou null
  });

  const { data: userRating } = useQuery<Rating | null>({
    queryKey: [`/api/photos/${photo.id}/rating`],
    enabled: !!photo.id,
  });

  const { data: averageRating } = useQuery<{ average: number | string }>({
    queryKey: [`/api/photos/${photo.id}/rating/average`],
    enabled: !!photo.id,
  });

  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: [`/api/photos/${photo.id}/comments`],
    enabled: !!photo.id,
  });
  
  // Load comment likes when comments are loaded
  useEffect(() => {
    // Pour chaque commentaire, récupérer le statut de like et le nombre de likes
    if (comments && comments.length > 0) {
      comments.forEach((comment) => {
        checkCommentLikeStatus(comment.id);
        getCommentLikeCount(comment.id);
      });
    }
  }, [comments]);
  
  // Store comment likes status in a map
  const [commentLikeStatus, setCommentLikeStatus] = useState<Record<number, boolean>>({});
  
  // Store comment likes count in a map
  const [commentLikeCount, setCommentLikeCount] = useState<Record<number, number>>({});

  const ratingMutation = useMutation({
    mutationFn: async (score: number) => {
      await apiRequest("POST", `/api/photos/${photo.id}/rate`, { score });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/photos/${photo.id}/ratings`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/photos/${photo.id}/rating`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/photos/${photo.id}/rating/average`],
      });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/photos/${photo.id}/comments`, {
        content: comment,
      });
    },
    onSuccess: () => {
      setComment("");
      queryClient.invalidateQueries({
        queryKey: [`/api/photos/${photo.id}/comments`],
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/photos/${photo.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/photos/feed"] });
      queryClient.invalidateQueries({
        queryKey: [`/api/photos/user/${photo.userId}`],
      });
      toast({
        title: "Photo supprimée",
        description: "Votre photo a été supprimée avec succès.",
      });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      await apiRequest("DELETE", `/api/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/photos/${photo.id}/comments`],
      });
      toast({
        title: "Commentaire supprimé",
        description: "Votre commentaire a été supprimé avec succès.",
      });
    },
  });

  const updateCaptionMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/photos/${photo.id}`, {
        caption: editedCaption,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/photos/feed"] });
      queryClient.invalidateQueries({
        queryKey: [`/api/photos/user/${photo.userId}`],
      });
      setIsEditingCaption(false);
      toast({
        title: "Légende mise à jour",
        description: "La légende de votre photo a été mise à jour avec succès.",
      });
    },
  });

  const { data: hasReportedCheating = false } = useQuery<boolean>({
    queryKey: [`/api/photos/${photo.id}/cheater/status`],
    enabled: !!photo.id,
  });

  const cheaterMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/photos/${photo.id}/cheater`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/photos/${photo.id}/cheater/status`],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/photos/feed"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/cheater-rankings"],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/photos/${photo.id}`],
      });
      toast({
        title: "Signalé comme tricheur !",
        description: "Son plat n'a pas été concocté de ses propres mains.",
      });
    },
  });
  
  const cancelCheaterMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/photos/${photo.id}/cheater`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/photos/${photo.id}/cheater/status`],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/photos/feed"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/cheater-rankings"],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/photos/${photo.id}`],
      });
      toast({
        title: "Signalement annulé",
        description: "Vous avez retiré votre signalement.",
      });
    },
  });
  
  // Mutation pour aimer un commentaire
  const likeCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      await apiRequest("POST", `/api/comments/${commentId}/like`);
    },
    onSuccess: (_, commentId) => {
      setCommentLikeStatus(prev => ({
        ...prev,
        [commentId]: true
      }));
      // Mettre à jour le compteur de likes
      setCommentLikeCount(prev => ({
        ...prev,
        [commentId]: (prev[commentId] || 0) + 1
      }));
      toast({
        title: "J'aime ajouté",
        description: "Vous avez aimé ce commentaire",
      });
      
      // Rafraîchir le nombre de likes
      getCommentLikeCount(commentId);
    },
  });
  
  // Mutation pour ne plus aimer un commentaire
  const unlikeCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      await apiRequest("DELETE", `/api/comments/${commentId}/like`);
    },
    onSuccess: (_, commentId) => {
      setCommentLikeStatus(prev => ({
        ...prev,
        [commentId]: false
      }));
      // Mettre à jour le compteur de likes
      setCommentLikeCount(prev => ({
        ...prev,
        [commentId]: Math.max(0, (prev[commentId] || 0) - 1)
      }));
      toast({
        title: "J'aime retiré",
        description: "Vous n'aimez plus ce commentaire",
      });
      
      // Rafraîchir le nombre de likes
      getCommentLikeCount(commentId);
    },
  });
  
  // Fonction pour vérifier si l'utilisateur a aimé un commentaire
  const checkCommentLikeStatus = async (commentId: number) => {
    try {
      const hasLiked = await apiRequest<boolean>("GET", `/api/comments/${commentId}/like/status`);
      setCommentLikeStatus(prevState => {
        return {
          ...prevState,
          [commentId]: !!hasLiked // Double négation pour s'assurer d'avoir un boolean
        };
      });
    } catch (error) {
      console.error("Erreur lors de la vérification du statut de like:", error);
    }
  };
  
  // Fonction pour obtenir le nombre de likes d'un commentaire
  const getCommentLikeCount = async (commentId: number) => {
    try {
      const likes = await apiRequest<{count: number}>("GET", `/api/comments/${commentId}/likes/count`);
      setCommentLikeCount(prevState => {
        return {
          ...prevState,
          [commentId]: likes.count
        };
      });
    } catch (error) {
      console.error("Erreur lors de la récupération du nombre de likes:", error);
    }
  };

  // Check if the current photo's author hasn't posted in over a week
  const isInactiveUser = (() => {
    if (!author || !author.id) return false;
    
    // Consider the user inactive if this is their latest photo and it's over a week old
    const oneWeekAgo = subDays(new Date(), 7);
    const photoTime = new Date(photo.timestamp);
    
    // If the photo is more than a week old, likely the user is inactive
    return isAfter(oneWeekAgo, photoTime);
  })();

  // Detect drink type from caption
  const detectDrinkType = (caption: string | null, alcoholPercentage: string | number | null): { emoji: string, name: string } => {
    if (!caption) return { emoji: '🥃', name: 'Boisson' };
    
    const lowerCaption = caption.toLowerCase();
    
    // Wine detection
    if (lowerCaption.includes('vin') || 
        lowerCaption.includes('bordeaux') || 
        lowerCaption.includes('bourgogne') ||
        lowerCaption.includes('champagne') ||
        lowerCaption.includes('rosé')) {
      return { emoji: '🍷', name: 'Vin' };
    }
    
    // Beer detection
    if (lowerCaption.includes('bière') || 
        lowerCaption.includes('biere') || 
        lowerCaption.includes('pression') ||
        lowerCaption.includes('pinte') ||
        lowerCaption.includes('ipa') ||
        lowerCaption.includes('blonde') ||
        lowerCaption.includes('brune')) {
      return { emoji: '🍺', name: 'Bière' };
    }
    
    // Cocktail detection
    if (lowerCaption.includes('cocktail') || 
        lowerCaption.includes('mojito') || 
        lowerCaption.includes('margarita') ||
        lowerCaption.includes('daiquiri') ||
        lowerCaption.includes('rhum') ||
        lowerCaption.includes('vodka') ||
        lowerCaption.includes('martini') ||
        lowerCaption.includes('gin') ||
        lowerCaption.includes('tonic')) {
      return { emoji: '🍸', name: 'Cocktail' };
    }
    
    // Whiskey/strong alcohol detection
    if (lowerCaption.includes('whisky') || 
        lowerCaption.includes('whiskey') || 
        lowerCaption.includes('bourbon') ||
        lowerCaption.includes('cognac') ||
        lowerCaption.includes('armagnac') ||
        lowerCaption.includes('scotch')) {
      return { emoji: '🥃', name: 'Whisky' };
    }
    
    // Champagne, sparkling wine
    if (lowerCaption.includes('champagne') || 
        lowerCaption.includes('pétillant') || 
        lowerCaption.includes('mousseux') ||
        lowerCaption.includes('effervescent') ||
        lowerCaption.includes('bulles')) {
      return { emoji: '🍾', name: 'Champagne' };
    }
    
    // Sake
    if (lowerCaption.includes('saké') || 
        lowerCaption.includes('sake')) {
      return { emoji: '🍶', name: 'Saké' };
    }
    
    // Default based on alcohol percentage
    const percentage = Number(alcoholPercentage);
    if (percentage > 30) return { emoji: '🥃', name: 'Spiritueux' };
    if (percentage > 15) return { emoji: '🍸', name: 'Alcool fort' };
    if (percentage > 8) return { emoji: '🍷', name: 'Vin' };
    return { emoji: '🍺', name: 'Bière' };
  };

  if (!author) {
    return (
      <Card className="w-full max-w-2xl mx-auto mb-8">
        <CardContent className="p-4 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const renderStars = (filled: number, interactive: boolean = true) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Button
        key={i}
        variant="ghost"
        size="sm"
        className="p-0 transition-transform hover:scale-110"
        onClick={() => interactive && ratingMutation.mutate(i + 1)}
        disabled={!interactive || ratingMutation.isPending}
      >
        <Star
          className={`h-6 w-6 transition-colors ${
            i < filled 
              ? "fill-orange-500 text-orange-500 drop-shadow-sm" 
              : "fill-gray-100 text-gray-300 hover:fill-orange-200 hover:text-orange-300"
          }`}
        />
      </Button>
    ));
  };

  const avgRating = averageRating?.average
    ? typeof averageRating.average === "string"
      ? parseFloat(averageRating.average)
      : averageRating.average
    : 0;

  return (
    <Card className="w-full max-w-2xl mx-auto mb-8 border-orange-200 shadow-lg overflow-hidden transition-all hover:shadow-xl rounded-xl">
      <div className="bg-gradient-to-r from-orange-100 to-orange-200/50 py-3 px-4 border-b border-orange-200">
        <div className="flex items-center space-x-3">
          <Link href={`/profile/${author?.id}`}>
            <Avatar className="cursor-pointer h-10 w-10 border-2 border-orange-300">
              {author?.avatarUrl ? (
                <AvatarImage src={author.avatarUrl} alt={author.username} />
              ) : (
                <AvatarFallback className="bg-orange-200 text-orange-700">
                  {author?.username?.charAt(0)?.toUpperCase() || "?"}
                </AvatarFallback>
              )}
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <Link href={`/profile/${author?.id}`}>
                <span className="font-bold cursor-pointer text-orange-800 hover:text-orange-600">
                  {author?.username}
                </span>
              </Link>
              {isInactiveUser && (
                <div title="Utilisateur inactif (pas de publication depuis plus d'une semaine)" className="bg-gray-200 rounded-md p-0.5 flex items-center">
                  <Moon className="h-3 w-3 text-gray-500" />
                  <span className="text-xs text-gray-500 ml-0.5">Zzz</span>
                </div>
              )}
              {photo.isAlcoholic && (() => {
                const drinkType = detectDrinkType(photo.caption, photo.alcoholPercentage);
                
                return (
                  <div title={`${drinkType.name} (${photo.alcoholPercentage || 0}% d'alcool)`} className="bg-amber-100 rounded-md px-1.5 py-0.5 flex items-center">
                    <span className="text-xs">{drinkType.emoji}</span>
                    <span className="text-xs text-amber-700 ml-1 font-medium">
                      {drinkType.name} {photo.alcoholPercentage ? `${photo.alcoholPercentage}%` : ''}
                    </span>
                  </div>
                );
              })()}
            </div>
            <span className="text-xs text-orange-600">
              {format(new Date(photo.timestamp), "d MMMM yyyy à HH'h'mm", { locale: fr })}
            </span>
          </div>
        </div>
      </div>
      <CardContent className="p-4 pt-5">

        <div className="relative">
          <img
            src={photo.imageUrl}
            alt={photo.caption || "Food photo"}
            className="w-full aspect-square object-cover rounded-lg shadow-md transform hover:scale-[1.01] transition-transform"
          />
          <div className="absolute top-2 right-2 flex gap-2">
            {!photo.isAlcoholic && (
              <>
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg px-3 py-1 flex items-center space-x-1 shadow-md">
                  <Star className="h-4 w-4 fill-white text-white" />
                  <span className="text-white font-bold">
                    {avgRating.toFixed(1)} ({ratings.length} votes)
                  </span>
                </div>
                {hasReportedCheating ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => cancelCheaterMutation.mutate()}
                    disabled={cancelCheaterMutation.isPending}
                    className="bg-gray-500/80 hover:bg-gray-600/80 text-white flex items-center gap-1 transition-colors"
                  >
                    <BeerOff className="h-4 w-4" />
                    <span>
                      {cancelCheaterMutation.isPending ? "Annulation..." : `Signalé (${photo.cheaterCount || 0})`}
                    </span>
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => cheaterMutation.mutate()}
                    disabled={cheaterMutation.isPending}
                    className="bg-red-500/90 hover:bg-red-600 shadow-md text-white flex items-center gap-1 transition-colors"
                  >
                    <BeerOff className="h-4 w-4" />
                    <span>
                      {cheaterMutation.isPending ? "Signalement..." : `Triche ! (${photo.cheaterCount || 0})`}
                    </span>
                  </Button>
                )}
              </>
            )}
            {photo.isAlcoholic && (() => {
              const drinkType = detectDrinkType(photo.caption, photo.alcoholPercentage);
              return (
                <div className="bg-amber-500 rounded-lg px-3 py-1 flex items-center space-x-1 shadow-md">
                  <span className="text-white font-bold flex items-center">
                    <span className="mr-1">{drinkType.emoji}</span>
                    {photo.alcoholPercentage || 0}% alc
                  </span>
                </div>
              );
            })()}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              {!photo.isAlcoholic && renderStars(userRating?.score || 0)}
            </div>
            
            {user?.id === photo.userId && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Êtes-vous sûr de vouloir supprimer cette photo ?",
                      )
                    ) {
                      deleteMutation.mutate();
                    }
                  }}
                  className="p-1 h-8 w-8 rounded-full"
                >
                  <Trash2 className="h-5 w-5 text-red-500" />
                </Button>
                <Dialog
                  open={isEditingCaption}
                  onOpenChange={setIsEditingCaption}
                >
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-1 h-8 w-8 rounded-full">
                      <Edit2 className="h-5 w-5 text-orange-600" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Modifier la légende</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <Textarea
                        value={editedCaption || ""}
                        onChange={(e) => setEditedCaption(e.target.value)}
                        placeholder="Écrivez une légende..."
                      />
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditedCaption(photo.caption);
                            setIsEditingCaption(false);
                          }}
                        >
                          Annuler
                        </Button>
                        <Button
                          onClick={() => updateCaptionMutation.mutate()}
                          disabled={updateCaptionMutation.isPending}
                        >
                          {updateCaptionMutation.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Enregistrer
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>

          {photo.caption && (
            <div className="mt-2 mb-3 px-3 py-3 rounded-lg bg-gradient-to-r from-orange-50/90 to-orange-100/70 border border-orange-100 shadow-sm">
              <Link href={`/profile/${author?.id}`}>
                <span className="font-medium text-orange-700 hover:underline">
                  {author?.username}
                </span>
              </Link>{" "}
              <span className="text-gray-700">{photo.caption}</span>
            </div>
          )}

          <div className="mt-4 space-y-3">
            <h4 className="font-medium text-base flex items-center gap-2 mb-1 text-orange-600">
              <MessageCircle className="h-4 w-4" />
              Commentaires ({comments.length})
            </h4>
            
            <div className="max-h-60 overflow-y-auto rounded-lg bg-gradient-to-b from-orange-50/80 to-orange-100/40 p-3 space-y-3 border border-orange-100/60 shadow-inner">
              {comments.length === 0 ? (
                <div className="h-4"></div>
              ) : (
                comments.map((comment: Comment) => {
                  const commentAuthor = users[comment.userId];
                  const isCurrentUser = user?.id === comment.userId;
                  return (
                    <div
                      key={comment.id}
                      className={`rounded-lg p-3 ${isCurrentUser ? 'bg-orange-100' : 'bg-white'} shadow-sm`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 mb-1">
                          <Link href={`/profile/${commentAuthor?.id}`}>
                            <Avatar className="h-6 w-6 cursor-pointer">
                              {commentAuthor?.avatarUrl ? (
                                <AvatarImage src={commentAuthor.avatarUrl} alt={commentAuthor.username} />
                              ) : (
                                <AvatarFallback className="text-xs">
                                  {commentAuthor?.username?.charAt(0)?.toUpperCase() || "?"}
                                </AvatarFallback>
                              )}
                            </Avatar>
                          </Link>
                          <Link href={`/profile/${commentAuthor?.id}`}>
                            <span className="font-bold text-sm hover:underline text-orange-700">
                              {commentAuthor?.username || "Utilisateur inconnu"}
                            </span>
                          </Link>
                          <span className="text-xs text-muted-foreground">
                            {comment.timestamp && format(new Date(comment.timestamp), "d MMMM yyyy à HH'h'mm", { locale: fr })}
                          </span>
                        </div>
                        {isCurrentUser && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Êtes-vous sûr de vouloir supprimer ce commentaire ?"
                                )
                              ) {
                                deleteCommentMutation.mutate(comment.id);
                              }
                            }}
                            className="p-0 h-auto"
                          >
                            <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm pl-8">{comment.content}</p>
                      {/* Bouton j'aime de commentaire */}
                      <div className="mt-2 pl-8 flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`p-0 h-auto flex items-center gap-1 ${
                              commentLikeStatus[comment.id] ? 'text-orange-500' : 'text-gray-400'
                            }`}
                            onClick={() => {
                              if (commentLikeStatus[comment.id]) {
                                unlikeCommentMutation.mutate(comment.id);
                                // Mettre à jour le compteur immédiatement pour une interface réactive
                                setCommentLikeCount(prev => ({
                                  ...prev,
                                  [comment.id]: Math.max(0, (prev[comment.id] || 0) - 1)
                                }));
                              } else {
                                likeCommentMutation.mutate(comment.id);
                                // Mettre à jour le compteur immédiatement pour une interface réactive
                                setCommentLikeCount(prev => ({
                                  ...prev,
                                  [comment.id]: (prev[comment.id] || 0) + 1
                                }));
                              }
                            }}
                          >
                            <ThumbsUp className={`h-4 w-4 ${
                              commentLikeStatus[comment.id] ? 'fill-orange-500 text-orange-500' : ''
                            }`} />
                            <span className="text-xs font-medium">
                              {commentLikeStatus[comment.id] ? 'Aimé' : 'J\'aime'}
                            </span>
                          </Button>
                          
                          {/* Afficher le nombre de likes */}
                          {(commentLikeCount[comment.id] > 0) && (
                            <span className="text-xs text-gray-500 font-medium bg-gray-100 rounded-full px-2 py-0.5">
                              {commentLikeCount[comment.id] || 0}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>


        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <form
          className="flex flex-col w-full gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (comment.trim()) {
              commentMutation.mutate();
            }
          }}
        >
          <div className="relative">
            <Input
              placeholder="Ajouter un commentaire..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="bg-gradient-to-r from-orange-50 to-orange-100/50 border-orange-200 pr-24 min-h-10 py-2 shadow-sm focus:shadow-md transition-shadow"
            />
            <Button 
              type="submit" 
              disabled={!comment.trim() || commentMutation.isPending}
              className="absolute right-1 top-1 bg-orange-500 hover:bg-orange-600 text-white"
              size="sm"
            >
              {commentMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : null}
              Publier
            </Button>
          </div>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Avatar className="h-5 w-5">
                {user?.avatarUrl ? (
                  <AvatarImage src={user.avatarUrl} alt={user?.username} />
                ) : (
                  <AvatarFallback className="text-xs">
                    {user?.username?.charAt(0)?.toUpperCase() || "?"}
                  </AvatarFallback>
                )}
              </Avatar>
              <span>Commenter en tant que <span className="font-semibold">{user?.username}</span></span>
            </div>
            <span className="italic">Soyez respectueux et constructif</span>
          </div>
        </form>
      </CardFooter>
    </Card>
  );
}
