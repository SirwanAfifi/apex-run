import SceneKit
import UIKit
import ImageIO

/// Native presentation of the shared course and race state. Simulation stays in
/// JavaScript; this class never integrates speed, steering, collisions or AI.
final class RaceScene {
    let view = SCNView(frame: .zero)
    private let scene = SCNScene()
    private let camera = SCNNode()
    private let player = SCNNode()
    private let playerArt = SCNNode()
    private var riders: [String: SCNNode] = [:]
    private let assetsURL: URL
    private var images: [String: UIImage] = [:]
    private let samples: [[String: Any]]
    private let roadHalf: Double

    init(track: [String: Any], assetsURL: URL) {
        self.assetsURL = assetsURL
        samples = track["samples"] as? [[String: Any]] ?? []
        roadHalf = track["roadHalf"] as? Double ?? 4.65
        view.scene = scene
        view.backgroundColor = UIColor(red: 0.58, green: 0.71, blue: 0.72, alpha: 1)
        view.preferredFramesPerSecond = 60
        view.antialiasingMode = .multisampling2X
        view.isPlaying = true
        view.rendersContinuously = false
        view.allowsCameraControl = false
        scene.background.contents = image("coast-panorama.webp") ?? UIColor(red: 0.62, green: 0.75, blue: 0.79, alpha: 1)
        scene.fogColor = UIColor(red: 0.65, green: 0.72, blue: 0.71, alpha: 1)
        scene.fogStartDistance = 260
        scene.fogEndDistance = 670

        camera.camera = SCNCamera()
        camera.camera?.fieldOfView = 65
        camera.camera?.zNear = 0.1
        camera.camera?.zFar = 900
        camera.camera?.wantsHDR = false
        scene.rootNode.addChildNode(camera)
        view.pointOfView = camera

        let ambient = SCNNode()
        ambient.light = SCNLight()
        ambient.light?.type = .ambient
        ambient.light?.intensity = 750
        ambient.light?.color = UIColor(red: 0.95, green: 0.96, blue: 1, alpha: 1)
        scene.rootNode.addChildNode(ambient)
        let sunlight = SCNNode()
        sunlight.light = SCNLight()
        sunlight.light?.type = .directional
        sunlight.light?.intensity = 650
        sunlight.light?.color = UIColor(red: 1, green: 0.89, blue: 0.70, alpha: 1)
        sunlight.eulerAngles = SCNVector3(-0.8, -0.65, 0)
        scene.rootNode.addChildNode(sunlight)

        buildCourse(track)
        playerArt.addChildNode(bikeSprite("sierra-rider.webp"))
        player.addChildNode(playerArt)
        player.addChildNode(shadow())
        scene.rootNode.addChildNode(player)
        placeInitialCamera()
    }

    private func image(_ name: String) -> UIImage? {
        if let cached = images[name] { return cached }
        let url = assetsURL.appendingPathComponent(name)
        guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
              let decoded = CGImageSourceCreateThumbnailAtIndex(source, 0, [
                kCGImageSourceCreateThumbnailFromImageAlways: true,
                kCGImageSourceThumbnailMaxPixelSize: 2048,
                kCGImageSourceCreateThumbnailWithTransform: true,
                kCGImageSourceShouldCacheImmediately: true
              ] as CFDictionary) else { return nil }
        let result = UIImage(cgImage: decoded)
        images[name] = result
        return result
    }

    private func material(_ color: UIColor, texture: String? = nil, constant: Bool = false) -> SCNMaterial {
        let material = SCNMaterial()
        material.diffuse.contents = texture.flatMap(image) ?? color
        material.lightingModel = constant ? .constant : .lambert
        material.isDoubleSided = true
        material.diffuse.wrapS = .repeat
        material.diffuse.wrapT = .repeat
        material.diffuse.magnificationFilter = .linear
        material.diffuse.minificationFilter = .linear
        material.diffuse.mipFilter = .linear
        return material
    }

