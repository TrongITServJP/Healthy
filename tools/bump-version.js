// Tăng phiên bản cache sau mỗi lần sửa CSS/JS: node tools/bump-version.js
// Cập nhật đồng thời ?v=N trong index.html, sw.js và tên CACHE trong sw.js.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const write = (f, s) => fs.writeFileSync(path.join(root, f), s);

const index = read('index.html');
const current = Math.max(...[...index.matchAll(/\?v=(\d+)/g)].map((m) => Number(m[1])));
const next = current + 1;

write('index.html', index.replace(/\?v=\d+/g, `?v=${next}`));
write('sw.js', read('sw.js').replace(/\?v=\d+/g, `?v=${next}`).replace(/'healthy-v\d+'/, `'healthy-v${next}'`));
console.log(`v${current} → v${next}`);
