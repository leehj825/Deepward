# Releasing Deepward on Google Play

The repository builds a signed release bundle in GitHub Actions. Only you can provide two things: the signing key and the Play Console account.

## 1. Create a signing key (once)

Keep the keystore and its passwords somewhere safe. If you lose them, you can't publish updates under the same key.

```bash
keytool -genkeypair -v -keystore release.keystore -alias deepward -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 release.keystore > release.keystore.b64      # on macOS: base64 -i release.keystore -o release.keystore.b64
```

## 2. Add the repository secrets

In GitHub, go to Settings → Secrets and variables → Actions → New repository secret, and add:

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | the contents of `release.keystore.b64` |
| `ANDROID_KEYSTORE_PASSWORD` | the keystore password |
| `ANDROID_KEY_ALIAS` | `deepward` (the alias you used) |
| `ANDROID_KEY_PASSWORD` | the key password |

## 3. Build

1. Go to Actions → **Android release** → Run workflow. The button appears once the workflow is on the default branch.
2. Enter a version name, such as `1.0.1`.
3. Leave the version code blank to use the run number, which rises on its own, or enter a number higher than your last upload.

When the run finishes, download the **deepward-release** artifact:

- `deepward-<version>-<code>.aab`: upload this to Play.
- `deepward-<version>-<code>.apk`: a signed APK for testing on a phone.

Without the secrets, the build still runs, but the output is unsigned (`...-unsigned.apk`) and can be neither installed nor uploaded.

## 4. Play Console checklist

- **Account and app:** a developer account (one-time fee), then create the app and turn on Play App Signing.
- **Store listing:**
  - Short and full description.
  - The 512×512 icon: `icons/icon-512.png`.
  - The 1024×500 feature graphic: `icons/feature-1024x500.png`.
  - At least two phone screenshots.
- **Forms:**
  - Content rating questionnaire (fantasy violence).
  - Target audience.
  - Data safety: the game collects no data, and saves and settings stay on the device.
- **Privacy policy URL:** a page stating that no data is collected (GitHub Pages works).
- **Testing:** new personal developer accounts must run a closed test with testers before production. Check Google's current requirements.

## Icons and splash

`tools/make_icons.py` draws the icon in code (a stone arch over stairs glowing up out of the Deep, with a sword planted before it). It writes:

- `icons/`: the web and store images.
- `resources/android/res/`: launcher icons in every density (legacy, round and adaptive) and the splash screens.

`tools/android_patch.js` copies them into the generated `android/` project. It also gives Android 12+ a dark system splash and sets the version and signing from the environment. To change the art, edit the script, run `python3 tools/make_icons.py` (needs Pillow) and commit the images.

The application id is `com.deepward.game`.
