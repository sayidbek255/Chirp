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

export const emailSchema = z.string().trim().min(1).max(255).email();

export const passwordSchema = z.string().trim().min(6).max(255);

export const userAgentSchema = z.string().optional();

export const codeSchema = z.string().min(1).max(24);

export const signupSchema = z.object({
  name: z.string().trim().min(1).max(50),
  username: z
    .string()
    .trim()
    .min(4)
    .max(15)
    .refine((username) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(username), {
      message:
        "Username must start with a letter or underscore and can only contain letters, numbers, and underscores.",
    })
    .refine(
      (username) => !restrictedUsernames.includes(username.toLowerCase()),
      { message: "This username is not allowed." }
    ),
  email: emailSchema,
  password: passwordSchema,
  userAgent: userAgentSchema,
});

export const loginSchema = z.object({
  usernameOrEmail: z.string().trim().max(255),
  password: z.string().trim().max(255),
  userAgent: userAgentSchema,
});

export const resetPasswordSchema = z.object({
  password: passwordSchema,
  code: codeSchema,
});
