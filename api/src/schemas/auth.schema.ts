import { z } from "zod";

export const restrictedUsernames = [
  "search",
  "notifications",
  "messages",
  "bookmarks",
  "settings",
  "login",
  "signup",
];

export const signupSchema = z.object({
  name: z.string().trim().min(1).max(50),
  username: z
    .string()
    .trim()
    .min(4)
    .max(15)
    .regex(/^[a-zA-Z_]+$/, "Username can only contain letters and underscores")
    .refine(
      (username) => !restrictedUsernames.includes(username.toLowerCase()),
      { message: "This username is not allowed." }
    ),
  email: z.string().trim().email().min(1).max(255),
  password: z.string().trim().min(6).max(255),
  userAgent: z.string().optional(),
});

export const loginSchema = z.object({
  usernameOrEmail: z.string().trim().max(255),
  password: z.string().trim().max(255),
  userAgent: z.string().optional(),
});
