import express, { type Express } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcrypt";
import { z } from "zod";
import { storage } from "./storage";
import { insertUserSchema, insertBookSchema, insertSectionSchema, insertFlashcardSchema, insertStudyProgressSchema, insertUserSettingsSchema, importBookSchema } from "@shared/schema";
import { requireAuth, requireAuthAndOwnership } from "./middleware/auth";
import { type AuthenticatedRequest } from "./types";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createClient } from '@supabase/supabase-js';

// Supabase Storage configuration
const supabaseUrl = "https://rwxbdlnptevbwtcpuicc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3eGJkbG5wdGV2Ynd0Y3B1aWNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4MzQ5ODcsImV4cCI6MjA3MzQxMDk4N30.x4LSKT0491g6t3Ii6n2ioyP0sDB8u6uKZM3RVBz-NKE";
const supabase = createClient(supabaseUrl, supabaseKey);

// Configure multer for file uploads (temporary local storage before uploading to Supabase)
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Helper function to upload file to Supabase Storage
async function uploadToSupabase(filePath: string, fileName: string, bucketName: string = 'uploads'): Promise<string> {
  const fileBuffer = fs.readFileSync(filePath);
  
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(fileName, fileBuffer, {
      contentType: 'auto',
      upsert: true
    });

  if (error) {
    throw new Error(`Failed to upload to Supabase: ${error.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucketName)
    .getPublicUrl(fileName);

  return publicUrl;
}

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Validate file types based on field name
    if (file.fieldname === 'background') {
      // Allow common image types for backgrounds
      const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (allowedImageTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid background file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
      }
    } else if (file.fieldname === 'font') {
      // Allow common font types
      const allowedFontTypes = ['font/ttf', 'font/otf', 'font/woff', 'font/woff2', 'application/font-woff', 'application/font-woff2', 'application/x-font-ttf', 'application/x-font-otf'];
      if (allowedFontTypes.includes(file.mimetype) || file.originalname.match(/\.(ttf|otf|woff|woff2)$/i)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid font file type. Only TTF, OTF, WOFF, and WOFF2 fonts are allowed.'));
      }
    } else if (file.fieldname === 'importFile') {
      // Allow JSON files for book import
      const allowedImportTypes = ['application/json', 'text/json', 'application/octet-stream'];
      if (allowedImportTypes.includes(file.mimetype) || file.originalname.match(/\.json$/i)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid import file type. Only JSON files are allowed.'));
      }
    } else {
      // For other file types (images, audio), allow common types
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm',
        'audio/aac', 'audio/m4a', 'audio/x-m4a', 'audio/mp4a-latm', 'audio/x-wav'
      ];
      // Also check file extension as fallback for audio files
      const audioExtensions = /\.(mp3|wav|ogg|m4a|aac|webm|mp4)$/i;
      
      if (allowedTypes.includes(file.mimetype) || 
          (file.fieldname === 'frontAudio' || file.fieldname === 'backAudio') && audioExtensions.test(file.originalname)) {
        cb(null, true);
      } else {
        cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: images and audio files.`));
      }
    }
  }
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const registerSchema = insertUserSchema.extend({
  password: z.string().min(6),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve static files from uploads directory
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
  
  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password } = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user
      const user = await storage.createUser({
        username,
        password: hashedPassword,
      });

      // Create session
      req.session.user = { id: user.id, username: user.username };
      
      res.json({ user: { id: user.id, username: user.username } });
    } catch (error) {
      console.error("Registration error:", error);
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        if (firstError.path[0] === "username") {
          return res.status(400).json({ message: "Username is required" });
        }
        if (firstError.path[0] === "password") {
          return res.status(400).json({ message: "Password must be at least 6 characters long" });
        }
      }
      res.status(400).json({ message: "Invalid registration data" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Create session
      req.session.user = { id: user.id, username: user.username };
      
      res.json({ user: { id: user.id, username: user.username } });
    } catch (error) {
      console.error("Login error:", error);
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        if (firstError.path[0] === "username") {
          return res.status(400).json({ message: "Username is required" });
        }
        if (firstError.path[0] === "password") {
          return res.status(400).json({ message: "Password is required" });
        }
      }
      res.status(400).json({ message: "Invalid login data" });
    }
  });

  // Add logout route
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.clearCookie('connect.sid'); // Clear session cookie
      res.json({ message: "Logged out successfully" });
    });
  });

  // Books routes (protected)
  app.get("/api/books/:userId", requireAuthAndOwnership, async (req: AuthenticatedRequest, res) => {
    try {
      const books = await storage.getUserBooks(req.params.userId);
      res.json(books);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch books" });
    }
  });

  app.get("/api/books/single/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const book = await storage.getBook(req.params.id);
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }
      if (book.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json(book);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch book" });
    }
  });

  app.post("/api/books", requireAuth, upload.single("coverImage"), async (req: AuthenticatedRequest, res) => {
    try {
      let coverImageUrl = null;
      
      if (req.file) {
        const fileName = `${crypto.randomUUID()}${path.extname(req.file.originalname)}`;
        coverImageUrl = await uploadToSupabase(req.file.path, fileName);
        
        // Clean up temporary file
        fs.unlinkSync(req.file.path);
      }
      
      const bookData = insertBookSchema.parse({
        ...req.body,
        coverImage: coverImageUrl,
      });
      
      const book = await storage.createBook(bookData);
      res.json(book);
    } catch (error) {
      console.error("Book creation error:", error);
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.put("/api/books/:id", requireAuth, upload.single("coverImage"), async (req: AuthenticatedRequest, res) => {
    try {
      let coverImageUrl = undefined;
      
      if (req.file) {
        const fileName = `${crypto.randomUUID()}${path.extname(req.file.originalname)}`;
        coverImageUrl = await uploadToSupabase(req.file.path, fileName);
        
        // Clean up temporary file
        fs.unlinkSync(req.file.path);
      }
      
      const updateData = {
        ...req.body,
        coverImage: coverImageUrl,
      };
      
      const book = await storage.updateBook(req.params.id, updateData);
      res.json(book);
    } catch (error) {
      console.error("Book update error:", error);
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete("/api/books/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      await storage.deleteBook(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete book" });
    }
  });

  // Sections routes (protected)
  app.get("/api/sections/:bookId", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const sections = await storage.getBookSections(req.params.bookId);
      res.json(sections);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sections" });
    }
  });

  app.get("/api/sections/single/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const section = await storage.getSection(req.params.id);
      if (!section) {
        return res.status(404).json({ message: "Section not found" });
      }
      res.json(section);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch section" });
    }
  });

  app.post("/api/sections", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const sectionData = insertSectionSchema.parse(req.body);
      const section = await storage.createSection(sectionData);
      res.json(section);
    } catch (error) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.put("/api/sections/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const sectionData = { name: req.body.name };
      const section = await storage.updateSection(req.params.id, sectionData);
      res.json(section);
    } catch (error) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete("/api/sections/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      await storage.deleteSection(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete section" });
    }
  });

  // Flashcards routes (protected)
  app.get("/api/flashcards/section/:sectionId", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const flashcards = await storage.getSectionFlashcards(req.params.sectionId);
      res.json(flashcards);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch flashcards" });
    }
  });

  app.get("/api/flashcards/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // Single flashcard fetch
      const flashcard = await storage.getFlashcard(req.params.id);
      if (!flashcard) {
        return res.status(404).json({ message: "Flashcard not found" });
      }
      res.json(flashcard);
    } catch (error) {
      console.error("Flashcard fetch error:", error);
      res.status(500).json({ message: "Failed to fetch flashcard" });
    }
  });

  // New endpoint specifically for book study mode
  app.get("/api/books/:bookId/flashcards", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // Get all sections for the book, then get all flashcards
      const sections = await storage.getBookSections(req.params.bookId);
      
      const allFlashcards: any[] = [];
      for (const section of sections) {
        const sectionFlashcards = await storage.getSectionFlashcards(section.id);
        allFlashcards.push(...sectionFlashcards);
      }
      
      // Don't shuffle on server, let client handle it for better randomization
      res.json(allFlashcards);
    } catch (error) {
      console.error("Book flashcards fetch error:", error);
      res.status(500).json({ message: "Failed to fetch book flashcards" });
    }
  });

  app.post("/api/flashcards", requireAuth, upload.fields([
    { name: "frontImage", maxCount: 1 },
    { name: "backImage", maxCount: 1 },
    { name: "frontAudio", maxCount: 1 },
    { name: "backAudio", maxCount: 1 },
  ]), async (req: AuthenticatedRequest, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      let frontImageUrl = null;
      let backImageUrl = null;
      let frontAudioUrl = null;
      let backAudioUrl = null;
      
      // Upload files to Supabase Storage
      if (files?.frontImage?.[0]) {
        const fileName = `${crypto.randomUUID()}${path.extname(files.frontImage[0].originalname)}`;
        frontImageUrl = await uploadToSupabase(files.frontImage[0].path, fileName);
        fs.unlinkSync(files.frontImage[0].path);
      }
      
      if (files?.backImage?.[0]) {
        const fileName = `${crypto.randomUUID()}${path.extname(files.backImage[0].originalname)}`;
        backImageUrl = await uploadToSupabase(files.backImage[0].path, fileName);
        fs.unlinkSync(files.backImage[0].path);
      }
      
      if (files?.frontAudio?.[0]) {
        const fileName = `${crypto.randomUUID()}${path.extname(files.frontAudio[0].originalname)}`;
        frontAudioUrl = await uploadToSupabase(files.frontAudio[0].path, fileName);
        fs.unlinkSync(files.frontAudio[0].path);
      }
      
      if (files?.backAudio?.[0]) {
        const fileName = `${crypto.randomUUID()}${path.extname(files.backAudio[0].originalname)}`;
        backAudioUrl = await uploadToSupabase(files.backAudio[0].path, fileName);
        fs.unlinkSync(files.backAudio[0].path);
      }
      
      const flashcardData = insertFlashcardSchema.parse({
        ...req.body,
        frontImage: frontImageUrl,
        backImage: backImageUrl,
        frontAudio: frontAudioUrl,
        backAudio: backAudioUrl,
      });
      
      const flashcard = await storage.createFlashcard(flashcardData);
      res.json(flashcard);
    } catch (error) {
      console.error("Flashcard creation error:", error);
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.put("/api/flashcards/:id", requireAuth, upload.fields([
    { name: "frontImage", maxCount: 1 },
    { name: "backImage", maxCount: 1 },
    { name: "frontAudio", maxCount: 1 },
    { name: "backAudio", maxCount: 1 },
  ]), async (req: AuthenticatedRequest, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      let frontImageUrl = undefined;
      let backImageUrl = undefined;
      let frontAudioUrl = undefined;
      let backAudioUrl = undefined;
      
      // Upload files to Supabase Storage
      if (files?.frontImage?.[0]) {
        const fileName = `${crypto.randomUUID()}${path.extname(files.frontImage[0].originalname)}`;
        frontImageUrl = await uploadToSupabase(files.frontImage[0].path, fileName);
        fs.unlinkSync(files.frontImage[0].path);
      }
      
      if (files?.backImage?.[0]) {
        const fileName = `${crypto.randomUUID()}${path.extname(files.backImage[0].originalname)}`;
        backImageUrl = await uploadToSupabase(files.backImage[0].path, fileName);
        fs.unlinkSync(files.backImage[0].path);
      }
      
      if (files?.frontAudio?.[0]) {
        const fileName = `${crypto.randomUUID()}${path.extname(files.frontAudio[0].originalname)}`;
        frontAudioUrl = await uploadToSupabase(files.frontAudio[0].path, fileName);
        fs.unlinkSync(files.frontAudio[0].path);
      }
      
      if (files?.backAudio?.[0]) {
        const fileName = `${crypto.randomUUID()}${path.extname(files.backAudio[0].originalname)}`;
        backAudioUrl = await uploadToSupabase(files.backAudio[0].path, fileName);
        fs.unlinkSync(files.backAudio[0].path);
      }
      
      const flashcardData = {
        ...req.body,
        frontImage: frontImageUrl,
        backImage: backImageUrl,
        frontAudio: frontAudioUrl,
        backAudio: backAudioUrl,
      };
      
      const flashcard = await storage.updateFlashcard(req.params.id, flashcardData);
      res.json(flashcard);
    } catch (error) {
      console.error("Flashcard update error:", error);
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete("/api/flashcards/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      await storage.deleteFlashcard(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete flashcard" });
    }
  });

  // Study progress routes (protected)
  app.post("/api/study-progress", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const progressData = insertStudyProgressSchema.parse(req.body);
      
      // Check if progress already exists
      const existing = await storage.getStudyProgress(progressData.userId, progressData.flashcardId);
      
      let progress;
      if (existing) {
        progress = await storage.updateStudyProgress(progressData.userId, progressData.flashcardId, progressData);
      } else {
        progress = await storage.createStudyProgress(progressData);
      }
      
      res.json(progress);
    } catch (error) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // User Settings routes (CRITICAL: Now protected from IDOR attacks)
  app.get("/api/settings/:userId", requireAuthAndOwnership, async (req: AuthenticatedRequest, res) => {
    try {
      const settings = await storage.getUserSettings(req.params.userId);
      if (!settings) {
        // Create default settings if none exist
        const defaultSettings = await storage.createUserSettings({
          userId: req.params.userId,
          backgroundImages: [],
          customFonts: []
        });
        return res.json(defaultSettings);
      }
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.post("/api/settings/:userId", requireAuthAndOwnership, async (req: AuthenticatedRequest, res) => {
    try {
      const settingsData = insertUserSettingsSchema.parse({ 
        userId: req.params.userId,
        ...req.body 
      });
      
      // Check if settings already exist
      const existing = await storage.getUserSettings(req.params.userId);
      
      let settings;
      if (existing) {
        settings = await storage.updateUserSettings(req.params.userId, settingsData);
      } else {
        settings = await storage.createUserSettings(settingsData);
      }
      
      res.json(settings);
    } catch (error) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.post("/api/settings/:userId/upload-background", requireAuthAndOwnership, upload.single("background"), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Generate secure filename using crypto UUID and preserve extension
      const fileExt = path.extname(req.file.originalname).toLowerCase();
      const secureFileName = `${crypto.randomUUID()}${fileExt}`;
      
      // Upload to Supabase Storage
      const publicUrl = await uploadToSupabase(req.file.path, secureFileName);
      
      // Clean up temporary file
      fs.unlinkSync(req.file.path);
      
      // Get or create user settings (upsert logic)
      let settings = await storage.getUserSettings(req.params.userId);
      if (!settings) {
        settings = await storage.createUserSettings({
          userId: req.params.userId,
          backgroundImages: [],
          customFonts: []
        });
      }
      
      const backgroundImages = (settings.backgroundImages as any[]) || [];
      
      // Add new background with Supabase URL
      const newBackground = {
        id: crypto.randomUUID(),
        name: req.body.name || path.parse(req.file.originalname).name,
        filename: secureFileName,
        url: publicUrl
      };
      
      backgroundImages.push(newBackground);
      
      // Update settings
      const updatedSettings = await storage.updateUserSettings(req.params.userId, {
        backgroundImages,
        selectedBackgroundId: req.body.setAsSelected ? newBackground.id : settings.selectedBackgroundId
      });
      
      res.json(updatedSettings);
    } catch (error) {
      console.error("Upload error:", error);
      if (error instanceof Error && error.message.includes('Invalid')) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to upload background" });
    }
  });

  app.post("/api/settings/:userId/upload-font", requireAuthAndOwnership, upload.single("font"), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Generate secure filename using crypto UUID and preserve extension
      const fileExt = path.extname(req.file.originalname).toLowerCase();
      const secureFileName = `${crypto.randomUUID()}${fileExt}`;
      
      // Upload to Supabase Storage
      const publicUrl = await uploadToSupabase(req.file.path, secureFileName);
      
      // Clean up temporary file
      fs.unlinkSync(req.file.path);
      
      // Get or create user settings (upsert logic)
      let settings = await storage.getUserSettings(req.params.userId);
      if (!settings) {
        settings = await storage.createUserSettings({
          userId: req.params.userId,
          backgroundImages: [],
          customFonts: []
        });
      }
      
      const customFonts = (settings.customFonts as any[]) || [];
      
      // Add new font with Supabase URL
      const newFont = {
        id: crypto.randomUUID(),
        name: req.body.name || path.parse(req.file.originalname).name,
        filename: secureFileName,
        url: publicUrl,
        weight: req.body.weight || "400",
        style: req.body.style || "normal"
      };
      
      customFonts.push(newFont);
      
      // Update settings
      const updatedSettings = await storage.updateUserSettings(req.params.userId, {
        customFonts
      });
      
      res.json(updatedSettings);
    } catch (error) {
      console.error("Font upload error:", error);
      if (error instanceof Error && error.message.includes('Invalid')) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to upload font" });
    }
  });

  app.delete("/api/settings/:userId/background/:backgroundId", requireAuthAndOwnership, async (req: AuthenticatedRequest, res) => {
    try {
      const { userId, backgroundId } = req.params;
      const settings = await storage.getUserSettings(userId);
      
      if (!settings) {
        return res.status(404).json({ message: "Settings not found" });
      }
      
      const backgroundImages = settings.backgroundImages as any[];
      const backgroundToDelete = backgroundImages.find((bg: any) => bg.id === backgroundId);
      
      // Delete file from Supabase Storage if it exists
      if (backgroundToDelete && backgroundToDelete.filename) {
        try {
          await supabase.storage
            .from('uploads')
            .remove([backgroundToDelete.filename]);
        } catch (fileError) {
          console.error('Failed to delete background file from Supabase:', fileError);
          // Continue with database cleanup even if file deletion fails
        }
      }
      
      const updatedBackgroundImages = backgroundImages.filter((bg: any) => bg.id !== backgroundId);
      let selectedBackgroundId = settings.selectedBackgroundId;
      
      // If the deleted background was selected, unset it
      if (selectedBackgroundId === backgroundId) {
        selectedBackgroundId = null;
      }
      
      const updatedSettings = await storage.updateUserSettings(userId, {
        backgroundImages: updatedBackgroundImages,
        selectedBackgroundId
      });
      
      res.json(updatedSettings);
    } catch (error) {
      console.error('Background deletion error:', error);
      res.status(500).json({ message: "Failed to delete background" });
    }
  });

  app.delete("/api/settings/:userId/font/:fontId", requireAuthAndOwnership, async (req: AuthenticatedRequest, res) => {
    try {
      const { userId, fontId } = req.params;
      const settings = await storage.getUserSettings(userId);
      
      if (!settings) {
        return res.status(404).json({ message: "Settings not found" });
      }
      
      const customFonts = settings.customFonts as any[];
      const fontToDelete = customFonts.find((font: any) => font.id === fontId);
      
      // Delete file from Supabase Storage if it exists
      if (fontToDelete && fontToDelete.filename) {
        try {
          await supabase.storage
            .from('uploads')
            .remove([fontToDelete.filename]);
        } catch (fileError) {
          console.error('Failed to delete font file from Supabase:', fileError);
          // Continue with database cleanup even if file deletion fails
        }
      }
      
      const updatedCustomFonts = customFonts.filter((font: any) => font.id !== fontId);
      
      const updatedSettings = await storage.updateUserSettings(userId, {
        customFonts: updatedCustomFonts
      });
      
      res.json(updatedSettings);
    } catch (error) {
      console.error('Font deletion error:', error);
      res.status(500).json({ message: "Failed to delete font" });
    }
  });

  // Import/Export routes
  app.get("/api/books/export/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      // First check if book exists and user owns it
      const book = await storage.getBook(req.params.id);
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }
      if (book.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const bookData = await storage.getBookWithFullData(req.params.id);
      const fileName = `book_${bookData.book.title.replace(/[^a-zA-Z0-9]/g, '_')}_export.json`;
      
      // Check if this is a mobile app request by checking user agent
      const userAgent = req.get('User-Agent') || '';
      const isMobileApp = userAgent.includes('wv') || userAgent.includes('Median') || req.get('X-Requested-With') === 'com.median.android';
      
      if (isMobileApp) {
        // For mobile apps, create a blob URL for download
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Length', Buffer.byteLength(JSON.stringify(bookData, null, 2)));
      } else {
        // For web browsers
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      }
      
      res.send(JSON.stringify(bookData, null, 2));
    } catch (error) {
      console.error('Export error:', error);
      res.status(500).json({ message: "Failed to export book" });
    }
  });

  app.post("/api/books/import", requireAuth, upload.single("importFile"), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Read and parse the uploaded JSON file
      const fileContent = fs.readFileSync(req.file.path, 'utf8');
      const rawData = JSON.parse(fileContent);
      
      // Validate with Zod schema
      const validationResult = importBookSchema.safeParse(rawData);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid book data format", 
          errors: validationResult.error.errors 
        });
      }
      
      const bookData = validationResult.data;

      // Create the book with all its data
      const createdBook = await storage.createBookWithFullData(bookData, req.user!.id);
      
      res.json({ 
        success: true, 
        book: createdBook,
        message: "Book imported successfully" 
      });
    } catch (error) {
      console.error('Import error:', error);
      
      if (error instanceof SyntaxError) {
        return res.status(400).json({ message: "Invalid JSON file" });
      }
      
      res.status(500).json({ message: "Failed to import book" });
    } finally {
      // Clean up the uploaded file in all cases
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.error('Failed to cleanup uploaded file:', cleanupError);
        }
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
