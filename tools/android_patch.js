// Adjusts the generated Android project (android/, made by `npx cap add android`) for a game:
// - fullscreen with the system bars hidden (they slide back on a swipe) and the screen kept awake while playing;
// - Deepward's launcher icons and splash screens (drawn by tools/make_icons.py into resources/android/res);
// - a dark system splash on Android 12+.
// Safe to run more than once.
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

// Phones buzz on hits and parries: the vibrate permission
const manF = path.join(root, 'android/app/src/main/AndroidManifest.xml');
let man = fs.readFileSync(manF, 'utf8');
if (!man.includes('android.permission.VIBRATE')) { man = man.replace(/(<\/manifest>)/, '    <uses-permission android:name="android.permission.VIBRATE" />\n$1'); fs.writeFileSync(manF, man); }
console.log('vibrate permission set');

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


// Google's ad banner (AdMob): the app id goes in the manifest (Deepward's AdMob app id; ADMOB_APP_ID overrides it in a build).
{
  const appId = process.env.ADMOB_APP_ID || 'ca-app-pub-4400173019354346~7285937881';
  let m = fs.readFileSync(manF, 'utf8');
  m = m.replace(/\s*<meta-data android:name="com\.google\.android\.gms\.ads\.APPLICATION_ID"[^>]*\/>/, '');
  m = m.replace(/(<application[^>]*>)/, `$1\n        <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="${appId}" />`);
  fs.writeFileSync(manF, m);
  console.log('AdMob app id set in the manifest (' + (process.env.ADMOB_APP_ID ? 'from ADMOB_APP_ID' : 'Deepward app id') + ')');
}
