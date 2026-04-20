
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import dotenv from "dotenv";

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDIiq9g1aIq_vUjox8ANR_RPrMwCelCJxc";

async function listModels() {
  console.log("Listing models...");
  try {
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`);
    const data = await resp.json();
    console.log("Models:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Failed to list models:", err);
  }
}

listModels();
