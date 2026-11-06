import Foundation
import JavaScriptCore

/// Loads the browser game's real simulation sources. Only storage, the clock and
/// frame delivery are adapted; there is no second implementation of the physics.
final class GameRuntime {
    enum RuntimeError: LocalizedError {
        case missingResource(String)
        case javascript(String)
        case invalidResult(String)

        var errorDescription: String? {
            switch self {
            case .missingResource(let name): return "Missing game resource: \(name)"
            case .javascript(let message): return "Game script failed: \(message)"
            case .invalidResult(let name): return "Invalid game response: \(name)"
            }
        }
    }

    private let context: JSContext
    private var pendingException: String?
    private let storage: UserDefaults
    var onInputReset: ((String) -> Void)?
    static let modules = ["motorcycles", "coast", "london", "world-model", "collision", "race", "host", "engine"]

    init(bundle: Bundle = .main, storage: UserDefaults = .standard) throws {
        guard let context = JSContext() else { throw RuntimeError.javascript("Unable to create JavaScriptCore context") }
        self.context = context
        self.storage = storage
        context.name = "Apex Run shared game core"
        context.exceptionHandler = { [weak self] _, exception in
            self?.pendingException = exception?.toString() ?? "Unknown JavaScript exception"
        }
        let get: @convention(block) (String) -> String? = { key in storage.string(forKey: "tv." + key) }
        let set: @convention(block) (String, String) -> Void = { key, value in storage.set(value, forKey: "tv." + key) }
        context.setObject(get, forKeyedSubscript: "nativeStorageGet" as NSString)
        context.setObject(set, forKeyedSubscript: "nativeStorageSet" as NSString)
        let reset: @convention(block) (String) -> Void = { [weak self] reason in self?.onInputReset?(reason) }
        context.setObject(reset, forKeyedSubscript: "nativeInputReset" as NSString)
        try evaluate("globalThis.window = globalThis;", source: nil)
        for module in Self.modules {
            guard let url = bundle.url(forResource: module, withExtension: "js") else {
                throw RuntimeError.missingResource(module + ".js")
            }
            try evaluate(String(contentsOf: url, encoding: .utf8), source: url)
        }
        _ = try state()
    }

    private func evaluate(_ source: String, source url: URL?) throws {
        pendingException = nil
        context.evaluateScript(source, withSourceURL: url)
        if let error = pendingException { throw RuntimeError.javascript(error) }
    }

    @discardableResult
    private func invoke(_ method: String, arguments: [Any] = []) throws -> JSValue {
        pendingException = nil
        guard let native = context.objectForKeyedSubscript("ApexNative"), !native.isUndefined,
              let result = native.invokeMethod(method, withArguments: arguments) else {
            throw RuntimeError.invalidResult(method)
        }
        if let error = pendingException { throw RuntimeError.javascript(error) }
        return result
    }

    private func dictionary(_ value: JSValue, method: String) throws -> [String: Any] {
        guard let text = value.toString(), let data = text.data(using: .utf8),
              let result = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw RuntimeError.invalidResult(method)
        }
        return result
    }

    func state() throws -> [String: Any] { try dictionary(invoke("stateJSON"), method: "stateJSON") }
    func track() throws -> [String: Any] { try dictionary(invoke("trackJSON"), method: "trackJSON") }
    func step(dt: Double, steer: Double, throttle: Double, brake: Double) throws -> [String: Any] {
        try dictionary(invoke("step", arguments: [dt, steer, throttle, brake]), method: "step")
    }
    func start() throws { try invoke("start") }
    func restart() throws { try invoke("restart") }
    func pause() throws { try invoke("pause") }
    func resume() throws { try invoke("resume") }
}
