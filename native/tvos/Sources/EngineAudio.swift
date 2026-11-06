import AVFoundation
import Foundation

/// Native output adapter for the engine's RPM/load telemetry. All public calls
/// happen on the main thread. Audio rendering reads immutable PCM buffers;
/// no Swift state or JavaScript is accessed from a realtime audio callback.
final class EngineAudio {
    private let engine = AVAudioEngine()
    private let exhaust = AVAudioPlayerNode()
    private let intake = AVAudioPlayerNode()
    private let wind = AVAudioPlayerNode()
    private let impact = AVAudioPlayerNode()
    private let exhaustSpeed = AVAudioUnitVarispeed()
    private let intakeSpeed = AVAudioUnitVarispeed()
    private let exhaustEQ = AVAudioUnitEQ(numberOfBands: 1)
    private let intakeEQ = AVAudioUnitEQ(numberOfBands: 1)
    private let windEQ = AVAudioUnitEQ(numberOfBands: 1)
    private let format = AVAudioFormat(standardFormatWithSampleRate: 48_000, channels: 1)!
    private var enabled = true
    private var configured = false
    private var unavailable = false
    private var model = ""
    private var lastImpactID = -1
    private var interruptionObserver: NSObjectProtocol?
    private(set) var errorMessage: String?

    init() {
        interruptionObserver = NotificationCenter.default.addObserver(forName: AVAudioSession.interruptionNotification, object: nil, queue: .main) { [weak self] _ in
            self?.pause()
        }
    }

    deinit {
        if let interruptionObserver { NotificationCenter.default.removeObserver(interruptionObserver) }
        engine.stop()
    }

    func setEnabled(_ value: Bool) {
        enabled = value
        if !value { pause() }
        else { unavailable = false }
    }

    func pause() {
        engine.mainMixerNode.outputVolume = 0
        exhaust.pause(); intake.pause(); wind.pause(); impact.stop()
        engine.pause()
    }

    func stop() {
        pause()
        engine.pause()
    }

    func update(state: [String: Any]) {
        let mode = state["mode"] as? String ?? "ready"
        guard enabled, (state["sound"] as? Bool ?? true), mode == "racing" || mode == "countdown" else {
            pause()
            return
        }
        guard !unavailable else { return }
        let profile = state["audioProfile"] as? [String: Any] ?? [:]
        let currentModel = (state["motorcycle"] as? [String: Any])?["model"] as? String ?? "r600"
        do {
            if !configured { try configure() }
            if model != currentModel {
                let firing = (profile["firing"] as? [NSNumber])?.map(\.doubleValue) ?? [0, 270, 450, 540]
                exhaust.stop(); intake.stop()
                exhaust.scheduleBuffer(wave(firing: firing, intake: false), at: nil, options: .loops)
                intake.scheduleBuffer(wave(firing: firing, intake: true), at: nil, options: .loops)
                model = currentModel
            }
            if !engine.isRunning { try engine.start() }
            if !exhaust.isPlaying { exhaust.play() }
            if !intake.isPlaying { intake.play() }
            if !wind.isPlaying { wind.play() }
        } catch {
            errorMessage = error.localizedDescription
            unavailable = true
            pause()
            NSLog("Apex audio unavailable: %@", error.localizedDescription)
            return
        }

        let rpm = number(state, "rpm", 1_300)
        let rev = rpm / max(1, number(profile, "redline", 14_100))
        let speed = min(1, max(0, number(state, "speed", 0) / 250))
        let crashed = state["crash"] as? [String: Any] != nil
        let shift = number(state, "shift", 0)
        let load = crashed ? 0 : number(state, "throttle", 0) * (1 - sin(.pi * shift) * 0.95)
        // One loop is the 720° cycle at 32 Hz, matching engine.js RPM / 120.
        let rate = Float(max(0.25, min(4, rpm / 120 / 32)))
        exhaustSpeed.rate = rate
        intakeSpeed.rate = rate
        exhaustEQ.bands[0].frequency = Float((360 + 980 * rev + load * 1_450) * number(profile, "exhaustTone", 1))
        intakeEQ.bands[0].frequency = Float((540 + 1_610 * rev) * number(profile, "intakeTone", 1))
        exhaust.volume = Float(0.38 * (0.47 + 0.53 * load) * number(profile, "exhaustGain", 1))
        intake.volume = Float(0.22 * (0.28 + 0.72 * load) * number(profile, "intakeGain", 1))
        wind.volume = Float(0.12 * speed * speed)
        windEQ.bands[0].frequency = Float(360 + 1_700 * speed)
        engine.mainMixerNode.outputVolume = 0.49

        if let hit = state["impact"] as? [String: Any], let id = hit["id"] as? NSNumber,
           id.intValue != lastImpactID, number(hit, "age", 1) < 0.18 {
            lastImpactID = id.intValue
            playImpact(severity: number(hit, "severity", 0.3), metal: hit["type"] as? String == "rail")
        }
        if number(state, "time", 0) == 0 { lastImpactID = -1 }
    }

