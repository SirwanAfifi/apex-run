# tvOS 27 startup regression

On 5 November 2026, TestFlight build 0.1.0 (2) was reported to open and immediately close on Apple TV model A2169 running tvOS 27.2.

A Release simulator build of the same source reproduced an app-process exit on tvOS 27.0 (24J360). Launches at 20:41:20 and 20:41:22 both trapped in `UIKitCore ___UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption_block_invoke`. A separate timed launch of PID 90856 exited within two seconds of polling.

Exception: `EXC_BREAKPOINT / SIGTRAP` on the main thread. This is an app startup failure, separate from the earlier DeviceHub and viewer-input failures. The app used a legacy AppDelegate window and lacked a scene manifest.

Apple documents the scene lifecycle as required for apps built with the latest SDK on tvOS 27: https://developer.apple.com/documentation/uikit/transitioning-to-the-uikit-scene-based-life-cycle

Fix: adopt a single UIWindowScene, create the game window in SceneDelegate, and suspend the race when its scene deactivates.

All 13 Release unit/UI tests passed on tvOS 27.0, including cold launch and Home-screen/background return. Result bundle: `test_sim_2026-11-05T20-44-52-871Z_pid57974_448afbdd.xcresult`.

The paired physical Apple TV 4K (2nd generation), A2169, tvOS 27.2 (24K122), supplied the build 2 report at 20:36:18 UTC. It has the identical UIKit lifecycle trap, proving the simulator reproduction matches the reported hardware failure. The executable UUID matches the retained build 2 archive: `1B516337-9509-3131-B75F-D100B36FF94E`. The full private report is retained in gitignored `native/tvos/build/device-diagnostics/ApexRunTV-build2-hardware.ips`.

The development-signed Release build 0.1.0 (3) was installed on the same physical Apple TV and launched successfully. PID 6986 remained alive after more than one minute; a 3840×2160 device screenshot shows the functional race menu. See [hardware screenshot](apple-tv-build3-launch.png). Full hardware gameplay and installation of the TestFlight-signed build remain unverified.

Build 3 uploaded to TestFlight successfully at 21:14:03 UTC on 5 November 2026. Apple reported the package is processing.
