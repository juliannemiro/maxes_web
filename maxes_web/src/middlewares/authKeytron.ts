import { Request, Response, NextFunction } from "express";

export const authKeytron = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers["x-api-key"] || req.query.api_key;
  const expectedKey = process.env.KEYTRON_API_KEY;

  if (!expectedKey) {
    return res.status(500).json({ error: "API Key not configured on the server." });
  }

  if (apiKey !== expectedKey) {
    return res.status(401).json({ error: "Unauthorized: Invalid API Key." });
  }

  next();
};
