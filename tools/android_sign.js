// Signs the release build: adds a signing config to the generated android/app/build.gradle that reads the keystore from the
// environment (KEYSTORE_PATH, KEYSTORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD), and sets the version (VERSION_CODE, VERSION_NAME).
// Used by .github/workflows/android-release.yml; safe to run more than once.
const fs = require('fs'), path = require('path');
const f = path.resolve(__dirname, '../android/app/build.gradle');
let g = fs.readFileSync(f, 'utf8');
if (!g.includes('deepwardRelease')) {
  g = g.replace(/android\s*\{/, `android {
    signingConfigs {
        deepwardRelease {
            storeFile file(System.getenv("KEYSTORE_PATH") ?: "release.keystore")
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias System.getenv("KEY_ALIAS")
            keyPassword System.getenv("KEY_PASSWORD")
        }
    }`);
  if (!/buildTypes\s*\{\s*release\s*\{/.test(g)) throw new Error('release build type not found in build.gradle');
  g = g.replace(/(buildTypes\s*\{\s*release\s*\{)/, '$1\n            signingConfig signingConfigs.deepwardRelease');
}
if (process.env.VERSION_CODE) g = g.replace(/versionCode\s+\d+/, 'versionCode ' + parseInt(process.env.VERSION_CODE, 10));
if (process.env.VERSION_NAME) g = g.replace(/versionName\s+"[^"]*"/, 'versionName "' + process.env.VERSION_NAME + '"');
fs.writeFileSync(f, g);
console.log('release signing and version set');
