
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";
import dotenv from "dotenv";

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDIiq9g1aIq_vUjox8ANR_RPrMwCelCJxc";

async function testStream() {
  console.log("Testing streamText...");
  try {
    const google = createGoogleGenerativeAI({
      apiKey: GEMINI_API_KEY,
    });
    const model = google("gemini-2.5-flash-lite");
    
    const result = await streamText({
      model,
      prompt: "Say hello in 5 words.",
    });
    
    console.log("Stream started...");
    for await (const chunk of result.textStream) {
      console.log("Chunk:", chunk);
    }
    console.log("Stream finished.");
  } catch (err) {
    console.error("Stream test failed:", err);
  }
}

testStream();
