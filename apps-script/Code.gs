/**
 * Healthy → Google Sheets
 * Dán toàn bộ file này vào Google Sheet: Tiện ích mở rộng → Apps Script.
 * Nhận dữ liệu từ ứng dụng Healthy và ghi mỗi ngày một dòng vào sheet "Nhật ký".
 *
 * TOKEN là mã bảo mật: phải giống hệt mã nhập trong app (Cài đặt → Google Sheets).
 */
const TOKEN = 'DOI_THANH_MA_BAO_MAT_CUA_BAN';

const LOG_SHEET = 'Nhật ký';
const PROFILE_SHEET = 'Hồ sơ';

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

    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      const count = upsertRows_(body.rows || []);
      if (body.profile) writeProfile_(body.profile);
      return json_({ ok: true, count: count });
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
