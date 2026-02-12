import { Request, Response } from 'express';

export interface Context {
  req: Request;
  res: Response;
  userId?: string;
}

export interface AuthenticatedContext extends Context {
  userId: string;
}
