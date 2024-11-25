import { Router } from "express";
import {
  loginHandler,
  logoutHandler,
  refreshHandler,
  signupHandler,
} from "../controllers/auth.controller";

const authRoutes = Router();

authRoutes.post("/signup", signupHandler);
authRoutes.post("/login", loginHandler);
authRoutes.get("/logout", logoutHandler);
authRoutes.get("/refresh", refreshHandler);

export default authRoutes;
