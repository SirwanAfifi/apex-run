# TestFlight build 0.1.0

App name: Apex Run

Platform: tvOS

Bundle identifier: `com.sirwanafifi.apexrun`

Developer team: SIRWAN AFIFI (`MD4N52M5TD`)

SKU: `apex-run-tvos`

Primary language: English (U.K.)

## Build 3 update — 0.1.0 (3)

Version **0.1.0 (3)** uploaded successfully on **5 November 2026 at 21:14:03
UTC**. The upload command exited successfully and reported “Uploaded package is
processing.” TestFlight readiness and installation of build 3 have not yet been
verified. The signed archive, IPA, `release.json` and upload log are retained under
`native/tvos/build/releases/0.1.0-3/` (gitignored).
The release executable/dSYM UUID is `D4361083-F648-3EA0-9C63-513F64AF342B`.

Build 2 was confirmed to fail at launch on an Apple TV A2169 running tvOS 27.2.
A Release build of the same source reproduced an app-process `EXC_BREAKPOINT /
SIGTRAP` on tvOS 27.0 in
`___UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`. The app lacked
the scene lifecycle required by tvOS 27. After pairing the physical TV, its build
2 crash report confirmed the same UIKit trap, with a UUID matching the retained
build 2 executable and dSYM. This failure is separate from the local
Device Hub and browser-viewer issues described below. See the
[startup diagnosis](evidence/tvos27-launch-failure.md).

Changes included in this update:

- Declare the app's single-window scene in its scene manifest.
- Create the game window in `SceneDelegate`.
- Suspend the race when the scene deactivates.

All 13 Release unit/UI tests passed on tvOS 27.0, including the new cold-launch
and return-from-background test. A development-signed Release build 3 was then
installed and launched on the actual Apple TV 4K (2nd generation, A2169), named
Bedroom, running tvOS 27.2 (24K122). It displayed the race menu and remained alive
for over a minute, verifying the startup fix on the affected device. See the
[physical-device launch screenshot](evidence/apple-tv-build3-launch.png).

Full physical gameplay and input testing remain pending, as does installation of
build 3 through TestFlight. The tvOS 27.2 simulator download was stopped because
the actual hardware was available; the simulator runtime was not tested.

## Build 2 update — 0.1.0 (2)

Version **0.1.0 (2)** uploaded successfully on **5 November 2026 at 20:32:56
UTC**, after archiving, cloud signing and strict local signature validation. The
upload command exited successfully and reported “Uploaded package is processing.”
The user subsequently confirmed installing build 2 on an Apple TV A2169 running
tvOS 27.2, where it also fails to open.

The archive, IPA, `release.json` and upload log are retained locally under
`native/tvos/build/releases/0.1.0-2/` (gitignored). The executable and dSYM share
UUID `1B516337-9509-3131-B75F-D100B36FF94E`.

Changes included in the app:

- Holding physical Enter/Return or Space accelerates during a race.
- Each keyboard key tracks its own release, and input must return to neutral
  before driving controls rearm after a reset.
- Cancelled key events release the affected input so throttle or steering cannot
  remain held unintentionally.

All 12 Release unit/UI tests passed in the tvOS 26.1 simulator. These input changes
did not resolve the reported physical Apple TV launch failure. The later tvOS 27
diagnosis and scene-lifecycle fix are recorded in the build 3 update above.

The temporary browser-viewer input guard and AXe keyboard adapter are local Mac
simulator tools under `/tmp`. They are not bundled in the app or this update.

## Beta description

Race the Pacific coast in Apex Run. Ride the Apex R600 through Cape Meridian,
compete with three rivals and chase your best time. This Apple TV beta
includes the 4.8 km coastal stage, clear weather, automatic gears and a chase
camera, with Siri Remote and game controller support.

## What to test

- Open the app from the Apple TV Home Screen, then leave and return to it.
- Start a race, pause/resume, and restart using the native menu.
- With a game controller, steer with the left stick, accelerate with the right
  trigger and brake with the left trigger.
