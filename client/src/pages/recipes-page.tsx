import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient } from "@/lib/queryClient";
import { type Recipe } from "../../../shared/schema";
import { ChefHat, Clock, Star, Users, Utensils, Search, Plus, Loader2, Image } from "lucide-react";

// Schéma de validation pour la création/modification d'une recette
const recipeFormSchema = z.object({
  title: z.string().min(3, "Le titre doit contenir au moins 3 caractères"),
  description: z.string().optional(),
  ingredients: z.string().min(10, "Les ingrédients doivent être détaillés")
    .transform(text => text.split('\n').filter(line => line.trim() !== '')),
  instructions: z.string().min(20, "Les instructions doivent être suffisamment détaillées"),
  prepTime: z.number().min(1).optional().or(z.string().transform(val => val === '' ? undefined : parseInt(val) || 0)),
  cookTime: z.number().min(0).optional().or(z.string().transform(val => val === '' ? undefined : parseInt(val) || 0)),
  servings: z.number().min(1).optional().or(z.string().transform(val => val === '' ? undefined : parseInt(val) || 0)),
  difficulty: z.enum(["facile", "moyen", "difficile"]).default("moyen"),
  imageUrl: z.string().optional(),
  category: z.enum(["entrée", "plat principal", "dessert", "boisson", "autre"]).default("plat principal"),
  tags: z.array(z.string()).default([])
});

type RecipeFormData = z.infer<typeof recipeFormSchema>;

