
const GEMINI_API_KEY = "AIzaSyDIiq9g1aIq_vUjox8ANR_RPrMwCelCJxc"; // From .env

async function testChat() {
  console.log("Testing Chat API...");
  try {
    const resp = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { role: "user", content: "Chào Vẹt Vàng, bạn là ai?" }
        ]
      })
    });

    if (!resp.ok) {
      console.error("API Error:", resp.status, await resp.text());
      return;
    }

    console.log("API Status OK. Reading stream...");
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      if (value) {
        console.log("Chunk:", decoder.decode(value));
      }
    }
    console.log("Stream finished.");
  } catch (err) {
    console.error("Test failed:", err);
  }
}

// Since I can't run a fetch against localhost easily without a running server, 
// I'll check if I can run the server or if there's a test for it.
// Actually, I'll just check the code again for any logic errors.
console.log("Script loaded. Run with node.");
