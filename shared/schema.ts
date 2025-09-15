import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const books = pgTable("books", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  coverImage: text("cover_image"),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sections = pgTable("sections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  bookId: varchar("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const flashcards = pgTable("flashcards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  frontText: text("front_text").notNull(),
  backText: text("back_text").notNull(),
  frontGradient: text("front_gradient").default("gradient-1"),
  backGradient: text("back_gradient").default("gradient-2"),
  frontCustomGradient: text("front_custom_gradient"),
  backCustomGradient: text("back_custom_gradient"),
  frontFont: text("front_font").default("Inter"),
  backFont: text("back_font").default("Inter"),
  frontImage: text("front_image"),
  backImage: text("back_image"),
  frontAudio: text("front_audio"),
  backAudio: text("back_audio"),
  sectionId: varchar("section_id").notNull().references(() => sections.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const studyProgress = pgTable("study_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  flashcardId: varchar("flashcard_id").notNull().references(() => flashcards.id, { onDelete: "cascade" }),
  difficulty: text("difficulty").notNull(), // "easy", "hard"
  lastStudied: timestamp("last_studied").defaultNow(),
  repetitions: text("repetitions").default("0"),
});

export const userSettings = pgTable("user_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  backgroundImages: jsonb("background_images").default(sql`'[]'::jsonb`), // Array of background objects { name, filename, url }
  selectedBackgroundId: text("selected_background_id"), // ID of currently selected background
  customFonts: jsonb("custom_fonts").default(sql`'[]'::jsonb`), // Array of font objects { name, filename, url, weight?, style? }
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertBookSchema = createInsertSchema(books).pick({
  title: true,
  description: true,
  coverImage: true,
  userId: true,
});

export const insertSectionSchema = createInsertSchema(sections).pick({
  name: true,
  bookId: true,
});

export const insertFlashcardSchema = createInsertSchema(flashcards).pick({
  frontText: true,
  backText: true,
  frontGradient: true,
  backGradient: true,
  frontCustomGradient: true,
  backCustomGradient: true,
  frontFont: true,
  backFont: true,
  frontImage: true,
  backImage: true,
  frontAudio: true,
  backAudio: true,
  sectionId: true,
});

export const insertStudyProgressSchema = createInsertSchema(studyProgress).pick({
  userId: true,
  flashcardId: true,
  difficulty: true,
  repetitions: true,
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).pick({
  userId: true,
  backgroundImages: true,
  selectedBackgroundId: true,
  customFonts: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Book = typeof books.$inferSelect;
export type InsertBook = z.infer<typeof insertBookSchema>;

export type Section = typeof sections.$inferSelect;
export type InsertSection = z.infer<typeof insertSectionSchema>;

export type Flashcard = typeof flashcards.$inferSelect;
export type InsertFlashcard = z.infer<typeof insertFlashcardSchema>;

export type StudyProgress = typeof studyProgress.$inferSelect;
export type InsertStudyProgress = z.infer<typeof insertStudyProgressSchema>;

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;

// Import/Export schema for validation
export const importFlashcardSchema = z.object({
  frontText: z.string().min(1),
  backText: z.string().min(1),
  frontGradient: z.string().optional(),
  backGradient: z.string().optional(),
  frontCustomGradient: z.string().optional(),
  backCustomGradient: z.string().optional(),
  frontFont: z.string().optional(),
  backFont: z.string().optional(),
  frontImage: z.string().nullable().optional(),
  backImage: z.string().nullable().optional(),
  frontAudio: z.string().nullable().optional(),
  backAudio: z.string().nullable().optional(),
});

export const importSectionSchema = z.object({
  name: z.string().min(1),
  flashcards: z.array(importFlashcardSchema).optional().default([]),
});

export const importBookSchema = z.object({
  book: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    coverImage: z.string().nullable().optional(),
  }),
  sections: z.array(importSectionSchema).optional().default([]),
  exportDate: z.string().optional(),
  version: z.string().optional(),
});
