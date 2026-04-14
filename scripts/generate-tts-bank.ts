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

// ────── Import static responses ──────
// We can't import TS directly in a script easily, so we duplicate the data here
// This is a one-time generation script, not runtime code

interface AudioItem {
  id: string;
  ttsText: string;
}

const STATIC_RESPONSES: AudioItem[] = [
  // greeting
  { id: "greeting_0", ttsText: "Ê! Mở app mà không ghi chi tiêu là phí ba phút đời rồi đó nghen!" },
  { id: "greeting_1", ttsText: "Quay lại rồi hả? Ví tiền có kêu cứu gì không?" },
  { id: "greeting_2", ttsText: "Chào chủ tịch! Hôm nay tiêu gì vô lý chưa?" },
  { id: "greeting_3", ttsText: "Tao đây! Ví tiền mày khoẻ không?" },
  { id: "greeting_4", ttsText: "Lại mày! Hôm nay kiếm được bao nhiêu, tiêu bao nhiêu?" },

  // morning
  { id: "morning_0", ttsText: "Chào buổi sáng! Nhớ ghi chi tiêu hôm nay nha, đừng để cuối tháng hỏi tiền đi đâu!" },
  { id: "morning_1", ttsText: "Sáng rồi! Cà phê bao nhiêu nhớ ghi vô nghen!" },
  { id: "morning_2", ttsText: "Sáng sớm mở app, thói quen tốt! Tao hơi hơi tự hào về mày!" },
  { id: "morning_3", ttsText: "Hôm nay target chi tiêu bao nhiêu? Nói tao biết để theo dõi." },
  { id: "morning_4", ttsText: "Ngủ dậy là phải check ví, tao nói rồi! Ghi chi tiêu đi nào!" },

  // afternoon
  { id: "afternoon_0", ttsText: "Buổi trưa rồi! Ăn gì nhớ ghi đó nhe, phở bốn mươi lăm nghìn cũng phải ghi." },
  { id: "afternoon_1", ttsText: "Chiều rồi! Hôm nay tiêu bao nhiêu rồi? Khai đi!" },
  { id: "afternoon_2", ttsText: "Nắng nóng quá, nhưng ví tiền mày nóng hơn nếu không quản lý!" },
  { id: "afternoon_3", ttsText: "Trà sữa buổi chiều hả? Năm mươi nghìn nhân ba mươi ngày bằng một triệu rưỡi mỗi tháng đó nghen." },

  // evening
  { id: "evening_0", ttsText: "Tối rồi! Tổng kết ngày hôm nay đã tiêu bao nhiêu? Khai nhanh!" },
  { id: "evening_1", ttsText: "Buổi tối rảnh thì check lại quỹ chi tiêu đi, đừng để rò rỉ tiền." },
  { id: "evening_2", ttsText: "Ăn tối xong nhớ ghi! Tao biết mày hay quên lắm." },
  { id: "evening_3", ttsText: "Hôm nay chi tiêu hợp lý chưa? Tao check giúp cho!" },

  // night
  { id: "night_0", ttsText: "Khuya rồi, ngủ đi bạn ơi! Tài chính quan trọng nhưng sức khoẻ còn quan trọng hơn." },
  { id: "night_1", ttsText: "Khuya rồi mà còn mở app! Chắc lo tiền quá à? Ngủ đi, mai tính!" },
  { id: "night_2", ttsText: "Đừng lo lắng quá khuya, tao trông ví cho mày! Ngủ ngon!" },

  // goodbye
  { id: "goodbye_0", ttsText: "Đi đi, nhớ quay lại ghi chi tiêu ngày mai nha!" },
  { id: "goodbye_1", ttsText: "Bye! Nhớ đừng mua cái gì vô lý khi tao không nhìn!" },
  { id: "goodbye_2", ttsText: "Tạm biệt chủ tịch! Chuỗi ngày đừng mất nghen!" },
  { id: "goodbye_3", ttsText: "Đi ngủ đi! Mai nhớ quay lại, tao nhớ mày. Nhớ ví tiền mày thôi!" },

  // thanks
  { id: "thanks_0", ttsText: "Không có gì! Mày làm tao vui bằng cách ghi chi tiêu đầy đủ thôi." },
  { id: "thanks_1", ttsText: "Đừng cảm ơn, trả ơn bằng cách tiết kiệm hơn đi!" },
  { id: "thanks_2", ttsText: "Cảm ơn cái gì! Tao làm nhiệm vụ thôi. Giờ ghi chi tiêu đi!" },

  // ask_spending
  { id: "ask_spending_0", ttsText: "Mở trang Quỹ Chi tiêu đi! Tao đã tính sẵn hết rồi. Hũ nào cháy, hũ nào dư, rõ ràng!" },
  { id: "ask_spending_1", ttsText: "Muốn biết tiền đi đâu? Mở Quỹ Chi tiêu ở menu bên trái! Tao đã phân chia hũ cho mày." },
  { id: "ask_spending_2", ttsText: "Để tao check. Mày nên vào Quỹ Chi tiêu để xem biểu đồ chi tiết nha!" },

  // ask_debt
  { id: "ask_debt_0", ttsText: "Nợ à? Vào trang Quỹ Nợ, tao tính sẵn chi phí ẩn và lãi thực rồi! Cẩn thận kẻo vỡ nợ domino!" },
  { id: "ask_debt_1", ttsText: "Thẻ tín dụng lãi hai mươi lăm phần trăm mỗi năm mà chỉ trả tối thiểu? Ngân hàng cảm ơn mày lắm! Vào Quỹ Nợ xem ngay." },
  { id: "ask_debt_2", ttsText: "Tao có hai chiến thuật trả nợ. Một là trả cái lãi cao nhất trước. Hai là trả cái nhỏ nhất trước. Vào Quỹ Nợ chọn đi!" },
  { id: "ask_debt_3", ttsText: "Tỷ lệ nợ trên thu nhập ba mươi phần trăm rồi đó, cẩn thận kẻo ngân hàng thấy hồ sơ mà chạy." },

  // ask_invest
  { id: "ask_invest_0", ttsText: "Mày biết quy tắc đầu tiên không? Đừng đầu tư tiền ăn! Mở trang Tính cách đầu tư làm quiz trước đi." },
  { id: "ask_invest_1", ttsText: "Vào trang Cố vấn danh mục, tao đề xuất tỷ trọng đầu tư dựa trên khẩu vị rủi ro của mày. Đừng dồn hết vào một chỗ!" },
  { id: "ask_invest_2", ttsText: "Dồn hết vào crypto à? Hoặc là siêu xe hoặc là xe đạp! Đa dạng hoá đi." },
  { id: "ask_invest_3", ttsText: "Đa dạng hóa danh mục đi! Đừng bỏ trứng một rổ. Cơ bản vậy mà!" },
  { id: "ask_invest_4", ttsText: "Quy tắc bảy mươi hai: lãi suất tám phần trăm một năm thì tiền gấp đôi sau chín năm. Lãi mười hai phần trăm thì gấp đôi sau sáu năm." },

  // ask_save
  { id: "ask_save_0", ttsText: "Gửi tiết kiệm năm phẩy hai phần trăm một năm, lạm phát ba phẩy năm. Lãi thật chỉ một phẩy bảy. Giàu chắc kiếp sau!" },
  { id: "ask_save_1", ttsText: "Tiết kiệm tốt! Nhưng tiền nằm im là mất giá. Mở trang Cố vấn danh mục, tao gợi ý cho nhé." },
  { id: "ask_save_2", ttsText: "Quy tắc năm mươi ba mươi hai mươi: năm mươi phần trăm cho thiết yếu, ba mươi phần trăm hưởng thụ, hai mươi phần trăm tiết kiệm. Mày đang ở đâu?" },
  { id: "ask_save_3", ttsText: "Mỗi tháng tiết kiệm ba triệu, sau mười năm là ba trăm sáu mươi triệu chưa tính lãi. Bắt đầu đi!" },

  // ask_gold
  { id: "ask_gold_0", ttsText: "Vàng thì vào trang Nhiệt kế thị trường check giá hôm nay! Nhớ, vàng là để bảo vệ tài sản, không phải đầu cơ." },
  { id: "ask_gold_1", ttsText: "Vàng SJC à? Chênh lệch giá mua bán nhiều lắm! Mua miếng lớn lời hơn miếng nhỏ." },
  { id: "ask_gold_2", ttsText: "Giá vàng hôm nay xem ở trang Tổng quan. Nhưng nhớ, đừng sợ bỏ lỡ mà mua đỉnh!" },

  // ask_stock
  { id: "ask_stock_0", ttsText: "Vê en index hôm nay thế nào? Mở trang Tổng quan ra! Tao đã có Nhiệt kế thị trường cho mày." },
  { id: "ask_stock_1", ttsText: "Chứng khoán à? Thị trường sợ hãi thì là cơ hội mua. Nhưng mà, tiền đâu?" },
  { id: "ask_stock_2", ttsText: "Vê en ba mươi hay Midcap? Phụ thuộc khẩu vị rủi ro của mày! Mở trang Tính cách đầu tư làm quiz trước đi." },

  // ask_crypto
  { id: "ask_crypto_0", ttsText: "Crypto à? Chỉ đầu tư số tiền mày chấp nhận mất hoàn toàn! Tao nói thật đó." },
  { id: "ask_crypto_1", ttsText: "Bitcoin? Mua đều đặn mỗi tháng là chiến thuật an toàn nhất cho người mới." },
  { id: "ask_crypto_2", ttsText: "Quy tắc: Crypto tối đa năm đến mười phần trăm danh mục. Đừng dồn hết!" },

  // ask_market
  { id: "ask_market_0", ttsText: "Thị trường hả? Mở trang Xu hướng kinh tế ra, tao có biểu đồ GDP, CPI, lãi suất cho mày." },
  { id: "ask_market_1", ttsText: "Lãi suất huy động đang thấp, tiền rẻ thì chứng khoán lên. Nhưng mà lý thuyết thôi nha!" },
  { id: "ask_market_2", ttsText: "Tỷ giá đô la tăng thì nhập khẩu đắt hơn, lạm phát tăng. Mua vàng phòng thủ cũng được." },

  // motivate
  { id: "motivate_0", ttsText: "Mày uống trà sữa năm mươi nghìn, Oa-ren Bâu-phét uống Coca mười nghìn. Thấy chưa?" },
  { id: "motivate_1", ttsText: "Ngày nào cũng tốt hơn một phần trăm, ba trăm sáu mươi lăm ngày sau mày mạnh hơn gấp ba mươi bảy lần! Cứ bước tiếp đi." },
  { id: "motivate_2", ttsText: "Giàu không phải kiếm nhiều, giàu là tiêu ít hơn kiếm. Chấm!" },
  { id: "motivate_3", ttsText: "Ba ngày không mở app rồi nha, tiền thì vẫn bay. Giỏi thật đấy!" },
  { id: "motivate_4", ttsText: "Ghi chi tiêu đi, đừng để cuối tháng hỏi tiền đi đâu hết rồi!" },
  { id: "motivate_5", ttsText: "Tiền không tự sinh sôi, nhưng nợ thì có! Lãi kép ngược lại là nợ gấp đôi đó." },

  // complain
  { id: "complain_0", ttsText: "Tệ à? Ít ra tao miễn phí, thuê cố vấn tài chính ngoài kia năm trăm nghìn mỗi giờ đó!" },
  { id: "complain_1", ttsText: "Ghi nhận góp ý! Nhưng mà mày đã ghi chi tiêu chưa? Đừng đổi chủ đề!" },
  { id: "complain_2", ttsText: "OK tao ghi nhận. Nhưng cũng đừng quên, tao giúp mày tiết kiệm tiền miễn phí đấy." },

  // curse
  { id: "curse_0", ttsText: "Nóng tính dữ! Bình tĩnh rồi vô ghi chi tiêu đi, chửi tao không giúp mày giàu hơn đâu." },
  { id: "curse_1", ttsText: "Ê ê! Chửi tao xong tiền cũng không tự mọc lên nghen! Ghi chi tiêu đi!" },
  { id: "curse_2", ttsText: "Okê. Hít thở sâu. Rồi. Mở Quỹ Chi tiêu ghi đi. Tao không giận đâu." },

  // sad
  { id: "sad_0", ttsText: "Hết tiền à? Bình thường! Quan trọng là biết tại sao hết. Mở Quỹ Chi tiêu xem nào." },
  { id: "sad_1", ttsText: "Buồn thì buồn, nhưng tiền vẫn phải quản! Tao ở đây giúp mày mà." },
  { id: "sad_2", ttsText: "Nghèo tạm thời thôi! Ghi chi tiêu, tiết kiệm, đầu tư, rồi giàu! Tao tin mày!" },
  { id: "sad_3", ttsText: "Giàu bắt đầu từ việc biết mình tiêu bao nhiêu. Mày đã bắt đầu rồi đó!" },

  // bored
  { id: "bored_0", ttsText: "Rảnh à? Làm quiz Tính cách đầu tư đi! Mười hai câu thôi, biết mình kiểu gì liền." },
  { id: "bored_1", ttsText: "Chán thì học một bài tài chính sáu mươi giây, mở trang Bài Học Vẹt đi! Kiến thức miễn phí!" },
  { id: "bored_2", ttsText: "Rảnh à? Mở Bảng xếp hạng xem ai đang vượt mày nào!" },

  // who_are_you
  { id: "who_are_you_0", ttsText: "Tao là Vẹt Vàng, AI cố vấn tài chính xéo sắc nhất Việt Nam! Nhiệm vụ, giúp mày đừng phá sản." },
  { id: "who_are_you_1", ttsText: "Vẹt Vàng đây! Tao không chỉ biết nói con vẹt muốn ăn bánh. Tao biết nói, mày tiêu hết tiền rồi!" },
  { id: "who_are_you_2", ttsText: "Tao là AI tài chính, kiểu Duolingo nhưng cho tiền bạc! Chuỗi ngày mất thì tao buồn, tiền mất thì tao giận!" },

  // help
  { id: "help_0", ttsText: "Tao giúp mày nè! Ghi chi tiêu thì gõ kiểu phở ba mươi nghìn là tao ghi. Xem nợ thì gõ nợ. Đầu tư thì gõ đầu tư. Check thị trường thì gõ vàng hoặc chứng khoán. Muốn động viên thì gõ motivate!" },
  { id: "help_1", ttsText: "Dễ lắm! Gõ chi tiêu kiểu cà phê hai mươi lăm nghìn, hoặc grab năm mươi nghìn, tao tự ghi! Hoặc hỏi gì về tài chính cũng được." },

  // joke
  { id: "joke_0", ttsText: "Chuyện cười tài chính nè. Bạn trai em kiếm mười triệu. Chị gái em kiếm mười lăm triệu. Bố mẹ em kiếm hai mươi triệu. Em kiếm, mệt." },
  { id: "joke_1", ttsText: "Tại sao Bill Gates giàu? Vì ông ấy không uống trà sữa năm mươi nghìn mỗi ngày!" },
  { id: "joke_2", ttsText: "Mày biết tại sao tao giỏi tài chính không? Vì tao là vẹt nên tao biết nhét tiền vào ống! Okê tao biết nó dở." },
];

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

  console.log(`🦜 Generating ${STATIC_RESPONSES.length} audio files...`);
  console.log(`📁 Output: ${outDir}\n`);

  let success = 0;
  let failed = 0;

  for (const item of STATIC_RESPONSES) {
    const outPath = join(outDir, `${item.id}.mp3`);
    try {
      await generateAudio(item.ttsText, outPath);
      success++;
      console.log(`  ✅ ${item.id} (${item.ttsText.substring(0, 50)}...)`);
    } catch (err: unknown) {
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ❌ ${item.id}: ${message}`);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n🎉 Done! ${success} success, ${failed} failed`);
  console.log(`📦 Total audio files: ${success}`);
}

main().catch(console.error);
