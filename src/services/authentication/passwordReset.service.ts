import { optionalEnv } from "../../config/env";
import { generatePasswordResetLink } from "../../database/repos/firebaseAuth.repo";

export type PasswordResetRequestInput = {
  email: string;
};

export type PasswordResetRequestResponse = {
  message: string;
  reset_link?: string;
};

export async function requestPasswordReset(input: PasswordResetRequestInput): Promise<PasswordResetRequestResponse> {
  const resetLink = await generatePasswordResetLink(input.email);

  // In production you typically email the link, not return it.
  const env = String(optionalEnv("NODE_ENV") || "development").toLowerCase();
  const includeLink = env !== "production";

  if (includeLink && resetLink) {
    return { message: "If the account exists, a reset link has been generated.", reset_link: resetLink };
  }

  return { message: "If the account exists, a reset link has been generated." };
}

