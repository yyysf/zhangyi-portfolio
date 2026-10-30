// 本项目专用视频工具：可控码率的 H.264 转码 + 抽帧。
// 用法：
//   swift media.swift transcode <in> <out.mp4> <maxW> <maxH> <kbps>
//   swift media.swift frame <in> <out.png> <seconds> [maxW]
import Foundation
import AVFoundation
import CoreImage
import AppKit

func die(_ msg: String) -> Never {
    FileHandle.standardError.write((msg + "\n").data(using: .utf8)!)
    exit(1)
}

func even(_ v: Int) -> Int { v % 2 == 0 ? v : v - 1 }

func transcode(_ args: [String]) {
    guard args.count >= 5 else { die("transcode <in> <out> <maxW> <maxH> <kbps>") }
    let inURL = URL(fileURLWithPath: args[0])
    let outURL = URL(fileURLWithPath: args[1])
    let maxW = Int(args[2])!, maxH = Int(args[3])!
    let kbps = Int(args[4])!

    try? FileManager.default.removeItem(at: outURL)
    let asset = AVURLAsset(url: inURL)
    guard let track = asset.tracks(withMediaType: .video).first else { die("no video track") }

    let natural = track.naturalSize.applying(track.preferredTransform)
    let srcW = Int(abs(natural.width)), srcH = Int(abs(natural.height))
    // 可选裁掉源片自带的黑边：transcode ... <kbps> [cropTop cropBottom]
    let cropTop = args.count > 5 ? Int(args[5])! : 0
    let cropBot = args.count > 6 ? Int(args[6])! : 0
    let picH = max(2, srcH - cropTop - cropBot)
    let scale = min(Double(maxW) / Double(srcW), Double(maxH) / Double(picH), 1.0)
    let outW = even(max(2, Int(Double(srcW) * scale)))
    let outH = even(max(2, Int(Double(picH) * scale)))

    let reader = try! AVAssetReader(asset: asset)
    // 用 420v 原生平面格式，H.264 编码器可直接吃，避免每帧做 BGRA 转换
    let videoOut = AVAssetReaderTrackOutput(track: track, outputSettings: [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange,
    ])
    videoOut.alwaysCopiesSampleData = false
    reader.add(videoOut)

    let audioTrack = asset.tracks(withMediaType: .audio).first
    var audioOut: AVAssetReaderTrackOutput?
    if audioTrack != nil {
        let o = AVAssetReaderTrackOutput(track: audioTrack!, outputSettings: [
            AVFormatIDKey: kAudioFormatLinearPCM,
            AVLinearPCMBitDepthKey: 16,
            AVLinearPCMIsFloatKey: false,
            AVLinearPCMIsBigEndianKey: false,
            AVLinearPCMIsNonInterleaved: false,
        ])
        reader.add(o)
        audioOut = o
    }

    let writer = try! AVAssetWriter(outputURL: outURL, fileType: .mp4)
    writer.shouldOptimizeForNetworkUse = true

    let vSettings: [String: Any] = [
        AVVideoCodecKey: AVVideoCodecType.h264,
        AVVideoWidthKey: outW,
        AVVideoHeightKey: outH,
        AVVideoCompressionPropertiesKey: [
            AVVideoAverageBitRateKey: kbps * 1000,
            AVVideoMaxKeyFrameIntervalKey: 60,
            AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
        ],
    ]
    let vIn = AVAssetWriterInput(mediaType: .video, outputSettings: vSettings)
    vIn.expectsMediaDataInRealTime = false
    writer.add(vIn)

    let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: vIn, sourcePixelBufferAttributes: [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange,
        kCVPixelBufferWidthKey as String: outW,
        kCVPixelBufferHeightKey as String: outH,
    ])
    let ciContext = CIContext(options: [.workingColorSpace: NSNull(), .outputColorSpace: NSNull()])
    let cropRect = CGRect(x: 0, y: cropBot, width: srcW, height: picH)
    let scaleT = CGAffineTransform(scaleX: CGFloat(outW) / CGFloat(srcW), y: CGFloat(outH) / CGFloat(picH))

    var aIn: AVAssetWriterInput?
    if audioOut != nil {
        let a = AVAssetWriterInput(mediaType: .audio, outputSettings: [
            AVFormatIDKey: kAudioFormatMPEG4AAC,
            AVSampleRateKey: 44100,
            AVNumberOfChannelsKey: 2,
            AVEncoderBitRateKey: 128000,
        ])
        a.expectsMediaDataInRealTime = false
        writer.add(a)
        aIn = a
    }

    reader.startReading()
    writer.startWriting()
    writer.startSession(atSourceTime: .zero)

    let sem = DispatchSemaphore(value: 0)
    let group = DispatchGroup()

    group.enter()
    var frames = 0
    vIn.requestMediaDataWhenReady(on: DispatchQueue(label: "v")) {
        while vIn.isReadyForMoreMediaData {
            guard let buf = videoOut.copyNextSampleBuffer() else {
                vIn.markAsFinished()
                group.leave()
                return
            }
            let pts = CMSampleBufferGetPresentationTimeStamp(buf)
            guard let src = CMSampleBufferGetImageBuffer(buf) else { continue }
            var img = CIImage(cvPixelBuffer: src)
            // 源片坐标系原点在左下，裁掉下方 cropBot、上方 cropTop
            if cropTop > 0 || cropBot > 0 {
                img = img.cropped(to: cropRect)
                img = img.transformed(by: CGAffineTransform(translationX: 0, y: -CGFloat(cropBot)))
            }
            img = img.transformed(by: scaleT)
            guard let pool = adaptor.pixelBufferPool else { die("no pool") }
            var dst: CVPixelBuffer?
            CVPixelBufferPoolCreatePixelBuffer(nil, pool, &dst)
            if let dst = dst {
                ciContext.render(img, to: dst)
                adaptor.append(dst, withPresentationTime: pts)
            }
            frames += 1
            if frames % 150 == 0 { FileHandle.standardError.write("  \(frames) frames\n".data(using: .utf8)!) }
        }
    }
    if let aIn = aIn, let aOut = audioOut {
        group.enter()
        aIn.requestMediaDataWhenReady(on: DispatchQueue(label: "a")) {
            while aIn.isReadyForMoreMediaData {
                if let buf = aOut.copyNextSampleBuffer() {
                    aIn.append(buf)
                } else {
                    aIn.markAsFinished()
                    group.leave()
                    return
                }
            }
        }
    }
    group.notify(queue: DispatchQueue.global(qos: .userInitiated)) {
        writer.finishWriting { sem.signal() }
    }
    sem.wait()
    if writer.status != .completed {
        die("write failed: \(writer.error?.localizedDescription ?? "?")")
    }
    let size = (try? FileManager.default.attributesOfItem(atPath: outURL.path)[.size] as? Int) ?? 0
    print("ok \(outW)x\(outH) \(String(format: "%.1f", Double(size ?? 0) / 1048576))MB -> \(outURL.lastPathComponent)")
}

