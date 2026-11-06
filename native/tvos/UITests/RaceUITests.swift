import XCTest

final class RaceUITests: XCTestCase {
    func testColdLaunchAndBackgroundReturnRemainUsable() throws {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launch()
        let ride = app.buttons["ride"]
        XCTAssertTrue(ride.waitForExistence(timeout: 20), "Cold launch must reach the race menu")
        XCTAssertTrue(ride.isEnabled)
        XCUIRemote.shared.press(.select)
        XCTAssertTrue(app.staticTexts["raceTime"].waitForExistence(timeout: 8))

        XCUIRemote.shared.press(.home)
        XCTAssertTrue(app.wait(for: .runningBackground, timeout: 8))
        app.activate()
        XCTAssertTrue(ride.waitForExistence(timeout: 8))
        XCTAssertEqual(ride.label, "RESUME RIDE", "Returning to the scene must leave the race paused")
        XCUIRemote.shared.press(.select)
        XCTAssertTrue(app.staticTexts["raceTime"].waitForExistence(timeout: 5))
    }

    func testRemoteCanStartPauseResumeAndRestart() throws {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launch()
        let ride = app.buttons["ride"]
        XCTAssertTrue(ride.waitForExistence(timeout: 20))
        XCTAssertTrue(ride.isEnabled)
        XCUIRemote.shared.press(.select)
        XCTAssertTrue(app.staticTexts["raceTime"].waitForExistence(timeout: 8))
        XCUIRemote.shared.press(.menu)
        XCTAssertTrue(ride.waitForExistence(timeout: 5))
        XCTAssertEqual(ride.label, "RESUME RIDE")
        XCUIRemote.shared.press(.select)
        XCTAssertTrue(app.staticTexts["raceTime"].waitForExistence(timeout: 5))
        XCUIRemote.shared.press(.menu)
        XCTAssertTrue(ride.waitForExistence(timeout: 5))
        XCUIRemote.shared.press(.down)
        XCUIRemote.shared.press(.select)
        XCTAssertTrue(app.staticTexts["raceTime"].waitForExistence(timeout: 5))
        let racing = expectation(for: NSPredicate(format: "label != %@", "00:00.000"), evaluatedWith: app.staticTexts["raceTime"])
        wait(for: [racing], timeout: 8)
        XCUIRemote.shared.press(.select, forDuration: 2)
        let speedText = app.staticTexts["raceSpeed"].label
        XCTAssertGreaterThan(Double(speedText.prefix(3)) ?? 0, 5, "Holding Select should accelerate the shared engine")
        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.name = "Cape Meridian native tvOS prototype"
        screenshot.lifetime = .keepAlways
        add(screenshot)
    }
}
