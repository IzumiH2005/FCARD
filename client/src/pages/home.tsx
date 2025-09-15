import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, LogOut, ChevronRight, BookOpen, Upload, Settings, Trash2, MoreVertical, Edit, Search, X, Download } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { FileUpload } from "@/components/ui/file-upload";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Book } from "@shared/schema";

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [user, setUser] = React.useState<{ id: string; username: string } | null>(null);
  const [isCreateBookOpen, setIsCreateBookOpen] = React.useState(false);
  const [isEditBookOpen, setIsEditBookOpen] = React.useState(false);
  const [editingBook, setEditingBook] = React.useState<Book | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isImportDialogOpen, setIsImportDialogOpen] = React.useState(false);
  const [importFile, setImportFile] = React.useState<File | null>(null);
  const [newBook, setNewBook] = React.useState<{
    title: string;
    description: string;
    coverImage: File | null;
  }>({
    title: "",
    description: "",
    coverImage: null,
  });
  const [editBook, setEditBook] = React.useState<{
    title: string;
    description: string;
    coverImage: File | null;
  }>({
    title: "",
    description: "",
    coverImage: null,
  });

  React.useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      setLocation("/auth");
      return;
    }
    setUser(JSON.parse(userData));
  }, [setLocation]);

  const { data: books = [], isLoading } = useQuery<Book[]>({
    queryKey: ["/api/books", user?.id],
    enabled: !!user?.id,
  });

  // Filter books based on search query
  const filteredBooks = React.useMemo(() => {
    if (!searchQuery.trim()) return books;
    
    return books.filter(book => 
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (book.description && book.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [books, searchQuery]);

  const createBookMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/books", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Failed to create book");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/books", user?.id] });
      setIsCreateBookOpen(false);
      setNewBook({ title: "", description: "", coverImage: null });
      toast({ title: "Success", description: "Book created successfully!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create book", variant: "destructive" });
    },
  });

  const handleCreateBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newBook.title) return;

    const formData = new FormData();
    formData.append("title", newBook.title);
    formData.append("description", newBook.description || "");
    formData.append("userId", user.id);
    if (newBook.coverImage) {
      formData.append("coverImage", newBook.coverImage);
    }

    createBookMutation.mutate(formData);
  };

  const deleteBookMutation = useMutation({
    mutationFn: async (bookId: string) => {
      const response = await apiRequest("DELETE", `/api/books/${bookId}`);
      if (!response.ok) throw new Error("Failed to delete book");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/books", user?.id] });
      toast({ title: "Success", description: "Book deleted successfully!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete book", variant: "destructive" });
    },
  });

  const handleDeleteBook = (e: React.MouseEvent, bookId: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this book? This action cannot be undone.")) {
      deleteBookMutation.mutate(bookId);
    }
  };

  const handleExportBook = async (e: React.MouseEvent, book: Book) => {
    e.stopPropagation();
    try {
      const response = await fetch(`/api/books/export/${book.id}`);
      if (!response.ok) throw new Error('Failed to export book');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `book_${book.title.replace(/[^a-zA-Z0-9]/g, '_')}_export.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({ title: "Success", description: "Book exported successfully!" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to export book", variant: "destructive" });
    }
  };

  const importBookMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('importFile', file);
      
      const response = await fetch('/api/books/import', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to import book');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/books', user?.id] });
      setIsImportDialogOpen(false);
      setImportFile(null);
      toast({ title: "Success", description: "Book imported successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleImportBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;
    importBookMutation.mutate(importFile);
  };

  const editBookMutation = useMutation({
    mutationFn: async ({ bookId, formData }: { bookId: string; formData: FormData }) => {
      const response = await fetch(`/api/books/${bookId}`, {
        method: "PUT",
        body: formData,
      });
      if (!response.ok) throw new Error("Failed to update book");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/books", user?.id] });
      setIsEditBookOpen(false);
      setEditBook({ title: "", description: "", coverImage: null });
      setEditingBook(null);
      toast({ title: "Success", description: "Book updated successfully!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update book", variant: "destructive" });
    },
  });

  const handleUpdateBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBook || !editBook.title) return;

    const formData = new FormData();
    formData.append("title", editBook.title);
    formData.append("description", editBook.description || "");
    if (editBook.coverImage) {
      formData.append("coverImage", editBook.coverImage);
    }

    editBookMutation.mutate({ bookId: editingBook.id, formData });
  };

  const handleEditBook = (e: React.MouseEvent, book: Book) => {
    e.stopPropagation();
    setEditingBook(book);
    setEditBook({
      title: book.title,
      description: book.description || "",
      coverImage: null,
    });
    setIsEditBookOpen(true);
  };

  const handleEditFileSelect = (files: FileList | null) => {
    if (files && files.length > 0) {
      setEditBook({ ...editBook, coverImage: files[0] });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    setLocation("/auth");
  };

  const handleBookClick = (book: Book) => {
    setLocation(`/book/${book.id}`);
  };

  const handleFileSelect = (files: FileList | null) => {
    if (files && files.length > 0) {
      setNewBook({ ...newBook, coverImage: files[0] });
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen pb-20 bg-background app-overlay">
      {/* Header */}
      <header className="bg-card border-b px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Books</h1>
            <p className="text-sm text-muted-foreground">Welcome back, {user.username}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="button-logout">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search books by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
            data-testid="search-input"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
              onClick={() => setSearchQuery("")}
              data-testid="clear-search"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-20 bg-muted rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-6 bg-muted rounded w-32" />
                      <div className="h-4 bg-muted rounded w-24" />
                      <div className="h-3 bg-muted rounded w-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredBooks.length > 0 ? (
          filteredBooks.map((book) => (
            <Card 
              key={book.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleBookClick(book)}
              data-testid={`card-book-${book.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-20 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center text-primary-foreground font-bold text-sm">
                    {book.coverImage ? (
                      <img 
                        src={book.coverImage} 
                        alt={book.title}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <span>{book.title.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{book.title}</h3>
                    {book.description && (
                      <p className="text-sm text-muted-foreground mt-1">{book.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Created {book.createdAt ? new Date(book.createdAt).toLocaleDateString() : 'Date unavailable'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                          data-testid={`button-book-menu-${book.id}`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => handleEditBook(e, book)}
                          data-testid={`button-edit-${book.id}`}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => handleExportBook(e, book)}
                          data-testid={`button-export-${book.id}`}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => handleDeleteBook(e, book.id)}
                          className="text-destructive focus:text-destructive"
                          data-testid={`button-delete-${book.id}`}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
              <BookOpen className="w-12 h-12 text-muted-foreground" />
            </div>
            {searchQuery ? (
              <>
                <h3 className="text-xl font-semibold mb-2">No books found</h3>
                <p className="text-muted-foreground mb-6">
                  No books match your search "{searchQuery}". Try a different search term.
                </p>
                <Button variant="outline" onClick={() => setSearchQuery("")}>
                  Clear search
                </Button>
              </>
            ) : books.length > 0 ? (
              <>
                <h3 className="text-xl font-semibold mb-2">No books found</h3>
                <p className="text-muted-foreground mb-6">Your search didn't match any books</p>
              </>
            ) : (
              <>
                <h3 className="text-xl font-semibold mb-2">No books yet</h3>
                <p className="text-muted-foreground mb-6">Create your first flashcard book to get started</p>
              </>
            )}
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <Dialog open={isCreateBookOpen} onOpenChange={setIsCreateBookOpen}>
        <DialogTrigger asChild>
          <Button
            size="icon"
            className="fixed bottom-24 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-50"
            data-testid="button-create-book"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Book</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateBook} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="book-title">Book Title</Label>
              <Input
                id="book-title"
                value={newBook.title}
                onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                placeholder="Enter book title..."
                data-testid="input-book-title"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="book-description">Description (Optional)</Label>
              <Textarea
                id="book-description"
                value={newBook.description}
                onChange={(e) => setNewBook({ ...newBook, description: e.target.value })}
                placeholder="Enter book description..."
                data-testid="textarea-book-description"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Cover Image (Optional)</Label>
              <FileUpload
                accept="image/*"
                onFileSelect={handleFileSelect}
                placeholder="Choose cover image..."
                data-testid="upload-cover-image"
              />
            </div>
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setIsCreateBookOpen(false)}
                data-testid="button-cancel-book"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={createBookMutation.isPending}
                data-testid="button-submit-book"
              >
                {createBookMutation.isPending ? "Creating..." : "Create Book"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Book Dialog */}
      <Dialog open={isEditBookOpen} onOpenChange={setIsEditBookOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Book</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateBook} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-book-title">Book Title</Label>
              <Input
                id="edit-book-title"
                value={editBook.title}
                onChange={(e) => setEditBook({ ...editBook, title: e.target.value })}
                placeholder="Enter book title..."
                data-testid="input-edit-book-title"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-book-description">Description (Optional)</Label>
              <Textarea
                id="edit-book-description"
                value={editBook.description}
                onChange={(e) => setEditBook({ ...editBook, description: e.target.value })}
                placeholder="Enter book description..."
                data-testid="textarea-edit-book-description"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Cover Image (Optional)</Label>
              {editingBook?.coverImage && (
                <div className="mb-2">
                  <p className="text-sm text-muted-foreground mb-2">Current cover:</p>
                  <div className="w-16 h-20 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                    <img 
                      src={editingBook.coverImage} 
                      alt={editingBook.title}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                </div>
              )}
              <FileUpload
                accept="image/*"
                onFileSelect={handleEditFileSelect}
                placeholder="Choose new cover image..."
                data-testid="upload-edit-cover-image"
              />
            </div>
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setIsEditBookOpen(false)}
                data-testid="button-cancel-edit-book"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={editBookMutation.isPending}
                data-testid="button-submit-edit-book"
              >
                {editBookMutation.isPending ? "Updating..." : "Update Book"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Import Book</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleImportBook} className="space-y-4">
            <div>
              <Label>Select JSON file</Label>
              <FileUpload
                accept=".json"
                onFileSelect={(files) => setImportFile(files?.[0] || null)}
                placeholder="Choose JSON file..."
                data-testid="import-file-upload"
              />
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsImportDialogOpen(false);
                  setImportFile(null);
                }}
                data-testid="button-cancel-import"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={!importFile || importBookMutation.isPending}
                data-testid="button-submit-import"
              >
                {importBookMutation.isPending ? "Importing..." : "Import Book"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t px-4 py-2 z-40">
        <div className="flex justify-around">
          <button className="flex flex-col items-center py-2 px-4 text-primary" data-testid="nav-books">
            <BookOpen className="w-6 h-6 mb-1" />
            <span className="text-xs">Books</span>
          </button>
          <button 
            className="flex flex-col items-center py-2 px-4 text-muted-foreground hover:text-primary transition-colors" 
            data-testid="nav-import"
            onClick={() => setIsImportDialogOpen(true)}
          >
            <Upload className="w-6 h-6 mb-1" />
            <span className="text-xs">Import</span>
          </button>
          <button 
            className="flex flex-col items-center py-2 px-4 text-muted-foreground hover:text-primary transition-colors" 
            data-testid="nav-settings"
            onClick={() => setLocation("/settings")}
          >
            <Settings className="w-6 h-6 mb-1" />
            <span className="text-xs">Settings</span>
          </button>
        </div>
      </nav>
    </div>
  );
}