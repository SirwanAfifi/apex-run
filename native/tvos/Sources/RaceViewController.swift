import UIKit
import SceneKit

final class RaceViewController: UIViewController {
    private var runtime: GameRuntime?
    private var course: RaceScene?
    private let input = GameInput()
    private let audio = EngineAudio()
    private var displayLink: CADisplayLink?
    private var lastTimestamp: CFTimeInterval?
    private var currentState: [String: Any] = [:]
    private var menuVisible = true
    private var soundEnabled = !UserDefaults.standard.bool(forKey: "tv.soundMuted")
    private let menu = UIView()
    private let hud = UIView()
    private let heading = UILabel()
    private let subtitle = UILabel()
    private let result = UILabel()
    private let timer = UILabel()
    private let position = UILabel()
    private let speed = UILabel()
    private let notice = UILabel()
    private let progress = UIProgressView(progressViewStyle: .default)
    private let ride = UIButton(type: .system)
    private let retry = UIButton(type: .system)
    private let sound = UIButton(type: .system)
    private let shade = CAGradientLayer()
    private var failed = false

    override var preferredFocusEnvironments: [UIFocusEnvironment] { menuVisible ? [ride] : [] }
    override var canBecomeFirstResponder: Bool { true }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.04, green: 0.07, blue: 0.07, alpha: 1)
        do {
            let runtime = try GameRuntime()
            guard let assets = Bundle.main.resourceURL?.appendingPathComponent("assets") else {
                throw GameRuntime.RuntimeError.missingResource("assets")
            }
            let course = RaceScene(track: try runtime.track(), assetsURL: assets)
            self.runtime = runtime
            self.course = course
            runtime.onInputReset = { [weak self] _ in self?.input.reset() }
            course.view.frame = view.bounds
            course.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            course.view.isUserInteractionEnabled = false
            view.addSubview(course.view)
            currentState = try runtime.state()
            course.update(state: currentState)
        } catch {
            failed = true
            NSLog("Apex Run startup failed: %@", error.localizedDescription)
            subtitle.text = error.localizedDescription
        }
        buildHUD()
        buildMenu()
        input.onPause = { [weak self] in self?.togglePause() }
        input.onStart = { [weak self] in self?.beginRide() }
        NotificationCenter.default.addObserver(self, selector: #selector(sceneWillDeactivate(_:)), name: UIScene.willDeactivateNotification, object: nil)
        let displayLink = CADisplayLink(target: self, selector: #selector(frame(_:)))
        displayLink.preferredFrameRateRange = CAFrameRateRange(minimum: 30, maximum: 60, preferred: 60)
        displayLink.add(to: .main, forMode: .common)
        self.displayLink = displayLink
        audio.setEnabled(soundEnabled)
        showMenu(true)
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        becomeFirstResponder()
        setNeedsFocusUpdate()
        updateFocusIfNeeded()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        shade.frame = menu.bounds
    }

    private func label(_ text: String, size: CGFloat, weight: UIFont.Weight = .semibold, brand: Bool = false) -> UILabel {
        let label = UILabel()
        label.text = text
        label.textColor = .white
        label.font = brand ? (UIFont(name: "BarlowCondensed-ExtraBoldItalic", size: size) ?? .systemFont(ofSize: size, weight: .black)) : .systemFont(ofSize: size, weight: weight)
        label.numberOfLines = 0
        return label
    }

    private func buildMenu() {
        menu.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(menu)
        NSLayoutConstraint.activate([menu.leadingAnchor.constraint(equalTo: view.leadingAnchor), menu.trailingAnchor.constraint(equalTo: view.trailingAnchor), menu.topAnchor.constraint(equalTo: view.topAnchor), menu.bottomAnchor.constraint(equalTo: view.bottomAnchor)])
        shade.colors = [UIColor.black.withAlphaComponent(0.90).cgColor, UIColor(red: 0.03, green: 0.07, blue: 0.06, alpha: 0.78).cgColor, UIColor.black.withAlphaComponent(0.12).cgColor]
        shade.locations = [0, 0.5, 1]
        shade.startPoint = CGPoint(x: 0, y: 0.5)
        shade.endPoint = CGPoint(x: 1, y: 0.5)
        menu.layer.insertSublayer(shade, at: 0)

        let brand = label("APEX RUN", size: 45, brand: true)
        let eyebrow = label("STAGE 02  /  PACIFIC COAST, CA", size: 20)
        eyebrow.textColor = UIColor(red: 0.57, green: 0.83, blue: 0.72, alpha: 1)
        heading.text = "CAPE\nMERIDIAN"
        heading.numberOfLines = 2
        heading.font = UIFont(name: "BarlowCondensed-ExtraBoldItalic", size: 110) ?? .systemFont(ofSize: 100, weight: .black)
        heading.textColor = .white
        if !failed { subtitle.text = "Pacific cliffs. An inlet crossing.\nOne final run to the lighthouse." }
        subtitle.font = .systemFont(ofSize: 25)
        subtitle.textColor = UIColor.white.withAlphaComponent(0.72)
        subtitle.numberOfLines = 0
        result.font = .monospacedDigitSystemFont(ofSize: 25, weight: .semibold)
        result.textColor = .white
        result.numberOfLines = 0
        result.isHidden = true

        configure(ride, title: "RIDE CAPE MERIDIAN", action: #selector(beginRide))
        ride.accessibilityIdentifier = "ride"
        ride.isEnabled = !failed
        configure(retry, title: "RESTART RACE", action: #selector(restartRide))
        retry.accessibilityIdentifier = "restart"
        retry.isHidden = true
        configure(sound, title: soundEnabled ? "SOUND ON" : "SOUND OFF", action: #selector(toggleSound))
        sound.accessibilityIdentifier = "sound"
        let buttons = UIStackView(arrangedSubviews: [ride, retry, sound])
        buttons.axis = .vertical
        buttons.spacing = 18
        buttons.alignment = .leading

        let controls = label("CONTROLLER   Left stick · steer   RT · accelerate   LT · brake\nSIRI REMOTE   Left / right · steer   Hold click · accelerate   Down · brake\nPlay/Pause · pause or resume", size: 17, weight: .regular)
        controls.textColor = UIColor.white.withAlphaComponent(0.6)
        controls.accessibilityIdentifier = "controls"
        let stack = UIStackView(arrangedSubviews: [brand, eyebrow, heading, subtitle, result, buttons, controls])
        stack.axis = .vertical
        stack.alignment = .leading
        stack.spacing = 22
        stack.setCustomSpacing(36, after: brand)
        stack.setCustomSpacing(30, after: subtitle)
        stack.setCustomSpacing(32, after: buttons)
        stack.translatesAutoresizingMaskIntoConstraints = false
        menu.addSubview(stack)
        NSLayoutConstraint.activate([stack.leadingAnchor.constraint(equalTo: menu.leadingAnchor, constant: 90), stack.centerYAnchor.constraint(equalTo: menu.centerYAnchor), stack.widthAnchor.constraint(lessThanOrEqualTo: menu.widthAnchor, multiplier: 0.72)])

        let details = label("4.8 KM    /    APEX R600    /    CLEAR SKIES", size: 18)
        details.textColor = UIColor.white.withAlphaComponent(0.7)
        details.translatesAutoresizingMaskIntoConstraints = false
        menu.addSubview(details)
        NSLayoutConstraint.activate([details.trailingAnchor.constraint(equalTo: menu.trailingAnchor, constant: -80), details.bottomAnchor.constraint(equalTo: menu.bottomAnchor, constant: -65)])
    }

    private func configure(_ button: UIButton, title: String, action: Selector) {
        var configuration = UIButton.Configuration.filled()
        configuration.title = title
        configuration.baseBackgroundColor = UIColor.white.withAlphaComponent(0.12)
        configuration.baseForegroundColor = .white
        configuration.cornerStyle = .capsule
        configuration.contentInsets = NSDirectionalEdgeInsets(top: 17, leading: 25, bottom: 17, trailing: 25)
        configuration.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { incoming in
            var attributes = incoming
            attributes.font = UIFont.systemFont(ofSize: 23, weight: .bold)
            return attributes
        }
        button.configuration = configuration
        button.configurationUpdateHandler = { button in
            var current = button.configuration
            current?.baseBackgroundColor = button.isFocused ? .white : UIColor.white.withAlphaComponent(0.12)
            current?.baseForegroundColor = button.isFocused ? .black : .white
            button.configuration = current
        }
        button.addTarget(self, action: action, for: .primaryActionTriggered)
    }

    private func buildHUD() {
        hud.frame = view.bounds
        hud.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        hud.isUserInteractionEnabled = false
        view.addSubview(hud)
        timer.font = .monospacedDigitSystemFont(ofSize: 38, weight: .semibold)
        timer.accessibilityIdentifier = "raceTime"
        position.font = .monospacedDigitSystemFont(ofSize: 38, weight: .bold)
        position.accessibilityIdentifier = "racePosition"
        speed.font = .monospacedDigitSystemFont(ofSize: 52, weight: .bold)
        speed.accessibilityIdentifier = "raceSpeed"
        notice.font = .systemFont(ofSize: 78, weight: .heavy)
        notice.textAlignment = .center
        notice.numberOfLines = 2
        notice.accessibilityIdentifier = "raceNotice"
        for label in [timer, position, speed, notice] {
            label.textColor = .white
            label.layer.shadowColor = UIColor.black.cgColor
            label.layer.shadowOpacity = 0.8
            label.layer.shadowRadius = 8
            label.layer.shadowOffset = CGSize(width: 0, height: 2)
            label.translatesAutoresizingMaskIntoConstraints = false
            hud.addSubview(label)
        }
        progress.progressTintColor = UIColor(red: 0.65, green: 0.9, blue: 0.65, alpha: 1)
        progress.trackTintColor = .white.withAlphaComponent(0.25)
        progress.translatesAutoresizingMaskIntoConstraints = false
        hud.addSubview(progress)
        NSLayoutConstraint.activate([
            timer.topAnchor.constraint(equalTo: hud.topAnchor, constant: 65), timer.leadingAnchor.constraint(equalTo: hud.leadingAnchor, constant: 80),
            position.topAnchor.constraint(equalTo: timer.topAnchor), position.trailingAnchor.constraint(equalTo: hud.trailingAnchor, constant: -80),
            speed.bottomAnchor.constraint(equalTo: hud.bottomAnchor, constant: -80), speed.trailingAnchor.constraint(equalTo: position.trailingAnchor),
            notice.centerXAnchor.constraint(equalTo: hud.centerXAnchor), notice.centerYAnchor.constraint(equalTo: hud.centerYAnchor, constant: -80),
            progress.leadingAnchor.constraint(equalTo: timer.leadingAnchor), progress.trailingAnchor.constraint(equalTo: position.trailingAnchor), progress.bottomAnchor.constraint(equalTo: hud.bottomAnchor, constant: -55)
        ])
    }

    @objc private func beginRide() {
        guard !failed, let runtime else { return }
        do {
            try runtime.start()
            currentState = try runtime.state()
            lastTimestamp = nil
            showMenu(false)
        } catch { fail(error) }
    }

    @objc private func restartRide() {
        guard let runtime else { return }
        do {
            try runtime.restart()
            currentState = try runtime.state()
            lastTimestamp = nil
            showMenu(false)
        } catch { fail(error) }
    }

    private func togglePause() {
        if menuVisible {
            if currentState["mode"] as? String == "paused" { beginRide() }
            return
        }
        suspend()
    }

    @objc private func sceneWillDeactivate(_ notification: Notification) {
        guard let scene = notification.object as? UIScene, scene === view.window?.windowScene else { return }
        suspend()
    }

    @objc private func suspend() {
        guard !failed, let runtime else { return }
        do {
            try runtime.pause()
            currentState = try runtime.state()
            audio.pause()
            lastTimestamp = nil
            showMenu(true)
        } catch { fail(error) }
    }

    @objc private func toggleSound() {
        soundEnabled.toggle()
        UserDefaults.standard.set(!soundEnabled, forKey: "tv.soundMuted")
        audio.setEnabled(soundEnabled)
        sound.configuration?.title = soundEnabled ? "SOUND ON" : "SOUND OFF"
    }

    private func showMenu(_ visible: Bool) {
        menuVisible = visible
        menu.isHidden = !visible
        hud.isHidden = visible
        input.setRacing(!visible)
        if visible {
            audio.pause()
            let mode = currentState["mode"] as? String ?? "ready"
            ride.configuration?.title = mode == "paused" ? "RESUME RIDE" : mode == "finished" ? "RACE AGAIN" : "RIDE CAPE MERIDIAN"
            retry.isHidden = mode != "paused"
            result.isHidden = !["paused", "finished"].contains(mode)
            if !result.isHidden {
                let distance = (currentState["distance"] as? Double ?? 0) / 1000
                result.text = "\(mode == "paused" ? "PAUSED" : "FINISHED")  ·  \(formatTime(currentState["time"] as? Double ?? 0))  ·  \(String(format: "%.2f", distance)) KM"
            }
        }
        setNeedsFocusUpdate()
        updateFocusIfNeeded()
    }

    @objc private func frame(_ link: CADisplayLink) {
        guard !menuVisible, !failed, let runtime else { lastTimestamp = nil; return }
        let dt = lastTimestamp.map { min(0.1, max(0, link.timestamp - $0)) } ?? 0
        lastTimestamp = link.timestamp
        input.poll()
        do {
            currentState = try runtime.step(dt: dt, steer: input.steer, throttle: input.throttle, brake: input.brake)
            course?.update(state: currentState)
            audio.update(state: currentState)
            updateHUD()
            if currentState["mode"] as? String == "finished" { showMenu(true) }
        } catch { fail(error) }
    }

    private func updateHUD() {
        let s = currentState
        timer.text = formatTime(s["time"] as? Double ?? 0)
        position.text = "P\(s["racePosition"] as? Int ?? 4) / 4"
        speed.text = String(format: "%03.0f KM/H  ·  %d", s["speed"] as? Double ?? 0, s["gear"] as? Int ?? 1)
        progress.progress = Float((s["distance"] as? Double ?? 0) / 4800)
        if s["mode"] as? String == "countdown" { notice.text = "\(s["countdown"] as? Int ?? 3)" }
        else if let crash = s["crash"] as? [String: Any] { notice.text = crash["phase"] as? String == "recover" ? "BACK ON TRACK" : "BIKE DOWN" }
        else { notice.text = nil }
    }

    private func formatTime(_ seconds: Double) -> String {
        let milliseconds = max(0, Int(seconds * 1000))
        return String(format: "%02d:%02d.%03d", milliseconds / 60000, milliseconds / 1000 % 60, milliseconds % 1000)
    }

    private func fail(_ error: Error) {
        failed = true
        input.reset()
        audio.stop()
        showMenu(true)
        ride.isEnabled = false
        subtitle.text = error.localizedDescription
        NSLog("Apex Run: %@", error.localizedDescription)
    }

    override func pressesBegan(_ presses: Set<UIPress>, with event: UIPressesEvent?) {
        if input.handle(presses: presses, began: true) { return }
        super.pressesBegan(presses, with: event)
    }

    override func pressesEnded(_ presses: Set<UIPress>, with event: UIPressesEvent?) {
        if input.handle(presses: presses, began: false) { return }
        super.pressesEnded(presses, with: event)
    }

    override func pressesCancelled(_ presses: Set<UIPress>, with event: UIPressesEvent?) {
        input.handle(presses: presses, began: false)
        input.reset()
        super.pressesCancelled(presses, with: event)
    }
}
