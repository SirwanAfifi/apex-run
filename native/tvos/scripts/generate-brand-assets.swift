#!/usr/bin/env swift
// Run from any directory: swift native/tvos/scripts/generate-brand-assets.swift
// Uses only the existing Apex Run artwork, logo geometry, and licensed Barlow font.
// Catalog schema: https://developer.apple.com/library/archive/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/BrandAssetsType.html
import AppKit
import CoreText
import ImageIO
import UniformTypeIdentifiers

let fileManager = FileManager.default
let root = URL(fileURLWithPath: #filePath).standardizedFileURL
    .deletingLastPathComponent().deletingLastPathComponent()
    .deletingLastPathComponent().deletingLastPathComponent()
let source = root.appendingPathComponent("dist/assets")
let catalog = root.appendingPathComponent("native/tvos/Assets.xcassets")
let brandName = "App Icon & Top Shelf Image"
let brand = catalog.appendingPathComponent(brandName + ".brandassets")
let info: [String: Any] = ["author": "xcode", "version": 1]

func json(_ value: [String: Any], at directory: URL) throws {
    try fileManager.createDirectory(at: directory, withIntermediateDirectories: true)
    let data = try JSONSerialization.data(withJSONObject: value, options: [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes])
    try (data + Data([10])).write(to: directory.appendingPathComponent("Contents.json"))
}

func image(_ name: String) throws -> CGImage {
    let url = source.appendingPathComponent(name)
    guard let input = CGImageSourceCreateWithURL(url as CFURL, nil),
          let image = CGImageSourceCreateImageAtIndex(input, 0, nil) else {
        throw NSError(domain: "ApexBrand", code: 1, userInfo: [NSLocalizedDescriptionKey: "Cannot load \(url.path)"])
    }
    return image
}

let coast = try image("coast-panorama.webp")
let rider = try image("sierra-rider.webp")
CTFontManagerRegisterFontsForURL(source.appendingPathComponent("BarlowCondensed-ExtraBoldItalic.ttf") as CFURL, .process, nil)
guard NSFont(name: "BarlowCondensed-ExtraBoldItalic", size: 40) != nil else {
    fatalError("The bundled Barlow font could not be registered")
}

func color(_ r: CGFloat, _ g: CGFloat, _ b: CGFloat, _ a: CGFloat = 1) -> CGColor {
    CGColor(colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!, components: [r, g, b, a])!
}

func canvas(width: Int, height: Int, opaque: Bool, draw: (CGContext, CGFloat, CGFloat) -> Void) -> CGImage {
    let alpha = opaque ? CGImageAlphaInfo.noneSkipLast : CGImageAlphaInfo.premultipliedLast
    let context = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0,
                            space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: alpha.rawValue)!
    context.interpolationQuality = .high
    draw(context, CGFloat(width), CGFloat(height))
    return context.makeImage()!
}

func png(_ image: CGImage, at url: URL) throws {
    try fileManager.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
    guard let destination = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil) else {
        throw NSError(domain: "ApexBrand", code: 2)
    }
    CGImageDestinationAddImage(destination, image, nil)
    guard CGImageDestinationFinalize(destination) else { throw NSError(domain: "ApexBrand", code: 3) }
}

func cover(_ image: CGImage, in rect: CGRect, context: CGContext, anchorX: CGFloat = 0.5) {
    let scale = max(rect.width / CGFloat(image.width), rect.height / CGFloat(image.height))
    let width = CGFloat(image.width) * scale, height = CGFloat(image.height) * scale
    context.saveGState()
    context.clip(to: rect)
    context.draw(image, in: CGRect(x: rect.minX - (width - rect.width) * anchorX, y: rect.midY - height / 2, width: width, height: height))
    context.restoreGState()
}

