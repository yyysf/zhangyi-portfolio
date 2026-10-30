// 本项目专用 PDF 转图工具（PDFKit + CoreGraphics），用于核对文本层缺失的字。
// 用法：swift render-pdf.swift <in.pdf> <outdir> [dpi]
import Foundation
import PDFKit
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
guard args.count >= 3 else { FileHandle.standardError.write("usage: render-pdf <in.pdf> <outdir> [dpi]\n".data(using: .utf8)!); exit(1) }
let inURL = URL(fileURLWithPath: args[1])
let outDir = URL(fileURLWithPath: args[2])
let dpi = args.count > 3 ? (Double(args[3]) ?? 144) : 144
try? FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)
guard let doc = PDFDocument(url: inURL) else { exit(1) }

for index in 0..<doc.pageCount {
    guard let page = doc.page(at: index) else { continue }
    let box = page.bounds(for: .mediaBox)
    let scale = dpi / 72.0
    let width = Int(box.width * scale), height = Int(box.height * scale)
    let space = CGColorSpaceCreateDeviceRGB()
    guard let ctx = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8,
                              bytesPerRow: 0, space: space,
                              bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue) else { continue }
    ctx.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
    ctx.fill(CGRect(x: 0, y: 0, width: width, height: height))
    ctx.scaleBy(x: scale, y: scale)
    page.draw(with: .mediaBox, to: ctx)
    guard let cgImage = ctx.makeImage() else { continue }
    let out = outDir.appendingPathComponent(String(format: "page-%02d.png", index + 1))
    guard let dest = CGImageDestinationCreateWithURL(out as CFURL, UTType.png.identifier as CFString, 1, nil) else { continue }
    CGImageDestinationAddImage(dest, cgImage, nil)
    CGImageDestinationFinalize(dest)
    print(out.path)
}
