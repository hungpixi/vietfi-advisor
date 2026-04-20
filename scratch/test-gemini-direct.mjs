
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import dotenv from "dotenv";

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDIiq9g1aIq_vUjox8ANR_RPrMwCelCJxc";

async function testGemini() {
  console.log("Testing Gemini API...");
  try {
    const google = createGoogleGenerativeAI({
      apiKey: GEMINI_API_KEY,
    });
    const model = google("gemini-1.5-flash");
    
    const { text } = await generateText({
      model,
      prompt: "Hello, who are you?",
    });
    
    console.log("Response:", text);
  } catch (err) {
    console.error("Gemini test failed:", err);
  }
}

testGemini();
