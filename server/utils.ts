import { User } from "@shared/schema";

// For the current user's own profile — includes email
export function sanitizeUser(user: User) {
  const { password, resetToken, resetTokenExpiry, vipCode, ...sanitizedUser } = user;
  return sanitizedUser;
}

// For public user lists — strips email as well
export function sanitizePublicUser(user: User) {
  const { password, resetToken, resetTokenExpiry, vipCode, email, ...publicUser } = user;
  return publicUser;
}

export function sanitizeUsers(users: User[]) {
  return users.map(sanitizePublicUser);
}
