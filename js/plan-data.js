// Dữ liệu tĩnh cho kế hoạch giảm cân 90 ngày: thực phẩm, thực đơn, bài tập, mục tiêu tuần.
window.PLAN_DATA = (() => {
  'use strict';

  // Giá trị dinh dưỡng trên 100 g (thực phẩm sống/khô trừ khi ghi "chín").
  // carb: true = món tinh bột, được tự co giãn khẩu phần để khớp calo mục tiêu.
  const FOODS = {
    com:       { name: 'Cơm trắng (chín)',            kcal: 130, p: 2.7, c: 28,  f: 0.3, carb: true },
    gaolut:    { name: 'Cơm gạo lứt (chín)',          kcal: 112, p: 2.6, c: 23,  f: 0.9, carb: true },
    yenmach:   { name: 'Yến mạch',                    kcal: 380, p: 13,  c: 66,  f: 7,   carb: true },
    khoailang: { name: 'Khoai lang luộc',             kcal: 86,  p: 1.6, c: 20,  f: 0.1, carb: true },
    banhmi:    { name: 'Bánh mì',                     kcal: 265, p: 9,   c: 49,  f: 3.2, carb: true },
    bun:       { name: 'Bún tươi',                    kcal: 110, p: 1.7, c: 25,  f: 0.1, carb: true },
    ucga:      { name: 'Ức gà bỏ da',                 kcal: 120, p: 22.5, c: 0,  f: 2.6 },
    heonac:    { name: 'Thịt heo thăn nạc',           kcal: 143, p: 21,  c: 0,   f: 6 },
    bonac:     { name: 'Thịt bò nạc',                 kcal: 140, p: 22,  c: 0,   f: 5 },
    basa:      { name: 'Cá basa / cá rô phi phi lê',  kcal: 95,  p: 15,  c: 0,   f: 3.5 },
    cangu:     { name: 'Cá ngừ hộp ngâm nước (ráo)',  kcal: 116, p: 26,  c: 0,   f: 1, unit: { n: 'hộp', g: 120 } },
    tom:       { name: 'Tôm',                         kcal: 99,  p: 24,  c: 0,   f: 0.3 },
    trung:     { name: 'Trứng gà',                    kcal: 143, p: 12.6, c: 0.7, f: 9.5, unit: { n: 'quả', g: 50 } },
    longtrang: { name: 'Lòng trắng trứng',            kcal: 52,  p: 11,  c: 0.7, f: 0.2, unit: { n: 'lòng trắng', g: 33 } },
    dauphu:    { name: 'Đậu phụ',                     kcal: 76,  p: 8,   c: 1.9, f: 4.8 },
    suachua:   { name: 'Sữa chua không đường',        kcal: 62,  p: 4.5, c: 4.5, f: 3,   unit: { n: 'hộp', g: 100 } },
    suatuoi:   { name: 'Sữa tươi không đường',   kcal: 62,  p: 3.2, c: 4.8, f: 3.4 },
    rau:       { name: 'Rau xanh luộc/canh (muống, cải, bắp cải, bí)', kcal: 25, p: 2, c: 4, f: 0.3 },
    salad:     { name: 'Dưa leo + cà chua',           kcal: 17,  p: 0.8, c: 3.5, f: 0.2 },
    chuoi:     { name: 'Chuối',                       kcal: 89,  p: 1.1, c: 23,  f: 0.3, unit: { n: 'quả', g: 100 } },
    oi:        { name: 'Ổi',                          kcal: 68,  p: 2.6, c: 14,  f: 1,   unit: { n: 'quả', g: 150 } },
    tao:       { name: 'Táo',                         kcal: 52,  p: 0.3, c: 14,  f: 0.2, unit: { n: 'quả', g: 150 } },
    dudu:      { name: 'Đu đủ',                       kcal: 43,  p: 0.5, c: 11,  f: 0.3 },
    dauphong:  { name: 'Lạc rang',                    kcal: 585, p: 26,  c: 16,  f: 49 },
    dau:       { name: 'Dầu ăn', kcal: 884, p: 0,  c: 0,   f: 100 }
  };

  // Thực đơn mẫu theo thứ trong tuần (0 = Chủ nhật). Khẩu phần tinh bột là mức gốc, app tự điều chỉnh theo giai đoạn.
  const MENUS = [
    { // CN
      'Bữa sáng': [['khoailang', 200], ['trung', 100], ['longtrang', 66], ['suatuoi', 180]],
      'Bữa trưa': [['com', 180], ['bonac', 150], ['rau', 250], ['dau', 5]],
      'Bữa phụ':  [['suachua', 100], ['chuoi', 100]],
      'Bữa tối':  [['com', 120], ['cangu', 120], ['dauphu', 150], ['rau', 250]]
    },
    { // T2
      'Bữa sáng': [['yenmach', 50], ['suatuoi', 180], ['trung', 100], ['longtrang', 66]],
      'Bữa trưa': [['com', 180], ['ucga', 200], ['rau', 250], ['dau', 5]],
      'Bữa phụ':  [['suachua', 100], ['oi', 150]],
      'Bữa tối':  [['com', 120], ['basa', 200], ['dauphu', 100], ['rau', 200], ['dau', 5]]
    },
    { // T3
      'Bữa sáng': [['banhmi', 80], ['trung', 100], ['longtrang', 66], ['salad', 150], ['dau', 5]],
      'Bữa trưa': [['com', 180], ['heonac', 180], ['rau', 250]],
      'Bữa phụ':  [['suatuoi', 220], ['chuoi', 100]],
      'Bữa tối':  [['com', 120], ['cangu', 120], ['dauphu', 150], ['salad', 150], ['dau', 5]]
    },
    { // T4
      'Bữa sáng': [['khoailang', 200], ['trung', 100], ['longtrang', 66], ['suachua', 100]],
      'Bữa trưa': [['bun', 200], ['ucga', 170], ['rau', 200], ['dau', 5]],
      'Bữa phụ':  [['oi', 150], ['dauphong', 15]],
      'Bữa tối':  [['com', 120], ['tom', 200], ['rau', 250], ['dau', 5]]
    },
    { // T5
      'Bữa sáng': [['yenmach', 50], ['suachua', 100], ['chuoi', 100], ['trung', 100], ['longtrang', 66]],
      'Bữa trưa': [['com', 180], ['basa', 220], ['dauphu', 100], ['rau', 250], ['dau', 5]],
      'Bữa phụ':  [['suatuoi', 220], ['tao', 150]],
      'Bữa tối':  [['com', 100], ['ucga', 200], ['salad', 200], ['dau', 5]]
    },
    { // T6
      'Bữa sáng': [['banhmi', 80], ['cangu', 120], ['trung', 50], ['salad', 150]],
      'Bữa trưa': [['com', 180], ['heonac', 180], ['rau', 250], ['dau', 5]],
      'Bữa phụ':  [['suachua', 100], ['dudu', 200]],
      'Bữa tối':  [['com', 120], ['trung', 100], ['dauphu', 150], ['rau', 200], ['dau', 5]]
    },
    { // T7
      'Bữa sáng': [['yenmach', 50], ['suatuoi', 180], ['trung', 100], ['longtrang', 66]],
      'Bữa trưa': [['gaolut', 180], ['ucga', 200], ['rau', 250], ['dau', 5]],
      'Bữa phụ':  [['suachua', 100], ['oi', 150]],
      'Bữa tối':  [['khoailang', 200], ['basa', 220], ['rau', 250], ['dau', 5]]
    }
  ];

  // Thư viện bài tập — tất cả không nhảy, không dụng cụ, an toàn cho viêm gót chân.
  // name có thể đổi theo giai đoạn (1, 2, 3) để tăng độ khó.
  const EXERCISES = {
    boxsquat:  { name: { 1: 'Squat ngồi chạm ghế', 2: 'Squat ngồi chạm ghế (xuống chậm 3 giây)', 3: 'Squat tự do (xuống chậm 3 giây)' },
                 cue: 'Chân rộng bằng vai, đẩy hông ra sau, ngồi chạm nhẹ ghế rồi đứng lên. Dồn lực đều cả bàn chân, không dồn gót.' },
    pushup:    { name: { 1: 'Chống đẩy tựa tường', 2: 'Chống đẩy trên bàn/ghế chắc', 3: 'Chống đẩy chống gối dưới sàn' },
                 cue: 'Thân thẳng từ đầu đến gối/gót, siết bụng, hạ ngực chậm. Tay rộng hơn vai một chút.' },
    bridge:    { name: { 1: 'Cầu mông', 2: 'Cầu mông giữ 2 giây trên đỉnh', 3: 'Cầu mông một chân' },
                 cue: 'Nằm ngửa, gập gối, đẩy hông lên bằng mông. Có thể đặt bàn chân phẳng — không gây áp lực lên gót.' },
    hinge:     { name: { 1: 'Gập hông (good morning, tay chống hông)', 2: 'Gập hông tay sau đầu', 3: 'Gập hông một chân bám tường' },
                 cue: 'Lưng thẳng, gối hơi chùng, đẩy hông ra sau đến khi căng đùi sau rồi đứng thẳng lên.' },
    deadbug:   { name: { 1: 'Dead bug', 2: 'Dead bug', 3: 'Dead bug duỗi thẳng tay chân' },
                 cue: 'Nằm ngửa, lưng dưới ép sàn, duỗi tay trái + chân phải rồi đổi bên. Tính số lần mỗi bên.' },
    plank:     { name: { 1: 'Plank chống gối', 2: 'Plank cẳng tay', 3: 'Plank cẳng tay chạm vai luân phiên' },
                 cue: 'Khuỷu dưới vai, siết bụng và mông, không võng lưng.' },
    wallsit:   { name: { 1: 'Ngồi tựa tường (cao)', 2: 'Ngồi tựa tường (đùi gần song song sàn)', 3: 'Ngồi tựa tường (đùi song song sàn)' },
                 cue: 'Lưng ép tường, bàn chân phẳng, gối không vượt mũi chân. Bài tĩnh — rất nhẹ cho gót chân.' },
    sumo:      { name: { 1: 'Sumo squat bám ghế', 2: 'Sumo squat', 3: 'Sumo squat giữ 2 giây dưới đáy' },
                 cue: 'Chân rộng hơn vai, mũi chân xoay ra ngoài, hạ hông thẳng xuống.' },
    superman:  { name: { 1: 'Superman (nằm sấp nâng tay chân)', 2: 'Nằm sấp Y-T-W', 3: 'Nằm sấp Y-T-W giữ 3 giây' },
                 cue: 'Nằm sấp, nâng ngực và tay lên khỏi sàn, siết lưng trên. Tốt cho tư thế khi thân nặng.' },
    birddog:   { name: { 1: 'Bird dog', 2: 'Bird dog giữ 2 giây', 3: 'Bird dog chạm khuỷu–gối' },
                 cue: 'Quỳ bốn chân, duỗi tay trái + chân phải, giữ hông ngang. Tính số lần mỗi bên.' },
    sideplank: { name: { 1: 'Plank nghiêng chống gối', 2: 'Plank nghiêng chống gối', 3: 'Plank nghiêng duỗi chân' },
                 cue: 'Khuỷu dưới vai, hông nâng thẳng hàng. Tính thời gian mỗi bên.' },
    sideleg:   { name: { 1: 'Nằm nghiêng nâng chân', 2: 'Nằm nghiêng nâng chân', 3: 'Nằm nghiêng nâng chân giữ 2 giây' },
                 cue: 'Nằm nghiêng, chân trên duỗi thẳng nâng lên chậm. Tính số lần mỗi bên.' },
    march:     { name: { 1: 'Dậm chân tại chỗ', 2: 'Dậm chân nâng gối cao', 3: 'Dậm chân nâng gối cao + vung tay mạnh' },
                 cue: 'Đi giày, đứng trên thảm. Không nhảy — luôn có một chân chạm sàn.' },
    boxing:    { name: { 1: 'Đấm bốc tại chỗ', 2: 'Đấm bốc + xoay hông', 3: 'Đấm móc + đấm thẳng nhanh' },
                 cue: 'Gối hơi chùng, xoay thân khi đấm, thở ra mỗi cú đấm.' },
    steptouch: { name: { 1: 'Bước chạm sang ngang', 2: 'Bước chạm sang ngang + vung tay', 3: 'Bước ngang 2 nhịp + hạ thấp' },
                 cue: 'Bước sang ngang rồi khép chân, nhịp đều, không bật nhảy.' },
    kneeelbow: { name: { 1: 'Gối chạm khuỷu đứng', 2: 'Gối chạm khuỷu đứng (chéo)', 3: 'Gối chạm khuỷu đứng nhanh' },
                 cue: 'Đứng thẳng, kéo gối lên gặp khuỷu tay đối diện, siết bụng.' },
    frontkick: { name: { 1: 'Đá chân trước nhẹ', 2: 'Đá chân trước', 3: 'Đá chân trước + đấm' },
                 cue: 'Đá bằng đùi, kiểm soát, tiếp đất nhẹ bằng cả bàn chân.' },
    crunch:    { name: { 1: 'Gập bụng (crunch)', 2: 'Gập bụng (crunch)', 3: 'Gập bụng đạp xe (bicycle)' },
                 cue: 'Nằm ngửa, gập gối, cuộn vai lên khỏi sàn, không kéo cổ.' },
    legraise:  { name: { 1: 'Nằm nâng gối (gập gối)', 2: 'Nằm nâng chân thẳng (biên độ ngắn)', 3: 'Nằm nâng chân thẳng' },
                 cue: 'Lưng dưới ép sàn, hạ chân chậm. Tính số lần.' },
    walk:      { name: { 1: 'Đi bộ nhẹ hoặc dậm chân theo nhạc', 2: 'Đi bộ nhanh vừa hoặc dậm chân + đấm bốc', 3: 'Đi bộ nhanh hoặc dậm chân nâng gối + đấm bốc' },
                 cue: 'Cường độ vừa: thở nhanh nhưng vẫn nói được câu ngắn. Giày có đệm gót; đau gót > 3/10 thì chuyển sang bài tại chỗ trên thảm.' }
  };

  // Bài chăm sóc gót chân — làm mỗi sáng khi ngủ dậy và sau buổi tập.
  const HEEL_ROUTINE = [
    { name: 'Kéo giãn bằng khăn trước khi bước xuống giường', dose: '3 × 30 giây mỗi chân', cue: 'Ngồi duỗi chân, vòng khăn qua lòng bàn chân, kéo mũi chân về phía người.' },
    { name: 'Ép tường giãn bắp chân (gối thẳng)', dose: '3 × 30 giây mỗi chân', cue: 'Chân sau thẳng, gót ép sàn, đẩy hông về phía tường.' },
    { name: 'Ép tường giãn bắp chân (gối gập)', dose: '3 × 30 giây mỗi chân', cue: 'Như trên nhưng chùng gối chân sau để giãn cơ dép.' },
    { name: 'Lăn lòng bàn chân trên chai nước đá', dose: '2 phút mỗi chân', cue: 'Lăn từ gót đến ngón, lực vừa phải. Giảm viêm và đau buổi sáng.' },
    { name: 'Gắp khăn bằng ngón chân', dose: '1 phút mỗi chân', cue: 'Ngồi ghế, dùng ngón chân cuộn khăn về phía mình.' },
    { name: 'Nhón gót chậm hai chân (khi hết đau nhói)', dose: '2 × 10–12 lần', cue: 'Lên 2 giây, giữ 1 giây, hạ 3 giây. Bỏ qua nếu đau tăng.' }
  ];

  // Lịch tập theo thứ (0 = CN). kind: strength | interval | steady | rest
  const SCHEDULE = [
    { title: 'Nghỉ ngơi chủ động', kind: 'rest', note: 'Đi dạo nhẹ 15–20 phút nếu gót chân cho phép + làm bài chăm sóc gót chân.' },
    { title: 'Sức mạnh A · Toàn thân', kind: 'strength', items: ['boxsquat', 'pushup', 'bridge', 'hinge', 'deadbug', 'plank'] },
    { title: 'Cardio ngắt quãng · Không nhảy', kind: 'interval', items: ['march', 'boxing', 'steptouch', 'kneeelbow', 'frontkick'], finisher: ['crunch', 'birddog'] },
    { title: 'Sức mạnh B · Toàn thân', kind: 'strength', items: ['wallsit', 'sumo', 'superman', 'pushup', 'birddog', 'sideplank', 'sideleg'] },
    { title: 'Cardio ngắt quãng + Bụng', kind: 'interval', items: ['boxing', 'march', 'kneeelbow', 'steptouch', 'frontkick'], finisher: ['legraise', 'deadbug', 'plank'] },
    { title: 'Sức mạnh A · Toàn thân', kind: 'strength', items: ['boxsquat', 'pushup', 'bridge', 'hinge', 'deadbug', 'plank'] },
    { title: 'Cardio đều · Đốt mỡ', kind: 'steady', items: ['walk'] }
  ];

  // Thông số theo giai đoạn
  const PHASES = {
    1: { name: 'Giai đoạn 1 · Làm quen', weeks: [1, 4], deficit: 750, minutes: 30,
         strength: { rounds: 2, reps: '10–12 lần', time: '20–30 giây', rest: '60 giây' },
         interval: { work: 30, rest: 30, rounds: 2 }, steady: 30 },
    2: { name: 'Giai đoạn 2 · Tăng tốc', weeks: [5, 8], deficit: 850, minutes: 40,
         strength: { rounds: 3, reps: '12–15 lần', time: '30–40 giây', rest: '45 giây' },
         interval: { work: 40, rest: 20, rounds: 3 }, steady: 40 },
    3: { name: 'Giai đoạn 3 · Bứt phá', weeks: [9, 13], deficit: 950, minutes: 45,
         strength: { rounds: 4, reps: '15–20 lần', time: '40–45 giây', rest: '30–45 giây' },
         interval: { work: 45, rest: 15, rounds: 4 }, steady: 45 }
  };

  // Bài tính theo thời gian (còn lại tính theo số lần)
  const TIMED = ['plank', 'wallsit', 'sideplank'];

  // Tỷ lệ % cân nặng giảm mỗi tuần (tuần đầu cao hơn do mất nước + glycogen)
  const WEEKLY_LOSS_SHAPE = [2.0, 1.5, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.9, 0.9, 0.9, 0.8, 0.6];

  // Mục tiêu và trọng tâm từng tuần
  const WEEKS = [
    { steps: 5000, focus: 'Làm quen: tập đúng kỹ thuật, cân mỗi sáng sau khi đi vệ sinh, uống 2,5–3 lít nước/ngày.' },
    { steps: 5500, focus: 'Bỏ hẳn nước ngọt, trà sữa, đồ chiên. Đong cơm bằng cân hoặc bát cố định.' },
    { steps: 6000, focus: 'Ăn đủ đạm mỗi ngày (mỗi bữa chính có 1 phần thịt/cá/trứng/đậu). Ngủ đủ 7 tiếng trở lên.' },
    { steps: 6500, focus: 'Đo vòng bụng + chụp ảnh tiến độ. Đánh giá gót chân: đau giảm thì tăng dần bước chân.' },
    { steps: 7000, focus: 'Lên Giai đoạn 2: tập 3 vòng, giảm calo. Nấu sẵn đồ ăn 2–3 ngày một lần.' },
    { steps: 7000, focus: 'Đi bộ 10 phút sau mỗi bữa chính (chia nhỏ để đỡ áp lực lên gót).' },
    { steps: 7500, focus: 'Chuyển sang chống đẩy trên bàn/ghế. Ăn ngoài thì chọn cơm gà/cá, bỏ da, bớt cơm.' },
    { steps: 7500, focus: 'Đo vòng bụng, so sánh ảnh. Nếu 2 tuần không giảm thì giảm thêm 100 kcal hoặc thêm 1.500 bước.' },
    { steps: 8000, focus: 'Lên Giai đoạn 3: 4 vòng, xuống chậm 3 giây. Giữ đạm cao để không mất cơ.' },
    { steps: 8000, focus: 'Hạn chế bia rượu và ăn khuya. Bữa tối xong trước 20h.' },
    { steps: 8500, focus: 'Nếu chững cân: kiểm tra lại cách đong thức ăn, ngủ đủ, không bỏ buổi tập.' },
    { steps: 8500, focus: 'Đo vòng bụng + ảnh. Dồn sức cho 2 tuần cuối, không cắt thêm calo.' },
    { steps: 8500, focus: 'Về đích: cân, đo, chụp ảnh. Lập kế hoạch tiếp theo hướng tới 63 kg (tăng dần lên mức duy trì ~100 kcal/tuần nếu muốn nghỉ).' }
  ];

  return { FOODS, MENUS, EXERCISES, HEEL_ROUTINE, SCHEDULE, PHASES, TIMED, WEEKLY_LOSS_SHAPE, WEEKS };
})();
