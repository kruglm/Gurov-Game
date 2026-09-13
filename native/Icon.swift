import Cocoa
let output = CommandLine.arguments[1]
let image = NSImage(size: NSSize(width: 1024, height: 1024))
image.lockFocus()
let shape = NSBezierPath(roundedRect: NSRect(x: 55, y: 55, width: 914, height: 914), xRadius: 200, yRadius: 200)
NSGradient(starting: NSColor(calibratedRed: 0.13, green: 0.26, blue: 0.31, alpha: 1), ending: NSColor(calibratedRed: 0.04, green: 0.09, blue: 0.16, alpha: 1))!.draw(in: shape, angle: -90)
let gold = NSColor(calibratedRed: 0.92, green: 0.80, blue: 0.55, alpha: 1)
gold.withAlphaComponent(0.35).setStroke()
let border = NSBezierPath(roundedRect: NSRect(x: 93, y: 93, width: 838, height: 838), xRadius: 171, yRadius: 171)
border.lineWidth = 3; border.stroke()
let font = NSFont(name: "Georgia", size: 590) ?? NSFont.systemFont(ofSize: 590)
let symbol = "λ" as NSString
symbol.draw(at: NSPoint(x: 340, y: 190), withAttributes: [.font: font, .foregroundColor: gold])
gold.setFill()
NSBezierPath(rect: NSRect(x: 254, y: 227, width: 516, height: 12)).fill()
let star = NSBezierPath(); star.move(to: NSPoint(x: 747, y: 742)); star.line(to: NSPoint(x: 768, y: 797)); star.line(to: NSPoint(x: 789, y: 742)); star.line(to: NSPoint(x: 846, y: 721)); star.line(to: NSPoint(x: 789, y: 700)); star.line(to: NSPoint(x: 768, y: 645)); star.line(to: NSPoint(x: 747, y: 700)); star.line(to: NSPoint(x: 690, y: 721)); star.close(); star.fill()
image.unlockFocus()
let bitmap = NSBitmapImageRep(data: image.tiffRepresentation!)!
try bitmap.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: output))
