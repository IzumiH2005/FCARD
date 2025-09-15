import { createClient } from '@supabase/supabase-js';
import {
  type User,
  type InsertUser,
  type Book,
  type InsertBook,
  type Section,
  type InsertSection,
  type Flashcard,
  type InsertFlashcard,
  type StudyProgress,
  type InsertStudyProgress,
  type UserSettings,
  type InsertUserSettings,
} from "@shared/schema";

const supabaseUrl = "https://rwxbdlnptevbwtcpuicc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3eGJkbG5wdGV2Ynd0Y3B1aWNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4MzQ5ODcsImV4cCI6MjA3MzQxMDk4N30.x4LSKT0491g6t3Ii6n2ioyP0sDB8u6uKZM3RVBz-NKE";

const supabase = createClient(supabaseUrl, supabaseKey);

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Books
  getUserBooks(userId: string): Promise<Book[]>;
  getBook(id: string): Promise<Book | undefined>;
  createBook(book: InsertBook): Promise<Book>;
  updateBook(id: string, book: Partial<InsertBook>): Promise<Book>;
  deleteBook(id: string): Promise<void>;

  // Sections
  getBookSections(bookId: string): Promise<Section[]>;
  getSection(id: string): Promise<Section | undefined>;
  createSection(section: InsertSection): Promise<Section>;
  updateSection(id: string, section: Partial<InsertSection>): Promise<Section>;
  deleteSection(id: string): Promise<void>;

  // Flashcards
  getSectionFlashcards(sectionId: string): Promise<Flashcard[]>;
  getFlashcard(id: string): Promise<Flashcard | undefined>;
  createFlashcard(flashcard: InsertFlashcard): Promise<Flashcard>;
  updateFlashcard(id: string, flashcard: Partial<InsertFlashcard>): Promise<Flashcard>;
  deleteFlashcard(id: string): Promise<void>;

  // Study Progress
  getStudyProgress(userId: string, flashcardId: string): Promise<StudyProgress | undefined>;
  createStudyProgress(progress: InsertStudyProgress): Promise<StudyProgress>;
  updateStudyProgress(userId: string, flashcardId: string, progress: Partial<InsertStudyProgress>): Promise<StudyProgress>;

  // User Settings
  getUserSettings(userId: string): Promise<UserSettings | undefined>;
  createUserSettings(settings: InsertUserSettings): Promise<UserSettings>;
  updateUserSettings(userId: string, settings: Partial<InsertUserSettings>): Promise<UserSettings>;
  
  // Import/Export
  getBookWithFullData(id: string): Promise<any>;
  createBookWithFullData(bookData: any, userId: string): Promise<Book>;
}