    private func buildCourse(_ track: [String: Any]) {
        guard samples.count > 1 else { return }
        var road = RaceMesh(), centerLines = RaceMesh(), edgeLines = RaceMesh()
        var ground = RaceMesh(), rails = RaceMesh()
        let offsets = track["groundOffsets"] as? [Double] ?? [-80, -28, -14, -8, -4.65, 4.65, 8, 17, 45, 103]
        for index in 0..<(samples.count - 1) {
            let a = samples[index], b = samples[index + 1]
            guard let leftA = a["left"] as? [Double], let rightA = a["right"] as? [Double],
                  let leftB = b["left"] as? [Double], let rightB = b["right"] as? [Double] else { continue }
            let da = a["d"] as? Double ?? Double(index * 8), db = b["d"] as? Double ?? da + 8
            road.quad([leftA, rightA, rightB, leftB], uv: [CGPoint(x: 0, y: da / 15), CGPoint(x: 1, y: da / 15), CGPoint(x: 1, y: db / 15), CGPoint(x: 0, y: db / 15)], lift: 0.025)
            func stripe(_ center: Double, _ width: Double, _ mesh: inout RaceMesh) {
                let lo = (center - width / 2 + roadHalf) / (2 * roadHalf)
                let hi = (center + width / 2 + roadHalf) / (2 * roadHalf)
                mesh.quad([raceInterpolate(leftA, rightA, lo), raceInterpolate(leftA, rightA, hi),
                           raceInterpolate(leftB, rightB, hi), raceInterpolate(leftB, rightB, lo)], lift: 0.042)
            }
            stripe(-0.12, 0.08, &centerLines)
            stripe(0.12, 0.08, &centerLines)
            stripe(-roadHalf + 0.23, 0.13, &edgeLines)
            stripe(roadHalf - 0.23, 0.13, &edgeLines)
            if a["bridge"] as? Bool != true {
                if let ga = a["ground"] as? [[Double]], let gb = b["ground"] as? [[Double]], ga.count == gb.count, ga.count == offsets.count {
                    for i in 0..<(ga.count - 1) {
                        // The road has its own asphalt surface.
                        if offsets[i] >= -roadHalf && offsets[i + 1] <= roadHalf { continue }
                        let cliff = offsets[i + 1] < -8
                        let tint: [Double] = cliff ? [0.64, 0.56, 0.43] : [0.82, 0.74, 0.51]
                        ground.quad([ga[i], ga[i + 1], gb[i + 1], gb[i]], uv: [CGPoint(x: offsets[i] / 24, y: da / 24), CGPoint(x: offsets[i + 1] / 24, y: da / 24), CGPoint(x: offsets[i + 1] / 24, y: db / 24), CGPoint(x: offsets[i] / 24, y: db / 24)], color: tint)
                    }
                } else {
                    for (name, edgeA, edgeB) in [("groundLeft", leftA, leftB), ("groundRight", rightA, rightB)] {
                        guard let farA = a[name] as? [Double], let farB = b[name] as? [Double] else { continue }
                        ground.quad([edgeA, farA, farB, edgeB], color: [0.78, 0.7, 0.5])
                    }
                }
            }
            for (flag, side) in [("railLeft", -1.0), ("railRight", 1.0)] where a[flag] as? Bool == true {
                let u = (side * 5.485 + roadHalf) / (2 * roadHalf)
                let pa = raceInterpolate(leftA, rightA, u), pb = raceInterpolate(leftB, rightB, u)
                var ta = pa, tb = pb, ba = pa, bb = pb
                ta[1] += 0.91; tb[1] += 0.91; ba[1] += 0.68; bb[1] += 0.68
                rails.quad([ba, bb, tb, ta], color: [0.78, 0.8, 0.78])
                if index % 2 == 0 {
                    var near = pa, far = pa, topNear = pa, topFar = pa
                    near[2] -= 0.055; far[2] += 0.055
                    topNear = near; topFar = far; topNear[1] += 0.9; topFar[1] += 0.9
                    rails.quad([near, far, topFar, topNear], color: [0.52, 0.55, 0.53])
                }
            }
        }
        scene.rootNode.addChildNode(ground.node(material: material(.brown, texture: "terrain-meadow.webp")))
        scene.rootNode.addChildNode(road.node(material: material(.darkGray, texture: "terrain-asphalt.webp")))
        scene.rootNode.addChildNode(centerLines.node(material: material(UIColor(red: 0.94, green: 0.71, blue: 0.29, alpha: 1), constant: true)))
        scene.rootNode.addChildNode(edgeLines.node(material: material(UIColor(white: 0.92, alpha: 1), constant: true)))
        scene.rootNode.addChildNode(rails.node(material: material(.white)))

        let water = SCNPlane(width: 5200, height: 6500)
        let sea = material(UIColor(red: 0.13, green: 0.39, blue: 0.43, alpha: 1), constant: true)
        water.materials = [sea]
        let seaNode = SCNNode(geometry: water)
        seaNode.eulerAngles.x = -.pi / 2
        seaNode.position = SCNVector3(-2450, 0.14, -2400)
        scene.rootNode.addChildNode(seaNode)

        var landmarks = RaceMesh()
        for face in track["landmarks"] as? [[String: Any]] ?? [] {
            guard let vertices = face["vertices"] as? [[Double]] else { continue }
            landmarks.quad(vertices, color: face["color"] as? [Double] ?? [0.7, 0.66, 0.55])
        }
        scene.rootNode.addChildNode(landmarks.node(material: material(.white)))
        addFoliage(track["foliage"] as? [[String: Any]] ?? [])
    }

