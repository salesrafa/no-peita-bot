import dotenv from 'dotenv';
dotenv.config();

export const PORT = process.env.PORT || 3000;
export const url = process.env.URL || "";
export const enviroment = process.env.ENVIROMENT || "dev";

export const allowedContacts = [
  "REDACTED_PHONE@c.us",
  "REDACTED_GROUP@g.us"
];

export const header = {
  'Content-Type': 'application/x-www-form-urlencoded'
};
