import { useState } from "react";
import { useLocation } from "wouter";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ChefHat, Plus, Trash2, Image, Clock } from "lucide-react";
import { insertRecipeSchema } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import * as z from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

// Extending the insertRecipeSchema to add validation
const recipeFormSchema = insertRecipeSchema.extend({
  // Make sure title is not empty and has a reasonable length
  title: z.string().min(3, "Le titre doit contenir au moins 3 caractères").max(100, "Le titre ne peut pas dépasser 100 caractères"),
  // Description is optional but should have a reasonable length if provided
  description: z.string().max(500, "La description ne peut pas dépasser 500 caractères").optional().nullable(),
  // Make sure ingredients is an array of strings
  ingredients: z.array(z.string().min(1, "L'ingrédient ne peut pas être vide")),
  // Make sure instructions is an array of strings
  instructions: z.array(z.string().min(1, "L'instruction ne peut pas être vide")),
  // Make sure time values are reasonable
  prepTime: z.number().min(1, "Le temps de préparation doit être d'au moins 1 minute").max(1440, "Le temps de préparation ne peut pas dépasser 24 heures"),
  cookTime: z.number().min(0, "Le temps de cuisson ne peut pas être négatif").max(1440, "Le temps de cuisson ne peut pas dépasser 24 heures"),
  // Make sure servings is reasonable
  servings: z.number().min(1, "Le nombre de portions doit être d'au moins 1").max(50, "Le nombre de portions ne peut pas dépasser 50"),
  // Make sure tags is an array of strings
  tags: z.array(z.string()),
  // Make sure imageUrl is optional but a string if provided
  imageUrl: z.string().nullable().optional(),
  // Ne pas inclure userId dans le schéma - il sera ajouté côté serveur
});

// Define the type using the schema
type RecipeFormValues = z.infer<typeof recipeFormSchema>;

