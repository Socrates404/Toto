import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient } from "@/lib/queryClient";
import { type Recipe } from "../../../shared/schema";
import { ChefHat, Clock, Star, Users, Utensils, Edit, Trash, ChevronLeft, Loader2 } from "lucide-react";

import { RecipeForm } from "./recipes-page"; // Import du composant de formulaire depuis la page de recettes

export default function RecipeDetailPage() {
  const { recipeId } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("ingredients");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRating, setIsRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);

  // Récupérer les détails de la recette
  const { data: recipe = {}, isLoading } = useQuery<Recipe>({
    queryKey: [`/api/recipes/${recipeId}`],
  });

  // Vérifier si l'utilisateur est le propriétaire de la recette
  const isOwner = user?.id === recipe.userId;

  // Mutation pour supprimer la recette
  const deleteRecipeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Erreur lors de la suppression de la recette');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
      toast({
        title: 'Recette supprimée',
        description: 'La recette a été supprimée avec succès.',
      });
      navigate('/recipes');
    },
    onError: (error) => {
      console.error('Erreur de suppression:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la recette. Veuillez réessayer.',
        variant: 'destructive',
      });
    },
  });

  // Mutation pour mettre à jour la recette
  const updateRecipeMutation = useMutation({
    mutationFn: async (updatedRecipe: Partial<Recipe>) => {
      const response = await fetch(`/api/recipes/${recipeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedRecipe),
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour de la recette');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/recipes/${recipeId}`] });
      toast({
        title: 'Recette mise à jour',
        description: 'La recette a été mise à jour avec succès.',
      });
    },
    onError: (error) => {
      console.error('Erreur de mise à jour:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour la recette. Veuillez réessayer.',
        variant: 'destructive',
      });
    },
  });

  // Mutation pour noter la recette
  const rateRecipeMutation = useMutation({
    mutationFn: async (score: number) => {
      const response = await fetch(`/api/recipes/${recipeId}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ score }),
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Erreur lors de la notation de la recette');
      }
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/recipes/${recipeId}`] });
      toast({
        title: 'Note enregistrée',
        description: `Vous avez noté cette recette ${rating}/5.`,
      });
      setIsRating(false);
    },
    onError: (error) => {
      console.error('Erreur de notation:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de noter cette recette. Veuillez réessayer.',
        variant: 'destructive',
      });
      setIsRating(false);
    },
  });

  // Handlers
  const handleDelete = () => {
    setIsDeleting(true);
    deleteRecipeMutation.mutate();
  };

  const handleUpdate = (updatedRecipe: Partial<Recipe>) => {
    updateRecipeMutation.mutate(updatedRecipe);
  };

  const handleRate = (score: number) => {
    setRating(score);
    setIsRating(true);
    rateRecipeMutation.mutate(score);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  // Parse ingredients and instructions based on their format
  // They could be arrays or strings with line breaks
  const ingredients = typeof recipe.ingredients === 'string'
    ? recipe.ingredients.split('\n').filter(ingredient => ingredient.trim())
    : Array.isArray(recipe.ingredients) 
      ? recipe.ingredients
      : [];
      
  const instructions = typeof recipe.instructions === 'string'
    ? recipe.instructions.split('\n').filter(instruction => instruction.trim())
    : Array.isArray(recipe.instructions)
      ? recipe.instructions
      : [];
    
  const tags = recipe.tags && Array.isArray(recipe.tags) ? recipe.tags : [];

  return (
    <div className="container mx-auto py-6">
      <Button 
        variant="outline" 
        onClick={() => navigate('/recipes')}
        className="mb-6"
      >
        <ChevronLeft className="h-4 w-4 mr-2" />
        Retour aux recettes
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl">{recipe.title}</CardTitle>
                  {recipe.description && (
                    <CardDescription className="mt-2">{recipe.description}</CardDescription>
                  )}
                </div>
                {isOwner && (
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Modifier la recette</DialogTitle>
                          <DialogDescription>
                            Modifiez les détails de votre recette.
                          </DialogDescription>
                        </DialogHeader>
                        <RecipeForm 
                          onSubmit={handleUpdate} 
                          initialData={recipe} 
                          isLoading={updateRecipeMutation.isPending} 
                        />
                      </DialogContent>
                    </Dialog>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="destructive" size="icon">
                          <Trash className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Supprimer la recette</DialogTitle>
                          <DialogDescription>
                            Êtes-vous sûr de vouloir supprimer cette recette ? Cette action est irréversible.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="mt-4">
                          <DialogClose asChild>
                            <Button variant="outline">Annuler</Button>
                          </DialogClose>
                          <Button 
                            variant="destructive" 
                            onClick={handleDelete}
                            disabled={isDeleting}
                          >
                            {isDeleting ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Suppression...
                              </>
                            ) : (
                              "Supprimer"
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline" className="flex items-center gap-1">
                  <ChefHat className="h-3 w-3" /> {recipe.difficulty}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  {recipe.category}
                </Badge>
                {recipe.prepTime && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Prép: {recipe.prepTime}
                  </Badge>
                )}
                {recipe.cookTime && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Utensils className="h-3 w-3" /> Cuisson: {recipe.cookTime}
                  </Badge>
                )}
                {recipe.servings && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Users className="h-3 w-3" /> {recipe.servings} pers.
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-1 mb-4">
                {tags.map((tag, index) => (
                  <Badge key={index} variant="secondary">{tag}</Badge>
                ))}
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="ingredients">Ingrédients</TabsTrigger>
                  <TabsTrigger value="instructions">Préparation</TabsTrigger>
                </TabsList>
                <TabsContent value="ingredients">
                  <h3 className="font-medium mb-2">Ingrédients:</h3>
                  <ul className="space-y-2 ml-5 list-disc">
                    {ingredients.map((ingredient, index) => (
                      <li key={index}>{ingredient}</li>
                    ))}
                  </ul>
                </TabsContent>
                <TabsContent value="instructions">
                  <h3 className="font-medium mb-2">Instructions:</h3>
                  <ol className="space-y-4 ml-5 list-decimal">
                    {instructions.map((instruction, index) => (
                      <li key={index}>{instruction}</li>
                    ))}
                  </ol>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            {recipe.imageUrl && (
              <div className="relative w-full h-48 overflow-hidden">
                <img 
                  src={recipe.imageUrl} 
                  alt={recipe.title} 
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-lg">Évaluation</CardTitle>
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className="p-0 bg-transparent border-none cursor-pointer"
                      onClick={() => !isOwner && handleRate(star)}
                      onMouseEnter={() => !isOwner && setHoveredRating(star)}
                      onMouseLeave={() => !isOwner && setHoveredRating(0)}
                      disabled={isOwner || isRating}
                    >
                      <Star
                        className={`h-6 w-6 ${
                          star <= (hoveredRating || rating || parseFloat(recipe.rating || "0"))
                            ? "fill-primary text-primary"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <span className="text-lg font-medium">
                  {recipe.rating ? parseFloat(recipe.rating).toFixed(1) : "0"}
                </span>
                <span className="text-muted-foreground text-sm">
                  ({recipe.ratingCount || 0} {recipe.ratingCount === 1 ? "vote" : "votes"})
                </span>
              </div>
              {isOwner && (
                <p className="text-sm text-muted-foreground">
                  Vous ne pouvez pas noter votre propre recette
                </p>
              )}
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              <h3 className="font-medium mb-2">À propos de cette recette</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Ajoutée le {new Date(recipe.timestamp).toLocaleDateString()}
              </p>
              {/* Autres informations supplémentaires pourraient être ajoutées ici */}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}