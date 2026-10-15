(() => {
  'use strict';

  const H = window.Healthy;
  if (!H) return;

  const KEY = 'healthy-sync';
  const DEBOUNCE_MS = 3000;
  const $ = (sel) => document.querySelector(sel);
  const fmtTime = (ms) => {
    const d = new Date(ms);
    const p2 = (n) => String(n).padStart(2, '0');
    return `${p2(d.getHours())}:${p2(d.getMinutes())} ${d.getDate()}/${d.getMonth() + 1}`;
  };
  const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

  // Cấu hình lưu riêng, không nằm trong dữ liệu sức khỏe (không bị xuất/xóa cùng)
  //  device:     mã ngẫu nhiên của thiết bị này
  //  remoteSeen: thời điểm bản sao lưu trên Sheets mà thiết bị này đã đồng bộ gần nhất
  const blank = () => ({ url: '', token: '', auto: true, pending: [], last: null, error: null, device: newId(), remoteSeen: 0, oldScript: false });

  function loadCfg() {
    try {
      return { ...blank(), ...JSON.parse(localStorage.getItem(KEY) || '{}') };
    } catch {
      return blank();
    }
  }
  function saveCfg() {
    try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch { /* bỏ qua */ }
  }

  let cfg = loadCfg();
  saveCfg();
  let timer = null;
  let busy = false;
  let suppress = false; // không đẩy lên Sheets khi đang khôi phục

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

  // ---------- Gửi / nhận ----------
  async function post(payload) {
    const res = await fetch(cfg.url, {
      method: 'POST',
      // text/plain để tránh preflight CORS với Apps Script
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ token: cfg.token, ...payload })
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Lỗi không rõ');
    // Script cũ (chưa có sao lưu) không trả về version
    cfg.oldScript = !data.version;
    return data;
  }

  // Gửi các ngày đang chờ + bản sao lưu đầy đủ
  async function flush(force = false) {
    if (!connected() || busy || !navigator.onLine) return;
    if (!cfg.pending.length && !force) return;
    busy = true;
    const keys = [...cfg.pending];
    try {
      const profile = window.HealthyPlan ? window.HealthyPlan.profile() : null;
      const data = await post({
        rows: keys.map(buildRow),
        profile,
        backup: JSON.stringify(H.state),
        base: cfg.remoteSeen,
        device: cfg.device
      });
      cfg.pending = cfg.pending.filter((k) => !keys.includes(k));
      cfg.last = Date.now();
      cfg.error = null;
      if (data.backupAt) cfg.remoteSeen = data.backupAt;
      if (data.conflict) showConflict(data.conflict);
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

  // Tải bản sao lưu từ Sheets về thay dữ liệu máy này
  async function restore(ask = true) {
    const data = await post({ action: 'pull' });
    if (cfg.oldScript) throw new Error('Apps Script đang là bản cũ — hãy cập nhật code để dùng sao lưu');
    const b = data.backup;
    if (!b || !b.data) { H.toast('Trên Sheets chưa có bản sao lưu'); return false; }
    if (ask && !confirm(`Thay toàn bộ dữ liệu trên máy này bằng bản sao lưu lúc ${fmtTime(b.updatedAt)}?`)) return false;
    cfg.remoteSeen = b.updatedAt;
    cfg.pending = [];
    saveCfg();
    suppress = true;
    try { H.replaceState(JSON.parse(b.data)); } finally { suppress = false; }
    hideBanner();
    renderStatus();
    H.toast('✅ Đã khôi phục dữ liệu từ Google Sheets');
    return true;
  }

  // Kiểm tra máy khác có sao lưu mới hơn không (khi mở app)
  async function checkRemote() {
    if (!connected() || !navigator.onLine) return;
    try {
      const data = await post({ action: 'meta' });
      const b = data.backup;
      if (b && b.device !== cfg.device && b.updatedAt > cfg.remoteSeen) showConflict(b);
    } catch { /* lỗi mạng: thử lại lần sau */ }
    saveCfg();
    renderStatus();
  }

  // ---------- Giao diện ----------
  function showConflict(b) {
    const el = $('#sync-banner');
    el.innerHTML = `
      <p>☁️ Có dữ liệu mới hơn từ <b>thiết bị khác</b> (sao lưu lúc ${fmtTime(b.updatedAt)}).</p>
      <div class="btn-row">
        <button class="btn primary" data-sync="pull">Tải về máy này</button>
        <button class="btn ghost" data-sync="keep" data-at="${Number(b.updatedAt)}">Giữ dữ liệu máy này</button>
      </div>`;
    el.hidden = false;
  }

  function hideBanner() {
    $('#sync-banner').hidden = true;
  }

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
    const lines = [];
    if (!connected()) lines.push('Chưa kết nối.');
    else if (cfg.error) lines.push(`⚠️ Lỗi: ${cfg.error}${cfg.pending.length ? ` · ${cfg.pending.length} ngày đang chờ gửi` : ''}`);
    else if (cfg.pending.length) lines.push(`⏳ Đang chờ gửi ${cfg.pending.length} ngày…`);
    else lines.push(`✅ Đã kết nối${cfg.last ? ` · gửi lần cuối ${fmtTime(cfg.last)}` : ''}`);
    if (connected() && cfg.oldScript) lines.push('⚠️ Apps Script là bản cũ: vẫn ghi Nhật ký nhưng chưa sao lưu/khôi phục được. Hãy dán code mới và triển khai "Phiên bản mới".');
    else if (connected() && cfg.remoteSeen) lines.push(`☁️ Sao lưu đầy đủ lúc ${fmtTime(cfg.remoteSeen)}`);
    el.textContent = lines.join('\n');
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
      const data = await post({ action: 'meta' });
      cfg.error = null;
      H.toast('✅ Kết nối Google Sheets thành công');
      const b = data.backup;
      // Sheets đã có dữ liệu từ máy khác: hỏi trước khi ghi đè (máy mới, vừa cài lại…)
      if (b && b.device !== cfg.device && b.updatedAt > cfg.remoteSeen) {
        if (confirm(`Google Sheets đã có bản sao lưu lúc ${fmtTime(b.updatedAt)}.\n\nOK: tải dữ liệu đó về máy này.\nHủy: giữ dữ liệu máy này và ghi đè lên Sheets.`)) {
          await restore(false);
          return;
        }
        cfg.remoteSeen = b.updatedAt;
      }
      queue(allKeys());
    } catch (err) {
      cfg.error = String(err.message || err);
      H.toast('Không kết nối được');
    }
    saveCfg();
    renderStatus();
  });

  document.addEventListener('click', async (e) => {
    const t = e.target;
    const act = t.closest('[data-sync]');
    if (act && act.dataset.sync === 'pull') {
      try { await restore(false); } catch (err) { H.toast(String(err.message || err)); }
      return;
    }
    if (act && act.dataset.sync === 'keep') {
      cfg.remoteSeen = Number(act.dataset.at);
      saveCfg();
      hideBanner();
      queue(allKeys());
      H.toast('Sẽ ghi dữ liệu máy này lên Sheets');
      return;
    }
    if (t.closest('#sync-restore')) {
      try { await restore(true); } catch (err) { H.toast(String(err.message || err)); }
      return;
    }
    if (t.closest('#sync-all')) {
      queue(allKeys());
      clearTimeout(timer);
      flush().then(() => H.toast(cfg.error ? 'Đồng bộ lỗi' : 'Đã đồng bộ toàn bộ'));
      return;
    }
    if (t.closest('#sync-off')) {
      if (!confirm('Ngắt kết nối Google Sheets trên thiết bị này?')) return;
      cfg = { ...blank(), device: cfg.device };
      saveCfg();
      renderStatus();
    }
  });

  // Mỗi lần lưu dữ liệu: gửi dòng của ngày đang xem (và hôm nay) kèm bản sao lưu
  H.onSave(() => {
    if (suppress || !connected() || !cfg.auto) return;
    queue([...new Set([H.currentDate(), H.todayKey()])]);
  });

  window.addEventListener('online', () => flush());
  renderStatus();
  checkRemote().then(() => flush());
})();