export default function CreateRecipePage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  // Define default values for the form
  const defaultValues: Partial<RecipeFormValues> = {
    title: "",
    description: "",
    ingredients: [""],
    instructions: [""],
    prepTime: 15,
    cookTime: 30,
    servings: 4,
    category: "plat principal", // Le schema utilise des minuscules
    difficulty: "facile", // Le schema utilise des minuscules
    tags: [],
    imageUrl: null,
    // userId will be set at submission time
  };

  // Initialize the form with react-hook-form
  const form = useForm<RecipeFormValues>({
    resolver: zodResolver(recipeFormSchema),
    defaultValues,
  });

  // Use useFieldArray for dynamic fields (ingredients, instructions, tags)
  const { fields: ingredientFields, append: appendIngredient, remove: removeIngredient } = useFieldArray({
    control: form.control,
    name: "ingredients" as never, // Type assertion to match the schema
  });

  const { fields: instructionFields, append: appendInstruction, remove: removeInstruction } = useFieldArray({
    control: form.control,
    name: "instructions" as never, // Type assertion to match the schema
  });

  const { fields: tagFields, append: appendTag, remove: removeTag } = useFieldArray({
    control: form.control,
    name: "tags" as never, // Type assertion to match the schema
  });

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

  // Mutation pour créer une recette - version simplifiée
  const createRecipeMutation = useMutation({
    mutationFn: (data: any) => {
      console.log("Mutation sending data:", data);
      return fetch("/api/recipes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "include",
      }).then(res => {
        if (!res.ok) {
          console.error("Recipe creation failed with status:", res.status);
          return res.json().then(err => {
            throw new Error(err.error || "Échec de la création de la recette");
          });
        }
        return res.json();
      });
    },
    onSuccess: (data) => {
      console.log("Recipe created successfully:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      toast({
        title: "Recette créée",
        description: "Votre recette a été créée avec succès",
      });
      // Redirection directe
      window.location.href = "/recipes";
    },
    onError: (error) => {
      console.error("Error creating recipe:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue lors de la création de la recette",
        variant: "destructive",
      });
    },
  });

  // Submit handler - version simplifiée
  const onSubmit = (data: RecipeFormValues) => {
    // Log pour le débogage
    console.log("Form submitted with data:", data);
    
    // Filtrer les champs vides
    const cleanData = {
      ...data,
      ingredients: data.ingredients.filter((ingredient) => ingredient.trim() !== ""),
      instructions: data.instructions.filter((instruction) => instruction.trim() !== "").join("\n\n"),
      tags: data.tags.filter((tag) => tag.trim() !== "")
    };
    
    console.log("Cleaned data:", cleanData);
    
    // Vérifications basiques
    if (cleanData.ingredients.length === 0) {
      toast({
        title: "Ingrédients manquants",
        description: "Veuillez ajouter au moins un ingrédient",
        variant: "destructive"
      });
      return;
    }
    
    if (cleanData.instructions.length === 0) {
      toast({
        title: "Instructions manquantes",
        description: "Veuillez ajouter au moins une instruction",
        variant: "destructive"
      });
      return;
    }
    
    // Notification simple
    toast({
      title: "Envoi en cours...",
      description: "Création de votre recette"
    });
    
    // Appeler directement la mutation
    createRecipeMutation.mutate(cleanData);
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-orange-50 to-orange-100/30 py-8">
      <div className="container max-w-3xl mx-auto px-4">
        <Card className="border-orange-200 shadow-sm">
          <CardHeader className="pb-4 border-b border-orange-100">
            <CardTitle className="text-2xl font-bold text-orange-800 flex items-center">
              <ChefHat className="h-6 w-6 mr-2 text-orange-600" />
              Créer une nouvelle recette
            </CardTitle>
            <CardDescription className="text-orange-600">
              Partagez votre savoir-faire culinaire avec la communauté TOTO
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Image Upload */}
                <div className="mb-6">
                  <FormLabel className="text-orange-800 block mb-2">Photo de la recette</FormLabel>
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
                        <Image className="h-12 w-12 mx-auto text-orange-400 mb-2" />
                        <p className="text-orange-600">Cliquez pour ajouter une photo</p>
                        <p className="text-xs text-orange-500 mt-1">JPG, PNG, GIF jusqu'à 5 Mo</p>
                      </div>
                    )}
                    <input
                      type="file"
                      id="recipe-image"
                      className="sr-only"
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                  </div>
                </div>

                {/* Basic Info */}
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="recipe-title" className="text-orange-800">Titre de la recette*</FormLabel>
                        <FormControl>
                          <Input
                            id="recipe-title"
                            placeholder="Ex: Tarte aux pommes maison"
                            className="border-orange-200 focus:border-orange-400"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-orange-800">Catégorie*</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="border-orange-200 focus:ring-orange-400">
                              <SelectValue placeholder="Sélectionner une catégorie" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="entrée">Entrée</SelectItem>
                            <SelectItem value="plat principal">Plat principal</SelectItem>
                            <SelectItem value="dessert">Dessert</SelectItem>
                            <SelectItem value="boisson">Boisson</SelectItem>
                            <SelectItem value="apéritif">Apéritif</SelectItem>
                            <SelectItem value="petit-déjeuner">Petit-déjeuner</SelectItem>
                            <SelectItem value="accompagnement">Accompagnement</SelectItem>
                            <SelectItem value="sauce">Sauce</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-orange-800">Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Décrivez brièvement votre recette, son origine, etc."
                          className="min-h-[80px] border-orange-200 focus:border-orange-400"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription className="text-orange-500">
                        Une description attrayante aide les autres à découvrir votre recette
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Recipe Details */}
                <div className="grid gap-4 md:grid-cols-4">
                  <FormField
                    control={form.control}
                    name="prepTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-orange-800">Préparation (min)*</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            className="border-orange-200 focus:border-orange-400"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
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
                        <FormLabel className="text-orange-800">Cuisson (min)*</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            className="border-orange-200 focus:border-orange-400"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
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
                        <FormLabel className="text-orange-800">Portions*</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            className="border-orange-200 focus:border-orange-400"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="difficulty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-orange-800">Difficulté*</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="border-orange-200 focus:ring-orange-400">
                              <SelectValue placeholder="Sélectionner" />
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

                {/* Ingredients */}
                <div>
                  <h3 className="text-lg font-medium text-orange-800 mb-3">Ingrédients*</h3>
                  <div className="space-y-3">
                    {ingredientFields.map((field, index) => (
                      <div key={field.id} className="flex gap-2">
                        <FormField
                          control={form.control}
                          name={`ingredients.${index}`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input
                                  placeholder="Ex: 200g de farine"
                                  className="border-orange-200 focus:border-orange-400"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="shrink-0 border-orange-200 hover:bg-orange-50 hover:text-red-500"
                          onClick={() => {
                            if (ingredientFields.length > 1) {
                              removeIngredient(index);
                            } else {
                              toast({
                                title: "Action impossible",
                                description: "Vous devez avoir au moins un ingrédient",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3 border-orange-200 hover:bg-orange-50 text-orange-700"
                    onClick={() => appendIngredient("")}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un ingrédient
                  </Button>
                </div>

                {/* Instructions */}
                <div>
                  <h3 className="text-lg font-medium text-orange-800 mb-3">Instructions*</h3>
                  <div className="space-y-4">
                    {instructionFields.map((field, index) => (
                      <div key={field.id} className="flex gap-2">
                        <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-700 font-medium">
                          {index + 1}
                        </div>
                        <FormField
                          control={form.control}
                          name={`instructions.${index}`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Textarea
                                  placeholder="Expliquez cette étape de la recette..."
                                  className="min-h-[80px] border-orange-200 focus:border-orange-400"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="shrink-0 h-8 mt-4 border-orange-200 hover:bg-orange-50 hover:text-red-500"
                          onClick={() => {
                            if (instructionFields.length > 1) {
                              removeInstruction(index);
                            } else {
                              toast({
                                title: "Action impossible",
                                description: "Vous devez avoir au moins une instruction",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3 border-orange-200 hover:bg-orange-50 text-orange-700"
                    onClick={() => appendInstruction("")}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter une instruction
                  </Button>
                </div>

                {/* Tags */}
                <div>
                  <h3 className="text-lg font-medium text-orange-800 mb-3">Tags (optionnel)</h3>
                  <div className="space-y-3">
                    {tagFields.map((field, index) => (
                      <div key={field.id} className="flex gap-2">
                        <FormField
                          control={form.control}
                          name={`tags.${index}`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input
                                  placeholder="Ex: végétarien, sans gluten, rapide"
                                  className="border-orange-200 focus:border-orange-400"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="shrink-0 border-orange-200 hover:bg-orange-50 hover:text-red-500"
                          onClick={() => removeTag(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3 border-orange-200 hover:bg-orange-50 text-orange-700"
                    onClick={() => appendTag("")}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un tag
                  </Button>
                </div>

                <Separator className="my-6 bg-orange-100" />

                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-orange-200 hover:bg-orange-50 text-orange-700"
                    onClick={() => setCancelDialogOpen(true)}
                  >
                    Annuler
                  </Button>
                  
                  {/* Bouton pour envoyer le formulaire */}
                  <div className="flex gap-3">
                    <Button
                      type="submit"
                      className="bg-orange-600 hover:bg-orange-700"
                      disabled={createRecipeMutation.isPending}
                    >
                      {createRecipeMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Publier la recette
                    </Button>
                    
                    {/* Bouton d'envoi direct */}
                    <Button
                      type="button"
                      className="bg-red-600 hover:bg-red-700"
                      onClick={() => {
                        console.log("Direct submission button clicked");
                        
                        // Récupérer les valeurs actuelles du formulaire sans validation
                        const formValues = form.getValues();
                        console.log("Form values:", formValues);
                        
                        // Créer un objet avec les données formatées
                        const dataToSend = {
                          title: formValues.title,
                          description: formValues.description || "",
                          ingredients: formValues.ingredients.filter(i => i && i.trim() !== ""),
                          instructions: formValues.instructions.filter(i => i && i.trim() !== "").join("\n\n"),
                          prepTime: Number(formValues.prepTime) || 10,
                          cookTime: Number(formValues.cookTime) || 20,
                          servings: Number(formValues.servings) || 4,
                          difficulty: formValues.difficulty || "moyen",
                          category: formValues.category || "plat principal",
                          tags: (formValues.tags || []).filter(t => t && t.trim() !== ""),
                          imageUrl: formValues.imageUrl
                        };
                        
                        console.log("Data to send:", dataToSend);
                        
                        // Notification simple
                        toast({
                          title: "Envoi direct...",
                          description: "Création d'urgence de votre recette"
                        });
                        
                        // Appel direct à l'API sans passer par la mutation standard
                        fetch("/api/recipes", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json"
                          },
                          credentials: "include",
                          body: JSON.stringify(dataToSend)
                        })
                        .then(response => {
                          console.log("Direct API call response:", response);
                          
                          if (response.ok) {
                            return response.json().then(data => {
                              console.log("Recipe created successfully:", data);
                              toast({
                                title: "Recette créée",
                                description: "Votre recette a été publiée avec succès"
                              });
                              // Redirection
                              setTimeout(() => {
                                window.location.href = "/recipes";
                              }, 1000);
                            });
                          } else {
                            return response.json().then(err => {
                              throw new Error(err.error || "Création de recette échouée");
                            });
                          }
                        })
                        .catch(error => {
                          console.error("Error in direct API call:", error);
                          toast({
                            title: "Erreur",
                            description: error.message || "Une erreur est survenue",
                            variant: "destructive"
                          });
                        });
                      }}
                    >
                      Envoi direct
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation dialog for cancel */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent className="border-orange-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-orange-800">Annuler la création ?</AlertDialogTitle>
            <AlertDialogDescription className="text-orange-600">
              Toutes les informations saisies seront perdues. Êtes-vous sûr de vouloir quitter cette page ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-orange-200 hover:bg-orange-50">Non, continuer l'édition</AlertDialogCancel>
            <AlertDialogAction
              className="bg-orange-600 hover:bg-orange-700 text-white"
              onClick={() => navigate("/recipes")}
            >
              Oui, quitter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}