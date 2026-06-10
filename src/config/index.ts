import dotenv from 'dotenv';
dotenv.config();

export const PORT = process.env.PORT || 3000;
export const url = process.env.URL || "";
// Accepts ENVIRONMENT (correct spelling) with a fallback to ENVIROMENT (legacy),
// so we don't break deploys still using the old variable name.
export const environment = process.env.ENVIRONMENT || process.env.ENVIROMENT || "dev";
export const scriptAuthToken = process.env.SCRIPT_AUTH_TOKEN || "";

export const allowedContacts = (process.env.ALLOWED_CONTACTS || "")
  .split(",")
  .map((c) => c.trim())
  .filter(Boolean);

export const header = {
  'Content-Type': 'application/x-www-form-urlencoded'
};
