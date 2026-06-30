import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { Resend } from "resend";
import {
  insertPhotoSchema,
  insertCommentSchema,
  insertRatingSchema,
  insertVipCodeSchema,
  insertUserSchema,
  insertRecipeSchema,
  photos,
  users,
  cheatingReports,
} from "@shared/schema";
import { eq, sql, desc, and } from "drizzle-orm";
import { db } from "./db";
import { randomBytes } from "crypto";
import { hashPassword } from "./password";
import { sanitizeUsers, sanitizeUser, sanitizePublicUser } from "./utils";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Current authenticated user (includes own email)
  app.get("/api/user", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.json(null);
      res.json(sanitizeUser(req.user));
    } catch (error) {
      console.error("GET /api/user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // Public user list — no emails
  app.get("/api/users", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const allUsers = await storage.getAllUsers();
      if (!Array.isArray(allUsers)) return res.status(500).json({ error: "Invalid response format" });
      res.json(sanitizeUsers(allUsers));
    } catch (error) {
      console.error("GET /api/users error:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Single user — no email
  app.get("/api/users/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      const userId = Number(req.params.id);
      if (isNaN(userId)) return res.status(400).json({ error: "Invalid user ID" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(sanitizePublicUser(user));
    } catch (error) {
      console.error("GET /api/users/:id error:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Verify VIP code
  app.post("/api/verify-vip-code", async (req, res) => {
    const parsed = insertVipCodeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).send(parsed.error.message);
    const vipCode = await storage.verifyVipCode(parsed.data.code);
    if (!vipCode) return res.status(400).send("Invalid VIP code");
    res.status(200).json({ valid: true });
  });

  // All photos
  app.get("/api/photos/all", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const allPhotos = await storage.getAllPhotos();
      res.json(allPhotos);
    } catch (error) {
      console.error("GET /api/photos/all error:", error);
      res.status(500).json({ error: "Failed to fetch photos" });
    }
  });

  // Feed with pagination
  app.get("/api/photos/feed", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      const page = req.query.page ? parseInt(req.query.page as string) : 0;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const feedPhotos = await storage.getFeedPhotos(req.user.id, page, limit);
      res.json(Array.isArray(feedPhotos) ? feedPhotos : []);
    } catch (error: any) {
      console.error("GET /api/photos/feed error:", error?.message);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/photos/user/:userId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const photoList = await storage.getUserPhotos(Number(req.params.userId));
    res.json(photoList);
  });

  app.post("/api/photos", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const parsed = insertPhotoSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).send(parsed.error.message);

    const isAlcoholic = !!parsed.data.isAlcoholic;
    const alcoholPercentage = isAlcoholic && parsed.data.alcoholPercentage
      ? String(parsed.data.alcoholPercentage)
      : null;

    const photo = await storage.createPhoto(req.user.id, {
      ...parsed.data,
      caption: parsed.data.caption ?? null,
      isAlcoholic,
      alcoholPercentage,
    });
    res.status(201).json(photo);
  });

  app.get("/api/photos/:photoId/likes", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const likeList = await storage.getLikes(Number(req.params.photoId));
    res.json(likeList);
  });

  app.post("/api/photos/:photoId/like", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const like = await storage.createLike(req.user.id, Number(req.params.photoId));
    res.status(201).json(like);
  });

  app.delete("/api/photos/:photoId/like", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.deleteLike(req.user.id, Number(req.params.photoId));
    res.sendStatus(200);
  });

  app.post("/api/photos/:photoId/rate", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const parsed = insertRatingSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).send(parsed.error.message);

    const existing = await storage.getRating(req.user.id, Number(req.params.photoId));
    const rating = existing
      ? await storage.updateRating(req.user.id, Number(req.params.photoId), parsed.data.score)
      : await storage.createRating(req.user.id, Number(req.params.photoId), parsed.data.score);
    res.status(201).json(rating);
  });

  app.get("/api/photos/:photoId/ratings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const ratingList = await storage.getPhotoRatings(Number(req.params.photoId));
    res.json(ratingList);
  });

  app.get("/api/photos/:photoId/rating/average", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const average = await storage.getAverageRating(Number(req.params.photoId));
    res.json({ average });
  });

  app.get("/api/photos/:photoId/rating", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const rating = await storage.getRating(req.user.id, Number(req.params.photoId));
    res.json(rating || null);
  });

  // Admin-only: reset all cheating data (set ADMIN_USER_ID env var)
  app.post("/api/photos/reset-cheating", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const adminId = process.env.ADMIN_USER_ID ? Number(process.env.ADMIN_USER_ID) : null;
    if (!adminId || req.user.id !== adminId) return res.status(403).json({ error: "Admin only" });
    try {
      await db.transaction(async (tx) => {
        await tx.update(photos).set({ cheaterCount: 0 });
        await tx.delete(cheatingReports).where(sql`1=1`);
      });
      res.sendStatus(200);
    } catch (error) {
      console.error("reset-cheating error:", error);
      res.status(500).json({ error: "Failed to reset counters" });
    }
  });

  app.post("/api/photos/:photoId/cheater", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      await storage.incrementCheaterCount(Number(req.params.photoId), req.user.id);
      res.sendStatus(200);
    } catch (error) {
      console.error("POST cheater error:", error);
      res.status(500).send("Failed to report cheater");
    }
  });

  app.get("/api/photos/:photoId/cheater/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const hasReported = await storage.hasReportedCheating(req.user.id, Number(req.params.photoId));
      res.json(hasReported);
    } catch (error) {
      console.error("cheater/status error:", error);
      res.status(500).json({ error: "Failed to check status" });
    }
  });

  app.delete("/api/photos/:photoId/cheater", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      await db.transaction(async (tx) => {
        const report = await tx
          .select()
          .from(cheatingReports)
          .where(and(
            eq(cheatingReports.userId, req.user.id),
            eq(cheatingReports.photoId, Number(req.params.photoId))
          ))
          .limit(1);

        if (report.length === 0) {
          return res.status(404).json({ error: "Report not found" });
        }

        await tx.delete(cheatingReports).where(and(
          eq(cheatingReports.userId, req.user.id),
          eq(cheatingReports.photoId, Number(req.params.photoId))
        ));

        await tx.update(photos)
          .set({ cheaterCount: sql`${photos.cheaterCount} - 1` })
          .where(eq(photos.id, Number(req.params.photoId)));
      });
      res.sendStatus(200);
    } catch (error) {
      console.error("DELETE cheater error:", error);
      res.status(500).json({ error: "Failed to cancel report" });
    }
  });

  app.post("/api/photos/:photoId/comments", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const parsed = insertCommentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).send(parsed.error.message);
    try {
      const comment = await storage.createComment(req.user.id, Number(req.params.photoId), parsed.data.content);
      res.status(201).json(comment);
    } catch (error) {
      console.error("createComment error:", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  app.get("/api/photos/:photoId/comments", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const commentList = await storage.getComments(Number(req.params.photoId));
    res.json(commentList);
  });

  app.patch("/api/photos/:photoId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const photo = await storage.getPhoto(Number(req.params.photoId));
    if (!photo) return res.sendStatus(404);
    if (photo.userId !== req.user.id) return res.sendStatus(403);
    await storage.updatePhoto(Number(req.params.photoId), { caption: req.body.caption });
    res.sendStatus(200);
  });

  app.delete("/api/photos/:photoId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const photo = await storage.getPhoto(Number(req.params.photoId));
    if (!photo) return res.sendStatus(404);
    if (photo.userId !== req.user.id) return res.sendStatus(403);
    await storage.deletePhoto(Number(req.params.photoId));
    res.sendStatus(200);
  });

  app.get("/api/photos/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const photoId = Number(req.params.id);
      if (isNaN(photoId)) return res.status(400).json({ error: "Invalid photo ID" });
      const photo = await storage.getPhoto(photoId);
      if (!photo) return res.status(404).json({ error: "Photo not found" });
      res.json(photo);
    } catch (error) {
      console.error("GET /api/photos/:id error:", error);
      res.status(500).json({ error: "Failed to fetch photo" });
    }
  });

  // Comment likes
  app.post("/api/comments/:commentId/like", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const commentId = Number(req.params.commentId);
      const comment = await storage.getComment(commentId);
      if (!comment) return res.status(404).json({ error: "Comment not found" });
      const hasLiked = await storage.hasLikedComment(req.user.id, commentId);
      if (hasLiked) return res.status(400).json({ error: "Already liked this comment" });
      const like = await storage.createCommentLike(req.user.id, commentId);
      res.status(201).json(like);
    } catch (error) {
      console.error("createCommentLike error:", error);
      res.status(500).json({ error: "Failed to like comment" });
    }
  });

  app.delete("/api/comments/:commentId/like", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      await storage.deleteCommentLike(req.user.id, Number(req.params.commentId));
      res.sendStatus(200);
    } catch (error) {
      console.error("deleteCommentLike error:", error);
      res.status(500).json({ error: "Failed to unlike comment" });
    }
  });

  app.get("/api/comments/:commentId/likes", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const commentLikeList = await storage.getCommentLikes(Number(req.params.commentId));
      res.json(commentLikeList);
    } catch (error) {
      console.error("getCommentLikes error:", error);
      res.status(500).json({ error: "Failed to get comment likes" });
    }
  });

  app.get("/api/comments/:commentId/like/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const hasLiked = await storage.hasLikedComment(req.user.id, Number(req.params.commentId));
      res.json(hasLiked);
    } catch (error) {
      console.error("hasLikedComment error:", error);
      res.status(500).json({ error: "Failed to check like status" });
    }
  });

  app.delete("/api/comments/:commentId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const comment = await storage.getComment(Number(req.params.commentId));
    if (!comment) return res.sendStatus(404);
    if (comment.userId !== req.user.id) return res.sendStatus(403);
    await storage.deleteComment(Number(req.params.commentId));
    res.sendStatus(200);
  });

  // Follows
  app.post("/api/users/:userId/follow", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const follow = await storage.createFollow(req.user.id, Number(req.params.userId));
    res.status(201).json(follow);
  });

  app.delete("/api/users/:userId/follow", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await storage.deleteFollow(req.user.id, Number(req.params.userId));
    res.sendStatus(200);
  });

  app.get("/api/users/:userId/followers", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const followers = await storage.getFollowers(Number(req.params.userId));
    res.json(sanitizeUsers(followers));
  });

  app.get("/api/users/:userId/following", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const following = await storage.getFollowing(Number(req.params.userId));
    res.json(sanitizeUsers(following));
  });

  app.get("/api/users/:userId/recipes", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      const recipeList = await storage.getUserRecipes(parseInt(req.params.userId, 10));
      res.json(recipeList);
    } catch (error) {
      console.error("getUserRecipes error:", error);
      res.status(500).json({ error: "Failed to get user recipes" });
    }
  });

  // User profile update
  app.patch("/api/users/:userId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      if (Number(req.params.userId) !== req.user.id) return res.sendStatus(403);

      const payloadSize = req.body ? JSON.stringify(req.body).length : 0;
      if (payloadSize > 5 * 1024 * 1024) return res.status(413).json({ error: "Payload too large" });

      const updates = insertUserSchema.partial().omit({ password: true }).safeParse(req.body);
      if (!updates.success) return res.status(400).send(updates.error.message);

      if (req.body.avatarUrl === null) updates.data.avatarUrl = null;

      const user = await storage.updateUser(req.user.id, updates.data);
      res.json(sanitizeUser(user));
    } catch (error) {
      console.error("PATCH /api/users/:userId error:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.delete("/api/users/:userId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = Number(req.params.userId);
    if (req.user.id !== userId) return res.status(403).send("You can only delete your own account");
    try {
      await storage.deleteUser(userId);
      req.logout((err) => {
        if (err) return res.status(500).send("Error during logout");
        res.status(200).send("User deleted successfully");
      });
    } catch (error) {
      console.error("deleteUser error:", error);
      res.status(500).send("Failed to delete user");
    }
  });

  app.post("/api/users/:userId/avatar", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      if (Number(req.params.userId) !== req.user.id) return res.sendStatus(403);
      if (!req.body || typeof req.body.avatarUrl === "undefined") {
        return res.status(400).json({ error: "Missing avatarUrl" });
      }
      const user = await storage.updateUser(req.user.id, { avatarUrl: req.body.avatarUrl });
      res.json(sanitizeUser(user));
    } catch (error) {
      console.error("avatar update error:", error);
      res.status(500).json({ error: "Failed to update avatar" });
    }
  });

  // Rankings
  app.get("/api/users/ratings/average", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const averageRatings = await storage.getUserAverageRatings();
      res.json(averageRatings);
    } catch (error) {
      console.error("getUserAverageRatings error:", error);
      res.status(500).json({});
    }
  });

  app.get("/api/cheater-rankings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const userRankings = await db
        .select({
          userId: users.id,
          username: users.username,
          totalCheaterCount: sql<number>`COUNT(DISTINCT ${cheatingReports.id})`,
        })
        .from(users)
        .innerJoin(photos, eq(photos.userId, users.id))
        .innerJoin(cheatingReports, eq(cheatingReports.photoId, photos.id))
        .groupBy(users.id, users.username)
        .orderBy(desc(sql<number>`COUNT(DISTINCT ${cheatingReports.id})`))
        .limit(10);

      const rankings = await Promise.all(
        userRankings.map(async (user) => {
          const [photo] = await db
            .select({
              photoId: photos.id,
              imageUrl: photos.imageUrl,
              caption: photos.caption,
              cheaterCount: sql<number>`COUNT(DISTINCT ${cheatingReports.id})`,
            })
            .from(photos)
            .leftJoin(cheatingReports, eq(cheatingReports.photoId, photos.id))
            .where(eq(photos.userId, user.userId))
            .groupBy(photos.id, photos.imageUrl, photos.caption)
            .orderBy(desc(sql<number>`COUNT(DISTINCT ${cheatingReports.id})`))
            .limit(1);

          return {
            userId: user.userId,
            username: user.username,
            photoId: photo?.photoId || 0,
            imageUrl: photo?.imageUrl || "",
            caption: photo?.caption || null,
            cheaterCount: user.totalCheaterCount,
          };
        })
      );

      res.json(rankings);
    } catch (error) {
      console.error("cheater-rankings error:", error);
      res.status(500).json({ error: "Failed to fetch rankings" });
    }
  });

  // Password reset — always returns 200 to prevent email enumeration
  app.post("/api/forgot-password", async (req, res) => {
    const SAFE_RESPONSE = { message: "If this email is registered, a reset link has been sent" };
    try {
      const user = await storage.getUserByEmail(req.body.email);
      if (!user) return res.json(SAFE_RESPONSE);

      const resetToken = randomBytes(32).toString("hex");
      const tokenExpiry = new Date(Date.now() + 3600000);

      await storage.updateUser(user.id, { resetToken, resetTokenExpiry: tokenExpiry });

      const appUrl = process.env.APP_URL || "http://localhost:5000";
      const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;

      if (process.env.APP_MODE === "debug") {
        // In debug mode, print the link instead of sending a real email
        console.log(`\n[DEBUG] Password reset link for ${user.email}:\n  ${resetUrl}\n`);
      } else {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "noreply@sh1nady.com",
          to: user.email || "",
          subject: "Password Reset Request",
          html: `<p>Click <a href="${resetUrl}">here</a> to reset your password.</p>`,
        });
      }

      res.json(SAFE_RESPONSE);
    } catch (err) {
      console.error("Forgot password error:", err);
      res.status(500).send("Error processing request");
    }
  });

  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) return res.status(400).send("Missing token or new password");

      const user = await storage.getUserByResetToken(token);
      if (!user) return res.status(404).send("Invalid reset token");

      if (!user.resetTokenExpiry || new Date() > new Date(user.resetTokenExpiry)) {
        return res.status(410).send("Reset token has expired");
      }

      await storage.updateUser(user.id, {
        password: await hashPassword(newPassword),
        resetToken: undefined,
        resetTokenExpiry: undefined,
      });

      res.json({ message: "Password reset successful" });
    } catch (err) {
      console.error("Reset password error:", err);
      res.status(500).send("Error resetting password");
    }
  });

  // Recipes
  app.get("/api/recipes", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 0;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const category = req.query.category as string | undefined;

      const recipeList = category
        ? await storage.getRecipesByCategory(category, page, limit)
        : await storage.getAllRecipes(page, limit);

      res.json(recipeList);
    } catch (error) {
      console.error("GET /api/recipes error:", error);
      res.status(500).json({ error: "Failed to get recipes" });
    }
  });

  app.get("/api/recipes/:recipeId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      const recipe = await storage.getRecipe(parseInt(req.params.recipeId, 10));
      if (!recipe) return res.status(404).json({ error: "Recipe not found" });
      res.json(recipe);
    } catch (error) {
      console.error("GET /api/recipes/:recipeId error:", error);
      res.status(500).json({ error: "Failed to get recipe" });
    }
  });

  app.post("/api/recipes", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      const parsed = insertRecipeSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
      const recipe = await storage.createRecipe(req.user.id, parsed.data);
      res.status(201).json(recipe);
    } catch (error) {
      console.error("POST /api/recipes error:", error);
      res.status(500).json({ error: "Failed to create recipe" });
    }
  });

  app.patch("/api/recipes/:recipeId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      const recipeId = parseInt(req.params.recipeId, 10);
      const recipe = await storage.getRecipe(recipeId);
      if (!recipe) return res.status(404).json({ error: "Recipe not found" });
      if (recipe.userId !== req.user.id) return res.status(403).json({ error: "Not your recipe" });
      const updates = insertRecipeSchema.partial().safeParse(req.body);
      if (!updates.success) return res.status(400).json({ error: updates.error.message });
      const updated = await storage.updateRecipe(recipeId, updates.data);
      res.json(updated);
    } catch (error) {
      console.error("PATCH /api/recipes/:recipeId error:", error);
      res.status(500).json({ error: "Failed to update recipe" });
    }
  });

  app.delete("/api/recipes/:recipeId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      const recipeId = parseInt(req.params.recipeId, 10);
      const recipe = await storage.getRecipe(recipeId);
      if (!recipe) return res.status(404).json({ error: "Recipe not found" });
      if (recipe.userId !== req.user.id) return res.status(403).json({ error: "Not your recipe" });
      await storage.deleteRecipe(recipeId);
      res.json({ message: "Recipe deleted successfully" });
    } catch (error) {
      console.error("DELETE /api/recipes/:recipeId error:", error);
      res.status(500).json({ error: "Failed to delete recipe" });
    }
  });

  app.post("/api/recipes/:recipeId/rate", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      const recipeId = parseInt(req.params.recipeId, 10);
      const score = parseFloat(req.body.score);
      if (isNaN(score) || score < 1 || score > 5) {
        return res.status(400).json({ error: "Score must be between 1 and 5" });
      }
      const newRating = await storage.rateRecipe(recipeId, score);
      res.json({ message: "Recipe rated successfully", rating: newRating });
    } catch (error) {
      console.error("POST /api/recipes/:recipeId/rate error:", error);
      res.status(500).json({ error: "Failed to rate recipe" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
