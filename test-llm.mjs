import dotenv from 'dotenv';
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

dotenv.config();

async function testGemini() {
    console.log("--- Testing Gemini ---");
    const apiKey = process.env.GEMINI_API_KEY;
    const modelName = "gemini-2.5-flash-lite"; // Restoring your original model

    if (!apiKey) {
        console.error("❌ GEMINI_API_KEY missing");
        return;
    }

    try {
        const google = createGoogleGenerativeAI({ apiKey });
        const { text } = await generateText({
            model: google(modelName),
            prompt: "Hello, reply with 'Gemini OK'",
        });
        console.log(`✅ Gemini Success: ${text}`);
    } catch (err) {
        console.error(`❌ Gemini Failed: ${err.message}`);
    }
}

async function testZen() {
    console.log("\n--- Testing Zen ---");
    const apiKey = process.env.ZEN_API_KEY;
    const baseUrl = "https://opencode.ai/zen/v1";
    const modelName = "minimax-m2.5-free";

    if (!apiKey || apiKey === "your_zen_api_key_here") {
        console.error("❌ ZEN_API_KEY is still placeholder or missing");
        return;
    }

    try {
        const zen = createOpenAI({ apiKey, baseURL: baseUrl });
        const { text } = await generateText({
            model: zen.chat(modelName),
            prompt: "Hello, reply with 'Zen OK'",
        });
        console.log(`✅ Zen Success: ${text}`);
    } catch (err) {
        console.error(`❌ Zen Failed: ${err.message}`);
    }
}

async function main() {
    await testGemini();
    await testZen();
}

main();
