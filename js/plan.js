(() => {
  'use strict';

  const H = window.Healthy;
  const D = window.PLAN_DATA;
  if (!H || !D) {
    // Thường do trình duyệt còn giữ file cũ — báo người dùng tải lại thay vì để trống
    const v = document.getElementById('view-plan');
    if (v) v.insertAdjacentHTML('afterbegin', '<div class="card warn">Ứng dụng vừa được cập nhật. <a href="" onclick="location.reload(true);return false">Chạm để tải lại</a>.</div>');
    return;
  }
  const PLAN_DAYS = 90;
  const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);
  const round50 = (n) => Math.round(n / 50) * 50;
  const fmtKg = (n) => n.toLocaleString('vi-VN', { maximumFractionDigits: 1 });
  const fmtDate = (d) => `${d.getDate()}/${d.getMonth() + 1}`;

  let subTab = 'today';
  let menuDay = null;

  // ---------- Hồ sơ & tính toán ----------
  function plan() {
    const st = H.state;
    if (!st.plan) {
      st.plan = {
        profile: { start: H.todayKey(), sex: 'male', age: 23, height: 170, weight: 100, goal: 86.5 },
        log: {}
      };
      H.save();
    }
    return st.plan;
  }

  function calc() {
    const p = plan().profile;
    const bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === 'male' ? 5 : -161);
    // Ít vận động (×1,2) + 6 buổi tập/tuần ~37 phút cường độ vừa (MET ≈ 4)
    const exercise = 4 * p.weight * (37.5 / 60) * 6 / 7;
    const tdee = bmr * 1.2 + exercise;
    const floor = p.sex === 'male' ? 1500 : 1200;
    const kcal = {};
    for (const ph of [1, 2, 3]) kcal[ph] = Math.max(floor, round50(tdee - D.PHASES[ph].deficit));
    const protein = Math.round(1.6 * Math.max(p.goal, p.weight * 0.8) / 5) * 5;

    // Cân nặng mục tiêu cuối mỗi tuần theo đường cong giảm dần
    const total = p.weight - p.goal;
    const shapeSum = D.WEEKLY_LOSS_SHAPE.reduce((a, b) => a + b, 0);
    const weekTargets = [p.weight];
    let acc = 0;
    D.WEEKLY_LOSS_SHAPE.forEach((s) => { acc += s; weekTargets.push(p.weight - total * acc / shapeSum); });

    const avgPerWeek = total / 13;
    return { bmr, tdee, kcal, floor, protein, weekTargets, avgPerWeek, pctPerWeek: avgPerWeek / p.weight * 100 };
  }

  function targetForDay(c, dayNum) {
    const x = Math.max(0, Math.min(PLAN_DAYS, dayNum)) / PLAN_DAYS * 13;
    const i = Math.floor(x);
    if (i >= 13) return c.weekTargets[13];
    return c.weekTargets[i] + (c.weekTargets[i + 1] - c.weekTargets[i]) * (x - i);
  }

  function dayNumber(key) {
    const ms = H.parseKey(key) - H.parseKey(plan().profile.start);
    return Math.round(ms / 86400000) + 1;
  }

  const weekOf = (dayNum) => Math.min(13, Math.max(1, Math.ceil(dayNum / 7)));
  const phaseOf = (week) => (week <= 4 ? 1 : week <= 8 ? 2 : 3);

  function dayLog(key) {
    const log = plan().log;
    if (!log[key]) log[key] = { ex: [], meals: [], heel: [], logged: false };
    return log[key];
  }

  // ---------- Thực đơn ----------
  function buildMenu(weekday, target) {
    const menu = D.MENUS[weekday];
    let carbK = 0, otherK = 0;
    Object.values(menu).flat().forEach(([id, g]) => {
      const k = D.FOODS[id].kcal * g / 100;
      if (D.FOODS[id].carb) carbK += k; else otherK += k;
    });
    const factor = Math.max(0.3, Math.min(1.6, (target - otherK) / carbK));

    const meals = Object.entries(menu).map(([name, items]) => {
      const rows = items.map(([id, g0]) => {
        const f = D.FOODS[id];
        const g = f.carb ? Math.round(g0 * factor / 5) * 5 : g0;
        return { name: f.name, amount: amountLabel(id, f, g), kcal: f.kcal * g / 100, p: f.p * g / 100, c: f.c * g / 100, f: f.f * g / 100 };
      });
      const sum = (k) => rows.reduce((a, r) => a + r[k], 0);
      return { name, rows, kcal: sum('kcal'), p: sum('p'), c: sum('c'), f: sum('f') };
    });
    const total = (k) => meals.reduce((a, m) => a + m[k], 0);
    return { meals, kcal: total('kcal'), p: total('p'), c: total('c'), f: total('f') };
  }

  function amountLabel(id, f, g) {
    if (id === 'suatuoi') return `${g} ml`;
    if (id === 'dau') return `${g / 5} thìa cà phê`;
    if (f.unit && !f.carb) {
      const q = g / f.unit.g;
      return `${q.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} ${f.unit.n}`;
    }
    return `${g} g`;
  }

  function menuHtml(menu, key) {
    const eaten = key ? dayLog(key).meals : null;
    return menu.meals.map((m) => `
      <div class="meal ${eaten && eaten.includes(m.name) ? 'done' : ''}">
        <div class="meal-head" ${key ? `data-meal="${m.name}"` : ''}>
          ${key ? '<span class="check"></span>' : ''}
          <strong>${m.name}</strong>
          <span class="muted">${Math.round(m.kcal)} kcal · ${Math.round(m.p)} g đạm</span>
        </div>
        <ul class="food-list">
          ${m.rows.map((r) => `<li><span>${r.name}</span><span>${r.amount}</span></li>`).join('')}
        </ul>
      </div>`).join('');
  }

  // ---------- Bài tập ----------
  function workoutFor(weekday, phase) {
    const s = D.SCHEDULE[weekday];
    const P = D.PHASES[phase];
    const exName = (id) => D.EXERCISES[id].name[phase];
    const out = { title: s.title, kind: s.kind, note: s.note, minutes: s.kind === 'rest' ? 0 : P.minutes, blocks: [] };

    if (s.kind === 'strength') {
      out.blocks.push({
        title: `Vòng tròn · ${P.strength.rounds} vòng · nghỉ ${P.strength.rest} giữa vòng`,
        items: s.items.map((id) => ({ id, name: exName(id), dose: D.TIMED.includes(id) ? P.strength.time : P.strength.reps, cue: D.EXERCISES[id].cue }))
      });
    } else if (s.kind === 'interval') {
      const iv = P.interval;
      out.blocks.push({
        title: `Ngắt quãng · ${iv.work}s tập / ${iv.rest}s nghỉ · ${iv.rounds} vòng`,
        items: s.items.map((id) => ({ id, name: exName(id), dose: `${iv.work} giây`, cue: D.EXERCISES[id].cue }))
      });
      out.blocks.push({
        title: `Bài bụng · ${Math.max(2, P.strength.rounds - 1)} vòng`,
        items: s.finisher.map((id) => ({ id, name: exName(id), dose: D.TIMED.includes(id) ? P.strength.time : P.strength.reps, cue: D.EXERCISES[id].cue }))
      });
    } else if (s.kind === 'steady') {
      out.blocks.push({
        title: 'Cardio đều',
        items: s.items.map((id) => ({ id, name: exName(id), dose: `${P.steady} phút`, cue: D.EXERCISES[id].cue }))
      });
    }
    return out;
  }

  function workoutHtml(w, key) {
    if (w.kind === 'rest') {
      return `<p class="tip left">🛌 ${w.note}</p>`;
    }
    const done = dayLog(key).ex;
    let idx = 0;
    const blocks = w.blocks.map((b) => `
      <h3 class="block-title">${b.title}</h3>
      <ul class="ex-list">
        ${b.items.map((it) => {
          const i = idx++;
          return `<li class="${done.includes(i) ? 'done' : ''}" data-ex="${i}">
            <span class="check"></span>
            <div class="ex-body">
              <div class="ex-top"><strong>${it.name}</strong><span class="dose">${it.dose}</span></div>
              <small class="muted">${it.cue}</small>
            </div>
          </li>`;
        }).join('')}
      </ul>`).join('');
    const logged = dayLog(key).logged;
    return `
      <p class="muted small">🔥 Khởi động 5 phút: xoay cổ, vai, hông, cổ chân + dậm chân nhẹ.</p>
      ${blocks}
      <p class="muted small">🧘 Thả lỏng 5 phút + bài chăm sóc gót chân (tab Gót chân).</p>
      <button class="btn ${logged ? '' : 'primary'} block" id="plan-finish" ${logged ? 'disabled' : ''}>
        ${logged ? '✓ Đã ghi vào Vận động' : `Hoàn thành buổi tập (${w.minutes} phút)`}
      </button>`;
  }

  // ---------- Hiển thị ----------
  function render() {
    const view = $('#view-plan');
    if (!view) return;
    const p = plan().profile;
    const c = calc();
    const key = H.currentDate();
    const dayNum = dayNumber(key);
    const weekday = H.parseKey(key).getDay();

    // Thanh trạng thái
    let header;
    if (dayNum < 1) header = `Kế hoạch bắt đầu ngày ${fmtDate(H.parseKey(p.start))}`;
    else if (dayNum > PLAN_DAYS) header = '🎉 Đã hoàn thành 90 ngày';
    else header = `Ngày ${dayNum}/${PLAN_DAYS} · Tuần ${weekOf(dayNum)}`;
    const activeDay = Math.min(PLAN_DAYS, Math.max(1, dayNum));
    const week = weekOf(activeDay);
    const phase = phaseOf(week);
    const kcal = c.kcal[phase];

    $('#plan-header').textContent = header;
    $('#plan-phase').textContent = D.PHASES[phase].name;
    $('#plan-progress').style.width = `${Math.max(0, Math.min(1, dayNum / PLAN_DAYS)) * 100}%`;
    $('#plan-kcal').textContent = kcal;
    $('#plan-protein').textContent = `${c.protein} g`;
    $('#plan-steps').textContent = D.WEEKS[week - 1].steps.toLocaleString('vi-VN');
    $('#plan-week-target').textContent = `${fmtKg(c.weekTargets[week])} kg`;
    $('#plan-focus').textContent = D.WEEKS[week - 1].focus;
    $('#plan-status').innerHTML = statusHtml(c);

    // Các tab con
    $$('.seg button').forEach((b) => b.classList.toggle('active', b.dataset.sub === subTab));
    $$('.sub').forEach((s) => (s.hidden = s.id !== `sub-${subTab}`));

    // Hôm nay
    const w = workoutFor(weekday, phase);
    $('#plan-workout-title').textContent = w.title + (w.minutes ? ` · ${w.minutes} phút` : '');
    $('#plan-workout').innerHTML = workoutHtml(w, key);
    const menu = buildMenu(weekday, kcal);
    const eaten = menu.meals.filter((m) => dayLog(key).meals.includes(m.name)).reduce((a, m) => a + m.kcal, 0);
    $('#plan-menu-sum').textContent = `Đã ăn ${Math.round(eaten)} / ${Math.round(menu.kcal)} kcal`;
    $('#plan-menu').innerHTML = menuHtml(menu, key);

    // Thực đơn tuần
    if (menuDay === null) menuDay = weekday;
    $('#menu-days').innerHTML = [1, 2, 3, 4, 5, 6, 0].map((d) =>
      `<button class="${d === menuDay ? 'active' : ''}" data-menuday="${d}">${WEEKDAYS[d]}</button>`).join('');
    const wm = buildMenu(menuDay, kcal);
    $('#menu-week-sum').textContent =
      `${Math.round(wm.kcal)} kcal · Đạm ${Math.round(wm.p)} g · Tinh bột ${Math.round(wm.c)} g · Béo ${Math.round(wm.f)} g`;
    $('#menu-week').innerHTML = menuHtml(wm, null);

    // Lộ trình
    renderRoadmap(c, week);

    // Gót chân
    const heelDone = dayLog(key).heel;
    $('#heel-list').innerHTML = D.HEEL_ROUTINE.map((h, i) => `
      <li class="${heelDone.includes(i) ? 'done' : ''}" data-heel="${i}">
        <span class="check"></span>
        <div class="ex-body">
          <div class="ex-top"><strong>${h.name}</strong><span class="dose">${h.dose}</span></div>
          <small class="muted">${h.cue}</small>
        </div>
      </li>`).join('');

    // Thiết lập
    const f = $('#plan-form');
    if (!f.contains(document.activeElement)) {
      f.start.value = p.start; f.sex.value = p.sex; f.age.value = p.age;
      f.height.value = p.height; f.weight.value = p.weight; f.goal.value = p.goal;
    }
    $('#plan-calc').innerHTML = `
      <li><span>BMR (Mifflin-St Jeor)</span><strong>${Math.round(c.bmr)} kcal</strong></li>
      <li><span>Tiêu hao/ngày (gồm tập)</span><strong>${Math.round(c.tdee)} kcal</strong></li>
      <li><span>Giai đoạn 1 (tuần 1–4)</span><strong>${c.kcal[1]} kcal</strong></li>
      <li><span>Giai đoạn 2 (tuần 5–8)</span><strong>${c.kcal[2]} kcal</strong></li>
      <li><span>Giai đoạn 3 (tuần 9–13)</span><strong>${c.kcal[3]} kcal</strong></li>
      <li><span>Đạm mỗi ngày</span><strong>${c.protein} g</strong></li>
      <li><span>Tốc độ giảm trung bình</span><strong>${fmtKg(c.avgPerWeek)} kg/tuần (${fmtKg(c.pctPerWeek)}%)</strong></li>`;
    $('#plan-pace-warn').hidden = c.pctPerWeek <= 1.2;

    // Thẻ trên trang Tổng quan
    $('#home-plan-title').textContent = header;
    $('#home-plan-detail').textContent = `${w.title} · ${kcal} kcal · mục tiêu tuần ${fmtKg(c.weekTargets[week])} kg`;

    if (subTab === 'road' && view.classList.contains('active')) drawChart(c);
  }

  function statusHtml(c) {
    const p = plan().profile;
    const keys = Object.keys(H.state.days)
      .filter((k) => H.state.days[k].weight && k >= p.start && k <= H.currentDate())
      .sort();
    if (!keys.length) return '⚖️ Cân mỗi sáng và lưu ở tab BMI để app so sánh với lộ trình.';
    const k = keys[keys.length - 1];
    const actual = H.state.days[k].weight;
    const diff = actual - targetForDay(c, dayNumber(k));
    const lost = p.weight - actual;
    const head = `Đã giảm <strong>${fmtKg(lost)} kg</strong> (hiện ${fmtKg(actual)} kg). `;
    if (diff <= -1.5) return head + `Nhanh hơn lộ trình ${fmtKg(-diff)} kg 🚀 — giữ nguyên calo, đừng cắt thêm, ưu tiên đủ đạm để giữ cơ.`;
    if (diff <= 0.5) return head + 'Đúng lộ trình 👍 Tiếp tục duy trì.';
    if (diff <= 1.5) return head + `Chậm hơn ${fmtKg(diff)} kg — thêm 1.000–1.500 bước/ngày và kiểm tra lại cân đong thức ăn.`;
    return head + `Chậm hơn ${fmtKg(diff)} kg — nếu kéo dài 2 tuần: giảm 100 kcal (không dưới ${c.floor}) + thêm bước chân. Cân có thể dao động 1–2 kg do muối/nước.`;
  }

  function renderRoadmap(c, curWeek) {
    const start = H.parseKey(plan().profile.start);
    $('#road-table').innerHTML = D.WEEKS.map((wk, i) => {
      const w = i + 1;
      const from = new Date(start); from.setDate(from.getDate() + i * 7);
      const to = new Date(start); to.setDate(to.getDate() + Math.min(i * 7 + 6, PLAN_DAYS - 1));
      const ph = phaseOf(w);
      return `<li class="${w === curWeek ? 'current' : ''}">
        <div class="wk-head">
          <strong>Tuần ${w}</strong>
          <span class="muted small">${fmtDate(from)}–${fmtDate(to)}</span>
          <span class="wk-target">${fmtKg(c.weekTargets[w])} kg</span>
        </div>
        <div class="wk-meta muted small">GĐ${ph} · ${c.kcal[ph]} kcal · ${wk.steps.toLocaleString('vi-VN')} bước</div>
        <div class="small">${wk.focus}</div>
      </li>`;
    }).join('');
  }

  function drawChart(c) {
    const canvas = $('#plan-chart');
    if (!canvas.offsetWidth) return;
    const p = plan().profile;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth, Hh = 200;
    canvas.width = W * dpr; canvas.height = Hh * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const css = getComputedStyle(document.documentElement);
    const color = (n) => css.getPropertyValue(n).trim();

    const actual = Object.keys(H.state.days)
      .filter((k) => H.state.days[k].weight)
      .map((k) => ({ d: dayNumber(k), w: H.state.days[k].weight }))
      .filter((x) => x.d >= 1 && x.d <= PLAN_DAYS);

    const all = [p.weight, p.goal, ...actual.map((a) => a.w)];
    const min = Math.floor(Math.min(...all) - 1), max = Math.ceil(Math.max(...all) + 1);
    const pad = { l: 34, r: 10, t: 10, b: 22 };
    const x = (d) => pad.l + (d / PLAN_DAYS) * (W - pad.l - pad.r);
    const y = (w) => pad.t + (1 - (w - min) / (max - min)) * (Hh - pad.t - pad.b);

    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = color('--muted');
    ctx.strokeStyle = color('--line');
    ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const v = min + (max - min) * g / 4;
      ctx.beginPath(); ctx.moveTo(pad.l, y(v)); ctx.lineTo(W - pad.r, y(v)); ctx.stroke();
      ctx.fillText(v.toFixed(0), 4, y(v) + 4);
    }
    [0, 30, 60, 90].forEach((d) => ctx.fillText(d ? `N${d}` : 'Bắt đầu', Math.min(x(d), W - pad.r - 30), Hh - 6));

    // Đường lộ trình
    ctx.setLineDash([6, 5]);
    ctx.strokeStyle = color('--muted');
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let d = 0; d <= PLAN_DAYS; d++) (d ? ctx.lineTo : ctx.moveTo).call(ctx, x(d), y(targetForDay(c, d)));
    ctx.stroke();
    ctx.setLineDash([]);

    // Cân nặng thực tế
    if (actual.length) {
      ctx.strokeStyle = color('--primary');
      ctx.fillStyle = color('--primary');
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      actual.forEach((a, i) => (i ? ctx.lineTo(x(a.d), y(a.w)) : ctx.moveTo(x(a.d), y(a.w))));
      ctx.stroke();
      actual.forEach((a) => { ctx.beginPath(); ctx.arc(x(a.d), y(a.w), 3.5, 0, Math.PI * 2); ctx.fill(); });
    }
  }

  // ---------- Sự kiện ----------
  document.addEventListener('click', (e) => {
    const t = e.target;
    const seg = t.closest('.seg button');
    if (seg) { subTab = seg.dataset.sub; render(); return; }

    const md = t.closest('[data-menuday]');
    if (md) { menuDay = Number(md.dataset.menuday); render(); return; }

    const key = H.currentDate();
    const toggle = (arr, v) => { const i = arr.indexOf(v); i >= 0 ? arr.splice(i, 1) : arr.push(v); };

    const ex = t.closest('[data-ex]');
    if (ex) { toggle(dayLog(key).ex, Number(ex.dataset.ex)); H.save(); render(); return; }

    const heel = t.closest('[data-heel]');
    if (heel) { toggle(dayLog(key).heel, Number(heel.dataset.heel)); H.save(); render(); return; }

    const meal = t.closest('[data-meal]');
    if (meal) { toggle(dayLog(key).meals, meal.dataset.meal); H.save(); render(); return; }

    if (t.closest('#plan-finish')) {
      const log = dayLog(key);
      if (log.logged) return;
      const week = weekOf(Math.min(PLAN_DAYS, Math.max(1, dayNumber(key))));
      const w = workoutFor(H.parseKey(key).getDay(), phaseOf(week));
      const met = w.kind === 'strength' ? 5 : w.kind === 'interval' ? 5.5 : 4;
      const kcal = Math.round(met * (H.latestWeight() || plan().profile.weight) * w.minutes / 60);
      H.day(key).activity.push({ t: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }), type: 'home', minutes: w.minutes, kcal });
      log.logged = true;
      H.save(); H.render();
      H.toast(`💪 Tuyệt vời! +${kcal} kcal`);
    }
  });

  $('#plan-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    plan().profile = {
      start: f.start.value || H.todayKey(),
      sex: f.sex.value,
      age: Number(f.age.value),
      height: Number(f.height.value),
      weight: Number(f.weight.value),
      goal: Number(f.goal.value)
    };
    H.save(); render();
    H.toast('Đã cập nhật kế hoạch');
  });

  window.addEventListener('resize', () => { if (subTab === 'road') render(); });

  // Tóm tắt dữ liệu kế hoạch của một ngày (dùng cho đồng bộ Google Sheets)
  function summary(key) {
    const dayNum = dayNumber(key);
    const inPlan = dayNum >= 1 && dayNum <= PLAN_DAYS;
    const log = plan().log[key] || { ex: [], meals: [], heel: [], logged: false };
    const week = weekOf(Math.min(PLAN_DAYS, Math.max(1, dayNum)));
    const phase = phaseOf(week);
    const weekday = H.parseKey(key).getDay();
    const w = workoutFor(weekday, phase);
    const exTotal = w.blocks.reduce((a, b) => a + b.items.length, 0);
    const menu = buildMenu(weekday, calc().kcal[phase]);
    const eaten = menu.meals.filter((m) => log.meals.includes(m.name));
    return {
      day: inPlan ? dayNum : '',
      target: inPlan ? +targetForDay(calc(), dayNum).toFixed(1) : '',
      workout: inPlan ? w.title : '',
      exercises: inPlan && exTotal ? `${log.ex.length}/${exTotal}` : '',
      logged: log.logged,
      mealsKcal: Math.round(eaten.reduce((a, m) => a + m.kcal, 0)),
      meals: eaten.map((m) => m.name).join(', '),
      heel: `${log.heel.length}/${D.HEEL_ROUTINE.length}`
    };
  }

  window.HealthyPlan = { summary, profile: () => plan().profile };

  H.onRender(render);
  H.onView((v) => { if (v === 'plan') render(); });
  render();
})();
