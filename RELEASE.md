# Releasing htmlbrowser.dev

The release pipeline builds a universal-binary `.dmg` + `.app.tar.gz`, signs them
with the Developer ID Application certificate, notarizes via Apple, signs the
updater archive with the Tauri ed25519 keypair, and publishes everything to a
GitHub release alongside a `latest.json` manifest. Existing installs auto-detect
the new version on next launch.

## One-time setup

### 1. Tauri updater keypair

Already generated at:

```
~/.config/htmlbrowser-dev/updater.key       # private — KEEP SAFE
~/.config/htmlbrowser-dev/updater.key.pub   # public  — committed to tauri.conf.json
```

The current key has **no password**. Before going to production, regenerate
with a real password:

```bash
pnpm tauri signer generate -w ~/.config/htmlbrowser-dev/updater.key -f
# Enter a password when prompted, save it offline.
```

Then update `src-tauri/tauri.conf.json` with the new contents of
`~/.config/htmlbrowser-dev/updater.key.pub`.

**Critical:** if the private key + password are lost, you cannot ship updates
to existing installs ever again. Back up both to a password manager.

### 2. Apple Developer signing assets

Generate a Developer ID Application certificate in
[developer.apple.com → Certificates](https://developer.apple.com/account/resources/certificates/list).
Install it into Keychain Access, then export it as a `.p12` (right-click →
Export → save with a strong password).

Look up your signing identity:

```bash
security find-identity -v -p codesigning
# Output: "Developer ID Application: Your Name (ABC1234DEF)"
```

Generate an app-specific password at [appleid.apple.com](https://appleid.apple.com)
→ Sign-In and Security → App-Specific Passwords. Notarization uses this.

### 3. Add GitHub secrets

In `Settings → Secrets and variables → Actions` on the repo, add:

| Secret | Value |
| --- | --- |
| `APPLE_CERTIFICATE` | `base64 -i your-cert.p12 \| pbcopy` and paste |
| `APPLE_CERTIFICATE_PASSWORD` | The password used when exporting the .p12 |
| `APPLE_SIGNING_IDENTITY` | The full identity string from `security find-identity` |
| `APPLE_ID` | Your Apple ID email |
| `APPLE_PASSWORD` | The app-specific password from appleid.apple.com |
| `APPLE_TEAM_ID` | Your 10-character team ID (top-right of developer.apple.com) |
| `TAURI_SIGNING_PRIVATE_KEY` | `cat ~/.config/htmlbrowser-dev/updater.key \| base64 \| pbcopy` and paste |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | The password for the updater key (empty string if none) |

## Cutting a release

```bash
# Bump version
pnpm version patch                    # or minor / major
git push origin main --follow-tags
```

The `release.yml` workflow runs on the tag, builds the universal binary,
signs and notarizes it, and publishes the GitHub release.

Within a few minutes after the workflow finishes, anyone running an older
version will see an "Update available" dialog on next launch.

## Manual local build

For testing the full pipeline locally:

```bash
export APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (ABC1234DEF)"
export APPLE_ID="you@example.com"
export APPLE_PASSWORD="abcd-efgh-ijkl-mnop"
export APPLE_TEAM_ID="ABC1234DEF"
export TAURI_SIGNING_PRIVATE_KEY="$(cat ~/.config/htmlbrowser-dev/updater.key)"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""

pnpm tauri build --target universal-apple-darwin
```

Output lands in `src-tauri/target/universal-apple-darwin/release/bundle/`.

## Verifying the signature

```bash
codesign --verify --deep --strict --verbose=2 \
  src-tauri/target/universal-apple-darwin/release/bundle/macos/htmlbrowser.dev.app

spctl --assess --type execute --verbose \
  src-tauri/target/universal-apple-darwin/release/bundle/macos/htmlbrowser.dev.app
```

Both should report success after notarization is stapled.
