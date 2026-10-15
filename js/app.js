(() => {
  'use strict';

  const STORAGE_KEY = 'healthy-data-v1';
  const RING_LENGTH = 326.7;
  const ACTIVITY_NAMES = {
    walk: '🚶 Đi bộ', run: '🏃 Chạy bộ', bike: '🚴 Đạp xe',
    swim: '🏊 Bơi', yoga: '🧘 Yoga', gym: '🏋️ Tập gym', home: '🔥 Tập tại nhà'
  };
  const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ---------- Dữ liệu ----------
  const defaults = () => ({
    settings: { waterGoal: 2000, activityGoal: 30, sleepGoal: 8, height: null },
    days: {}
  });

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaults();
      const data = JSON.parse(raw);
      return { ...data, settings: { ...defaults().settings, ...data.settings }, days: data.days || {} };
    } catch {
      return defaults();
    }
  }

  const saveHooks = [];

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      toast('Không lưu được dữ liệu');
    }
    saveHooks.forEach((fn) => fn());
  }

  let state = load();

  // Xin trình duyệt không tự xóa dữ liệu khi máy thiếu dung lượng (Chrome/Android hỗ trợ)
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let sleepFormDate = null;
  let currentDate = todayKey();
  let sleepQuality = 3;

  function todayKey(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function parseKey(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function shiftKey(key, delta) {
    const d = parseKey(key);
    d.setDate(d.getDate() + delta);
    return todayKey(d);
  }

  function day(key = currentDate) {
    if (!state.days[key]) state.days[key] = { water: [], activity: [], sleep: null, weight: null };
    return state.days[key];
  }

  function peekDay(key) {
    return state.days[key] || { water: [], activity: [], sleep: null, weight: null };
  }

  const sum = (arr, f) => arr.reduce((a, x) => a + f(x), 0);
  const clamp01 = (n) => Math.max(0, Math.min(1, n));
  const timeNow = () => new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  function latestWeight() {
    const keys = Object.keys(state.days).filter((k) => state.days[k].weight).sort();
    return keys.length ? state.days[keys[keys.length - 1]].weight : null;
  }

  function bmiInfo(weight, heightCm) {
    if (!weight || !heightCm) return null;
    const bmi = weight / Math.pow(heightCm / 100, 2);
    // Ngưỡng BMI cho người châu Á (WHO)
    let label = 'Bình thường';
    if (bmi < 18.5) label = 'Thiếu cân';
    else if (bmi >= 25) label = 'Béo phì';
    else if (bmi >= 23) label = 'Thừa cân';
    return { bmi, label };
  }

  // ---------- Điều hướng ----------
  const renderHooks = [];
  const viewHooks = [];

  function go(view) {
    $$('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${view}`));
    $$('.tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.go === view));
    window.scrollTo({ top: 0 });
    if (view === 'weight') drawWeightChart();
    viewHooks.forEach((fn) => fn(view));
  }

  $$('[data-go]').forEach((el) => el.addEventListener('click', () => go(el.dataset.go)));

  $('#prev-day').addEventListener('click', () => { currentDate = shiftKey(currentDate, -1); render(); });
  $('#next-day').addEventListener('click', () => {
    if (currentDate < todayKey()) { currentDate = shiftKey(currentDate, 1); render(); }
  });

  // ---------- Nước ----------
  $$('[data-water]').forEach((btn) => btn.addEventListener('click', () => {
    const ml = Number(btn.dataset.water);
    day().water.push({ t: timeNow(), ml });
    save(); render();
    const total = sum(day().water, (w) => w.ml);
    if (total >= state.settings.waterGoal && total - ml < state.settings.waterGoal) toast('🎉 Đạt mục tiêu nước hôm nay!');
    else toast(`+${ml} ml`);
  }));

  $('#water-undo').addEventListener('click', () => {
    if (day().water.pop()) { save(); render(); toast('Đã hoàn tác'); }
  });

  // ---------- Vận động ----------
  $('#activity-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    const minutes = Number(form.minutes.value);
    if (!minutes) return;
    const met = Number($('#activity-type').selectedOptions[0].dataset.met);
    const kcal = Math.round(met * (latestWeight() || 60) * minutes / 60);
    day().activity.push({ t: timeNow(), type: form.type.value, minutes, kcal });
    save(); render();
    toast(`Đã lưu · ${kcal} kcal`);
  });

  // ---------- Giấc ngủ ----------
  $$('#sleep-quality button').forEach((b) => b.addEventListener('click', () => {
    sleepQuality = Number(b.dataset.q);
    $$('#sleep-quality button').forEach((x) => x.classList.toggle('on', x === b));
  }));

  $('#sleep-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const { bed, wake } = e.target;
    const [bh, bm] = bed.value.split(':').map(Number);
    const [wh, wm] = wake.value.split(':').map(Number);
    let minutes = (wh * 60 + wm) - (bh * 60 + bm);
    if (minutes <= 0) minutes += 24 * 60;
    day().sleep = { bed: bed.value, wake: wake.value, hours: +(minutes / 60).toFixed(2), q: sleepQuality };
    save(); render();
    toast('Đã lưu giấc ngủ');
  });

  // ---------- Cân nặng ----------
  $('#weight-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const height = Number(e.target.height.value);
    const weight = Number(e.target.weight.value);
    if (!height || !weight) return;
    state.settings.height = height;
    day().weight = weight;
    save(); render(); drawWeightChart();
    toast('Đã lưu cân nặng');
  });

  // ---------- Cài đặt ----------
  $('#settings-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    state.settings.waterGoal = Number(f.waterGoal.value) || 2000;
    state.settings.activityGoal = Number(f.activityGoal.value) || 30;
    state.settings.sleepGoal = Number(f.sleepGoal.value) || 8;
    save(); render();
    toast('Đã lưu mục tiêu');
  });

  $('#export-btn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `healthy-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  $('#import-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data.days) throw new Error('invalid');
      state = { ...data, settings: { ...defaults().settings, ...data.settings }, days: data.days };
      save(); render();
      toast('Đã nhập dữ liệu');
    } catch {
      toast('File không hợp lệ');
    }
    e.target.value = '';
  });

  $('#reset-btn').addEventListener('click', () => {
    if (!confirm('Xóa toàn bộ dữ liệu? Không thể hoàn tác.')) return;
    state = defaults();
    save(); render();
    toast('Đã xóa dữ liệu');
  });

  // ---------- Hiển thị ----------
  function render() {
    const d = peekDay(currentDate);
    const s = state.settings;
    const isToday = currentDate === todayKey();

    $('#today-label').textContent = (isToday ? 'Hôm nay · ' : '') +
      parseKey(currentDate).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' });
    $('#next-day').disabled = isToday;

    const { water, actMin, actKcal, sleepH, pWater, pAct, pSleep, score } = dayStats(currentDate);

    // Tổng quan
    $('#score-value').textContent = score;
    $('#score-ring').style.strokeDashoffset = RING_LENGTH * (1 - score / 100);
    $('#score-tip').textContent = tipFor(pWater, pAct, d.sleep, score);
    $('#home-water').textContent = `${water} ml`;
    $('#home-water-bar').style.width = `${pWater * 100}%`;
    $('#home-activity').textContent = `${actMin} phút`;
    $('#home-activity-bar').style.width = `${pAct * 100}%`;
    $('#home-sleep').textContent = d.sleep ? `${sleepH.toFixed(1)} giờ` : '-';
    $('#home-sleep-bar').style.width = `${pSleep * 100}%`;
    const bmi = bmiInfo(latestWeight(), s.height || (state.plan && state.plan.profile.height));
    $('#home-bmi').textContent = bmi ? bmi.bmi.toFixed(1) : '-';
    $('#home-bmi-label').textContent = bmi ? bmi.label : 'Chưa có dữ liệu';
    renderWeek();

    // Nước
    $('#water-total').textContent = water;
    $('#water-goal').textContent = s.waterGoal;
    $('#glass-fill').style.height = `${pWater * 100}%`;
    renderList('#water-log', [...d.water].reverse(), (w) => `<span>💧 ${w.ml} ml</span><span class="muted">${w.t}</span>`, 'Chưa uống ly nào');

    // Vận động
    $('#activity-summary').textContent = d.activity.length ? `· ${actMin} phút · ${actKcal} kcal` : '';
    renderList('#activity-log', d.activity.map((a, i) => ({ ...a, i })).reverse(), (a) =>
      `<span>${ACTIVITY_NAMES[a.type] || esc(a.type)} · ${Number(a.minutes) || 0} phút</span>
       <span><span class="muted">${a.kcal} kcal</span><button class="del" data-del-act="${a.i}" aria-label="Xóa">✕</button></span>`,
      'Chưa có hoạt động');
    $$('[data-del-act]').forEach((b) => b.addEventListener('click', () => {
      day().activity.splice(Number(b.dataset.delAct), 1);
      save(); render();
    }));

    // Giấc ngủ
    const sf = $('#sleep-form');
    if (d.sleep) {
      sf.bed.value = d.sleep.bed;
      sf.wake.value = d.sleep.wake;
      sleepQuality = d.sleep.q;
    } else if (sleepFormDate !== currentDate) {
      // Sang ngày chưa ghi giấc ngủ: về giá trị mặc định thay vì giữ số của ngày khác
      sf.bed.value = '23:00';
      sf.wake.value = '06:30';
      sleepQuality = 3;
    }
    sleepFormDate = currentDate;
    $$('#sleep-quality button').forEach((x) => x.classList.toggle('on', Number(x.dataset.q) === sleepQuality));
    $('#sleep-result').textContent = d.sleep
      ? `Bạn đã ngủ ${sleepH.toFixed(1)} giờ (mục tiêu ${s.sleepGoal} giờ). ${sleepH >= s.sleepGoal - 0.5 ? 'Tuyệt vời! 🌙' : 'Hãy cố ngủ sớm hơn nhé.'}`
      : 'Người trưởng thành nên ngủ 7–9 giờ mỗi đêm.';

    // Cân nặng
    const wf = $('#weight-form');
    if (s.height && document.activeElement !== wf.height) wf.height.value = s.height;
    if (document.activeElement !== wf.weight) wf.weight.value = d.weight || latestWeight() || '';
    if (bmi) {
      $('#bmi-box').hidden = false;
      $('#bmi-value').textContent = bmi.bmi.toFixed(1);
      $('#bmi-label').textContent = bmi.label;
      // Thang hiển thị BMI 15 → 35
      $('#bmi-marker').style.left = `${clamp01((bmi.bmi - 15) / 20) * 100}%`;
    } else {
      $('#bmi-box').hidden = true;
    }

    // Cài đặt
    const st = $('#settings-form');
    st.waterGoal.value = s.waterGoal;
    st.activityGoal.value = s.activityGoal;
    st.sleepGoal.value = s.sleepGoal;

    renderHooks.forEach((fn) => fn());
  }

  function dayStats(key) {
    const d = peekDay(key);
    const s = state.settings;
    const water = sum(d.water, (w) => w.ml);
    const actMin = sum(d.activity, (a) => a.minutes);
    const actKcal = sum(d.activity, (a) => a.kcal);
    const sleepH = d.sleep ? d.sleep.hours : 0;
    const pWater = clamp01(water / s.waterGoal);
    const pAct = clamp01(actMin / s.activityGoal);
    const pSleep = d.sleep ? clamp01(1 - Math.abs(sleepH - s.sleepGoal) / s.sleepGoal) : 0;
    const score = Math.round(pWater * 35 + pAct * 35 + pSleep * 30);
    return { water, actMin, actKcal, sleepH, pWater, pAct, pSleep, score };
  }

  function renderList(sel, items, tpl, emptyText) {
    $(sel).innerHTML = items.length
      ? items.map((x) => `<li>${tpl(x)}</li>`).join('')
      : `<li class="empty">${emptyText}</li>`;
  }

  function renderWeek() {
    const goal = state.settings.waterGoal;
    const cols = [];
    let max = goal;
    for (let i = 6; i >= 0; i--) {
      const key = shiftKey(currentDate, -i);
      const total = sum(peekDay(key).water, (w) => w.ml);
      max = Math.max(max, total);
      cols.push({ key, total });
    }
    $('#week-chart').innerHTML = cols.map((c) => `
      <div class="col ${c.key === currentDate ? 'today' : ''} ${c.total >= goal ? 'goal' : ''}">
        <i style="height:${(c.total / max) * 100}%" title="${c.total} ml"></i>
        <span>${WEEKDAYS[parseKey(c.key).getDay()]}</span>
      </div>`).join('');
  }

  function tipFor(pWater, pAct, sleep, score) {
    if (score >= 90) return 'Xuất sắc! Bạn đang có một ngày rất khỏe mạnh 💪';
    if (pWater < 0.5) return 'Uống thêm nước nhé — cơ thể cần khoảng 2 lít mỗi ngày.';
    if (pAct < 0.5) return 'Thử đi bộ nhanh 15 phút để tăng năng lượng.';
    if (!sleep) return 'Đừng quên ghi lại giấc ngủ đêm qua.';
    return 'Bạn đang làm tốt, tiếp tục duy trì nhé!';
  }

  function drawWeightChart() {
    const canvas = $('#weight-chart');
    const points = Object.keys(state.days)
      .filter((k) => state.days[k].weight)
      .sort()
      .slice(-30)
      .map((k) => ({ k, w: state.days[k].weight }));

    $('#weight-empty').hidden = points.length > 0;
    canvas.hidden = points.length === 0;
    if (!points.length || !canvas.offsetWidth) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth, H = 180;
    canvas.width = W * dpr; canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const css = getComputedStyle(document.documentElement);
    const primary = css.getPropertyValue('--primary').trim();
    const muted = css.getPropertyValue('--muted').trim();
    const line = css.getPropertyValue('--line').trim();

    const ws = points.map((p) => p.w);
    let min = Math.min(...ws) - 1, max = Math.max(...ws) + 1;
    const pad = { l: 34, r: 10, t: 10, b: 22 };
    const x = (i) => pad.l + (points.length === 1 ? (W - pad.l - pad.r) / 2 : (i / (points.length - 1)) * (W - pad.l - pad.r));
    const y = (w) => pad.t + (1 - (w - min) / (max - min)) * (H - pad.t - pad.b);

    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = muted;
    ctx.strokeStyle = line;
    ctx.lineWidth = 1;
    for (let g = 0; g <= 3; g++) {
      const val = min + (max - min) * (g / 3);
      const gy = y(val);
      ctx.beginPath(); ctx.moveTo(pad.l, gy); ctx.lineTo(W - pad.r, gy); ctx.stroke();
      ctx.fillText(val.toFixed(0), 4, gy + 4);
    }

    const first = parseKey(points[0].k), last = parseKey(points[points.length - 1].k);
    const fmt = (d) => `${d.getDate()}/${d.getMonth() + 1}`;
    ctx.fillText(fmt(first), pad.l, H - 6);
    const lastLabel = fmt(last);
    ctx.fillText(lastLabel, W - pad.r - ctx.measureText(lastLabel).width, H - 6);

    ctx.strokeStyle = primary;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    points.forEach((p, i) => (i ? ctx.lineTo(x(i), y(p.w)) : ctx.moveTo(x(i), y(p.w))));
    ctx.stroke();

    ctx.fillStyle = primary;
    points.forEach((p, i) => { ctx.beginPath(); ctx.arc(x(i), y(p.w), 3.5, 0, Math.PI * 2); ctx.fill(); });
  }

  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
  }

  window.addEventListener('resize', () => { if ($('#view-weight').classList.contains('active')) drawWeightChart(); });

  // Khi mở lại app sang ngày mới thì tự nhảy về hôm nay
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && currentDate > todayKey()) { currentDate = todayKey(); render(); }
  });

  // API dùng chung cho các module khác (plan.js)
  window.Healthy = {
    get state() { return state; },
    save, day, peekDay, todayKey, parseKey, shiftKey, latestWeight, toast, render, go,
    dayStats, bmiInfo, ACTIVITY_NAMES,
    currentDate: () => currentDate,
    onSave: (fn) => saveHooks.push(fn),
    onRender: (fn) => renderHooks.push(fn),
    onView: (fn) => viewHooks.push(fn)
  };

  render();

  // Mở thẳng một tab qua đường dẫn, ví dụ .../Healthy/#plan
  window.addEventListener('load', () => {
    const v = location.hash.slice(1);
    if (v && document.getElementById(`view-${v}`)) go(v);
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
    // Có bản mới (service worker mới tiếp quản) thì tải lại một lần để không dùng lẫn file cũ/mới
    if (navigator.serviceWorker.controller) {
      let reloaded = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!reloaded) { reloaded = true; location.reload(); }
      });
    }
  }
})();