    private func configure() throws {
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.ambient, mode: .default, options: [.mixWithOthers])
        try session.setActive(true)
        for node in [exhaust, intake, wind, impact] { engine.attach(node) }
        for node in [exhaustSpeed, intakeSpeed] { engine.attach(node) }
        for node in [exhaustEQ, intakeEQ, windEQ] { engine.attach(node) }
        engine.connect(exhaust, to: exhaustSpeed, format: format)
        engine.connect(exhaustSpeed, to: exhaustEQ, format: format)
        engine.connect(exhaustEQ, to: engine.mainMixerNode, format: format)
        engine.connect(intake, to: intakeSpeed, format: format)
        engine.connect(intakeSpeed, to: intakeEQ, format: format)
        engine.connect(intakeEQ, to: engine.mainMixerNode, format: format)
        engine.connect(wind, to: windEQ, format: format)
        engine.connect(windEQ, to: engine.mainMixerNode, format: format)
        engine.connect(impact, to: engine.mainMixerNode, format: format)
        for eq in [exhaustEQ, windEQ] {
            eq.bands[0].filterType = .lowPass
            eq.bands[0].frequency = 1_000
            eq.bands[0].bypass = false
        }
        intakeEQ.bands[0].filterType = .bandPass
        intakeEQ.bands[0].frequency = 900
        intakeEQ.bands[0].bandwidth = 2
        intakeEQ.bands[0].bypass = false
        wind.scheduleBuffer(noise(), at: nil, options: .loops)
        engine.mainMixerNode.outputVolume = 0
        engine.prepare()
        configured = true
    }

    private func number(_ dict: [String: Any], _ key: String, _ fallback: Double) -> Double {
        guard let value = dict[key] as? NSNumber, value.doubleValue.isFinite else { return fallback }
        return value.doubleValue
    }

    /// Same 64-harmonic Fourier series, decay and firing weights as firingWave
    /// in src/engine.js, using the shared catalogue's firing angles.
    private func wave(firing: [Double], intake: Bool) -> AVAudioPCMBuffer {
        let count = 1_500
        let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(count))!
        buffer.frameLength = AVAudioFrameCount(count)
        let data = buffer.floatChannelData![0]
        let weights: [Double] = intake ? [0.8, 1, 0.86, 0.93] : [1, 0.91, 0.95, 0.86]
        var real = [Double](repeating: 0, count: 64)
        var imaginary = real
        for harmonic in 1..<64 {
            let n = Double(harmonic)
            let decay = exp(-n / (intake ? 16 : 34)) / pow(n, intake ? 0.82 : 0.58)
            for (index, angle) in firing.enumerated() {
                let phase = angle / 720 * n * .pi * 2
                let weight = weights[index % weights.count]
                real[harmonic] += weight * decay * cos(phase)
                imaginary[harmonic] -= weight * decay * sin(phase)
            }
        }
        var peak = 0.001
        for index in 0..<count {
            let phase = Double(index) / Double(count) * .pi * 2
            var value = 0.0
            for harmonic in 1..<64 {
                value += real[harmonic] * cos(Double(harmonic) * phase) + imaginary[harmonic] * sin(Double(harmonic) * phase)
            }
            data[index] = Float(value)
            peak = max(peak, abs(value))
        }
        for index in 0..<count { data[index] /= Float(peak) }
        return buffer
    }

    private func noise() -> AVAudioPCMBuffer {
        let count = 48_000
        let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(count))!
        buffer.frameLength = AVAudioFrameCount(count)
        let samples = buffer.floatChannelData![0]
        var random: UInt32 = 0xA9E0
        for index in 0..<count {
            random = 1_664_525 &* random &+ 1_013_904_223
            samples[index] = Float(Double(random) / Double(UInt32.max) * 2 - 1)
        }
        return buffer
    }

    private func playImpact(severity: Double, metal: Bool) {
        let count = 12_000
        let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(count))!
        buffer.frameLength = AVAudioFrameCount(count)
        let samples = buffer.floatChannelData![0]
        let strength = min(1, max(0, severity))
        var phase = 0.0
        for index in 0..<count {
            let time = Double(index) / 48_000
            let frequency = (metal ? 210.0 : 112.0) * exp(-time * 9) + 34
            phase += 2 * .pi * frequency / 48_000
            samples[index] = Float(sin(phase) * exp(-time * 18) * min(1, time * 1_000) * (0.18 + strength * 0.48))
        }
        impact.stop()
        impact.scheduleBuffer(buffer)
        impact.play()
    }
}
