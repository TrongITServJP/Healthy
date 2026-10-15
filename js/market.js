(() => {
  'use strict';

  const H = window.Healthy;
  const HP = window.HealthyPlan;
  const D = window.PLAN_DATA;
  if (!H || !HP || !D) return;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);
  const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const fmtDate = (key) => { const d = H.parseKey(key); return `${WEEKDAYS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`; };
  const vnd = HP.fmtVnd;

  let tripKey = null;
  let groupBy = 'store';
  try { groupBy = localStorage.getItem('healthy-trip-group') || 'store'; } catch { /* bỏ qua */ }

  const storesLabel = (m) => m.stores.map((x) => D.STORES[x].short).join(' · ');

  function trips() {
    const p = HP.data();
    if (!p.trips) p.trips = {};
    return p.trips;
  }

  // ---------- Tính toán ----------
  function computeTrip(start) {
    const n = D.TRIP_DAYS;
    const items = {};
    const days = [];
    for (let i = 0; i < n; i++) {
      const key = H.shiftKey(start, i);
      const { menu } = HP.dayInfo(key);
      days.push({ key, menu });
      menu.meals.forEach((m) => m.rows.forEach((r) => {
        const b = HP.bought(r.id, r.g);
        if (!items[b.id]) items[b.id] = { id: b.id, uses: new Array(n).fill(0) };
        items[b.id].uses[i] += b.g;
      }));
    }
    return { start, days, items: Object.values(items) };
  }

  function quantity(m, g, id) {
    if (m.unit === 'kg') {
      const r = Math.max(50, Math.ceil(g / 50) * 50);
      // Trái cây bán theo kg: kèm số quả ước tính
      const fu = id && D.FOODS[id].unit;
      const approx = fu ? ` (~${Math.max(1, Math.round(r * m.yield / fu.g))} ${fu.n})` : '';
      return { label: (r >= 1000 ? `${(r / 1000).toLocaleString('vi-VN')} kg` : `${r} g`) + approx, g: r };
    }
    if (m.unit === 'L') {
      const r = Math.max(100, Math.ceil(g / 100) * 100);
      return { label: r >= 1000 ? `${(r / 1000).toLocaleString('vi-VN')} L` : `${r} ml`, g: r };
    }
    // Thiếu dưới 1/4 cái thì không mua thêm (ví dụ 1,2 ổ bánh mì → 1 ổ)
    const c = Math.max(1, Math.ceil(g / m.per - 0.25));
    return { label: `${c} ${m.unit}`, g: c * m.per };
  }

  function keepLabel(k) {
    const span = (d) => (d >= 30 ? `${Math.round(d / 30)} tháng` : `${d} ngày`);
    return `${k.mode} ${span(k.days)}${k.freeze ? ` · ngăn đá ${span(k.freeze)}` : ''}`;
  }

  // Tách mỗi mặt hàng thành: mua chính / mua thêm giữa chừng / đồ khô, kèm ghi chú độ tươi
  function planTrip(trip) {
    const main = [], extra = [], pantry = [];
    trip.items.forEach((it) => {
      const m = D.MARKET[it.id];
      const price = HP.priceOf(it.id);
      const usedOn = it.uses.map((g, i) => (g > 0 ? i : -1)).filter((i) => i >= 0);
      const dates = (offs) => offs.map((i) => fmtDate(trip.days[i].key)).join(', ');

      if (m.pantry) {
        const g = it.uses.reduce((a, b) => a + b, 0);
        pantry.push({ id: it.id, name: m.buy, label: `dùng ~${Math.round(g)} ${m.unit === 'L' ? 'ml' : 'g'}`, cost: g * price / m.per, note: keepLabel(m.keep) });
        return;
      }

      const late = usedOn.filter((i) => i >= m.keep.days);
      let note = '';
      let mainOffs = usedOn;
      if (late.length && m.keep.freeze) {
        note = `🧊 Phần ăn ${dates(late)}: ${m.freezeNote || 'cấp đông, rã đông ngăn mát tối hôm trước'}.`;
      } else if (late.length) {
        mainOffs = usedOn.filter((i) => i < m.keep.days);
        const g = late.reduce((a, i) => a + it.uses[i], 0);
        const q = quantity(m, g, it.id);
        extra.push({ id: it.id, name: m.buy, label: q.label, cost: q.g * price / m.per, store: m.stores[0],
          note: `🛒 Mua vào ${fmtDate(trip.days[late[0]].key)} · chỉ để được ${m.keep.days} ngày.` });
      }

      if (mainOffs.length) {
        const g = mainOffs.reduce((a, i) => a + it.uses[i], 0);
        const q = quantity(m, g, it.id);
        if (!note && m.keep.days <= 2) note = `⏱ ${keepLabel(m.keep)} — ăn trước, đừng để lâu.`;
        main.push({ id: it.id, cat: m.cat, store: m.stores[0], name: m.buy, label: q.label, cost: q.g * price / m.per, note, where: `🏪 ${storesLabel(m)}` });
      }
    });
    // Trong mỗi cửa hàng, xếp theo nhóm hàng để đi theo quầy
    main.sort((a, b) => D.MARKET_CATS.indexOf(a.cat) - D.MARKET_CATS.indexOf(b.cat));
    return { main, extra, pantry };
  }

  // ---------- Hiển thị ----------
  function rowHtml(r, key, done) {
    return `<li class="${done.includes(key) ? 'done' : ''}" data-buy="${key}">
      <span class="check"></span>
      <img class="food-img" src="img/food/${r.id}.jpg" alt="" loading="lazy" width="34" height="34">
      <div class="ex-body">
        <div class="ex-top"><strong>${r.name}</strong><span class="dose">${r.label}</span></div>
        <div class="buy-meta"><small class="muted">${[r.note, r.where].filter(Boolean).join('<br>')}</small><small class="price">${vnd(r.cost)}</small></div>
      </div>
    </li>`;
  }

  const isVisible = () => {
    const sub = $('#sub-market');
    return sub && !sub.hidden && $('#view-plan').classList.contains('active');
  };

  function render() {
    if (!isVisible()) return;
    if (!tripKey) tripKey = HP.tripStart(H.todayKey());
    const trip = computeTrip(tripKey);
    const { main, extra, pantry } = planTrip(trip);
    const done = trips()[tripKey] || [];

    const total = [...main, ...extra, ...pantry].reduce((a, r) => a + r.cost, 0);
    const eatCost = trip.days.reduce((a, d) => a + d.menu.cost, 0);
    const mealCount = trip.days.reduce((a, d) => a + d.menu.meals.length, 0);

    $('#trip-title').textContent = tripKey === HP.tripStart(H.todayKey()) ? 'Chuyến đi chợ này' : 'Chuyến đi chợ';
    $('#trip-range').textContent = `${fmtDate(trip.days[0].key)} → ${fmtDate(trip.days[trip.days.length - 1].key)} · đi chợ ngày ${fmtDate(tripKey)}`;
    $('#trip-total').textContent = vnd(total);
    $('#trip-perday').textContent = vnd(eatCost / trip.days.length);
    $('#trip-permeal').textContent = vnd(eatCost / mealCount);

    $('#trip-days').innerHTML = trip.days.map((d) => `
      <div class="trip-day">
        <div class="trip-day-head"><strong>${fmtDate(d.key)}</strong><span class="price">${vnd(d.menu.cost)}</span></div>
        <div class="muted small">${d.menu.meals.map((m) => `${m.name.replace('Bữa ', '')} ${vnd(m.cost)}`).join(' · ')}</div>
      </div>`).join('');

    const boughtCount = main.filter((r) => done.includes(r.id)).length;
    $('#trip-count').textContent = `${boughtCount}/${main.length}`;
    $$('#trip-group button').forEach((b) => b.classList.toggle('active', b.dataset.group === groupBy));
    const groups = groupBy === 'store'
      ? Object.keys(D.STORES).map((k) => ({ title: D.STORES[k].name, note: D.STORES[k].note, rows: main.filter((r) => r.store === k) }))
      : D.MARKET_CATS.map((cat) => ({ title: cat, rows: main.filter((r) => r.cat === cat) }));
    $('#trip-list').innerHTML = groups.map((g) => {
      if (!g.rows.length) return '';
      const sub = g.rows.reduce((a, r) => a + r.cost, 0);
      return `<h3 class="block-title">${g.title} <span class="muted">· ${g.rows.length} món · ${vnd(sub)}</span></h3>
        ${g.note ? `<p class="muted small group-note">${g.note}</p>` : ''}
        <ul class="ex-list">${g.rows.map((r) => rowHtml(r, r.id, done)).join('')}</ul>`;
    }).join('');

    $('#trip-extra-card').hidden = !extra.length;
    $('#trip-extra').innerHTML = `<ul class="ex-list">${extra.map((r) => rowHtml(r, `extra:${r.id}`, done)).join('')}</ul>`;
    $('#trip-pantry').innerHTML = `<ul class="ex-list">${pantry.map((r) => rowHtml(r, `pantry:${r.id}`, done)).join('')}</ul>`;

    renderCatalog();
  }

  function renderCatalog() {
    const list = $('#catalog-list');
    if (!$('.catalog').open || list.contains(document.activeElement)) return;
    const inMenu = new Set(D.MENUS.flatMap((m) => Object.values(m).flat().map(([id]) => HP.bought(id, 1).id)));
    const ids = Object.keys(D.MARKET).filter((id) => !D.MARKET[id].buyAs);

    list.innerHTML = D.MARKET_CATS.map((cat) => {
      const rows = ids.filter((id) => D.MARKET[id].cat === cat)
        .sort((a, b) => D.MARKET[b].pop - D.MARKET[a].pop || HP.costOf(a, 100) - HP.costOf(b, 100));
      if (!rows.length) return '';
      return `<h3 class="block-title">${cat}</h3><ul class="cat-list">${rows.map((id) => {
        const m = D.MARKET[id], f = D.FOODS[id];
        const cost100 = HP.costOf(id, 100);
        const value = f.p >= 8 ? ` · <b>${Math.round(f.p / cost100 * 10000)} g đạm/10k</b>` : '';
        const unitLabel = m.unit === 'kg' || m.unit === 'L' ? m.unit : m.unit;
        return `<li>
          <div class="cat-top">
            <img class="food-img lg" src="img/food/${id}.jpg" alt="" loading="lazy" width="48" height="48">
            <strong>${m.buy}</strong>
            <span class="stars" title="Mức độ phổ biến">${'★'.repeat(m.pop)}${'☆'.repeat(3 - m.pop)}</span>
            <span class="tag ${inMenu.has(id) ? 'on' : ''}">${inMenu.has(id) ? 'Trong thực đơn' : 'Đổi món'}</span>
          </div>
          <div class="cat-price">
            <input type="number" min="0" step="500" inputmode="numeric" value="${HP.priceOf(id)}" data-price="${id}" aria-label="Giá ${m.buy}">
            <span class="muted small">đ/${unitLabel}</span>
          </div>
          <small class="muted">${f.kcal} kcal · ${f.p} g đạm /100 g ăn được${value}</small>
          <small class="muted">🏪 ${storesLabel(m)} · 🧊 ${keepLabel(m.keep)}</small>
          <small>${m.tip}</small>
        </li>`;
      }).join('')}</ul>`;
    }).join('');
  }

  // ---------- Sự kiện ----------
  document.addEventListener('click', (e) => {
    const t = e.target;
    // Vừa chuyển sang tab Đi chợ (plan.js đã bỏ ẩn ở handler trước)
    if (t.closest('.seg [data-sub="market"]')) { render(); return; }
    const row = t.closest('[data-buy]');
    if (row) {
      const list = trips()[tripKey] || (trips()[tripKey] = []);
      const k = row.dataset.buy;
      const i = list.indexOf(k);
      i >= 0 ? list.splice(i, 1) : list.push(k);
      H.save(); render();
      return;
    }
    const grp = t.closest('[data-group]');
    if (grp) {
      groupBy = grp.dataset.group;
      try { localStorage.setItem('healthy-trip-group', groupBy); } catch { /* bỏ qua */ }
      render();
      return;
    }
    if (t.closest('#trip-prev')) { tripKey = H.shiftKey(tripKey, -D.TRIP_DAYS); render(); return; }
    if (t.closest('#trip-next')) { tripKey = H.shiftKey(tripKey, D.TRIP_DAYS); render(); return; }
    if (t.closest('#price-reset')) {
      if (!confirm('Khôi phục toàn bộ giá về mặc định?')) return;
      HP.data().prices = {};
      H.save(); H.render(); render();
      H.toast('Đã khôi phục giá mặc định');
    }
  });

  document.addEventListener('change', (e) => {
    const input = e.target.closest('[data-price]');
    if (!input) return;
    const v = Math.round(Number(input.value));
    const p = HP.data();
    if (!p.prices) p.prices = {};
    if (v > 0) p.prices[input.dataset.price] = v;
    else delete p.prices[input.dataset.price];
    input.blur();
    H.save(); H.render(); render();
    H.toast('Đã cập nhật giá');
  });

  $('.catalog').addEventListener('toggle', renderCatalog);
  H.onRender(render);
  H.onView((v) => { if (v === 'plan') render(); });
  render();
})();
