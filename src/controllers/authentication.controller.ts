import type { Request, Response, NextFunction } from "express";
import { login } from "../services/authentication/login.service";
import { refreshToken } from "../services/authentication/refreshToken.service";
import { register } from "../services/authentication/register.service";
import { requestPasswordReset } from "../services/authentication/passwordReset.service";

export async function loginController(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = (req.body ?? {}) as { email?: string; password?: string };

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const result = await login({ email, password });
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function registerController(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, firstname, lastname, role } = (req.body ?? {}) as {
      email: string;
      password: string;
      firstname: string;
      lastname: string;
      role?: string;
    };

    const result = await register({ email, password, firstname, lastname, role });
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function passwordResetRequestController(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = (req.body ?? {}) as { email: string };
    const result = await requestPasswordReset({ email });
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

export async function refreshTokenController(req: Request, res: Response, next: NextFunction) {
  try {
    const { refresh_token } = (req.body ?? {}) as { refresh_token: string };
    const result = await refreshToken({ refresh_token });
    return res.status(200).json(result);
  } catch (err) {
    return next(err);
  }
}

