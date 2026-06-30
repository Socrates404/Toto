import {
  users, vipCodes, photos, ratings, comments, follows, likes, commentLikes, recipes,
  type User, type InsertUser, type Photo, type Rating, type Comment, type Follow,
  type VipCode, type Like, type CommentLike, type Recipe, type InsertRecipe,
  cheatingReports,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, inArray, avg, sql, or } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

export interface IStorage {
  // VIP code methods
  verifyVipCode(code: string): Promise<VipCode | undefined>;
  markVipCodeAsUsed(code: string, userId: number): Promise<void>;

  // User methods
  getAllUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  deleteUser(userId: number): Promise<void>;
  updateUser(userId: number, updates: Partial<InsertUser>): Promise<User>;

  // Photo methods
  createPhoto(userId: number, photo: Omit<Photo, "id" | "userId" | "timestamp">): Promise<Photo>;
  getPhoto(id: number): Promise<Photo | undefined>;
  getFeedPhotos(userId: number, page?: number, limit?: number): Promise<Photo[]>;
  getUserPhotos(userId: number): Promise<Photo[]>;
  getAllPhotos(): Promise<Photo[]>;
  deletePhoto(photoId: number): Promise<void>;
  updatePhoto(photoId: number, updates: { caption: string | null }): Promise<void>;
  incrementCheaterCount(photoId: number, userId: number): Promise<void>;
  hasReportedCheating(userId: number, photoId: number): Promise<boolean>;

  // Rating methods
  createRating(userId: number, photoId: number, score: number): Promise<Rating>;
  updateRating(userId: number, photoId: number, score: number): Promise<Rating>;
  getRating(userId: number, photoId: number): Promise<Rating | undefined>;
  getPhotoRatings(photoId: number): Promise<Rating[]>;
  getAverageRating(photoId: number): Promise<number>;
  getUserAverageRatings(): Promise<Record<number, { average: number; count: number }>>;

  // Comment methods
  createComment(userId: number, photoId: number, content: string): Promise<Comment>;
  getComments(photoId: number): Promise<Comment[]>;
  getComment(commentId: number): Promise<Comment | undefined>;
  deleteComment(commentId: number): Promise<void>;

  // Follow methods
  createFollow(followerId: number, followedId: number): Promise<Follow>;
  deleteFollow(followerId: number, followedId: number): Promise<void>;
  getFollowers(userId: number): Promise<User[]>;
  getFollowing(userId: number): Promise<User[]>;

  // Like methods
  createLike(userId: number, photoId: number): Promise<Like>;
  deleteLike(userId: number, photoId: number): Promise<void>;
  getLikes(photoId: number): Promise<Like[]>;

  // Comment like methods
  createCommentLike(userId: number, commentId: number): Promise<CommentLike>;
  deleteCommentLike(userId: number, commentId: number): Promise<void>;
  getCommentLikes(commentId: number): Promise<CommentLike[]>;
  hasLikedComment(userId: number, commentId: number): Promise<boolean>;

  // Recipe methods
  createRecipe(userId: number, recipe: InsertRecipe): Promise<Recipe>;
  getRecipe(id: number): Promise<Recipe | undefined>;
  getAllRecipes(page?: number, limit?: number): Promise<Recipe[]>;
  getUserRecipes(userId: number): Promise<Recipe[]>;
  getRecipesByCategory(category: string, page?: number, limit?: number): Promise<Recipe[]>;
  updateRecipe(recipeId: number, updates: Partial<InsertRecipe>): Promise<Recipe>;
  deleteRecipe(recipeId: number): Promise<void>;
  rateRecipe(recipeId: number, score: number): Promise<number>;