func frame(_ args: [String]) {
    guard args.count >= 3 else { die("frame <in> <out.png> <seconds> [maxW]") }
    let asset = AVURLAsset(url: URL(fileURLWithPath: args[0]))
    let gen = AVAssetImageGenerator(asset: asset)
    gen.appliesPreferredTrackTransform = true
    gen.requestedTimeToleranceBefore = .zero
    gen.requestedTimeToleranceAfter = .zero
    let t = CMTime(seconds: Double(args[2])!, preferredTimescale: 600)
    guard let cg = try? gen.copyCGImage(at: t, actualTime: nil) else { die("no frame") }
    let maxW = args.count > 3 ? Int(args[3])! : 1600
    let cropTop = args.count > 4 ? Int(args[4])! : 0
    let cropBot = args.count > 5 ? Int(args[5])! : 0
    let picH = max(1, cg.height - cropTop - cropBot)
    let pic = cg.cropping(to: CGRect(x: 0, y: cropTop, width: cg.width, height: picH)) ?? cg
    let scale = min(1.0, Double(maxW) / Double(pic.width))
    let w = Int(Double(pic.width) * scale), h = Int(Double(pic.height) * scale)
    let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0,
                        space: CGColorSpace(name: CGColorSpace.sRGB)!,
                        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    ctx.interpolationQuality = .high
    ctx.draw(pic, in: CGRect(x: 0, y: 0, width: w, height: h))
    let out = ctx.makeImage()!
    let rep = NSBitmapImageRep(cgImage: out)
    let data = rep.representation(using: .png, properties: [:])!
    try! data.write(to: URL(fileURLWithPath: args[1]))
    print("ok \(w)x\(h) -> \(args[1])")
}

let argv = Array(CommandLine.arguments.dropFirst())
guard let cmd = argv.first else { die("transcode | frame") }
switch cmd {
case "transcode": transcode(Array(argv.dropFirst()))
case "frame": frame(Array(argv.dropFirst()))
default: die("unknown command \(cmd)")
}
