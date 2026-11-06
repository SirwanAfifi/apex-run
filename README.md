# Apex Run

Apex Run is a motorcycle racing game. It runs in a web browser. The project also includes an Apple TV app that uses the same race simulation.

## Browser game

- Ride Sierra Pass in a solo time trial.
- Race against three riders on Cape Meridian or A3 London.
- Select clear weather or rain.
- Select automatic or manual gears.
- Switch between cockpit and chase cameras.
- Select one of three motorcycles. Change its paint, livery, and race number in the garage.
- View ride data and save your best times on the device.

## Run the browser game

You need Node.js and a modern web browser. The commands below also use Python 3 to serve the game. The build and JavaScript tests use Node.js built-in modules. You do not need to install npm packages.

Run these commands from the project root:

```sh
node build.mjs
python3 -m http.server 8000 --bind 127.0.0.1 --directory dist
```

Open [the local game](http://127.0.0.1:8000). Select **Ride**, select a motorcycle, then select **Start Ride**. To stop the server, press `Ctrl+C` in the terminal.

Run `node build.mjs` again after you change a file in `src/`. Then refresh the browser.

The build checks JavaScript syntax, combines the source files into `dist/game.js`, and updates file version values in `dist/index.html`. The `dist/` directory also contains the original HTML, CSS, and game assets. Keep this directory in Git. Do not delete it as a build cleanup step.

## Browser controls

| Action | Key |
| --- | --- |
| Accelerate | `W` or Up arrow |
| Brake | `S` or Down arrow |
| Steer | `A` / `D` or Left / Right arrow |
| Shift down / up in manual mode | `Q` / `E` |
| Change camera | `C` |
| Pause or resume | `P` or `Escape` |

With a standard game controller, use the left stick to steer. Use the right trigger to accelerate and the left trigger to brake. Use the left and right shoulder buttons to shift down and up.

On a touch screen, hold one finger on the game to accelerate. Move the finger sideways to steer. Hold a second finger to brake. Lift your fingers to coast. In manual mode, move the first finger quickly up or down to change gear.

Release the driving controls after a pause or crash recovery. Then apply them again.

## Run the JavaScript tests

Run this command from the project root:

```sh
for test_file in tests/*.cjs; do
  node "$test_file" || exit 1
done
```

The eight test files check collisions, courses, menus, mirrors, motorcycles, touch input logic, and the shared native simulation. They use simulated browser and native hosts. They do not test browser layout, physical touch input, or physical game controllers.

## Apple TV app

The Apple TV app requires tvOS 17 or later. To build it, use Xcode on a Mac.

```sh
open native/tvos/ApexRunTV.xcodeproj
```

In Xcode, select the **ApexRunTV** scheme and an Apple TV simulator. Then run the app. For a physical Apple TV, set your development team in **Signing & Capabilities** and pair the device with Xcode.

The app uses JavaScriptCore to run the shared simulation and SceneKit to draw the course. It supports Cape Meridian, the Apex R600, clear weather, automatic gears, and the chase camera. Other browser features are not yet available in the Apple TV app. Browser and Apple TV saves do not sync.

See the [Apple TV README](native/tvos/README.md) for controls, build commands, and known limits. See the [TestFlight notes](native/tvos/TESTFLIGHT.md) for recorded release results.

## Project files

| Path | Contents |
| --- | --- |
| `src/` | Shared simulation and browser code |
| `dist/` | Browser HTML, CSS, built JavaScript, and game assets |
| `tests/` | JavaScript test files |
| `native/tvos/` | Apple TV app, Xcode project, native tests, and release notes |
| `outputs/` | Video recording plans and narration text |
| `build.mjs` | Browser build script |

The Xcode project is included in Git. If you change its file list or build settings, update `native/tvos/project.yml`. Then use XcodeGen to generate the project:

```sh
xcodegen generate --spec native/tvos/project.yml
```

Local Apple build files are stored in `native/tvos/build/`. Git ignores this directory and Xcode user settings.

The Barlow Condensed font license is in [dist/assets/OFL.txt](dist/assets/OFL.txt).
