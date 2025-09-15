import { type Request } from "express";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
  };
}

// Extend Express Session interface
declare module 'express-session' {
  interface SessionData {
    user?: {
      id: string;
      username: string;
    };
  }
}