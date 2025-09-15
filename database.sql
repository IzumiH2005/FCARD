-- Flashcard Application Database Schema
-- Complete SQL schema for PostgreSQL/Supabase

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "username" text NOT NULL UNIQUE,
  "password" text NOT NULL,
  "created_at" timestamp DEFAULT NOW()
);

-- Books table
CREATE TABLE IF NOT EXISTS "books" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" text NOT NULL,
  "description" text,
  "cover_image" text,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT NOW()
);

-- Sections table
CREATE TABLE IF NOT EXISTS "sections" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "book_id" varchar NOT NULL REFERENCES "books"("id") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT NOW()
);

-- Flashcards table
CREATE TABLE IF NOT EXISTS "flashcards" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "front_text" text NOT NULL,
  "back_text" text NOT NULL,
  "front_gradient" text DEFAULT 'gradient-1',
  "back_gradient" text DEFAULT 'gradient-2',
  "front_custom_gradient" text,
  "back_custom_gradient" text,
  "front_font" text DEFAULT 'Inter',
  "back_font" text DEFAULT 'Inter',
  "front_image" text,
  "back_image" text,
  "front_audio" text,
  "back_audio" text,
  "section_id" varchar NOT NULL REFERENCES "sections"("id") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT NOW()
);

-- Study progress table
CREATE TABLE IF NOT EXISTS "study_progress" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "flashcard_id" varchar NOT NULL REFERENCES "flashcards"("id") ON DELETE CASCADE,
  "difficulty" text NOT NULL,
  "last_studied" timestamp DEFAULT NOW(),
  "repetitions" text DEFAULT '0'
);

-- User settings table
CREATE TABLE IF NOT EXISTS "user_settings" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE UNIQUE,
  "background_images" jsonb DEFAULT '[]'::jsonb,
  "selected_background_id" text,
  "custom_fonts" jsonb DEFAULT '[]'::jsonb,
  "created_at" timestamp DEFAULT NOW(),
  "updated_at" timestamp DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_books_user_id" ON "books"("user_id");
CREATE INDEX IF NOT EXISTS "idx_sections_book_id" ON "sections"("book_id");
CREATE INDEX IF NOT EXISTS "idx_flashcards_section_id" ON "flashcards"("section_id");
CREATE INDEX IF NOT EXISTS "idx_study_progress_user_id" ON "study_progress"("user_id");
CREATE INDEX IF NOT EXISTS "idx_study_progress_flashcard_id" ON "study_progress"("flashcard_id");
CREATE INDEX IF NOT EXISTS "idx_user_settings_user_id" ON "user_settings"("user_id");

-- Sample data (optional - comment out if not needed)
/*
INSERT INTO "users" ("id", "username", "password") VALUES
('550e8400-e29b-41d4-a716-446655440000', 'demo_user', '$2b$10$yourhashedpasswordhere');

INSERT INTO "books" ("id", "title", "description", "user_id") VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Sample Book', 'A sample flashcard book', '550e8400-e29b-41d4-a716-446655440000');

INSERT INTO "sections" ("id", "name", "book_id") VALUES
('550e8400-e29b-41d4-a716-446655440002', 'Sample Section', '550e8400-e29b-41d4-a716-446655440001');

INSERT INTO "flashcards" ("id", "front_text", "back_text", "section_id") VALUES
('550e8400-e29b-41d4-a716-446655440003', 'Front text example', 'Back text example', '550e8400-e29b-41d4-a716-446655440002');
*/