import GameController
import QuartzCore
import UIKit

/// Maps tvOS controls into the shared game's three normalized input channels.
/// Poll and call all methods on the main thread, alongside the display link.
final class GameInput {
    private(set) var steer = 0.0
    private(set) var throttle = 0.0
    private(set) var brake = 0.0
    var onPause: (() -> Void)?
    var onStart: (() -> Void)?
    var onCamera: (() -> Void)?

    private var racing = false
    private var armed = false
    private var held = Set<String>()
    private var keyboardHeld = Set<UIKeyboardHIDUsage>()
    private var keyboardBlocked = Set<UIKeyboardHIDUsage>()
    private static let keyboardActions: [UIKeyboardHIDUsage: String] = [
        .keyboardLeftArrow: "left", .keyboardA: "left",
        .keyboardRightArrow: "right", .keyboardD: "right",
        .keyboardUpArrow: "gas", .keyboardW: "gas",
        .keyboardDownArrow: "brake", .keyboardS: "brake",
        .keyboardReturnOrEnter: "select", .keyboardReturn: "select",
        .keypadEnter: "select", .keyboardSpacebar: "select"
    ]
    private var observers: [NSObjectProtocol] = []
    private var lastActionTime: CFTimeInterval = -1
    private var lastMenuPauseTime: CFTimeInterval = -1
    private var lastMenuReleaseTime: CFTimeInterval = -1
    private var menuPressInFlight = false

    init() {
        let center = NotificationCenter.default
        observers.append(center.addObserver(forName: .GCControllerDidConnect, object: nil, queue: .main) { [weak self] notification in
            guard let controller = notification.object as? GCController else { return }
            self?.configure(controller)
            self?.reset()
        })
        observers.append(center.addObserver(forName: .GCControllerDidDisconnect, object: nil, queue: .main) { [weak self] _ in
            guard let self else { return }
            self.reset()
            if self.racing { self.onPause?() }
        })
        observers.append(center.addObserver(forName: UIApplication.willResignActiveNotification, object: nil, queue: .main) { [weak self] _ in
            self?.reset()
        })
        GCController.controllers().forEach(configure)
    }

    deinit {
        observers.forEach(NotificationCenter.default.removeObserver)
    }

    private func configure(_ controller: GCController) {
        controller.handlerQueue = .main
        if let pad = controller.extendedGamepad {
            pad.buttonMenu.pressedChangedHandler = { [weak self] _, _, pressed in
                self?.handleMenuPress(began: pressed)
            }
            pad.buttonY.pressedChangedHandler = { [weak self] _, _, pressed in
                guard let self, pressed, self.racing else { return }
                self.onCamera?()
            }
        } else if let pad = controller.microGamepad {
            pad.reportsAbsoluteDpadValues = true
            pad.allowsRotation = false
            pad.buttonMenu.pressedChangedHandler = { [weak self] _, _, pressed in
                self?.handleMenuPress(began: pressed)
            }
            pad.buttonX.pressedChangedHandler = { [weak self] _, _, pressed in
                if pressed { self?.playPauseAction() }
            }
        }
    }

    func setRacing(_ value: Bool) {
        guard value != racing else { return }
        racing = value
        reset()
    }

    /// A held trigger never carries across pause, disconnect, or a restarted run.
    /// The next neutral sample rearms input before another press is accepted.
    func reset() {
        steer = 0
        throttle = 0
        brake = 0
        armed = false
        keyboardBlocked.formUnion(keyboardHeld)
        held.removeAll()
    }

