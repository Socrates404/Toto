import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Add vipCodes table
export const vipCodes = pgTable("vip_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  // We keep these fields for tracking purposes, but 'used' is no longer a constraint
  used: boolean("used").default(false),
  usedBy: integer("used_by").references(() => users.id),
  usedAt: timestamp("used_at"),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").unique(), 
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  vipCode: text("vip_code"),
});

export const photos = pgTable("photos", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  imageUrl: text("image_url").notNull(),
  caption: text("caption"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  cheaterCount: integer("cheater_count").default(0),
});

export const cheatingReports = pgTable("cheating_reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  photoId: integer("photo_id").notNull().references(() => photos.id),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const likes = pgTable("likes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  photoId: integer("photo_id").notNull().references(() => photos.id),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const ratings = pgTable("ratings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  photoId: integer("photo_id").notNull().references(() => photos.id),
  score: integer("score").notNull(), 
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  photoId: integer("photo_id").notNull().references(() => photos.id),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const follows = pgTable("follows", {
  id: serial("id").primaryKey(),
  followerId: integer("follower_id").notNull().references(() => users.id),
  followedId: integer("followed_id").notNull().references(() => users.id),
});

export const commentLikes = pgTable("comment_likes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  commentId: integer("comment_id").notNull().references(() => comments.id),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const recipes = pgTable("recipes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  ingredients: text("ingredients").array().notNull(),
  instructions: text("instructions").notNull(),
  prepTime: text("prep_time"),
  cookTime: text("cook_time"),
  servings: integer("servings"),
  difficulty: text("difficulty").default("moyen").notNull(),
  imageUrl: text("image_url"),
  category: text("category").default("plat principal").notNull(),
  tags: text("tags").array().default([]).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  rating: text("rating").default("0").notNull(),
  ratingCount: integer("rating_count").default(0).notNull(),
});

export const insertUserSchema = createInsertSchema(users)
  .extend({
    email: z.string().email("Invalid email address").optional(),
    vipCode: z.string().min(1, "VIP code is required"),
    resetToken: z.string().optional(),
    resetTokenExpiry: z.date().optional(),
  });

export const insertPhotoSchema = createInsertSchema(photos)
  .omit({ 
    id: true,
    userId: true,
    timestamp: true,
  })
  .extend({
    cheaterCount: z.number().default(0),
  });

export const insertLikeSchema = createInsertSchema(likes).omit({
  id: true,
  userId: true,
  timestamp: true,
});

export const insertCommentSchema = createInsertSchema(comments).pick({
  content: true,
});

export const insertRatingSchema = createInsertSchema(ratings)
  .pick({
    score: true,
  })
  .extend({
    score: z.number().min(1).max(5),
  });

export const insertVipCodeSchema = createInsertSchema(vipCodes).pick({
  code: true,
});

export const insertRecipeSchema = createInsertSchema(recipes).omit({
  id: true,
  userId: true,
  timestamp: true,
  rating: true,
  ratingCount: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertLike = z.infer<typeof insertLikeSchema>;
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type User = typeof users.$inferSelect;
export type Photo = typeof photos.$inferSelect;
export type Like = typeof likes.$inferSelect;
export type Rating = typeof ratings.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Follow = typeof follows.$inferSelect;
export type VipCode = typeof vipCodes.$inferSelect;
export type CommentLike = typeof commentLikes.$inferSelect;
export type Recipe = typeof recipes.$inferSelect;