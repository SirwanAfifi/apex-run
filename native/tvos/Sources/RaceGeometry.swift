import SceneKit
import UIKit

/// Small mesh builder. Coordinates are exported by the shared JavaScript world;
/// SceneKit uses negative Z as forward, so the conversion happens only here.
struct RaceMesh {
    private var vertices: [SCNVector3] = []
    private var normals: [SCNVector3] = []
    private var texcoords: [CGPoint] = []
    private var colors: [Float] = []
    private var indices: [Int32] = []

    mutating func quad(_ points: [[Double]], uv: [CGPoint]? = nil, color: [Double] = [1, 1, 1], lift: Double = 0) {
        guard points.count == 4, points.allSatisfy({ $0.count == 3 && $0.allSatisfy(\.isFinite) }) else { return }
        let p = points.map { SIMD3<Float>(Float($0[0]), Float($0[1] + lift), Float(-$0[2])) }
        let cross = simd_cross(p[1] - p[0], p[2] - p[0])
        let normal = simd_length(cross) > 0.00001 ? simd_normalize(cross) : SIMD3<Float>(0, 1, 0)
        let start = Int32(vertices.count)
        let texture = uv ?? [CGPoint(x: 0, y: 0), CGPoint(x: 1, y: 0), CGPoint(x: 1, y: 1), CGPoint(x: 0, y: 1)]
        for i in 0..<4 {
            vertices.append(SCNVector3(p[i].x, p[i].y, p[i].z))
            normals.append(SCNVector3(normal.x, normal.y, normal.z))
            texcoords.append(texture[i])
            colors.append(contentsOf: [Float(color[0]), Float(color[1]), Float(color[2]), 1])
        }
        indices.append(contentsOf: [start, start + 1, start + 2, start, start + 2, start + 3])
    }

    func node(material: SCNMaterial) -> SCNNode {
        guard !vertices.isEmpty else { return SCNNode() }
        let colorSource = colors.withUnsafeBytes { buffer in
            SCNGeometrySource(data: Data(buffer), semantic: .color, vectorCount: vertices.count,
                              usesFloatComponents: true, componentsPerVector: 4,
                              bytesPerComponent: MemoryLayout<Float>.size, dataOffset: 0, dataStride: 16)
        }
        let element = SCNGeometryElement(indices: indices, primitiveType: .triangles)
        let geometry = SCNGeometry(sources: [SCNGeometrySource(vertices: vertices), SCNGeometrySource(normals: normals),
                                            SCNGeometrySource(textureCoordinates: texcoords), colorSource], elements: [element])
        geometry.materials = [material]
        return SCNNode(geometry: geometry)
    }
}

func raceVector(_ point: [Double], lift: Double = 0) -> SCNVector3 {
    guard point.count >= 3 else { return SCNVector3Zero }
    return SCNVector3(Float(point[0]), Float(point[1] + lift), Float(-point[2]))
}

func raceInterpolate(_ a: [Double], _ b: [Double], _ t: Double) -> [Double] {
    guard a.count == 3, b.count == 3 else { return [0, 0, 0] }
    return zip(a, b).map { $0 + ($1 - $0) * t }
}
