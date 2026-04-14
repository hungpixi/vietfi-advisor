/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Generate Lottie JSON for Vẹt Vàng v2 — Cuter, more detailed
 * Bigger eyes, clearer beak, better proportions
 */
const fs = require('fs');
const path = require('path');

// ── Colors (RGBA 0-1) ──
const GOLD       = [0.90, 0.72, 0.31, 1];
const GOLD_LIGHT = [0.96, 0.85, 0.54, 1];
const GOLD_DARK  = [0.77, 0.58, 0.23, 1];
const ORANGE     = [1.00, 0.55, 0.00, 1];
const ORANGE_DK  = [0.90, 0.40, 0.00, 1];
const WHITE      = [1, 1, 1, 1];
const BLACK      = [0.08, 0.08, 0.08, 1];
const GREEN_TAIL = [0.30, 0.69, 0.31, 1];
const GREEN_DK   = [0.20, 0.55, 0.22, 1];
const BLUSH      = [1.00, 0.55, 0.55, 1];

const W = 240, H = 280, FPS = 30, TOTAL = 90;
const CX = W / 2; // 120 center

function sv(v) { return { a: 0, k: v }; }

function bob2D(x, y, dy, t) {
  const m = Math.floor(t / 2);
  return { a: 1, k: [
    { i:{x:0.42,y:1}, o:{x:0.58,y:0}, t:0, s:[x, y, 0] },
    { i:{x:0.42,y:1}, o:{x:0.58,y:0}, t:m, s:[x, y+dy, 0] },
    { t:t, s:[x, y, 0] }
  ]};
}

function rotAnim(deg, off, t) {
  const m = Math.floor(t / 2);
  return { a: 1, k: [
    { i:{x:[0.42],y:[1]}, o:{x:[0.58],y:[0]}, t:0, s:[deg] },
    { i:{x:[0.42],y:[1]}, o:{x:[0.58],y:[0]}, t:m, s:[deg+off] },
    { t:t, s:[deg] }
  ]};
}

function blinkAnim(t) {
  const bs = Math.floor(t * 0.65);
  return { a: 1, k: [
    { i:{x:[0.42],y:[1]}, o:{x:[0.58],y:[0]}, t:0, s:[100,100,100] },
    { i:{x:[0.42],y:[1]}, o:{x:[0.58],y:[0]}, t:bs, s:[100,100,100] },
    { i:{x:[0.42],y:[1]}, o:{x:[0.58],y:[0]}, t:bs+2, s:[100,5,100] },
    { i:{x:[0.42],y:[1]}, o:{x:[0.58],y:[0]}, t:bs+5, s:[100,100,100] },
    { t:t, s:[100,100,100] }
  ]};
}

function el(cx, cy, rx, ry) { return { ty:"el", p:sv([cx,cy]), s:sv([rx*2,ry*2]) }; }
function fl(c) { return { ty:"fl", c:sv(c.slice(0,4)), o:sv(c.length>4?c[4]:100) }; }
function sh(v, i, o, closed) {
  return { ty:"sh", ks:sv({
    v:v, i:i||v.map(()=>[0,0]), o:o||v.map(()=>[0,0]), c:closed!==false
  })};
}
function gr(nm, items) {
  return { ty:"gr", nm:nm, it:[...items, {ty:"tr",p:sv([0,0]),a:sv([0,0]),s:sv([100,100]),r:sv(0),o:sv(100)}] };
}

function layer(nm, shapes, ks, i) {
  return {
    ddd:0, ind:i, ty:4, nm:nm, sr:1,
    ks:{ o:sv(100), r:ks.r||sv(0), p:ks.p||sv([CX,140,0]), a:ks.a||sv([0,0,0]), s:ks.s||sv([100,100,100]) },
    ao:0, shapes:shapes, ip:0, op:TOTAL, st:0, bm:0
  };
}