    func poll(controllers: [GCController] = GCController.controllers()) {
        guard racing else { steer = 0; throttle = 0; brake = 0; return }
        let keys = keyboardHeld.subtracting(keyboardBlocked).compactMap { Self.keyboardActions[$0] }
        let actions = held.union(keys)
        var steering = (actions.contains("right") ? 1.0 : 0) - (actions.contains("left") ? 1.0 : 0)
        var gas = actions.contains("gas") || actions.contains("select") ? 1.0 : 0
        var braking = actions.contains("brake") ? 1.0 : 0

        // Prefer a paired extended controller; the remote remains usable for menus.
        if let pad = controllers.compactMap({ $0.extendedGamepad }).first {
            let axis = Double(pad.leftThumbstick.xAxis.value)
            let dead = 0.12
            let analog = abs(axis) <= dead ? 0 : (axis < 0 ? -1.0 : 1.0) * min(1, (abs(axis) - dead) / (1 - dead))
            if abs(analog) > abs(steering) { steering = analog }
            gas = max(gas, Double(pad.rightTrigger.value))
            braking = max(braking, Double(pad.leftTrigger.value))
        } else if let pad = controllers.compactMap({ $0.microGamepad }).first {
            let axis = Double(pad.dpad.xAxis.value)
            if abs(axis) > abs(steering) { steering = axis }
            gas = max(gas, Double(pad.buttonA.value))
            braking = max(braking, max(0, -Double(pad.dpad.yAxis.value)))
        }

        if !armed {
            armed = keyboardBlocked.isEmpty && abs(steering) < 0.12 && gas < 0.04 && braking < 0.04
            steer = 0; throttle = 0; brake = 0
            return
        }
        steer = max(-1, min(1, steering))
        throttle = max(0, min(1, gas))
        brake = max(0, min(1, braking))
    }

    private func performAction(_ action: (() -> Void)?, at now: CFTimeInterval = CACurrentMediaTime()) {
        // A remote press can arrive through both UIKit and GameController.
        guard now - lastActionTime > 0.22 else { return }
        lastActionTime = now
        action?()
    }

    /// Both GameController and UIKit can report the same Back press. Remember
    /// the consumed press after onPause changes racing, so its duplicate never
    /// reaches UIKit's system Back action and leaves the app unexpectedly.
    @discardableResult
    func handleMenuPress(began: Bool, at now: CFTimeInterval = CACurrentMediaTime()) -> Bool {
        if began {
            guard racing || now - lastMenuPauseTime < 0.22 else { return false }
            menuPressInFlight = true
            if racing {
                lastMenuPauseTime = now
                performAction(onPause, at: now)
            }
            return true
        }
        let consumed = menuPressInFlight || now - lastMenuPauseTime < 0.22 || now - lastMenuReleaseTime < 0.22
        if consumed {
            menuPressInFlight = false
            lastMenuReleaseTime = now
        }
        return consumed
    }

    private func menuAction() {
        if racing { performAction(onPause) }
    }

    private func playPauseAction() {
        performAction(racing ? onPause : onStart)
    }

    /// Physical keyboard input uses the same held controls as the Siri Remote.
    /// Menu selection stays with UIKit; starting/resuming with Return must not
    /// carry that held key into the race or turn it into a pause command.
    @discardableResult
    func handleKeyboardPress(_ key: UIKeyboardHIDUsage, began: Bool) -> Bool {
        if Self.keyboardActions[key] != nil {
            if began {
                keyboardHeld.insert(key)
                if !racing { keyboardBlocked.insert(key) }
            } else {
                keyboardHeld.remove(key)
                keyboardBlocked.remove(key)
            }
            return racing
        }
        switch key {
        case .keyboardEscape:
            return handleMenuPress(began: began)
        case .keyboardP:
            guard racing else { return false }
            if began { menuAction() }
            return true
        case .keyboardC:
            guard racing else { return false }
            if began { onCamera?() }
            return true
        default:
            return false
        }
    }

    /// Forward pressesBegan / pressesEnded / pressesCancelled from the game VC.
    /// Return false to let the native tvOS focus system handle menu navigation.
    @discardableResult
    func handle(presses: Set<UIPress>, began: Bool) -> Bool {
        var consumed = false
        for press in presses {
            // A hardware key may also carry a remote-style press.type. Prefer
            // its actual key code so Return/Space remain held throttle controls.
            if let key = press.key, Self.keyboardActions[key.keyCode] != nil ||
                [.keyboardEscape, .keyboardP, .keyboardC].contains(key.keyCode) {
                if handleKeyboardPress(key.keyCode, began: began) { consumed = true }
                continue
            }
            if press.type == .playPause {
                if began { playPauseAction() }
                consumed = true
                continue
            }
            if press.type == .menu {
                if handleMenuPress(began: began) { consumed = true }
                continue
            }
            guard racing else { continue }
            let name: String?
            switch press.type {
            case .leftArrow: name = "left"
            case .rightArrow: name = "right"
            case .upArrow: name = "gas"
            case .downArrow: name = "brake"
            case .select: name = "select"
            default: name = nil
            }
            if let name {
                if began { held.insert(name) } else { held.remove(name) }
                consumed = true
            }
        }
        return consumed
    }
}