  // Session store
  sessionStore: session.Store;
}

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
      tableName: "session",
    });
  }

  async verifyVipCode(code: string): Promise<VipCode | undefined> {
    const [vipCode] = await db.select().from(vipCodes).where(eq(vipCodes.code, code));
    return vipCode;
  }

  async markVipCodeAsUsed(code: string, userId: number): Promise<void> {
    // VIP codes are reusable; just log usage
    console.log(`User ${userId} used VIP code: ${code}`);
  }

  async getAllUsers(): Promise<User[]> {
    const result = await db.select().from(users);
    return Array.isArray(result) ? result : [];
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.resetToken, token));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db
      .insert(users)
      .values({ ...user, bio: user.bio ?? null, avatarUrl: user.avatarUrl ?? null, vipCode: user.vipCode ?? null })
      .returning();
    return newUser;
  }

  async updateUser(userId: number, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, avatarUrl: "avatarUrl" in updates ? updates.avatarUrl : undefined })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async createPhoto(userId: number, photo: Omit<Photo, "id" | "userId" | "timestamp">): Promise<Photo> {
    const isAlcoholic = !!photo.isAlcoholic;
    const alcoholPercentage = isAlcoholic && photo.alcoholPercentage !== null
      ? String(photo.alcoholPercentage)
      : null;

    const [newPhoto] = await db
      .insert(photos)
      .values({
        userId,
        imageUrl: photo.imageUrl,
        caption: photo.caption ?? null,
        timestamp: new Date(),
        cheaterCount: photo.cheaterCount ?? 0,
        isAlcoholic,
        alcoholPercentage,
      })
      .returning();
    return newPhoto;
  }

  async getPhoto(id: number): Promise<Photo | undefined> {
    const [photo] = await db.select().from(photos).where(eq(photos.id, id));
    return photo;
  }

  async getFeedPhotos(userId: number, page: number = 0, limit: number = 10): Promise<Photo[]> {
    const offset = page * limit;
    return db
      .select()
      .from(photos)
      .orderBy(desc(photos.timestamp))
      .limit(limit)
      .offset(offset);
  }

  async getUserPhotos(userId: number): Promise<Photo[]> {
    return db.select().from(photos).where(eq(photos.userId, userId)).orderBy(desc(photos.timestamp));
  }

  async getAllPhotos(): Promise<Photo[]> {
    const result = await db.select().from(photos).orderBy(desc(photos.timestamp));
    return Array.isArray(result) ? result : [];
  }

  async deletePhoto(photoId: number): Promise<void> {
    await db.delete(ratings).where(eq(ratings.photoId, photoId));
    await db.delete(comments).where(eq(comments.photoId, photoId));
    await db.delete(cheatingReports).where(eq(cheatingReports.photoId, photoId));
    await db.delete(photos).where(eq(photos.id, photoId));
  }

  async updatePhoto(photoId: number, updates: { caption: string | null }): Promise<void> {
    await db.update(photos).set(updates).where(eq(photos.id, photoId));
  }

  async incrementCheaterCount(photoId: number, userId: number): Promise<void> {
    const [existingReport] = await db
      .select()
      .from(cheatingReports)
      .where(and(eq(cheatingReports.photoId, photoId), eq(cheatingReports.userId, userId)));

    if (!existingReport) {
      await db.transaction(async (tx) => {
        await tx.insert(cheatingReports).values({ userId, photoId, timestamp: new Date() });
        const [result] = await tx
          .select({ count: sql<number>`count(*)` })
          .from(cheatingReports)
          .where(eq(cheatingReports.photoId, photoId));
        await tx.update(photos).set({ cheaterCount: result.count }).where(eq(photos.id, photoId));
      });
    }
  }

  async hasReportedCheating(userId: number, photoId: number): Promise<boolean> {
    const [report] = await db
      .select()
      .from(cheatingReports)
      .where(and(eq(cheatingReports.photoId, photoId), eq(cheatingReports.userId, userId)));
    return !!report;
  }

  async createRating(userId: number, photoId: number, score: number): Promise<Rating> {
    const [rating] = await db.insert(ratings).values({ userId, photoId, score }).returning();
    return rating;
  }

  async updateRating(userId: number, photoId: number, score: number): Promise<Rating> {
    const [rating] = await db
      .update(ratings)
      .set({ score })
      .where(and(eq(ratings.userId, userId), eq(ratings.photoId, photoId)))
      .returning();
    return rating;
  }

  async getRating(userId: number, photoId: number): Promise<Rating | undefined> {
    const [rating] = await db
      .select()
      .from(ratings)
      .where(and(eq(ratings.userId, userId), eq(ratings.photoId, photoId)));
    return rating;
  }

  async getPhotoRatings(photoId: number): Promise<Rating[]> {
    return db.select().from(ratings).where(eq(ratings.photoId, photoId));
  }

  async getAverageRating(photoId: number): Promise<number> {
    const [result] = await db
      .select({ average: avg(ratings.score) })
      .from(ratings)
      .where(eq(ratings.photoId, photoId));
    return Number(result?.average || 0);
  }

  async getUserAverageRatings(): Promise<Record<number, { average: number; count: number }>> {
    const result = await db
      .select({
        userId: photos.userId,
        average: avg(ratings.score),
        count: sql<number>`COUNT(DISTINCT ${photos.id}) FILTER (WHERE ${ratings.score} IS NOT NULL)`,
      })
      .from(photos)
      .leftJoin(ratings, eq(photos.id, ratings.photoId))
      .groupBy(photos.userId);

    return result.reduce((acc, curr) => {
      acc[curr.userId] = { average: Number(curr.average) || 0, count: Number(curr.count) || 0 };
      return acc;
    }, {} as Record<number, { average: number; count: number }>);
  }

  async createComment(userId: number, photoId: number, content: string): Promise<Comment> {
    const [comment] = await db
      .insert(comments)
      .values({ userId, photoId, content, timestamp: new Date() })
      .returning();
    return comment;
  }

  async getComments(photoId: number): Promise<Comment[]> {
    return db.select().from(comments).where(eq(comments.photoId, photoId)).orderBy(comments.timestamp);
  }

  async getComment(commentId: number): Promise<Comment | undefined> {
    const [comment] = await db.select().from(comments).where(eq(comments.id, commentId));
    return comment;
  }

  async deleteComment(commentId: number): Promise<void> {
    await db.delete(commentLikes).where(eq(commentLikes.commentId, commentId));
    await db.delete(comments).where(eq(comments.id, commentId));
  }

  async createFollow(followerId: number, followedId: number): Promise<Follow> {
    const existing = await db
      .select()
      .from(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followedId, followedId)));
    if (existing.length > 0) return existing[0];
    const [follow] = await db.insert(follows).values({ followerId, followedId }).returning();
    return follow;
  }

  async deleteFollow(followerId: number, followedId: number): Promise<void> {
    await db
      .delete(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followedId, followedId)));
  }

  async getFollowers(userId: number): Promise<User[]> {
    const rows = await db
      .select()
      .from(follows)
      .where(eq(follows.followedId, userId))
      .innerJoin(users, eq(follows.followerId, users.id));
    return rows.map((r) => ({ ...r.users, vipCode: r.users.vipCode ?? null }));
  }

  async getFollowing(userId: number): Promise<User[]> {
    const rows = await db
      .select()
      .from(follows)
      .where(eq(follows.followerId, userId))
      .innerJoin(users, eq(follows.followedId, users.id));
    return rows.map((r) => ({ ...r.users, vipCode: r.users.vipCode ?? null }));
  }

  async createLike(userId: number, photoId: number): Promise<Like> {
    const [like] = await db
      .insert(likes)
      .values({ userId, photoId, timestamp: new Date() })
      .returning();
    return like;
  }

  async deleteLike(userId: number, photoId: number): Promise<void> {
    await db.delete(likes).where(and(eq(likes.userId, userId), eq(likes.photoId, photoId)));
  }

  async getLikes(photoId: number): Promise<Like[]> {
    return db.select().from(likes).where(eq(likes.photoId, photoId)).orderBy(desc(likes.timestamp));
  }

  async createCommentLike(userId: number, commentId: number): Promise<CommentLike> {
    const [like] = await db
      .insert(commentLikes)
      .values({ userId, commentId, timestamp: new Date() })
      .returning();
    return like;
  }

  async deleteCommentLike(userId: number, commentId: number): Promise<void> {
    await db
      .delete(commentLikes)
      .where(and(eq(commentLikes.userId, userId), eq(commentLikes.commentId, commentId)));
  }

  async getCommentLikes(commentId: number): Promise<CommentLike[]> {
    return db
      .select()
      .from(commentLikes)
      .where(eq(commentLikes.commentId, commentId))
      .orderBy(desc(commentLikes.timestamp));
  }

  async hasLikedComment(userId: number, commentId: number): Promise<boolean> {
    const [like] = await db
      .select()
      .from(commentLikes)
      .where(and(eq(commentLikes.userId, userId), eq(commentLikes.commentId, commentId)));
    return !!like;
  }

  async deleteUser(userId: number): Promise<void> {
    await db.transaction(async (tx) => {
      const userPhotos = await tx.select({ id: photos.id }).from(photos).where(eq(photos.userId, userId));
      const photoIds = userPhotos.map((p) => p.id);

      if (photoIds.length > 0) {
        await tx.delete(comments).where(inArray(comments.photoId, photoIds));
        await tx.delete(ratings).where(inArray(ratings.photoId, photoIds));
        await tx.delete(likes).where(inArray(likes.photoId, photoIds));
        await tx.delete(cheatingReports).where(inArray(cheatingReports.photoId, photoIds));
      }

      const userComments = await tx.select({ id: comments.id }).from(comments).where(eq(comments.userId, userId));
      const commentIds = userComments.map((c) => c.id);
      if (commentIds.length > 0) {
        await tx.delete(commentLikes).where(inArray(commentLikes.commentId, commentIds));
      }

      await tx.delete(photos).where(eq(photos.userId, userId));
      await tx.delete(comments).where(eq(comments.userId, userId));
      await tx.delete(ratings).where(eq(ratings.userId, userId));
      await tx.delete(likes).where(eq(likes.userId, userId));
      await tx.delete(commentLikes).where(eq(commentLikes.userId, userId));
      await tx.delete(recipes).where(eq(recipes.userId, userId));
      await tx.delete(follows).where(or(eq(follows.followerId, userId), eq(follows.followedId, userId)));
      await tx.delete(users).where(eq(users.id, userId));
    });
  }

  async createRecipe(userId: number, recipe: InsertRecipe): Promise<Recipe> {
    const [newRecipe] = await db
      .insert(recipes)
      .values({
        userId,
        title: recipe.title,
        description: recipe.description || null,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        prepTime: recipe.prepTime || null,
        cookTime: recipe.cookTime || null,
        servings: recipe.servings || null,
        difficulty: recipe.difficulty || "moyen",
        imageUrl: recipe.imageUrl || null,
        category: recipe.category || "plat principal",
        tags: recipe.tags || [],
        timestamp: new Date(),
        rating: "0",
        ratingCount: 0,
      })
      .returning();
    return newRecipe;
  }

  async getRecipe(id: number): Promise<Recipe | undefined> {
    const [recipe] = await db.select().from(recipes).where(eq(recipes.id, id));
    return recipe;
  }

  async getAllRecipes(page: number = 0, limit: number = 10): Promise<Recipe[]> {
    const offset = page * limit;
    return db.select().from(recipes).orderBy(desc(recipes.timestamp)).limit(limit).offset(offset);
  }

  async getUserRecipes(userId: number): Promise<Recipe[]> {
    return db.select().from(recipes).where(eq(recipes.userId, userId)).orderBy(desc(recipes.timestamp));
  }

  async getRecipesByCategory(category: string, page: number = 0, limit: number = 10): Promise<Recipe[]> {
    const offset = page * limit;
    return db
      .select()
      .from(recipes)
      .where(eq(recipes.category, category))
      .orderBy(desc(recipes.timestamp))
      .limit(limit)
      .offset(offset);
  }

  async updateRecipe(recipeId: number, updates: Partial<InsertRecipe>): Promise<Recipe> {
    const [recipe] = await db
      .update(recipes)
      .set(updates)
      .where(eq(recipes.id, recipeId))
      .returning();
    return recipe;
  }

  async deleteRecipe(recipeId: number): Promise<void> {
    await db.delete(recipes).where(eq(recipes.id, recipeId));
  }

  async rateRecipe(recipeId: number, score: number): Promise<number> {
    const [recipe] = await db.select().from(recipes).where(eq(recipes.id, recipeId));
    if (!recipe) throw new Error(`Recipe ${recipeId} not found`);

    const currentRating = recipe.rating ? parseFloat(recipe.rating.toString()) : 0;
    const currentCount = recipe.ratingCount || 0;
    const newCount = currentCount + 1;
    const newRating = (currentRating * currentCount + score) / newCount;

    await db
      .update(recipes)
      .set({ rating: newRating.toFixed(1), ratingCount: newCount })
      .where(eq(recipes.id, recipeId));

    return parseFloat(newRating.toFixed(1));
  }
}

export const storage = new DatabaseStorage();
