// Copies the web game into www/ (the folder Capacitor packs into the Android app). Only runtime files are copied.
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), out = path.join(root, 'www');
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
fs.copyFileSync(path.join(root, 'index.html'), path.join(out, 'index.html'));
for (const d of ['css', 'js', 'vendor', 'icons']) fs.cpSync(path.join(root, d), path.join(out, d), { recursive: true });
// The debug APK keeps the class choice; DW_RELEASE=1 (the store build) leaves the warrior-only default in js/config.js
if (process.env.DW_RELEASE !== '1') {
  const f = path.join(out, 'js', 'config.js'), c = fs.readFileSync(f, 'utf8'), k = c.replace(/^  warriorOnly: .*$/m, '  warriorOnly: false,');
  if (k === c) throw new Error('warriorOnly line not found in js/config.js');
  fs.writeFileSync(f, k);
}
console.log('www/ ready:', fs.readdirSync(out).join(', '));
