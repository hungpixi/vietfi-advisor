import { betterAuth } from "better-auth";
import Database from "better-sqlite3";

const db = new Database("./better-auth.sqlite");

export const auth = betterAuth({
    database: db,
    emailAndPassword: {
        enabled: true,
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID || "demo-client-id",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "demo-client-secret",
        }
    }
});
