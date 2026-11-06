import XCTest
import UIKit
@testable import ApexRunTV

final class GameInputTests: XCTestCase {
    func testDuplicateBackAfterPauseIsConsumedWithoutExitingOrPausingAgain() {
        let input = GameInput()
        var pauses = 0
        input.onPause = { [weak input] in
            pauses += 1
            input?.setRacing(false)
        }
        input.setRacing(true)
        // GameController delivery pauses synchronously; UIKit follows it.
        XCTAssertTrue(input.handleMenuPress(began: true, at: 10))
        XCTAssertTrue(input.handleMenuPress(began: true, at: 10.02))
        XCTAssertTrue(input.handleMenuPress(began: false, at: 10.03))
        XCTAssertTrue(input.handleMenuPress(began: false, at: 10.04))
        XCTAssertEqual(pauses, 1)
        // A later deliberate Back in the menu keeps normal tvOS behaviour.
        XCTAssertFalse(input.handleMenuPress(began: true, at: 11))
        XCTAssertFalse(input.handleMenuPress(began: false, at: 11.1))
    }

    func testHeldBackReleaseAndItsDuplicateStayConsumed() {
        let input = GameInput()
        input.onPause = { [weak input] in input?.setRacing(false) }
        input.setRacing(true)
        XCTAssertTrue(input.handleMenuPress(began: true, at: 10))
        XCTAssertTrue(input.handleMenuPress(began: false, at: 11))
        XCTAssertTrue(input.handleMenuPress(began: false, at: 11.02))
        XCTAssertFalse(input.handleMenuPress(began: true, at: 12))
    }

    func testBackOnInitialMenuIsNotIntercepted() {
        let input = GameInput()
        XCTAssertFalse(input.handleMenuPress(began: true, at: 10))
        XCTAssertFalse(input.handleMenuPress(began: false, at: 10.1))
    }

    func testHoldingKeyboardSelectAcceleratesUntilReleaseWithoutPausing() {
        let input = GameInput()
        var pauses = 0
        var starts = 0
        input.onPause = { pauses += 1 }
        input.onStart = { starts += 1 }
        input.setRacing(true)
        input.poll(controllers: [])
        for key: UIKeyboardHIDUsage in [.keyboardReturnOrEnter, .keyboardSpacebar] {
            XCTAssertTrue(input.handleKeyboardPress(key, began: true))
            input.poll(controllers: [])
            XCTAssertEqual(input.throttle, 1)
            // Repeated key-downs maintain a hold rather than firing an action.
            XCTAssertTrue(input.handleKeyboardPress(key, began: true))
            input.poll(controllers: [])
            XCTAssertEqual(input.throttle, 1)
            XCTAssertTrue(input.handleKeyboardPress(key, began: false))
            input.poll(controllers: [])
            XCTAssertEqual(input.throttle, 0)
        }
        XCTAssertEqual(pauses, 0)
        XCTAssertEqual(starts, 0)
    }

    func testMenuSelectionAndResetRequireKeyboardReleaseBeforeRearming() {
        let input = GameInput()
        XCTAssertFalse(input.handleKeyboardPress(.keyboardReturnOrEnter, began: true))
        input.setRacing(true)
        input.poll(controllers: [])
        XCTAssertEqual(input.throttle, 0)
        input.handleKeyboardPress(.keyboardReturnOrEnter, began: true)
        input.poll(controllers: [])
        XCTAssertEqual(input.throttle, 0)
        input.handleKeyboardPress(.keyboardReturnOrEnter, began: false)
        input.poll(controllers: [])
        input.handleKeyboardPress(.keyboardReturnOrEnter, began: true)
        input.poll(controllers: [])
        XCTAssertEqual(input.throttle, 1)
        input.reset()
        input.poll(controllers: [])
        input.handleKeyboardPress(.keyboardReturnOrEnter, began: true)
        input.poll(controllers: [])
        XCTAssertEqual(input.throttle, 0)
        input.handleKeyboardPress(.keyboardReturnOrEnter, began: false)
        input.poll(controllers: [])
        input.handleKeyboardPress(.keyboardReturnOrEnter, began: true)
        input.poll(controllers: [])
        XCTAssertEqual(input.throttle, 1)
    }

    func testKeyboardSteeringAndBrakeReleaseIndependentlyWhileSelectIsHeld() {
        let input = GameInput()
        input.setRacing(true)
        input.poll(controllers: [])
        input.handleKeyboardPress(.keyboardSpacebar, began: true)
        input.handleKeyboardPress(.keyboardRightArrow, began: true)
        input.handleKeyboardPress(.keyboardDownArrow, began: true)
        input.poll(controllers: [])
        XCTAssertEqual(input.throttle, 1)
        XCTAssertEqual(input.steer, 1)
        XCTAssertEqual(input.brake, 1)
        input.handleKeyboardPress(.keyboardRightArrow, began: false)
        input.handleKeyboardPress(.keyboardDownArrow, began: false)
        input.poll(controllers: [])
        XCTAssertEqual(input.throttle, 1)
        XCTAssertEqual(input.steer, 0)
        XCTAssertEqual(input.brake, 0)
    }

}