- With Siri Remote, steer left/right, hold click to accelerate, press down to
  brake, and use Play/Pause to pause or resume.
- With a physical keyboard, hold Enter/Return or Space to accelerate while
  racing. Check releasing one key while another remains held, and cancelled
  input after a focus change.
- Release all driving controls after starting, resuming or recovering from a
  crash before accelerating again.
- Check frame rate, sound, controller connection/disconnection and crash recovery
  on your Apple TV.

This prototype does not yet include rain, cockpit/mirrors, garage customization,
other courses or full visual parity with the browser game.

No sign-in or special setup is required to play.

## Build 1 local release verification

Verified on 5 November 2026:

- The tvOS Release archive compiled and passed Xcode bundle validation with
  signing disabled. It contains the correct version, bundle ID, layered icon/Top
  Shelf catalog, export-compliance declaration and UserDefaults privacy manifest.
- An App Store Connect export with `destination=export`, automatic signing and
  the configured team succeeded. Xcode used cloud signing to produce a signed
  IPA without a registered Apple TV or a local Apple Distribution identity.
- The unsigned archive is
  `/tmp/apex-run-testflight/ApexRunTV-unsigned.xcarchive`.
- The distribution-signed IPA is
  `/tmp/apex-run-testflight/distribution/ApexRunTV.ipa`.

These temporary artifacts are local build outputs, not durable release storage.
The reproducible archive/export/upload commands are in [README.md](README.md#testflight-release).

## Build 1 upload and physical-device follow-up

Version **0.1.0 (1)** was uploaded successfully on **5 November 2026 at 17:16:45
UTC**. Apple validation passed all checks. The upload command exited successfully
and reported “Uploaded package is processing.”

App Store Connect app ID: `6831247985`.

[Open Apex Run in TestFlight](https://appstoreconnect.apple.com/apps/6831247985/testflight)

On 5 November 2026, the user confirmed installing the build on a physical Apple
TV, where it opened and immediately closed. The cause was unresolved at the time.
Build 2 added keyboard-input changes and also failed to open on the user's Apple
TV; the subsequent tvOS 27 diagnosis is recorded above.

A fresh, normal Release build launched successfully in the tvOS 26.1 Apple TV 4K
(3rd generation, 1080p) simulator, with a screenshot confirming launch. An
optimized Release UI test also passed start, pause, resume, restart and
acceleration; only that test build enabled `ENABLE_TESTABILITY=YES`. These
tvOS 26.1 simulator results did not reproduce or explain the physical-device
failure. The later tvOS 27.0 reproduction exposed the missing scene lifecycle.

Initially, no physical-device crash report was found in Xcode or local logs. The
user later identified the device as Apple TV A2169 running tvOS 27.2. Pairing then
enabled retrieval of its build 2 crash report and successful verification of the
build 3 startup fix, as recorded above. External tester distribution and an App
Store release remain unconfirmed.

## Local simulator follow-up

Two separate simulator-tool failures were identified on 5 November 2026:
Device Hub aborts in its accessibility integration, and the unmodified browser
viewer sends touchscreen HID target 50, which aborts tvOS `backboardd` and causes
the system to terminate the game. A temporary local viewer copy now blocks
unsupported input and forwards only whitelisted keyboard keys through AXe.

The local app also now treats held Return/Space as throttle rather than
pause/resume. All 12 Release unit/UI tests passed. In the corrected browser
viewer, keyboard input started a race, accelerated to 25 km/h, steered, and
braked to a stop; repeated mouse clicks no longer restarted the simulator.
See [verified simulator frame](evidence/simulator-keyboard-verified.jpg).

The native keyboard changes are included in the build 2 update described above.
The viewer guard and AXe adapter remain local simulator tooling and are not
shipped. Those tvOS 26.1 checks did not establish a fix for the reported physical
Apple TV launch failure; the separate tvOS 27 startup diagnosis and fix are
recorded in the build 3 update above.
