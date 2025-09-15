import { type Response, type NextFunction } from "express";
import { type AuthenticatedRequest } from "../types";

/**
 * Authentication middleware that checks for a valid session
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.session?.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  // Make user available on request object
  req.user = req.session.user;
  next();
}

/**
 * Authorization middleware that ensures the authenticated user matches the userId parameter
 */
export function requireUserOwnership(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  const userIdParam = req.params.userId;
  if (req.user.id !== userIdParam) {
    return res.status(403).json({ message: "Access denied. You can only access your own data." });
  }
  
  next();
}

/**
 * Combined middleware for routes that require both authentication and user ownership
 */
export function requireAuthAndOwnership(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, (err) => {
    if (err) return next(err);
    requireUserOwnership(req, res, next);
  });
}