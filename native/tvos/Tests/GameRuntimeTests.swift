import XCTest
import ImageIO
@testable import ApexRunTV

final class GameRuntimeTests: XCTestCase {
    private var preferences: UserDefaults!
    private var suite: String!

    override func setUp() {
        super.setUp()
        suite = "ApexRunTVTests.\(UUID().uuidString)"
        preferences = UserDefaults(suiteName: suite)
    }

    override func tearDown() {
        preferences.removePersistentDomain(forName: suite)
        preferences = nil
        super.tearDown()
    }

    func testSharedSourcesLoadAndPhysicsRunInJavaScriptCore() throws {
        let game = try GameRuntime(storage: preferences)
        let ready = try game.state()
        XCTAssertEqual(ready["mode"] as? String, "ready")
        XCTAssertEqual(ready["course"] as? String, "coast")
        XCTAssertEqual(ready["camera"] as? String, "chase")
        XCTAssertEqual((ready["rivals"] as? [Any])?.count, 3)
        try game.start()
        var state = ready
        for _ in 0..<360 { state = try game.step(dt: 1.0 / 60, steer: 0, throttle: 1, brake: 0) }
        XCTAssertEqual(state["mode"] as? String, "racing")
        XCTAssertGreaterThan(state["speed"] as? Double ?? 0, 10)
        XCTAssertGreaterThan(state["distance"] as? Double ?? 0, 5)
        XCTAssertEqual((state["worldPosition"] as? [Double])?.count, 3)
        XCTAssertNotNil(state["audioProfile"] as? [String: Any])
    }

    func testPauseFreezesRaceAndRestartResetsIt() throws {
        let game = try GameRuntime(storage: preferences)
        try game.start()
        for _ in 0..<240 { _ = try game.step(dt: 1.0 / 60, steer: 0, throttle: 1, brake: 0) }
        try game.pause()
        let paused = try game.state()
        for _ in 0..<60 { _ = try game.step(dt: 1.0 / 60, steer: 1, throttle: 1, brake: 0) }
        let after = try game.state()
        XCTAssertEqual(after["mode"] as? String, "paused")
        XCTAssertEqual(after["time"] as? Double, paused["time"] as? Double)
        XCTAssertEqual(after["distance"] as? Double, paused["distance"] as? Double)
        try game.resume()
        XCTAssertEqual(try game.state()["mode"] as? String, "racing")
        try game.restart()
        let reset = try game.state()
        XCTAssertEqual(reset["mode"] as? String, "countdown")
        XCTAssertEqual(reset["distance"] as? Double, 0)
        XCTAssertEqual(reset["speed"] as? Double, 0)
    }

    func testNativeGeometryComesFromSharedCourse() throws {
        let game = try GameRuntime(storage: preferences)
        let track = try game.track()
        XCTAssertEqual(track["length"] as? Double, 4800)
        let samples = try XCTUnwrap(track["samples"] as? [[String: Any]])
        XCTAssertGreaterThan(samples.count, 600)
        for sample in samples {
            for key in ["center", "left", "right"] {
                let coordinates = try XCTUnwrap(sample[key] as? [Double])
                XCTAssertEqual(coordinates.count, 3)
                XCTAssertTrue(coordinates.allSatisfy(\.isFinite))
            }
        }
        XCTAssertGreaterThan((track["landmarks"] as? [Any])?.count ?? 0, 1000)
    }

    func testExistingArtworkDecodesOnTVOS() throws {
        let assets = try XCTUnwrap(Bundle.main.resourceURL?.appendingPathComponent("assets"))
        for name in ["coast-panorama.webp", "sierra-rider.webp", "coast-rival-amber.webp", "terrain-asphalt.webp", "coast-cypress.webp"] {
            let source = try XCTUnwrap(CGImageSourceCreateWithURL(assets.appendingPathComponent(name) as CFURL, nil), name)
            XCTAssertNotNil(CGImageSourceCreateImageAtIndex(source, 0, nil), name)
        }
    }

    func testCrashAndRecoveryResetNativeControls() throws {
        let game = try GameRuntime(storage: preferences)
        var reasons: [String] = []
        game.onInputReset = { reasons.append($0) }
        try game.start()
        for frame in 0..<2400 {
            _ = try game.step(dt: 1.0 / 60, steer: frame > 360 ? -0.8 : 0, throttle: 1, brake: 0)
            if reasons.contains("recovery") { break }
        }
        XCTAssertEqual(reasons.filter { $0 == "crash" }.count, 1)
        XCTAssertEqual(reasons.filter { $0 == "recovery" }.count, 1)
        XCTAssertEqual(try game.state()["throttle"] as? Double, 0)
    }
}