export class SupabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return undefined;
    return data as User;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !data) return undefined;
    return data as User;
  }

  async createUser(user: InsertUser): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .insert({
        username: user.username,
        password: user.password
      })
      .select()
      .single();

    if (error) throw error;
    return data as User;
  }

  // Books
  async getUserBooks(userId: string): Promise<Book[]> {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Map snake_case to camelCase
    return data.map(book => ({
      id: book.id,
      title: book.title,
      description: book.description,
      coverImage: book.cover_image,
      userId: book.user_id,
      createdAt: book.created_at
    })) as Book[];
  }

  async getBook(id: string): Promise<Book | undefined> {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return undefined;

    // Map snake_case to camelCase
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      coverImage: data.cover_image,
      userId: data.user_id,
      createdAt: data.created_at
    } as Book;
  }

  async createBook(book: InsertBook): Promise<Book> {
    const { data, error } = await supabase
      .from('books')
      .insert({
        title: book.title,
        description: book.description,
        cover_image: book.coverImage,
        user_id: book.userId
      })
      .select()
      .single();

    if (error) throw error;

    // Map snake_case to camelCase
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      coverImage: data.cover_image,
      userId: data.user_id,
      createdAt: data.created_at
    } as Book;
  }

  async updateBook(id: string, book: Partial<InsertBook>): Promise<Book> {
    const updateData: any = {};
    if (book.title !== undefined) updateData.title = book.title;
    if (book.description !== undefined) updateData.description = book.description;
    if (book.coverImage !== undefined) updateData.cover_image = book.coverImage;

    const { data, error } = await supabase
      .from('books')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Map snake_case to camelCase
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      coverImage: data.cover_image,
      userId: data.user_id,
      createdAt: data.created_at
    } as Book;
  }

  async deleteBook(id: string): Promise<void> {
    const { error } = await supabase
      .from('books')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Sections
  async getBookSections(bookId: string): Promise<Section[]> {
    const { data, error } = await supabase
      .from('sections')
      .select('*')
      .eq('book_id', bookId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Section[];
  }

  async getSection(id: string): Promise<Section | undefined> {
    const { data, error } = await supabase
      .from('sections')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return undefined;
    return data as Section;
  }

  async createSection(section: InsertSection): Promise<Section> {
    const { data, error } = await supabase
      .from('sections')
      .insert({
        name: section.name,
        book_id: section.bookId
      })
      .select()
      .single();

    if (error) throw error;
    return data as Section;
  }

  async updateSection(id: string, section: Partial<InsertSection>): Promise<Section> {
    const updateData: any = {};
    if (section.name !== undefined) updateData.name = section.name;

    const { data, error } = await supabase
      .from('sections')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Section;
  }

  async deleteSection(id: string): Promise<void> {
    const { error } = await supabase
      .from('sections')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Flashcards
  async getSectionFlashcards(sectionId: string): Promise<Flashcard[]> {
    const { data, error } = await supabase
      .from('flashcards')
      .select('*')
      .eq('section_id', sectionId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Map snake_case to camelCase
    return data.map(flashcard => ({
      id: flashcard.id,
      frontText: flashcard.front_text,
      backText: flashcard.back_text,
      frontGradient: flashcard.front_gradient,
      backGradient: flashcard.back_gradient,
      frontCustomGradient: flashcard.front_custom_gradient,
      backCustomGradient: flashcard.back_custom_gradient,
      frontFont: flashcard.front_font,
      backFont: flashcard.back_font,
      frontImage: flashcard.front_image,
      backImage: flashcard.back_image,
      frontAudio: flashcard.front_audio,
      backAudio: flashcard.back_audio,
      sectionId: flashcard.section_id,
      createdAt: flashcard.created_at
    })) as Flashcard[];
  }

  async getFlashcard(id: string): Promise<Flashcard | undefined> {
    const { data, error } = await supabase
      .from('flashcards')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return undefined;

    // Map snake_case to camelCase
    return {
      id: data.id,
      frontText: data.front_text,
      backText: data.back_text,
      frontGradient: data.front_gradient,
      backGradient: data.back_gradient,
      frontCustomGradient: data.front_custom_gradient,
      backCustomGradient: data.back_custom_gradient,
      frontFont: data.front_font,
      backFont: data.back_font,
      frontImage: data.front_image,
      backImage: data.back_image,
      frontAudio: data.front_audio,
      backAudio: data.back_audio,
      sectionId: data.section_id,
      createdAt: data.created_at
    } as Flashcard;
  }

  async createFlashcard(flashcard: InsertFlashcard): Promise<Flashcard> {
    const { data, error } = await supabase
      .from('flashcards')
      .insert({
        front_text: flashcard.frontText,
        back_text: flashcard.backText,
        front_gradient: flashcard.frontGradient,
        back_gradient: flashcard.backGradient,
        front_custom_gradient: flashcard.frontCustomGradient,
        back_custom_gradient: flashcard.backCustomGradient,
        front_font: flashcard.frontFont,
        back_font: flashcard.backFont,
        front_image: flashcard.frontImage,
        back_image: flashcard.backImage,
        front_audio: flashcard.frontAudio,
        back_audio: flashcard.backAudio,
        section_id: flashcard.sectionId
      })
      .select()
      .single();

    if (error) throw error;

    // Map snake_case to camelCase
    return {
      id: data.id,
      frontText: data.front_text,
      backText: data.back_text,
      frontGradient: data.front_gradient,
      backGradient: data.back_gradient,
      frontCustomGradient: data.front_custom_gradient,
      backCustomGradient: data.back_custom_gradient,
      frontFont: data.front_font,
      backFont: data.back_font,
      frontImage: data.front_image,
      backImage: data.back_image,
      frontAudio: data.front_audio,
      backAudio: data.back_audio,
      sectionId: data.section_id,
      createdAt: data.created_at
    } as Flashcard;
  }

  async updateFlashcard(id: string, flashcard: Partial<InsertFlashcard>): Promise<Flashcard> {
    const updateData: any = {};
    if (flashcard.frontText !== undefined) updateData.front_text = flashcard.frontText;
    if (flashcard.backText !== undefined) updateData.back_text = flashcard.backText;
    if (flashcard.frontGradient !== undefined) updateData.front_gradient = flashcard.frontGradient;
    if (flashcard.backGradient !== undefined) updateData.back_gradient = flashcard.backGradient;
    if (flashcard.frontCustomGradient !== undefined) updateData.front_custom_gradient = flashcard.frontCustomGradient;
    if (flashcard.backCustomGradient !== undefined) updateData.back_custom_gradient = flashcard.backCustomGradient;
    if (flashcard.frontFont !== undefined) updateData.front_font = flashcard.frontFont;
    if (flashcard.backFont !== undefined) updateData.back_font = flashcard.backFont;
    if (flashcard.frontImage !== undefined) updateData.front_image = flashcard.frontImage;
    if (flashcard.backImage !== undefined) updateData.back_image = flashcard.backImage;
    if (flashcard.frontAudio !== undefined) updateData.front_audio = flashcard.frontAudio;
    if (flashcard.backAudio !== undefined) updateData.back_audio = flashcard.backAudio;
    if (flashcard.sectionId !== undefined) updateData.section_id = flashcard.sectionId;

    const { data, error } = await supabase
      .from('flashcards')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Map snake_case to camelCase
    return {
      id: data.id,
      frontText: data.front_text,
      backText: data.back_text,
      frontGradient: data.front_gradient,
      backGradient: data.back_gradient,
      frontCustomGradient: data.front_custom_gradient,
      backCustomGradient: data.back_custom_gradient,
      frontFont: data.front_font,
      backFont: data.back_font,
      frontImage: data.front_image,
      backImage: data.back_image,
      frontAudio: data.front_audio,
      backAudio: data.back_audio,
      sectionId: data.section_id,
      createdAt: data.created_at
    } as Flashcard;
  }

  async deleteFlashcard(id: string): Promise<void> {
    const { error } = await supabase
      .from('flashcards')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Study Progress
  async getStudyProgress(userId: string, flashcardId: string): Promise<StudyProgress | undefined> {
    const { data, error } = await supabase
      .from('study_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('flashcard_id', flashcardId)
      .single();

    if (error || !data) return undefined;
    return data as StudyProgress;
  }

  async createStudyProgress(progress: InsertStudyProgress): Promise<StudyProgress> {
    const { data, error } = await supabase
      .from('study_progress')
      .insert({
        user_id: progress.userId,
        flashcard_id: progress.flashcardId,
        difficulty: progress.difficulty,
        repetitions: progress.repetitions
      })
      .select()
      .single();

    if (error) throw error;
    return data as StudyProgress;
  }

  async updateStudyProgress(userId: string, flashcardId: string, progress: Partial<InsertStudyProgress>): Promise<StudyProgress> {
    const updateData: any = {};
    if (progress.difficulty !== undefined) updateData.difficulty = progress.difficulty;
    if (progress.repetitions !== undefined) updateData.repetitions = progress.repetitions;
    if (progress.userId !== undefined) updateData.user_id = progress.userId;
    if (progress.flashcardId !== undefined) updateData.flashcard_id = progress.flashcardId;

    const { data, error } = await supabase
      .from('study_progress')
      .update(updateData)
      .eq('user_id', userId)
      .eq('flashcard_id', flashcardId)
      .select()
      .single();

    if (error) throw error;
    return data as StudyProgress;
  }

  // User Settings
  async getUserSettings(userId: string): Promise<UserSettings | undefined> {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) return undefined;
    
    // Map snake_case to camelCase
    return {
      id: data.id,
      userId: data.user_id,
      backgroundImages: data.background_images,
      selectedBackgroundId: data.selected_background_id,
      customFonts: data.custom_fonts,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    } as UserSettings;
  }

  async createUserSettings(settings: InsertUserSettings): Promise<UserSettings> {
    const { data, error } = await supabase
      .from('user_settings')
      .insert({
        user_id: settings.userId,
        background_images: settings.backgroundImages || [],
        selected_background_id: settings.selectedBackgroundId,
        custom_fonts: settings.customFonts || []
      })
      .select()
      .single();

    if (error) throw error;
    
    // Map snake_case to camelCase
    return {
      id: data.id,
      userId: data.user_id,
      backgroundImages: data.background_images,
      selectedBackgroundId: data.selected_background_id,
      customFonts: data.custom_fonts,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    } as UserSettings;
  }

  async updateUserSettings(userId: string, settings: Partial<InsertUserSettings>): Promise<UserSettings> {
    const updateData: any = {};
    if (settings.backgroundImages !== undefined) updateData.background_images = settings.backgroundImages;
    if (settings.selectedBackgroundId !== undefined) updateData.selected_background_id = settings.selectedBackgroundId;
    if (settings.customFonts !== undefined) updateData.custom_fonts = settings.customFonts;
    
    // Always update the timestamp
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('user_settings')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    
    // Map snake_case to camelCase
    return {
      id: data.id,
      userId: data.user_id,
      backgroundImages: data.background_images,
      selectedBackgroundId: data.selected_background_id,
      customFonts: data.custom_fonts,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    } as UserSettings;
  }

  // Import/Export methods
  async getBookWithFullData(id: string): Promise<any> {
    // Get the book
    const book = await this.getBook(id);
    if (!book) {
      throw new Error('Book not found');
    }

    // Get all sections for this book
    const sections = await this.getBookSections(id);

    // Get all flashcards for each section
    const sectionsWithFlashcards = await Promise.all(
      sections.map(async (section) => {
        const flashcards = await this.getSectionFlashcards(section.id);
        return {
          ...section,
          flashcards
        };
      })
    );

    return {
      book,
      sections: sectionsWithFlashcards,
      exportDate: new Date().toISOString(),
      version: "1.0"
    };
  }

  async createBookWithFullData(bookData: any, userId: string): Promise<Book> {
    // Create the book
    const book = await this.createBook({
      title: bookData.book.title,
      description: bookData.book.description,
      coverImage: bookData.book.coverImage,
      userId: userId
    });

    // Create sections and their flashcards
    if (bookData.sections && Array.isArray(bookData.sections)) {
      for (const sectionData of bookData.sections) {
        const section = await this.createSection({
          name: sectionData.name,
          bookId: book.id
        });

        // Create flashcards for this section
        if (sectionData.flashcards && Array.isArray(sectionData.flashcards)) {
          for (const flashcardData of sectionData.flashcards) {
            await this.createFlashcard({
              frontText: flashcardData.frontText,
              backText: flashcardData.backText,
              frontGradient: flashcardData.frontGradient,
              backGradient: flashcardData.backGradient,
              frontCustomGradient: flashcardData.frontCustomGradient,
              backCustomGradient: flashcardData.backCustomGradient,
              frontFont: flashcardData.frontFont,
              backFont: flashcardData.backFont,
              frontImage: flashcardData.frontImage,
              backImage: flashcardData.backImage,
              frontAudio: flashcardData.frontAudio,
              backAudio: flashcardData.backAudio,
              sectionId: section.id
            });
          }
        }
      }
    }

    return book;
  }
}

export const storage = new SupabaseStorage();