function generate() {
  const layers = [];
  let idx = 1;
  const bodyBob = -5;

  // 1. TAIL (behind everything)
  layers.push(layer("tail", [
    gr("tail_main", [
      sh([[-12,0],[0,55],[12,0]], [[-4,15],[0,5],[4,15]], [[4,15],[0,5],[-4,15]]),
      fl(GREEN_TAIL)
    ]),
    gr("tail_stripe", [
      sh([[-6,10],[0,45],[6,10]], [[-2,10],[0,4],[2,10]], [[2,10],[0,4],[-2,10]]),
      fl(GREEN_DK)
    ])
  ], { p:bob2D(CX, 195, bodyBob+2, TOTAL), r:rotAnim(0, 4, TOTAL) }, idx++));

  // 2. LEFT FOOT
  layers.push(layer("foot_l", [
    gr("ft_l", [
      sh([[-3,-3],[-16,5],[-10,7],[-3,7],[6,5],[3,-3]],
         [[0,0],[-2,0],[0,0],[0,0],[2,0],[0,0]],
         [[-2,3],[0,1],[0,0],[2,0],[0,-1],[0,-3]]),
      fl(ORANGE)
    ])
  ], { p:sv([CX-12, 210, 0]) }, idx++));

  // 3. RIGHT FOOT
  layers.push(layer("foot_r", [
    gr("ft_r", [
      sh([[3,-3],[16,5],[10,7],[3,7],[-6,5],[-3,-3]],
         [[0,0],[2,0],[0,0],[0,0],[-2,0],[0,0]],
         [[2,3],[0,1],[0,0],[-2,0],[0,-1],[0,-3]]),
      fl(ORANGE)
    ])
  ], { p:sv([CX+12, 210, 0]) }, idx++));

  // 4. BODY
  layers.push(layer("body", [
    gr("body_main", [
      el(0, 0, 42, 50),
      fl(GOLD)
    ]),
    gr("belly", [
      el(0, 10, 30, 35),
      fl(GOLD_LIGHT)
    ])
  ], { p:bob2D(CX, 155, bodyBob, TOTAL) }, idx++));

  // 5. LEFT WING
  layers.push(layer("wing_l", [
    gr("wl", [
      sh([[0,-20],[25,5],[18,35],[-5,20]],
         [[0,0],[10,-8],[0,10],[-10,0]],
         [[10,5],[0,10],[-10,0],[0,-10]]),
      fl(GOLD_DARK)
    ])
  ], { p:bob2D(CX-42, 148, bodyBob, TOTAL), a:sv([0,-20,0]), r:rotAnim(5, -12, TOTAL) }, idx++));

  // 6. RIGHT WING
  layers.push(layer("wing_r", [
    gr("wr", [
      sh([[0,-20],[-25,5],[-18,35],[5,20]],
         [[0,0],[-10,-8],[0,10],[10,0]],
         [[-10,5],[0,10],[10,0],[0,-10]]),
      fl(GOLD_DARK)
    ])
  ], { p:bob2D(CX+42, 148, bodyBob, TOTAL), a:sv([0,-20,0]), r:rotAnim(-5, 12, TOTAL) }, idx++));

  // 7. HEAD
  layers.push(layer("head", [
    gr("head_circle", [
      el(0, 0, 36, 32),
      fl(GOLD)
    ])
  ], { p:bob2D(CX, 100, bodyBob-2, TOTAL) }, idx++));

  // 8. CREST (tuft on head)
  layers.push(layer("crest", [
    gr("crest_feathers", [
      sh([[0,0],[-5,-18],[0,-25],[5,-18]],
         [[0,0],[-3,-2],[0,-4],[3,-2]],
         [[-3,0],[0,-4],[3,-2],[0,2]]),
      fl(ORANGE)
    ]),
    gr("crest_tip", [
      sh([[0,-20],[-3,-30],[0,-34],[3,-30]],
         [[0,0],[-1,-2],[0,-2],[1,-2]],
         [[-1,-2],[0,-2],[1,-2],[0,2]]),
      fl(ORANGE_DK)
    ])
  ], { p:bob2D(CX, 72, bodyBob-3, TOTAL) }, idx++));

  // 9. LEFT EYE — big cute style
  layers.push(layer("eye_l", [
    gr("eye_white_l", [
      el(0, 0, 12, 14),
      fl(WHITE)
    ]),
    gr("pupil_l", [
      el(2, 1, 7, 8),
      fl(BLACK)
    ]),
    gr("shine_l", [
      el(5, -3, 3.5, 3.5),
      fl(WHITE)
    ]),
    gr("shine_l2", [
      el(-2, 3, 1.5, 1.5),
      fl(WHITE)
    ])
  ], { p:bob2D(CX-14, 95, bodyBob-2, TOTAL), s:blinkAnim(TOTAL) }, idx++));

  // 10. RIGHT EYE
  layers.push(layer("eye_r", [
    gr("eye_white_r", [
      el(0, 0, 12, 14),
      fl(WHITE)
    ]),
    gr("pupil_r", [
      el(2, 1, 7, 8),
      fl(BLACK)
    ]),
    gr("shine_r", [
      el(5, -3, 3.5, 3.5),
      fl(WHITE)
    ]),
    gr("shine_r2", [
      el(-2, 3, 1.5, 1.5),
      fl(WHITE)
    ])
  ], { p:bob2D(CX+14, 95, bodyBob-2, TOTAL), s:blinkAnim(TOTAL) }, idx++));

  // 11. BLUSH LEFT
  layers.push(layer("blush_l", [
    gr("bl_l", [
      el(0, 0, 9, 5),
      { ty:"fl", c:sv(BLUSH.slice(0,4)), o:sv(30) }
    ])
  ], { p:bob2D(CX-24, 104, bodyBob-2, TOTAL) }, idx++));

  // 12. BLUSH RIGHT
  layers.push(layer("blush_r", [
    gr("bl_r", [
      el(0, 0, 9, 5),
      { ty:"fl", c:sv(BLUSH.slice(0,4)), o:sv(30) }
    ])
  ], { p:bob2D(CX+24, 104, bodyBob-2, TOTAL) }, idx++));

  // 13. BEAK — clearer, bigger
  layers.push(layer("beak", [
    gr("beak_top", [
      sh([[0,-5],[16,0],[12,5],[0,4],[-2,0]],
         [[0,0],[4,-4],[0,3],[-4,0],[0,0]],
         [[4,0],[0,4],[-4,0],[0,-1],[0,-2]]),
      fl(ORANGE)
    ]),
    gr("beak_bottom", [
      sh([[0,2],[12,5],[8,10],[0,8]],
         [[0,0],[2,-1],[0,2],[-3,0]],
         [[3,0],[0,3],[-3,0],[0,-2]]),
      fl(ORANGE_DK)
    ])
  ], { p:bob2D(CX+4, 106, bodyBob-2, TOTAL) }, idx++));

  // Lottie renders first layer on TOP → reverse so eyes/beak are on top
  layers.reverse();

  return {
    v: "5.7.1", fr: FPS, ip: 0, op: TOTAL,
    w: W, h: H, nm: "Vet Vang Idle v3",
    ddd: 0, assets: [], layers: layers
  };
}

const outputDir = process.argv[2] || '.';
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
const anim = generate();
const out = path.join(outputDir, 'vet-vang-idle.json');
fs.writeFileSync(out, JSON.stringify(anim, null, 2));
console.log(`✅ Generated v2: ${out}`);
console.log(`   ${anim.w}x${anim.h}, ${anim.op/anim.fr}s, ${anim.layers.length} layers`);
