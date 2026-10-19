// Adjusts the generated Android project (android/, made by `npx cap add android`) for a game:
// - fullscreen with the system bars hidden (they slide back on a swipe) and the screen kept awake while playing;
// - Deepward's launcher icons and splash screens (drawn by tools/make_icons.py into resources/android/res);
// - a dark system splash on Android 12+;
// - the version (VERSION_CODE / VERSION_NAME) and release signing (KEYSTORE_PATH, KEYSTORE_PASSWORD, KEY_ALIAS,
//   KEY_PASSWORD) taken from the environment, as the release workflow sets them. Safe to run more than once.
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), cfg = JSON.parse(fs.readFileSync(path.join(root, 'capacitor.config.json'), 'utf8'));
const dir = path.join(root, 'android/app/src/main/java', ...cfg.appId.split('.'));
fs.writeFileSync(path.join(dir, 'MainActivity.java'), `package ${cfg.appId};

import android.os.Bundle;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideSystemBars();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    private void hideSystemBars() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        c.hide(WindowInsetsCompat.Type.systemBars());
        c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }
}
`);
console.log('patched MainActivity: fullscreen, screen kept on');

// Icons and splash screens
const res = path.join(root, 'android/app/src/main/res');
fs.cpSync(path.join(root, 'resources/android/res'), res, { recursive: true });
console.log('copied launcher icons and splash screens');

// Android 12+ draws its own splash from the theme: keep it dark, with the emblem
const stylesF = path.join(res, 'values/styles.xml');
let styles = fs.readFileSync(stylesF, 'utf8');
if (!styles.includes('windowSplashScreenBackground')) {
  styles = styles.replace(/(<style name="AppTheme\.NoActionBarLaunch"[^>]*>)/, `$1
        <item name="windowSplashScreenBackground">#100C16</item>
        <item name="windowSplashScreenAnimatedIcon">@mipmap/ic_launcher_foreground</item>
        <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>`);
  fs.writeFileSync(stylesF, styles);
}

// Version and release signing from the environment
const gradleF = path.join(root, 'android/app/build.gradle');
let gradle = fs.readFileSync(gradleF, 'utf8');
if (!gradle.includes('appVersionCode')) {
  gradle = gradle
    .replace("apply plugin: 'com.android.application'\n", `apply plugin: 'com.android.application'

def appVersionCode = (System.getenv("VERSION_CODE") ?: "1").toInteger()
def appVersionName = System.getenv("VERSION_NAME") ?: "1.0"
`)
    .replace(/versionCode \d+/, 'versionCode appVersionCode')
    .replace(/versionName "[^"]*"/, 'versionName appVersionName')
    .replace(/(\n    buildTypes \{\n        release \{\n)/, `
    signingConfigs {
        // Only used when the release keystore is supplied through the environment (see RELEASE.md)
        if (System.getenv("KEYSTORE_PATH")) {
            release {
                storeFile file(System.getenv("KEYSTORE_PATH"))
                storePassword System.getenv("KEYSTORE_PASSWORD")
                keyAlias System.getenv("KEY_ALIAS")
                keyPassword System.getenv("KEY_PASSWORD")
            }
        }
    }$1            if (System.getenv("KEYSTORE_PATH")) signingConfig signingConfigs.release
`);
  if (!gradle.includes('signingConfigs.release') || !gradle.includes('versionCode appVersionCode')) throw new Error('build.gradle did not match the expected template');
  fs.writeFileSync(gradleF, gradle);
}
console.log('patched build.gradle: version and signing from the environment');
