// Hình minh họa động tác: người que vẽ bằng SVG, chuyển động qua lại giữa 2 tư thế.
// Mỗi tư thế chỉ cần vị trí hông, cổ, bàn tay, bàn chân — khuỷu tay và đầu gối được tính
// tự động (động học ngược) để tay chân luôn đúng tỷ lệ. Nhìn nghiêng, mặt quay sang phải.
window.FIGURES = (() => {
  'use strict';

  const FLOOR = 92;
  const ARM = [14, 13];
  const LEG = [20, 20];

  // Giải khớp giữa (khuỷu/gối) cho chi 2 đoạn; s = ±1 chọn hướng gập
  function limb(root, target, [l1, l2], s) {
    const dx = target[0] - root[0], dy = target[1] - root[1];
    const dist = Math.hypot(dx, dy) || 0.001;
    const d = Math.min(dist, l1 + l2 - 0.01);
    const a = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
    const base = Math.atan2(dy, dx);
    const joint = [root[0] + l1 * Math.cos(base + s * a), root[1] + l1 * Math.sin(base + s * a)];
    const end = [root[0] + (dx / dist) * d, root[1] + (dy / dist) * d];
    return [root, joint, end];
  }

  // Tư thế → các đường vẽ. kb/eb: hướng gập gối/khuỷu cho [gần, xa]
  function build(f) {
    const kb = f.kb || [-1, -1];
    const eb = f.eb || [1, 1];
    const ux = f.neck[0] - f.hip[0], uy = f.neck[1] - f.hip[1];
    const ul = Math.hypot(ux, uy) || 1;
    const head = f.head || [f.neck[0] + (ux / ul) * 9, f.neck[1] + (uy / ul) * 9];
    return {
      armFar: limb(f.neck, f.hands[1], ARM, eb[1]),
      legFar: limb(f.hip, f.feet[1], LEG, kb[1]),
      torso: [f.hip, f.neck],
      legNear: limb(f.hip, f.feet[0], LEG, kb[0]),
      armNear: limb(f.neck, f.hands[0], ARM, eb[0]),
      head,
      towel: f.towel ? [f.hands[0], [f.feet[0][0] + 3, f.feet[0][1] - 5]] : null,
      bottle: f.bottle ? f.feet[0] : null
    };
  }

  const pts = (arr) => arr.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

  // ---------- Đồ vật tĩnh ----------
  const PROPS = {
    floor: () => `<line class="fig-floor" x1="2" y1="${FLOOR}" x2="118" y2="${FLOOR}"/>`,
    mat: () => `<rect class="fig-mat" x="8" y="${FLOOR}" width="104" height="3" rx="1.5"/>`,
    wallL: () => `<rect class="fig-prop" x="20" y="8" width="5" height="${FLOOR - 8}"/>`,
    wallR: () => `<rect class="fig-prop" x="100" y="8" width="5" height="${FLOOR - 8}"/>`,
    chair: () => `<path class="fig-prop-line" d="M24 70 H48 M26 70 V${FLOOR} M46 70 V${FLOOR} M24 70 V46"/>`,
    chairR: () => `<path class="fig-prop-line" d="M30 68 H54 M32 68 V${FLOOR} M52 68 V${FLOOR} M30 68 V44"/>`,
    table: () => `<path class="fig-prop-line" d="M86 70 H118 M90 70 V${FLOOR} M114 70 V${FLOOR}"/>`,
    towelFloor: () => `<rect class="fig-towel" x="60" y="${FLOOR - 2}" width="34" height="2.5" rx="1"/>`
  };

  // ---------- Thư viện tư thế ----------
  const P = {
    boxsquat: { props: ['floor', 'chair'], frames: [
      { hip: [60, 52], neck: [60, 24], hands: [[86, 27], [84, 28]], feet: [[64, 92], [62, 92]] },
      { hip: [44, 68], neck: [61, 45], hands: [[86, 44], [84, 45]], feet: [[64, 92], [62, 92]] }
    ] },
    pushup: {
      1: { props: ['floor', 'wallR'], frames: [
        { hip: [57, 56], neck: [69, 30], hands: [[99, 33], [99, 35]], feet: [[40, 92], [38, 92]], eb: [1, 1] },
        { hip: [63, 59], neck: [80, 37], hands: [[99, 33], [99, 35]], feet: [[40, 92], [38, 92]], eb: [1, 1] }
      ] },
      2: { props: ['floor', 'table'], frames: [
        { hip: [60, 66], neck: [82, 48], hands: [[96, 70], [94, 70]], feet: [[30, 92], [28, 92]] },
        { hip: [64, 72], neck: [89, 58], hands: [[96, 70], [94, 70]], feet: [[30, 92], [28, 92]] }
      ] },
      3: { props: ['floor', 'mat'], frames: [
        { hip: [69, 80], neck: [93, 66], hands: [[96, 91], [94, 91]], feet: [[36, 84], [34, 84]], kb: [-1, -1] },
        { hip: [71, 86], neck: [98, 81], hands: [[96, 91], [94, 91]], feet: [[36, 86], [34, 86]], kb: [-1, -1] }
      ] }
    },
    bridge: { props: ['floor', 'mat'], frames: [
      { hip: [60, 86], neck: [33, 86], head: [24, 86], hands: [[54, 90], [52, 90]], feet: [[76, 91], [74, 91]], kb: [-1, -1], eb: [-1, -1] },
      { hip: [60, 68], neck: [36, 85], head: [27, 86], hands: [[54, 90], [52, 90]], feet: [[76, 91], [74, 91]], kb: [-1, -1], eb: [-1, -1] }
    ] },
    hinge: { props: ['floor'], frames: [
      { hip: [60, 52], neck: [60, 24], hands: [[55, 50], [57, 50]], feet: [[62, 92], [60, 92]] },
      { hip: [52, 54], neck: [79, 44], hands: [[55, 52], [57, 52]], feet: [[62, 92], [60, 92]] }
    ] },
    deadbug: { props: ['floor', 'mat'], frames: [
      { hip: [62, 86], neck: [34, 86], head: [25, 86], hands: [[36, 60], [38, 60]], feet: [[82, 66], [84, 66]], kb: [-1, -1] },
      { hip: [62, 86], neck: [34, 86], head: [25, 86], hands: [[10, 84], [38, 60]], feet: [[82, 66], [101, 84]], kb: [-1, -1] }
    ] },
    plank: { props: ['floor', 'mat'], frames: [
      { hip: [58, 80], neck: [86, 72], hands: [[102, 90], [100, 90]], feet: [[20, 91], [18, 91]], eb: [1, 1] },
      { hip: [58, 78], neck: [86, 72], hands: [[102, 90], [100, 90]], feet: [[20, 91], [18, 91]], eb: [1, 1] }
    ] },
    wallsit: { props: ['floor', 'wallL'], frames: [
      { hip: [32, 52], neck: [31, 24], hands: [[34, 50], [36, 50]], feet: [[40, 92], [38, 92]] },
      { hip: [32, 68], neck: [31, 40], hands: [[50, 64], [52, 64]], feet: [[56, 92], [54, 92]] }
    ] },
    sumo: { props: ['floor'], frames: [
      { hip: [60, 54], neck: [60, 26], hands: [[58, 42], [62, 42]], feet: [[42, 92], [78, 92]], kb: [1, -1], eb: [-1, 1] },
      { hip: [60, 68], neck: [60, 40], hands: [[58, 56], [62, 56]], feet: [[42, 92], [78, 92]], kb: [1, -1], eb: [-1, 1] }
    ] },
    superman: { props: ['floor', 'mat'], frames: [
      { hip: [56, 87], neck: [84, 87], head: [93, 86], hands: [[110, 89], [108, 89]], feet: [[16, 90], [18, 90]] },
      { hip: [56, 87], neck: [83, 81], head: [91, 77], hands: [[108, 74], [106, 75]], feet: [[18, 80], [20, 81]] }
    ] },
    birddog: { props: ['floor', 'mat'], frames: [
      { hip: [54, 70], neck: [84, 70], hands: [[86, 91], [84, 91]], feet: [[34, 90], [32, 90]], kb: [1, 1], eb: [-1, -1] },
      { hip: [54, 70], neck: [84, 70], hands: [[110, 64], [84, 91]], feet: [[34, 90], [14, 66]], kb: [1, 1], eb: [-1, -1] }
    ] },
    sideplank: { props: ['floor', 'mat'], frames: [
      { hip: [64, 86], neck: [40, 72], hands: [[54, 91], [58, 70]], feet: [[92, 90], [90, 90]], kb: [1, 1], eb: [-1, 1] },
      { hip: [62, 76], neck: [40, 70], hands: [[54, 91], [56, 60]], feet: [[92, 90], [90, 90]], kb: [1, 1], eb: [-1, 1] }
    ] },
    sideleg: { props: ['floor', 'mat'], frames: [
      { hip: [56, 86], neck: [30, 84], head: [22, 80], hands: [[20, 90], [44, 82]], feet: [[96, 88], [96, 90]] },
      { hip: [56, 86], neck: [30, 84], head: [22, 80], hands: [[20, 90], [44, 82]], feet: [[92, 66], [96, 90]] }
    ] },
    march: { props: ['floor', 'mat'], toes: true, frames: [
      { hip: [60, 52], neck: [60, 24], hands: [[50, 44], [72, 40]], feet: [[70, 72], [60, 92]] },
      { hip: [60, 52], neck: [60, 24], hands: [[72, 40], [50, 44]], feet: [[60, 92], [70, 72]] }
    ] },
    boxing: { props: ['floor', 'mat'], toes: true, frames: [
      { hip: [58, 53], neck: [61, 25], hands: [[72, 24], [68, 27]], feet: [[68, 92], [50, 92]], eb: [1, 1] },
      { hip: [59, 53], neck: [63, 25], hands: [[89, 24], [68, 27]], feet: [[68, 92], [50, 92]], eb: [1, 1] }
    ] },
    steptouch: { props: ['floor', 'mat'], frames: [
      { hip: [52, 53], neck: [52, 25], hands: [[40, 44], [64, 44]], feet: [[44, 92], [60, 92]], kb: [1, -1], eb: [-1, 1] },
      { hip: [68, 53], neck: [68, 25], hands: [[56, 44], [80, 44]], feet: [[60, 92], [76, 92]], kb: [1, -1], eb: [-1, 1] }
    ] },
    kneeelbow: { props: ['floor', 'mat'], toes: true, frames: [
      { hip: [60, 52], neck: [60, 24], head: [60, 15], hands: [[58, 14], [62, 14]], feet: [[62, 92], [60, 92]], eb: [-1, -1] },
      { hip: [60, 54], neck: [64, 28], head: [67, 20], hands: [[64, 18], [66, 18]], feet: [[66, 70], [60, 92]], eb: [-1, -1] }
    ] },
    frontkick: { props: ['floor', 'mat'], toes: true, frames: [
      { hip: [56, 52], neck: [57, 24], hands: [[68, 26], [66, 28]], feet: [[62, 92], [52, 92]], eb: [1, 1] },
      { hip: [54, 52], neck: [50, 25], hands: [[62, 27], [60, 29]], feet: [[92, 50], [52, 92]], eb: [1, 1] }
    ] },
    crunch: { props: ['floor', 'mat'], frames: [
      { hip: [62, 86], neck: [34, 86], head: [25, 85], hands: [[26, 80], [28, 80]], feet: [[80, 91], [78, 91]], kb: [-1, -1], eb: [-1, -1] },
      { hip: [62, 86], neck: [40, 75], head: [33, 69], hands: [[33, 66], [35, 66]], feet: [[80, 91], [78, 91]], kb: [-1, -1], eb: [-1, -1] }
    ] },
    legraise: { props: ['floor', 'mat'], frames: [
      { hip: [62, 86], neck: [34, 86], head: [25, 86], hands: [[56, 90], [54, 90]], feet: [[101, 86], [101, 87]], eb: [-1, -1] },
      { hip: [62, 86], neck: [34, 86], head: [25, 86], hands: [[56, 90], [54, 90]], feet: [[70, 47], [71, 47]], eb: [-1, -1] }
    ] },
    indoor: { props: ['floor', 'mat'], toes: true, frames: [
      { hip: [60, 52], neck: [61, 24], hands: [[72, 26], [86, 24]], feet: [[70, 72], [60, 92]], eb: [1, 1] },
      { hip: [60, 52], neck: [61, 24], hands: [[87, 24], [70, 27]], feet: [[60, 92], [70, 72]], eb: [1, 1] }
    ] }
  };

  // Bài chăm sóc gót chân (theo thứ tự trong PLAN_DATA.HEEL_ROUTINE)
  const HEEL = [
    { props: ['floor', 'mat'], frames: [
      { hip: [40, 86], neck: [46, 59], hands: [[72, 72], [70, 73]], feet: [[82, 89], [80, 90]], towel: true },
      { hip: [40, 86], neck: [42, 59], hands: [[64, 70], [62, 71]], feet: [[82, 88], [80, 90]], towel: true }
    ] },
    { props: ['floor', 'wallR'], toes: true, frames: [
      { hip: [62, 55], neck: [78, 31], hands: [[99, 36], [99, 38]], feet: [[80, 92], [40, 92]] },
      { hip: [67, 57], neck: [82, 33], hands: [[99, 36], [99, 38]], feet: [[80, 92], [40, 92]] }
    ] },
    { props: ['floor', 'wallR'], toes: true, frames: [
      { hip: [60, 60], neck: [77, 36], hands: [[99, 38], [99, 40]], feet: [[80, 92], [48, 92]] },
      { hip: [62, 64], neck: [79, 40], hands: [[99, 38], [99, 40]], feet: [[80, 92], [48, 92]] }
    ] },
    { props: ['floor', 'chairR'], frames: [
      { hip: [44, 66], neck: [45, 38], hands: [[56, 62], [58, 62]], feet: [[70, 86], [62, 92]], bottle: true },
      { hip: [44, 66], neck: [45, 38], hands: [[56, 62], [58, 62]], feet: [[82, 86], [62, 92]], bottle: true }
    ] },
    { props: ['floor', 'chairR', 'towelFloor'], toes: true, frames: [
      { hip: [44, 66], neck: [45, 38], hands: [[56, 62], [58, 62]], feet: [[72, 90], [62, 92]] },
      { hip: [44, 66], neck: [45, 38], hands: [[56, 62], [58, 62]], feet: [[70, 89], [62, 92]] }
    ] },
    { props: ['floor', 'mat'], toes: 'raise', frames: [
      { hip: [60, 52], neck: [60, 24], hands: [[62, 50], [60, 50]], feet: [[60, 92], [58, 92]] },
      { hip: [60, 46], neck: [60, 18], hands: [[62, 44], [60, 44]], feet: [[60, 86], [58, 86]] }
    ] }
  ];

  // ---------- Vẽ ----------
  const ANIM = (attr, a, b, dur) =>
    `<animate attributeName="${attr}" values="${a};${b};${a}" dur="${dur}s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>`;

  function svg(def, label) {
    const [fa, fb] = def.frames.map(build);
    const dur = def.dur || 2.4;
    const moving = Boolean(fb);
    const line = (cls, a, b) => `<polyline class="${cls}" points="${pts(a)}">${moving ? ANIM('points', pts(a), pts(b), dur) : ''}</polyline>`;

    // Bàn chân: đoạn ngắn nằm trên sàn; bài nhón gót giữ mũi chân cố định
    const toe = (ankle, raise) => (raise ? [ankle, [ankle[0] + 7, FLOOR]] : [ankle, [ankle[0] + 6, ankle[1]]]);
    const feet = (which) => {
      if (!def.toes) return '';
      const raise = def.toes === 'raise';
      const a = toe(fa[which][2], raise);
      const b = moving ? toe(fb[which][2], raise) : a;
      return line(which === 'legNear' ? 'fig-near' : 'fig-far', a, b);
    };

    const parts = [
      def.props.map((p) => PROPS[p]()).join(''),
      fa.towel ? line('fig-towel-line', fa.towel, moving ? fb.towel : fa.towel) : '',
      fa.bottle ? `<rect class="fig-bottle" x="${(fa.bottle[0] - 7).toFixed(1)}" y="87" width="14" height="5" rx="2.5">${moving ? ANIM('x', (fa.bottle[0] - 7).toFixed(1), (fb.bottle[0] - 7).toFixed(1), def.dur || 2.4) : ''}</rect>` : '',
      line('fig-far', fa.armFar, moving ? fb.armFar : fa.armFar),
      line('fig-far', fa.legFar, moving ? fb.legFar : fa.legFar),
      feet('legFar'),
      line('fig-near', fa.torso, moving ? fb.torso : fa.torso),
      line('fig-near', fa.legNear, moving ? fb.legNear : fa.legNear),
      feet('legNear'),
      line('fig-near', fa.armNear, moving ? fb.armNear : fa.armNear),
      `<circle class="fig-head" r="6" cx="${fa.head[0].toFixed(1)}" cy="${fa.head[1].toFixed(1)}">${
        moving ? ANIM('cx', fa.head[0].toFixed(1), fb.head[0].toFixed(1), dur) + ANIM('cy', fa.head[1].toFixed(1), fb.head[1].toFixed(1), dur) : ''}</circle>`
    ];
    return `<svg class="fig" viewBox="0 0 120 100" role="img" aria-label="${label || ''}">${parts.join('')}</svg>`;
  }

  // Hình cho bài tập theo id (một số bài có hình riêng theo giai đoạn)
  function exercise(id, phase, label) {
    const def = P[id] && (P[id].frames ? P[id] : P[id][phase] || P[id][1]);
    return def ? svg(def, label) : '';
  }

  const heel = (i, label) => (HEEL[i] ? svg(HEEL[i], label) : '');

  return { exercise, heel, debug: { P, HEEL, svg } };
})();
