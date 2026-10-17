# 0021: Connect the app with a QR code

Date: 2026-10-18

Status: Accepted.

## Context

The app reads the same server as the browser, behind the same proxy. Behind Cloudflare Access, a browser passes with a login, but an app cannot. It sends a service token on every request, and the owner's server also checks the Access token itself ([decision 0010](0010-verify-access-token.md)). Until now, a person typed the address, the Client ID, and the Client Secret on the phone.

## Decision

1. Settings on the web has a Mobile app section. "Show the code" calls the server action `pairingCode`. It answers with a QR code of `mytesla://connect?url=…&car=…`. When `MOBILE_ACCESS_CLIENT_ID` and `MOBILE_ACCESS_CLIENT_SECRET` are set and demo mode is off, the code also holds `id` and `secret`. The HTML of the page holds no code.
2. The address in the code is `SITE_URL`, or else the host and the scheme of the request.
3. The server encodes the code with `uqr`, which has no dependencies, and sends the path of the dark modules. The page draws it black on white with a quiet zone of 4 modules in both themes, and hides it after 2 minutes.
4. The app scans with `CameraView.launchScanner` from `expo-camera`: the VisionKit scanner on iOS 16 and later, and the Google code scanner on Android. It takes the first code, checks it with `pairingOf()`, fills in the form, connects, and opens the car of the code. It asks for the camera on iOS only. The config plugin leaves out the microphone.
5. The app reads a code only from its own scanner.

## Alternatives

1. A one-time code that the app trades for the token. Cloudflare Access refuses every request without a token, so the trade needs a path that bypasses Access.
2. A code with the address only. The phone still needs the token typed in. The code works this way when the server has no token for the app.
3. An app identity for each person, so that the app uses the Settings of the person who showed the code. It needs a store of device keys and a change of the viewer rule. A later task covers it.

## Consequences

The code with a token is a credential. Anyone who scans or photographs it can open the dashboard until the service token is deleted. The section says so, and the code hides after 2 minutes.

To stop the phones, delete the service token in Cloudflare and set a new one on the server. Each phone then scans again.

A service token has no email, so the app uses the Settings of the shared `owner` user, as before.
