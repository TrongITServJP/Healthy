(() => {
  'use strict';

  const H = window.Healthy;
  if (!H) return;

  const KEY = 'healthy-sync';
  const DEBOUNCE_MS = 3000;
  const $ = (sel) => document.querySelector(sel);

  // Cấu hình lưu riêng, không nằm trong dữ liệu sức khỏe (không bị xuất/xóa cùng)
  function loadCfg() {
    try {
      return { url: '', token: '', auto: true, pending: [], last: null, error: null, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
    } catch {
      return { url: '', token: '', auto: true, pending: [], last: null, error: null };
    }
  }
  function saveCfg() {
    try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch { /* bỏ qua */ }
  }

  let cfg = loadCfg();
  let timer = null;
  let busy = false;

  const connected = () => Boolean(cfg.url && cfg.token);

  // ---------- Dữ liệu một dòng ----------
  function buildRow(key) {
    const d = H.peekDay(key);
    const st = H.dayStats(key);
    const p = window.HealthyPlan ? window.HealthyPlan.summary(key) : {};
    const height = H.state.settings.height || (window.HealthyPlan && window.HealthyPlan.profile().height);
    const bmi = H.bmiInfo(d.weight, height);
    return {
      date: key,
      planDay: p.day ?? '',
      weight: d.weight || '',
      target: p.target ?? '',
      bmi: bmi ? +bmi.bmi.toFixed(1) : '',
      water: st.water,
      activityMin: st.actMin,
      activityKcal: st.actKcal,
      activities: d.activity.map((a) => `${H.ACTIVITY_NAMES[a.type] || a.type} ${a.minutes}p`).join(', '),
      sleepHours: d.sleep ? d.sleep.hours : '',
      sleepQuality: d.sleep ? d.sleep.q : '',
      workout: p.workout ?? '',
      exercises: p.exercises ?? '',
      workoutDone: p.logged ? 'Có' : '',
      mealsKcal: p.mealsKcal || '',
      meals: p.meals ?? '',
      heel: p.heel ?? '',
      score: st.score
    };
  }

  function allKeys() {
    const keys = new Set(Object.keys(H.state.days));
    const log = H.state.plan && H.state.plan.log;
    if (log) Object.keys(log).forEach((k) => keys.add(k));
    return [...keys].filter((k) => k <= H.todayKey()).sort();
  }

  // ---------- Gửi ----------
  async function post(payload) {
    const res = await fetch(cfg.url, {
      method: 'POST',
      // text/plain để tránh preflight CORS với Apps Script
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ token: cfg.token, ...payload })
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Lỗi không rõ');
    return data;
  }

  async function flush() {
    if (!connected() || busy || !cfg.pending.length || !navigator.onLine) return;
    busy = true;
    const keys = [...cfg.pending];
    try {
      const profile = window.HealthyPlan ? window.HealthyPlan.profile() : null;
      await post({ rows: keys.map(buildRow), profile });
      cfg.pending = cfg.pending.filter((k) => !keys.includes(k));
      cfg.last = new Date().toISOString();
      cfg.error = null;
    } catch (err) {
      cfg.error = String(err.message || err);
    }
    busy = false;
    saveCfg();
    renderStatus();
    if (cfg.pending.length && !cfg.error) flush();
  }

  function queue(keys) {
    keys.forEach((k) => { if (!cfg.pending.includes(k)) cfg.pending.push(k); });
    saveCfg();
    clearTimeout(timer);
    timer = setTimeout(flush, DEBOUNCE_MS);
  }

  // ---------- Giao diện ----------
  function renderStatus() {
    const el = $('#sync-status');
    if (!el) return;
    const f = $('#sync-form');
    if (!f.contains(document.activeElement)) {
      f.url.value = cfg.url;
      f.token.value = cfg.token;
      f.auto.checked = cfg.auto;
    }
    $('#sync-actions').hidden = !connected();
    let text;
    if (!connected()) text = 'Chưa kết nối.';
    else if (cfg.error) text = `⚠️ Lỗi: ${cfg.error}${cfg.pending.length ? ` · ${cfg.pending.length} ngày đang chờ gửi` : ''}`;
    else if (cfg.pending.length) text = `⏳ Đang chờ gửi ${cfg.pending.length} ngày…`;
    else text = `✅ Đã kết nối${cfg.last ? ` · lần cuối ${new Date(cfg.last).toLocaleString('vi-VN')}` : ''}`;
    el.textContent = text;
  }

  $('#sync-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const url = f.url.value.trim();
    if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(url)) {
      H.toast('URL phải có dạng https://script.google.com/macros/s/…/exec');
      return;
    }
    cfg.url = url;
    cfg.token = f.token.value.trim();
    cfg.auto = f.auto.checked;
    saveCfg();
    $('#sync-status').textContent = '⏳ Đang kiểm tra kết nối…';
    try {
      await post({ rows: [] });
      cfg.error = null;
      H.toast('✅ Kết nối Google Sheets thành công');
      queue(allKeys());
    } catch (err) {
      cfg.error = String(err.message || err);
      H.toast('Không kết nối được');
    }
    saveCfg();
    renderStatus();
  });

  $('#sync-all').addEventListener('click', () => {
    queue(allKeys());
    clearTimeout(timer);
    flush().then(() => H.toast(cfg.error ? 'Đồng bộ lỗi' : 'Đã đồng bộ toàn bộ'));
  });

  $('#sync-off').addEventListener('click', () => {
    if (!confirm('Ngắt kết nối Google Sheets trên thiết bị này?')) return;
    cfg = { url: '', token: '', auto: true, pending: [], last: null, error: null };
    saveCfg();
    renderStatus();
  });

  // Mỗi lần lưu dữ liệu: gửi dòng của ngày đang xem (và hôm nay)
  H.onSave(() => {
    if (!connected() || !cfg.auto) return;
    queue([...new Set([H.currentDate(), H.todayKey()])]);
  });

  window.addEventListener('online', flush);
  renderStatus();
  flush();
})();