function RecipeCard({ recipe }: { recipe: Recipe }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const isOwner = user?.id === recipe.userId;
  
  // Formater les tags pour l'affichage
  const tags = recipe.tags && Array.isArray(recipe.tags) ? recipe.tags : [];

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      {recipe.imageUrl && (
        <div className="relative w-full h-40 overflow-hidden">
          <img 
            src={recipe.imageUrl} 
            alt={recipe.title} 
            className="w-full h-full object-cover"
          />
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              {recipe.rating || "0"}
            </Badge>
          </div>
        </div>
      )}
      <CardHeader className="pb-2">
        <CardTitle className="text-lg line-clamp-1">{recipe.title}</CardTitle>
        <CardDescription className="flex flex-wrap gap-2">
          {recipe.prepTime && (
            <span className="flex items-center gap-1 text-xs">
              <Clock className="h-3 w-3" /> Prép: {recipe.prepTime}
            </span>
          )}
          {recipe.cookTime && (
            <span className="flex items-center gap-1 text-xs">
              <Utensils className="h-3 w-3" /> Cuisson: {recipe.cookTime}
            </span>
          )}
          {recipe.servings && (
            <span className="flex items-center gap-1 text-xs">
              <Users className="h-3 w-3" /> {recipe.servings} pers.
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2 flex-1">
        {recipe.description && (
          <p className="text-sm text-muted-foreground line-clamp-3 mb-2">
            {recipe.description}
          </p>
        )}
        <div className="flex flex-wrap gap-1 mt-1">
          <Badge variant="outline">{recipe.difficulty}</Badge>
          <Badge variant="outline">{recipe.category}</Badge>
          {tags.slice(0, 2).map((tag, index) => (
            <Badge key={index} variant="secondary">{tag}</Badge>
          ))}
          {tags.length > 2 && (
            <Badge variant="secondary">+{tags.length - 2}</Badge>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Link href={`/recipes/${recipe.id}`} className="w-full">
          <Button variant="default" className="w-full">
            Voir la recette
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

// Export du composant de formulaire pour réutilisation dans recipe-detail-page.tsx
export function RecipeForm({ 
  onSubmit, 
  initialData,
  isLoading
}: { 
  onSubmit: (data: RecipeFormData) => void; 
  initialData?: Partial<RecipeFormData>;
  isLoading: boolean;
}) {
  const { toast } = useToast();
  // Format ingredients array to string for the form
  const ingredientsAsString = Array.isArray(initialData?.ingredients) 
    ? initialData?.ingredients.join('\n')
    : '';

  const form = useForm<RecipeFormData>({
    resolver: zodResolver(recipeFormSchema),
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      ingredients: ingredientsAsString,
      instructions: initialData?.instructions || "",
      prepTime: typeof initialData?.prepTime === 'number' ? initialData.prepTime : undefined,
      cookTime: typeof initialData?.cookTime === 'number' ? initialData.cookTime : undefined,
      servings: typeof initialData?.servings === 'number' ? initialData.servings : undefined,
      difficulty: initialData?.difficulty || "moyen",
      imageUrl: initialData?.imageUrl || "",
      category: initialData?.category || "plat principal",
      tags: initialData?.tags || []
    }
  });

  const [tagsInput, setTagsInput] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.imageUrl || null);
  const tags = form.watch("tags");

  // Handle image upload and preview
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Image trop volumineuse",
        description: "L'image ne doit pas dépasser 5 Mo",
        variant: "destructive",
      });
      return;
    }

    // Create a preview of the image
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
      form.setValue("imageUrl", reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const addTag = () => {
    if (tagsInput.trim() && !tags.includes(tagsInput.trim())) {
      form.setValue("tags", [...tags, tagsInput.trim()]);
      setTagsInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    form.setValue("tags", tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Titre</FormLabel>
              <FormControl>
                <Input placeholder="Titre de la recette" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Description brève de la recette" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Catégorie</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une catégorie" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="entrée">Entrée</SelectItem>
                    <SelectItem value="plat principal">Plat principal</SelectItem>
                    <SelectItem value="dessert">Dessert</SelectItem>
                    <SelectItem value="boisson">Boisson</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="difficulty"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Difficulté</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une difficulté" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="facile">Facile</SelectItem>
                    <SelectItem value="moyen">Moyen</SelectItem>
                    <SelectItem value="difficile">Difficile</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="prepTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Temps de préparation (min)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="1"
                    placeholder="Ex: 15" 
                    {...field}
                    value={field.value?.toString() || ''}
                    onChange={(e) => field.onChange(e.target.value === '' ? '' : parseInt(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cookTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Temps de cuisson (min)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="0"
                    placeholder="Ex: 30" 
                    {...field}
                    value={field.value?.toString() || ''}
                    onChange={(e) => field.onChange(e.target.value === '' ? '' : parseInt(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="servings"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre de personnes</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="1"
                    placeholder="Ex: 4" 
                    {...field}
                    value={field.value?.toString() || ''}
                    onChange={(e) => field.onChange(e.target.value === '' ? '' : parseInt(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="ingredients"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ingrédients</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Un ingrédient par ligne" 
                  className="min-h-[120px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="instructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Instructions</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Décrivez les étapes de préparation" 
                  className="min-h-[150px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field: { value, onChange, ...field } }) => (
            <FormItem>
              <FormLabel>Photo de la recette</FormLabel>
              <FormControl>
                <div
                  className={`border-2 border-dashed rounded-lg p-4 text-center ${
                    imagePreview ? "border-orange-300" : "border-orange-200 hover:border-orange-300"
                  } transition-colors cursor-pointer bg-orange-50`}
                  onClick={() => document.getElementById("recipe-image")?.click()}
                >
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Prévisualisation"
                        className="max-h-64 mx-auto rounded-md object-cover"
                      />
                      <p className="text-xs text-orange-600 mt-2">Cliquez pour changer l'image</p>
                    </div>
                  ) : (
                    <div className="py-6">
                      <div className="h-12 w-12 mx-auto text-orange-400 mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                      </div>
                      <p className="text-orange-600">Cliquez pour ajouter une photo</p>
                      <p className="text-xs text-orange-500 mt-1">JPG, PNG, GIF jusqu'à 5Mo</p>
                    </div>
                  )}
                  <input
                    type="file"
                    id="recipe-image"
                    className="sr-only"
                    accept="image/*"
                    onChange={handleImageUpload}
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tags"
          render={() => (
            <FormItem>
              <FormLabel>Tags</FormLabel>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                    {tag} &times;
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input 
                  placeholder="Ajouter un tag" 
                  value={tagsInput} 
                  onChange={e => setTagsInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button type="button" variant="outline" onClick={addTag}>+</Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Annuler</Button>
          </DialogClose>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              "Enregistrer"
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

export default function RecipesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [isCreating, setIsCreating] = useState(false);
  
  // Récupérer toutes les recettes
  const { data: recipes = [], isLoading } = useQuery<Recipe[]>({
    queryKey: ['/api/recipes'],
  });

  // Gérer le filtrage des recettes
  const filteredRecipes = recipes.filter((recipe: Recipe) => {
    // Filtrer par catégorie
    if (categoryFilter !== "all" && recipe.category !== categoryFilter) {
      return false;
    }
    
    // Filtrer par onglet actif (toutes / mes recettes)
    if (activeTab === "my-recipes" && recipe.userId !== user?.id) {
      return false;
    }
    
    // Filtrer par recherche
    return searchTerm === "" || 
      recipe.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (recipe.description && recipe.description.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  // Création d'une nouvelle recette
  const handleCreateRecipe = async (formData: RecipeFormData) => {
    setIsCreating(true);
    try {
      const tagsToSave = formData.tags || [];
  
      const recipeData = {
        ...formData,
        tags: tagsToSave,
      };
      
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recipeData),
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la création de la recette');
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
      toast({
        title: 'Recette créée',
        description: 'Votre recette a été créée avec succès.',
      });
      
      setIsCreating(false);
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de créer la recette. Veuillez réessayer.',
        variant: 'destructive',
      });
      setIsCreating(false);
    }
  };

  return (
      <div className="container mx-auto py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">Recettes</h1>
            <p className="text-muted-foreground">Parcourez et partagez vos recettes préférées</p>
          </div>
        
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle recette
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Ajouter une nouvelle recette</DialogTitle>
                <DialogDescription>
                  Partagez votre recette avec la communauté.
                </DialogDescription>
              </DialogHeader>
              <RecipeForm onSubmit={handleCreateRecipe} isLoading={isCreating} />
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">Toutes les recettes</TabsTrigger>
            <TabsTrigger value="my-recipes">Mes recettes</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher des recettes..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              <SelectItem value="entrée">Entrées</SelectItem>
              <SelectItem value="plat principal">Plats principaux</SelectItem>
              <SelectItem value="dessert">Desserts</SelectItem>
              <SelectItem value="boisson">Boissons</SelectItem>
              <SelectItem value="autre">Autres</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center min-h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredRecipes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map((recipe: Recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <ChefHat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Aucune recette trouvée</h3>
            <p className="text-muted-foreground mb-4">
              {activeTab === "my-recipes" 
                ? "Vous n'avez pas encore créé de recettes." 
                : "Aucune recette ne correspond à vos critères de recherche."}
            </p>
            {activeTab === "my-recipes" && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Créer ma première recette
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Ajouter une nouvelle recette</DialogTitle>
                    <DialogDescription>
                      Partagez votre recette avec la communauté.
                    </DialogDescription>
                  </DialogHeader>
                  <RecipeForm onSubmit={handleCreateRecipe} isLoading={isCreating} />
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}
      </div>
  );
}