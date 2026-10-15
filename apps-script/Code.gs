/**
 * Healthy → Google Sheets
 * Dán toàn bộ file này vào Google Sheet: Tiện ích mở rộng → Apps Script.
 * Nhận dữ liệu từ ứng dụng Healthy và ghi mỗi ngày một dòng vào sheet "Nhật ký",
 * đồng thời giữ một bản sao lưu đầy đủ (sheet ẩn "Sao lưu") để khôi phục về app.
 *
 * Cập nhật code: Triển khai → Quản lý các lần triển khai → ✏️ Sửa → Phiên bản: "Phiên bản mới"
 * → Triển khai (giữ nguyên URL, không cần nhập lại trong app).
 *
 * TOKEN là mã bảo mật: phải giống hệt mã nhập trong app (Cài đặt → Google Sheets).
 */
const TOKEN = 'DOI_THANH_MA_BAO_MAT_CUA_BAN';

const LOG_SHEET = 'Nhật ký';
const PROFILE_SHEET = 'Hồ sơ';
const BACKUP_SHEET = 'Sao lưu';
const CHUNK = 40000; // mỗi ô tối đa 50.000 ký tự

// [khóa dữ liệu từ app, tiêu đề cột]
const COLUMNS = [
  ['date', 'Ngày'],
  ['planDay', 'Ngày KH'],
  ['weight', 'Cân nặng (kg)'],
  ['target', 'Cân mục tiêu (kg)'],
  ['bmi', 'BMI'],
  ['water', 'Nước (ml)'],
  ['activityMin', 'Vận động (phút)'],
  ['activityKcal', 'Calo đốt (kcal)'],
  ['activities', 'Hoạt động'],
  ['sleepHours', 'Ngủ (giờ)'],
  ['sleepQuality', 'Chất lượng ngủ (1-5)'],
  ['workout', 'Buổi tập KH'],
  ['exercises', 'Bài tập đã xong'],
  ['workoutDone', 'Hoàn thành buổi tập'],
  ['mealsKcal', 'Calo ăn theo thực đơn'],
  ['meals', 'Bữa đã ăn'],
  ['heel', 'Bài gót chân'],
  ['score', 'Điểm ngày'],
  ['updatedAt', 'Cập nhật lúc']
];

function doGet() {
  return json_({ ok: true, app: 'Healthy', sheet: SpreadsheetApp.getActive().getName() });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.token !== TOKEN) return json_({ ok: false, error: 'Sai mã bảo mật' });

    if (body.action === 'meta') return json_({ ok: true, version: 2, backup: readBackup_(false) });
    if (body.action === 'pull') return json_({ ok: true, version: 2, backup: readBackup_(true) });

    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      const count = upsertRows_(body.rows || []);
      if (body.profile) writeProfile_(body.profile);
      const res = { ok: true, version: 2, count: count };
      if (body.backup) {
        // Chặn ghi đè: thiết bị khác đã sao lưu sau lần đồng bộ gần nhất của thiết bị này
        const meta = readBackup_(false);
        if (meta && meta.device !== body.device && meta.updatedAt > (body.base || 0)) {
          res.conflict = meta;
        } else {
          res.backupAt = writeBackup_(body.backup, body.device);
        }
      }
      return json_(res);
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// Chạy hàm này một lần trong trình soạn thảo để tạo sheet và cấp quyền
function setup() {
  logSheet_();
  SpreadsheetApp.getActive().toast('Đã sẵn sàng nhận dữ liệu từ Healthy');
}

function upsertRows_(rows) {
  if (!rows.length) return 0;
  const sh = logSheet_();
  const last = sh.getLastRow();
  const dates = last > 1 ? sh.getRange(2, 1, last - 1, 1).getDisplayValues().map(function (r) { return r[0]; }) : [];
  let appendAt = last + 1;

  rows.forEach(function (r) {
    r.updatedAt = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    const values = [COLUMNS.map(function (c) { return r[c[0]] === undefined || r[c[0]] === null ? '' : r[c[0]]; })];
    const idx = dates.indexOf(String(r.date));
    if (idx >= 0) {
      sh.getRange(idx + 2, 1, 1, COLUMNS.length).setValues(values);
    } else {
      sh.getRange(appendAt, 1, 1, COLUMNS.length).setValues(values);
      dates.push(String(r.date));
      appendAt++;
    }
  });

  if (sh.getLastRow() > 2) sh.getRange(2, 1, sh.getLastRow() - 1, COLUMNS.length).sort(1);
  return rows.length;
}

function backupSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(BACKUP_SHEET);
  if (!sh) {
    sh = ss.insertSheet(BACKUP_SHEET);
    sh.hideSheet();
  }
  return sh;
}

function writeBackup_(data, device) {
  const sh = backupSheet_();
  const at = Date.now();
  const rows = [['updatedAt', at], ['device', device || ''], ['chunks', 0]];
  for (let i = 0; i < data.length; i += CHUNK) rows.push([data.slice(i, i + CHUNK), '']);
  rows[2][1] = rows.length - 3;
  sh.clearContents();
  sh.getRange(1, 1, rows.length, 2).setNumberFormat('@').setValues(rows);
  return at;
}

function readBackup_(withData) {
  const sh = SpreadsheetApp.getActive().getSheetByName(BACKUP_SHEET);
  if (!sh || sh.getLastRow() < 3) return null;
  const head = sh.getRange(1, 2, 3, 1).getValues();
  const meta = { updatedAt: Number(head[0][0]), device: String(head[1][0]) };
  const chunks = Number(head[2][0]);
  if (withData && chunks > 0) {
    meta.data = sh.getRange(4, 1, chunks, 1).getValues().map(function (r) { return r[0]; }).join('');
  }
  return meta;
}

function writeProfile_(profile) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(PROFILE_SHEET) || ss.insertSheet(PROFILE_SHEET);
  const rows = [['Thông tin', 'Giá trị']].concat(Object.keys(profile).map(function (k) { return [k, profile[k]]; }));
  sh.clearContents();
  sh.getRange(1, 1, rows.length, 2).setValues(rows);
  sh.getRange(1, 1, 1, 2).setFontWeight('bold');
}

function logSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(LOG_SHEET);
  if (!sh) {
    // Dùng lại sheet trống mặc định nếu có, không thì tạo mới
    const first = ss.getSheets()[0];
    sh = first.getLastRow() === 0 ? first.setName(LOG_SHEET) : ss.insertSheet(LOG_SHEET, 0);
  }
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS.map(function (c) { return c[1]; })])
      .setFontWeight('bold').setBackground('#10b981').setFontColor('#ffffff').setWrap(true);
    sh.setFrozenRows(1);
    sh.setFrozenColumns(1);
    sh.getRange('A:A').setNumberFormat('@'); // giữ ngày dạng yyyy-mm-dd
    sh.setColumnWidths(1, COLUMNS.length, 110);
    sh.setColumnWidth(9, 220);
    sh.setColumnWidth(16, 220);
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