    private func addFoliage(_ foliage: [[String: Any]]) {
        guard let tree = image("coast-cypress.webp") else { return }
        let ratio = tree.size.width / tree.size.height
        let treeMaterial = material(.clear, constant: true)
        treeMaterial.diffuse.contents = tree
        treeMaterial.transparencyMode = .aOne
        treeMaterial.writesToDepthBuffer = false
        for item in foliage {
            let kind = item["kind"] as? Int ?? 0
            guard [0, 14, 15].contains(kind), let position = item["position"] as? [Double] else { continue }
            let height = item["height"] as? Double ?? 5
            let plane = SCNPlane(width: CGFloat(height) * ratio, height: CGFloat(height))
            plane.materials = [treeMaterial]
            let node = SCNNode(geometry: plane)
            node.position = raceVector(position, lift: height / 2)
            let facing = SCNBillboardConstraint()
            facing.freeAxes = .Y
            node.constraints = [facing]
            node.renderingOrder = 5
            scene.rootNode.addChildNode(node)
        }
    }

    private func bikeSprite(_ name: String) -> SCNNode {
        let artwork = image(name)
        let height = 1.65
        let ratio = artwork.map { Double($0.size.width / $0.size.height) } ?? 0.66
        let plane = SCNPlane(width: height * ratio, height: height)
        let ink = material(.red, constant: true)
        ink.diffuse.contents = artwork ?? UIColor(red: 0.87, green: 0.24, blue: 0.18, alpha: 1)
        ink.transparencyMode = .aOne
        ink.writesToDepthBuffer = false
        plane.materials = [ink]
        let sprite = SCNNode(geometry: plane)
        sprite.position.y = Float(height / 2)
        sprite.renderingOrder = 10
        return sprite
    }

