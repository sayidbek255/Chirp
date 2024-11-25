import { Router } from "express";
import {
  getUserHandler,
  loginHandler,
  logoutHandler,
  refreshHandler,
  resetPasswordHandler,
  forgotPasswordHandler,
  signupHandler,
  verifyEmailHandler,
} from "../controllers/auth.controller";
import authenticate from "../middleware/authenticate";

const authRoutes = Router();

authRoutes.post("/signup", signupHandler);
authRoutes.post("/login", loginHandler);
authRoutes.get("/logout", logoutHandler);
authRoutes.get("/refresh", refreshHandler);
authRoutes.get("/email/verify/:code", verifyEmailHandler);
authRoutes.post("/password/forgot", forgotPasswordHandler);
authRoutes.post("/password/reset", resetPasswordHandler);
authRoutes.get("/user", authenticate, getUserHandler);

export default authRoutes;
