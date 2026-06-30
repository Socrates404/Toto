import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { InsertUser, insertUserSchema } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Utensils, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [_, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<InsertUser>({
    resolver: zodResolver(
      mode === "login"
        ? insertUserSchema.pick({ username: true, password: true })
        : mode === "register"
          ? insertUserSchema.pick({
              username: true,
              password: true,
              vipCode: true,
            })
          : insertUserSchema.pick({ email: true }),
    ),
    defaultValues: {
      username: "",
      password: "",
      vipCode: "",
      email: "",
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      await apiRequest("POST", "/api/forgot-password", { email });
    },
    onSuccess: () => {
      toast({
        title: "Demande de réinitialisation du mot de passe envoyée",
        description: "Veuillez vérifier votre boite mail.",
      });
      setMode("login");
    },
    onError: (error: Error) => {
      toast({
        title: "Impossible d'envoyer un mail de récupération",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const onSubmit = async (data: InsertUser) => {
    try {
      if (mode === "login") {
        await loginMutation.mutateAsync(data);
      } else if (mode === "register") {
        await registerMutation.mutateAsync(data);
      } else {
        await forgotPasswordMutation.mutateAsync(data.email!);
      }
    } catch (error) {
      // Error is already handled by the mutation's onError callback
      return;
    }
  };

  const handleModeChange = (newMode: "login" | "register" | "forgot") => {
    setMode(newMode);
    form.reset();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-100 via-red-50 to-orange-50">
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8 p-4">
        <div className="flex flex-col justify-center">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Utensils className="h-12 w-12 text-orange-500" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-red-600 text-transparent bg-clip-text mb-2">
              TOTO
            </h1>
            <p className="text-muted-foreground">
              L'application des fins gourmets
            </p>
          </div>
          <Card className="backdrop-blur-sm bg-white/80">
            <CardHeader>
              <CardTitle>
                {mode === "login"
                  ? "Bonjour!"
                  : mode === "register"
                    ? "Rejoindre la communauté"
                    : "Réinitialiser le mot de passe"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  {mode !== "forgot" && (
                    <>
                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <Label>Nom</Label>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <Label>Mot de passe</Label>
                            <FormControl>
                              <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {mode === "register" && (
                        <FormField
                          control={form.control}
                          name="vipCode"
                          render={({ field }) => (
                            <FormItem>
                              <Label>
                                code VIP <span className="text-red-500">*</span>
                              </Label>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Enter votre code secret exclusif..."
                                  required
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </>
                  )}

                  {mode === "forgot" && (
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <Label>Email</Label>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                    disabled={
                      loginMutation.isPending ||
                      registerMutation.isPending ||
                      forgotPasswordMutation.isPending
                    }
                  >
                    {(loginMutation.isPending ||
                      registerMutation.isPending ||
                      forgotPasswordMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {mode === "login"
                      ? "Connexion"
                      : mode === "register"
                        ? "S'enregistrer"
                        : "Envoyer le lien"}
                  </Button>
                </form>
              </Form>
              <div className="mt-4 text-center space-y-2">
                {mode === "login" && (
                  <>
                    <Button
                      variant="link"
                      onClick={() => handleModeChange("register")}
                    >
                      Créer un nouveau compte
                    </Button>
                    <div>
                      <Button
                        variant="link"
                        onClick={() => handleModeChange("forgot")}
                      >
                        Mot de passe oublié?
                      </Button>
                    </div>
                  </>
                )}
                {(mode === "register" || mode === "forgot") && (
                  <Button
                    variant="link"
                    onClick={() => handleModeChange("login")}
                  >
                    Retour à la connexion
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="hidden md:flex flex-col justify-center">
          <h1 className="text-4xl font-bold mb-4">Toto cuisto</h1>
          <p className="text-lg text-muted-foreground">
            Partagez vos recettes et vos créations culinaires avec vos amis et
            votre famille !
          </p>
        </div>
      </div>
    </div>
  );
}