    private func shadow() -> SCNNode {
        let shape = SCNPlane(width: 1.05, height: 1.65)
        let shade = material(.clear, constant: true)
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        shade.diffuse.contents = UIGraphicsImageRenderer(size: CGSize(width: 64, height: 128), format: format).image { renderer in
            let context = renderer.cgContext
            context.translateBy(x: 32, y: 64)
            context.scaleBy(x: 1, y: 2)
            let colors = [UIColor(white: 0.02, alpha: 0.30).cgColor, UIColor(white: 0.02, alpha: 0).cgColor]
            if let gradient = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: colors as CFArray, locations: [0, 1]) {
                context.drawRadialGradient(gradient, startCenter: .zero, startRadius: 4, endCenter: .zero, endRadius: 31, options: [])
            }
        }
        shade.writesToDepthBuffer = false
        shape.materials = [shade]
        let node = SCNNode(geometry: shape)
        node.eulerAngles.x = -.pi / 2
        node.position.y = 0.045
        node.renderingOrder = 2
        return node
    }

    private func sampledPosition(distance: Double, lateral: Double = 0) -> [Double] {
        guard let first = samples.first, let last = samples.last else { return [0, 0, distance] }
        let firstD = first["d"] as? Double ?? 0
        let lastD = last["d"] as? Double ?? distance
        let step = samples.count > 1 ? ((samples[1]["d"] as? Double ?? firstD + 8) - firstD) : 8
        let index = min(samples.count - 2, max(0, Int(floor((min(lastD, max(firstD, distance)) - firstD) / max(0.1, step)))))
        guard index >= 0, index + 1 < samples.count else { return first["center"] as? [Double] ?? [0, 0, distance] }
        let a = samples[index], b = samples[index + 1]
        let da = a["d"] as? Double ?? firstD, db = b["d"] as? Double ?? da + step
        let t = min(1, max(0, (distance - da) / max(0.1, db - da)))
        let pa = raceInterpolate(a["left"] as? [Double] ?? [0, 0, da], a["right"] as? [Double] ?? [0, 0, da], (lateral + 1) / 2)
        let pb = raceInterpolate(b["left"] as? [Double] ?? [0, 0, db], b["right"] as? [Double] ?? [0, 0, db], (lateral + 1) / 2)
        return raceInterpolate(pa, pb, t)
    }

    private func placeInitialCamera() {
        let p = sampledPosition(distance: 0, lateral: 0.4)
        player.position = raceVector(p, lift: 0.045)
        camera.position = SCNVector3(Float(p[0]), Float(p[1] + 3), Float(-p[2] + 7))
        camera.look(at: raceVector(sampledPosition(distance: 20), lift: 1.2))
    }

    func update(state: [String: Any]) {
        let distance = state["distance"] as? Double ?? 0
        let lateral = state["lateral"] as? Double ?? 0
        let metadata = state["player"] as? [String: Any] ?? [:]
        let position = metadata["position"] as? [Double] ?? state["worldPosition"] as? [Double] ?? sampledPosition(distance: distance, lateral: lateral)
        let heading = metadata["heading"] as? Double ?? atan(state["tangent"] as? Double ?? 0)
        let lean = state["leanAngle"] as? Double ?? 0
        let heave = state["heave"] as? Double ?? 0
        SCNTransaction.begin()
        SCNTransaction.animationDuration = 0
        SCNTransaction.disableActions = true
        player.position = raceVector(position, lift: 0.05 + heave * 0.055)
        player.eulerAngles.y = Float(-heading)
        playerArt.eulerAngles.z = Float(-lean * .pi / 180 * 0.72)
        if let crash = state["crash"] as? [String: Any] {
            let roll = crash["roll"] as? Double ?? 0
            let side = crash["side"] as? Double ?? 1
            playerArt.eulerAngles.z = Float(-side * roll)
        }
        for rival in state["rivals"] as? [[String: Any]] ?? [] {
            let id = rival["id"] as? String ?? "rival"
            let node: SCNNode
            if let existing = riders[id] { node = existing }
            else {
                node = SCNNode()
                let art = ["silva": "amber", "park": "teal", "moreau": "blue"][id] ?? "amber"
                let body = SCNNode()
                body.name = "body"
                body.addChildNode(bikeSprite("coast-rival-\(art).webp"))
                node.addChildNode(body)
                node.addChildNode(shadow())
                scene.rootNode.addChildNode(node)
                riders[id] = node
            }
            let rd = rival["distance"] as? Double ?? 0, rl = rival["lateral"] as? Double ?? 0
            let rp = rival["position"] as? [Double] ?? rival["worldPosition"] as? [Double] ?? sampledPosition(distance: rd, lateral: rl)
            node.position = raceVector(rp, lift: 0.05)
            node.eulerAngles.y = Float(-(rival["heading"] as? Double ?? atan(rival["tangent"] as? Double ?? 0)))
            node.childNode(withName: "body", recursively: false)?.eulerAngles.z = Float(-(rival["leanAngle"] as? Double ?? 0) * .pi / 180)
            node.isHidden = abs(rd - distance) > 650
        }
        if let cameraState = state["cameraPose"] as? [String: Any] ?? state["camera"] as? [String: Any], let eye = cameraState["position"] as? [Double], let target = cameraState["target"] as? [Double] {
            camera.position = raceVector(eye)
            camera.look(at: raceVector(target))
        } else {
            let eye = sampledPosition(distance: distance - 7, lateral: lateral)
            camera.position = raceVector(eye, lift: 3)
            camera.look(at: raceVector(sampledPosition(distance: distance + 18, lateral: lateral * 0.45), lift: 1.2))
        }
        SCNTransaction.commit()
    }
}