func backdrop(_ context: CGContext, width: CGFloat, height: CGFloat, shelf: Bool) {
    context.setFillColor(color(0.045, 0.075, 0.07))
    context.fill(CGRect(x: 0, y: 0, width: width, height: height))
    cover(coast, in: CGRect(x: 0, y: 0, width: width, height: height), context: context, anchorX: shelf ? 0.5 : 0.65)
    let shade = CGGradient(colorsSpace: CGColorSpace(name: CGColorSpace.sRGB), colors: [
        color(0.025, 0.055, 0.055, 0.96), color(0.025, 0.055, 0.055, 0.76), color(0.025, 0.055, 0.055, 0.12)
    ] as CFArray, locations: [0, 0.44, 1])!
    context.drawLinearGradient(shade, start: .zero, end: CGPoint(x: width, y: height * 0.15), options: [.drawsBeforeStartLocation, .drawsAfterEndLocation])
    let ground = CGGradient(colorsSpace: CGColorSpace(name: CGColorSpace.sRGB), colors: [color(0.02, 0.045, 0.04, 0.7), color(0.02, 0.045, 0.04, 0)] as CFArray, locations: [0, 1])!
    context.drawLinearGradient(ground, start: .zero, end: CGPoint(x: 0, y: height * 0.5), options: [])
}

func motorcycle(_ context: CGContext, width: CGFloat, height: CGFloat, shelf: Bool) {
    let renderedHeight = height * (shelf ? 0.87 : 0.88)
    let renderedWidth = renderedHeight * CGFloat(rider.width) / CGFloat(rider.height)
    let x = width * (shelf ? 0.74 : 0.77) - renderedWidth / 2
    let y = height * 0.035
    context.saveGState()
    context.setShadow(offset: CGSize(width: -height * 0.02, height: -height * 0.02), blur: height * 0.045, color: color(0, 0, 0, 0.65))
    context.draw(rider, in: CGRect(x: x, y: y, width: renderedWidth, height: renderedHeight))
    context.restoreGState()
}

func mark(_ context: CGContext, x: CGFloat, y: CGFloat, width: CGFloat) {
    // Exact foreground path vertices from dist/assets/mark.svg (viewBox 0 0 56 44).
    // The badge's rounded rectangle is intentionally omitted: tvOS applies its own mask.
    let scale = width / 56
    context.saveGState()
    context.translateBy(x: x, y: y + 44 * scale)
    context.scaleBy(x: scale, y: -scale)
    context.setFillColor(color(0.8745, 0.2275, 0.1373))
    let logo = CGMutablePath()
    logo.move(to: CGPoint(x: 4, y: 34)); logo.addLine(to: CGPoint(x: 22, y: 8))
    logo.addLine(to: CGPoint(x: 29, y: 8)); logo.addLine(to: CGPoint(x: 11, y: 34)); logo.closeSubpath()
    logo.move(to: CGPoint(x: 18, y: 34)); logo.addLine(to: CGPoint(x: 35, y: 9))
    logo.addLine(to: CGPoint(x: 47, y: 34)); logo.addLine(to: CGPoint(x: 37, y: 34))
    logo.addLine(to: CGPoint(x: 32, y: 23)); logo.addLine(to: CGPoint(x: 25, y: 34)); logo.closeSubpath()
    context.addPath(logo); context.fillPath()
    context.restoreGState()
}

func text(_ value: String, in context: CGContext, at point: CGPoint, size: CGFloat, color: NSColor, tracking: CGFloat = 0) {
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(cgContext: context, flipped: false)
    let attributes: [NSAttributedString.Key: Any] = [
        .font: NSFont(name: "BarlowCondensed-ExtraBoldItalic", size: size)!,
        .foregroundColor: color, .kern: tracking
    ]
    NSAttributedString(string: value, attributes: attributes).draw(at: point)
    NSGraphicsContext.restoreGraphicsState()
}

func lettering(_ context: CGContext, width: CGFloat, height: CGFloat, shelf: Bool) {
    let ivory = NSColor(srgbRed: 1, green: 0.96, blue: 0.87, alpha: 1)
    if shelf {
        let x = width * 0.16
        mark(context, x: x, y: height * 0.60, width: height * 0.25)
        text("APEX RUN", in: context, at: CGPoint(x: x, y: height * 0.29), size: height * 0.26, color: ivory, tracking: height * 0.003)
        context.setFillColor(color(0.8745, 0.2275, 0.1373))
        context.fill(CGRect(x: x + height * 0.008, y: height * 0.25, width: height * 0.15, height: height * 0.009))
        text("THE OPEN ROAD AWAITS", in: context, at: CGPoint(x: x + height * 0.19, y: height * 0.212), size: height * 0.052, color: NSColor(srgbRed: 0.84, green: 0.88, blue: 0.82, alpha: 1), tracking: height * 0.005)
    } else {
        let x = width * 0.105
        mark(context, x: x, y: height * 0.58, width: width * 0.25)
        text("APEX", in: context, at: CGPoint(x: x, y: height * 0.275), size: height * 0.30, color: ivory, tracking: height * 0.003)
        text("RUN", in: context, at: CGPoint(x: x, y: height * 0.07), size: height * 0.24, color: ivory, tracking: height * 0.019)
    }
}

