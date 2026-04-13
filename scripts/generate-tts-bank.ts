/**
 * Generate TTS Audio Bank — Pre-generate MP3s for all static scripted responses
 * ==============================================================================
 * Usage: npx tsx scripts/generate-tts-bank.ts
 *
 * Requires: edge-tts-universal (đã install trong project)
 * Output: public/audio/tts/{id}.mp3
 */

import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { getAllStaticResponses } from '../src/lib/scripted-responses';

// ────── Edge TTS Generation ──────
async function generateAudio(text: string, outputPath: string): Promise<void> {
  const { EdgeTTS } = await import('edge-tts-universal');

  const tts = new EdgeTTS(text, 'vi-VN-HoaiMyNeural');
  tts.rate = '+5%';
  tts.pitch = '+2Hz';

  const result = await tts.synthesize();
  const audioBlob: Blob = result.audio;
  const audioBuffer = Buffer.from(await audioBlob.arrayBuffer());
  await writeFile(outputPath, audioBuffer);
}

async function main() {
  const outDir = join(process.cwd(), 'public', 'audio', 'tts');

  if (!existsSync(outDir)) {
    await mkdir(outDir, { recursive: true });
  }

  const staticResponses = getAllStaticResponses();

  console.log(`🦜 Generating ${staticResponses.length} audio files...`);
  console.log(`📁 Output: ${outDir}\n`);

  let success = 0;
  let failed = 0;

  for (const item of staticResponses) {
    const outPath = join(outDir, `${item.id}.mp3`);
    try {
      await generateAudio(item.ttsText, outPath);
      success++;
      console.log(`  ✅ ${item.id} (${item.ttsText.substring(0, 50)}...)`);
    } catch (err: any) {
      failed++;
      console.error(`  ❌ ${item.id}: ${err.message}`);
    }

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n🎉 Done! ${success} success, ${failed} failed`);
  console.log(`📦 Total audio files: ${success}`);
}

main().catch(console.error);
