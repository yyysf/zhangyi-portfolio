// 本项目专用 PDF 取文工具（PDFKit，macOS 原生，无需第三方库）。
// 用法：
//   swift extract-pdf.swift <in.pdf> <out.txt>          逐页取文，页间空一行
//   swift extract-pdf.swift <in.pdf> --layout <out.txt>  按版面块取文，保留分栏顺序
import Foundation
import PDFKit

func die(_ msg: String) -> Never {
    FileHandle.standardError.write((msg + "\n").data(using: .utf8)!)
    exit(1)
}

let args = CommandLine.arguments
guard args.count >= 3 else { die("usage: extract-pdf <in.pdf> [--layout] <out.txt>") }
let inputPath = args[1]
var layout = false
var outputPath = args[2]
if args.count >= 4 && args[2] == "--layout" {
    layout = true
    outputPath = args[3]
}
guard let doc = PDFDocument(url: URL(fileURLWithPath: inputPath)) else { die("cannot open \(inputPath)") }

var pages: [String] = []
for index in 0..<doc.pageCount {
    guard let page = doc.page(at: index) else { continue }
    if layout {
        // 版面模式下按文本块取，块之间换行；块内按行拼接，避免分栏被拉平。
        var chunks: [String] = []
        let blocks = page.selection(for: page.bounds(for: .mediaBox))?.selectionsByLine() ?? []
        for line in blocks {
            let text = line.string ?? ""
            if !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                chunks.append(text)
            }
        }
        pages.append(chunks.joined(separator: "\n"))
    } else {
        pages.append(page.string ?? "")
    }
}
try pages.joined(separator: "\n\n").write(toFile: outputPath, atomically: true, encoding: .utf8)
print("pages: \(doc.pageCount) -> \(outputPath)")