func iconLayer(_ layer: String, width: Int, height: Int) -> CGImage {
    canvas(width: width, height: height, opaque: layer == "Back") { context, w, h in
        switch layer {
        case "Back": backdrop(context, width: w, height: h, shelf: false)
        case "Middle": motorcycle(context, width: w, height: h, shelf: false)
        default: lettering(context, width: w, height: h, shelf: false)
        }
    }
}

func stack(name: String, width: Int, height: Int, scales: [Int]) throws {
    let directory = brand.appendingPathComponent(name + ".imagestack")
    try json(["info": info, "layers": ["Front", "Middle", "Back"].map { ["filename": $0 + ".imagestacklayer"] }], at: directory)
    for layer in ["Front", "Middle", "Back"] {
        let layerDirectory = directory.appendingPathComponent(layer + ".imagestacklayer")
        try json(["info": info], at: layerDirectory)
        let content = layerDirectory.appendingPathComponent("Content.imageset")
        var images: [[String: Any]] = []
        for scale in scales {
            let name = "\(layer.lowercased())@\(scale)x.png"
            try png(iconLayer(layer, width: width * scale, height: height * scale), at: content.appendingPathComponent(name))
            images.append(["idiom": "tv", "filename": name, "scale": "\(scale)x"])
        }
        try json(["info": info, "images": images], at: content)
    }
}

func shelf(name: String, width: Int) throws {
    let directory = brand.appendingPathComponent(name + ".imageset")
    var images: [[String: Any]] = []
    for scale in [1, 2] {
        let rendered = canvas(width: width * scale, height: 720 * scale, opaque: true) { context, w, h in
            backdrop(context, width: w, height: h, shelf: true)
            motorcycle(context, width: w, height: h, shelf: true)
            lettering(context, width: w, height: h, shelf: true)
        }
        let filename = "top-shelf@\(scale)x.png"
        try png(rendered, at: directory.appendingPathComponent(filename))
        images.append(["idiom": "tv", "filename": filename, "scale": "\(scale)x"])
    }
    try json(["info": info, "images": images], at: directory)
}

try json(["info": info], at: catalog)
try json(["info": info, "assets": [
    ["idiom": "tv", "role": "primary-app-icon", "size": "400x240", "filename": "App Icon - Small.imagestack"],
    ["idiom": "tv", "role": "primary-app-icon", "size": "1280x768", "filename": "App Icon - App Store.imagestack"],
    ["idiom": "tv", "role": "top-shelf-image", "size": "1920x720", "filename": "Top Shelf Image.imageset"],
    ["idiom": "tv", "role": "top-shelf-image-wide", "size": "2320x720", "filename": "Top Shelf Image Wide.imageset"]
]], at: brand)
try stack(name: "App Icon - Small", width: 400, height: 240, scales: [1, 2])
try stack(name: "App Icon - App Store", width: 1280, height: 768, scales: [1])
try shelf(name: "Top Shelf Image", width: 1920)
try shelf(name: "Top Shelf Image Wide", width: 2320)

let preview = canvas(width: 1280, height: 768, opaque: true) { context, w, h in
    for layer in ["Back", "Middle", "Front"] { context.draw(iconLayer(layer, width: 1280, height: 768), in: CGRect(x: 0, y: 0, width: w, height: h)) }
}
let previewURL = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent("apex-tv-brand-preview.png")
try png(preview, at: previewURL)
print("Generated \(catalog.path)")
print("ASSETCATALOG_COMPILER_APPICON_NAME = \(brandName)")
print("Preview: \(previewURL.path)")
