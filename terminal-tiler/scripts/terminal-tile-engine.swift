import AppKit
import ApplicationServices
import CoreGraphics
import Foundation

enum TileCoreError: Error, CustomStringConvertible {
  case invalidInput(String)
  case accessibilityDenied
  case unsupportedInvokingApp
  case noScreens

  var description: String {
    switch self {
    case .invalidInput(let message):
      return message
    case .accessibilityDenied:
      return "终端窗口平铺需要开启辅助功能权限：系统设置 -> 隐私与安全性 -> 辅助功能。"
    case .unsupportedInvokingApp:
      return "当前前台应用不是受支持的终端。"
    case .noScreens:
      return "未检测到可用显示器。"
    }
  }
}

enum TerminalApp: String, CaseIterable {
  case iTerm2
  case terminal = "Terminal"
  case ghostty = "Ghostty"

  var bundleIdentifiers: [String] {
    switch self {
    case .iTerm2:
      return ["com.googlecode.iterm2"]
    case .terminal:
      return ["com.apple.Terminal"]
    case .ghostty:
      return ["com.mitchellh.ghostty"]
    }
  }
}

struct Rect {
  let left: Int
  let top: Int
  let right: Int
  let bottom: Int

  var width: Int { right - left }
  var height: Int { bottom - top }
  var centerX: Double { Double(left + right) / 2.0 }
  var centerY: Double { Double(top + bottom) / 2.0 }
}

struct WindowRecord {
  let app: TerminalApp
  let key: String
  let element: AXUIElement
  let frame: Rect
  let sourceIndex: Int
}

struct MoveOperation {
  let record: WindowRecord
  let target: Rect
}

struct ZoneConfig {
  let side: String
  let divisor: Int
}

struct TileExecutionOptions {
  let zoneArgument: String?
  let environment: [String: String]
  let invokingAppOverride: TerminalApp?
  let promptForAccessibility: Bool

  init(
    zoneArgument: String?,
    environment: [String: String],
    invokingAppOverride: TerminalApp? = nil,
    promptForAccessibility: Bool = false
  ) {
    self.zoneArgument = zoneArgument
    self.environment = environment
    self.invokingAppOverride = invokingAppOverride
    self.promptForAccessibility = promptForAccessibility
  }
}

struct TileExecutionResult {
  let message: String?
  let debugMessage: String?
}

func tileUsageText() -> String {
  """
  Usage:
    terminal-tile-core
    terminal-tile-core ZONE

  Zones:
    zl2  zl3  zl4
    zr2  zr3  zr4
  """
}

func isTileAccessibilityTrusted(prompt: Bool) -> Bool {
  if prompt {
    let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true] as CFDictionary
    return AXIsProcessTrustedWithOptions(options)
  }
  return AXIsProcessTrusted()
}

func zoneLayoutFromArg(_ value: String) -> String? {
  let key = value
    .replacingOccurrences(of: " ", with: "")
    .replacingOccurrences(of: "-", with: "")
    .replacingOccurrences(of: "_", with: "")
    .lowercased()

  switch key {
  case "zl2": return "term-left-half"
  case "zl3": return "term-left-third"
  case "zl4": return "term-left-quarter"
  case "zr2": return "term-right-half"
  case "zr3": return "term-right-third"
  case "zr4": return "term-right-quarter"
  default: return nil
  }
}

func readConfigScope(environment: [String: String]) -> String {
  let path = environment["TILE_CONFIG_FILE"] ??
    (NSHomeDirectory() as NSString).appendingPathComponent(".config/terminal-window-tiler/config")
  guard let text = try? String(contentsOfFile: path, encoding: .utf8) else {
    return ""
  }

  for rawLine in text.split(whereSeparator: \.isNewline) {
    let line = rawLine.trimmingCharacters(in: .whitespacesAndNewlines)
    if line.isEmpty || line.hasPrefix("#") || !line.contains("=") {
      continue
    }
    let parts = line.split(separator: "=", maxSplits: 1, omittingEmptySubsequences: false)
    if parts.count == 2 && parts[0].trimmingCharacters(in: .whitespaces) == "TILE_SCOPE" {
      return parts[1].trimmingCharacters(in: .whitespaces)
    }
  }
  return ""
}

func normalizeScope(_ value: String) -> String {
  let normalized = value.replacingOccurrences(of: " ", with: "").lowercased()
  switch normalized {
  case "", "current":
    return "current"
  case "all", "cross", "crossterminal", "cross-terminal", "global":
    return "all"
  default:
    return "current"
  }
}

func normalizedFrontmostTerminalApp(
  environment: [String: String],
  invokingAppOverride: TerminalApp? = nil
) -> TerminalApp? {
  if let invokingAppOverride {
    return invokingAppOverride
  }

  if let explicit = environment["TILE_INVOKING_TERMINAL_APP"] {
    switch explicit {
    case "iTerm2": return .iTerm2
    case "Terminal": return .terminal
    case "Ghostty": return .ghostty
    default: break
    }
  }

  switch environment["TERM_PROGRAM"] {
  case "iTerm.app": return .iTerm2
  case "Apple_Terminal": return .terminal
  case "ghostty": return .ghostty
  default: break
  }

  switch environment["__CFBundleIdentifier"] {
  case "com.googlecode.iterm2": return .iTerm2
  case "com.apple.Terminal": return .terminal
  case "com.mitchellh.ghostty": return .ghostty
  default: break
  }

  if let bundleID = NSWorkspace.shared.frontmostApplication?.bundleIdentifier {
    switch bundleID {
    case "com.googlecode.iterm2": return .iTerm2
    case "com.apple.Terminal": return .terminal
    case "com.mitchellh.ghostty": return .ghostty
    default: break
    }
  }

  return nil
}

func collectGhosttyPIDs() -> [pid_t] {
  var pids: Set<pid_t> = []

  for app in NSRunningApplication.runningApplications(withBundleIdentifier: "com.mitchellh.ghostty") {
    pids.insert(app.processIdentifier)
  }

  for app in NSWorkspace.shared.runningApplications {
    let localizedName = app.localizedName?.lowercased() ?? ""
    let bundleIdentifier = app.bundleIdentifier?.lowercased() ?? ""
    let bundlePath = app.bundleURL?.path.lowercased() ?? ""
    let executablePath = app.executableURL?.path.lowercased() ?? ""
    let matchesGhostty =
      localizedName.contains("ghostty") ||
      bundleIdentifier.contains("ghostty") ||
      bundlePath.contains("ghostty") ||
      executablePath.contains("ghostty")
    if matchesGhostty {
      pids.insert(app.processIdentifier)
    }
  }

  if let infos = CGWindowListCopyWindowInfo([.optionAll], CGWindowID(0)) as? [[String: Any]] {
    for info in infos {
      let owner = (info[kCGWindowOwnerName as String] as? String ?? "").lowercased()
      if owner.contains("ghostty") {
        if let pid = info[kCGWindowOwnerPID as String] as? pid_t {
          pids.insert(pid)
        } else if let number = info[kCGWindowOwnerPID as String] as? NSNumber {
          pids.insert(pid_t(number.intValue))
        }
      }
    }
  }

  let process = Process()
  process.executableURL = URL(fileURLWithPath: "/usr/bin/pgrep")
  process.arguments = ["-x", "ghostty"]
  let pipe = Pipe()
  process.standardOutput = pipe
  process.standardError = Pipe()
  if (try? process.run()) != nil {
    process.waitUntilExit()
    if process.terminationStatus == 0 {
      let text = String(decoding: pipe.fileHandleForReading.readDataToEndOfFile(), as: UTF8.self)
      for line in text.split(whereSeparator: \.isNewline) {
        if let value = Int32(line.trimmingCharacters(in: .whitespacesAndNewlines)) {
          pids.insert(value)
        }
      }
    }
  }

  return Array(pids).sorted()
}

func pids(for app: TerminalApp) -> [pid_t] {
  switch app {
  case .ghostty:
    return collectGhosttyPIDs()
  case .iTerm2, .terminal:
    let bundleID = app.bundleIdentifiers[0]
    return NSRunningApplication.runningApplications(withBundleIdentifier: bundleID)
      .map(\.processIdentifier)
      .sorted()
  }
}

func copyAXValue(_ element: AXUIElement, attribute: String) -> AXValue? {
  var rawValue: CFTypeRef?
  let error = AXUIElementCopyAttributeValue(element, attribute as CFString, &rawValue)
  guard error == .success, let rawValue, CFGetTypeID(rawValue) == AXValueGetTypeID() else {
    return nil
  }
  return (rawValue as! AXValue)
}

func getCGPoint(_ element: AXUIElement, attribute: String) -> CGPoint? {
  guard let axValue = copyAXValue(element, attribute: attribute) else {
    return nil
  }
  var point = CGPoint.zero
  guard AXValueGetType(axValue) == .cgPoint else {
    return nil
  }
  return AXValueGetValue(axValue, .cgPoint, &point) ? point : nil
}

func getCGSize(_ element: AXUIElement, attribute: String) -> CGSize? {
  guard let axValue = copyAXValue(element, attribute: attribute) else {
    return nil
  }
  var size = CGSize.zero
  guard AXValueGetType(axValue) == .cgSize else {
    return nil
  }
  return AXValueGetValue(axValue, .cgSize, &size) ? size : nil
}

func getWindowNumber(_ element: AXUIElement) -> Int? {
  var rawValue: CFTypeRef?
  let error = AXUIElementCopyAttributeValue(element, "AXWindowNumber" as CFString, &rawValue)
  guard error == .success, let rawValue else {
    return nil
  }
  if let intValue = rawValue as? Int {
    return intValue
  }
  if let number = rawValue as? NSNumber {
    return number.intValue
  }
  return nil
}

func setCGPoint(_ element: AXUIElement, attribute: String, value: CGPoint) -> AXError {
  var mutableValue = value
  guard let axValue = AXValueCreate(.cgPoint, &mutableValue) else {
    return .failure
  }
  return AXUIElementSetAttributeValue(element, attribute as CFString, axValue)
}

func setCGSize(_ element: AXUIElement, attribute: String, value: CGSize) -> AXError {
  var mutableValue = value
  guard let axValue = AXValueCreate(.cgSize, &mutableValue) else {
    return .failure
  }
  return AXUIElementSetAttributeValue(element, attribute as CFString, axValue)
}

func collectWindowRecords(for apps: [TerminalApp], promptForAccessibility: Bool) throws -> [WindowRecord] {
  guard isTileAccessibilityTrusted(prompt: promptForAccessibility) else {
    throw TileCoreError.accessibilityDenied
  }

  var records: [WindowRecord] = []
  for app in apps {
    for pid in pids(for: app) {
      let appElement = AXUIElementCreateApplication(pid)
      var rawWindows: CFTypeRef?
      let copyError = AXUIElementCopyAttributeValue(appElement, kAXWindowsAttribute as CFString, &rawWindows)
      if copyError != .success {
        continue
      }
      let windows = rawWindows as? [AXUIElement] ?? []
      for (sourceIndex, window) in windows.enumerated() {
        guard
          let position = getCGPoint(window, attribute: kAXPositionAttribute),
          let size = getCGSize(window, attribute: kAXSizeAttribute)
        else {
          continue
        }

        let left = Int(position.x.rounded())
        let top = Int(position.y.rounded())
        let width = Int(size.width.rounded())
        let height = Int(size.height.rounded())
        let key = getWindowNumber(window).map { "\(pid):\($0)" } ?? "\(pid):idx:\(sourceIndex + 1)"
        records.append(
          WindowRecord(
            app: app,
            key: key,
            element: window,
            frame: Rect(left: left, top: top, right: left + width, bottom: top + height),
            sourceIndex: sourceIndex + 1
          )
        )
      }
    }
  }
  return records
}

func visibleRectsTopLeft() throws -> [Rect] {
  let screens = NSScreen.screens
  guard !screens.isEmpty else {
    throw TileCoreError.noScreens
  }

  let maxY = screens.map { $0.frame.origin.y + $0.frame.size.height }.max() ?? 0
  return screens.map { screen in
    let frame = screen.visibleFrame
    let left = Int(frame.origin.x.rounded())
    let top = Int((maxY - (frame.origin.y + frame.size.height)).rounded())
    let width = Int(frame.size.width.rounded())
    let height = Int(frame.size.height.rounded())
    return Rect(left: left, top: top, right: left + width, bottom: top + height)
  }
}

func nearestScreenIndex(for pointX: Double, pointY: Double, rects: [Rect]) -> Int {
  for (index, rect) in rects.enumerated() {
    if pointX >= Double(rect.left), pointX < Double(rect.right), pointY >= Double(rect.top), pointY < Double(rect.bottom) {
      return index
    }
  }

  var bestIndex = 0
  var bestDistance = Double.greatestFiniteMagnitude
  for (index, rect) in rects.enumerated() {
    let dx = pointX - rect.centerX
    let dy = pointY - rect.centerY
    let d2 = (dx * dx) + (dy * dy)
    if d2 < bestDistance {
      bestDistance = d2
      bestIndex = index
    }
  }
  return bestIndex
}

func colCount(for n: Int) -> Int {
  switch n {
  case 1: return 1
  case 2: return 2
  case 3: return 3
  case 4: return 2
  case 5: return 3
  case 6: return 3
  case 7: return 4
  case 8: return 4
  case 9: return 3
  case 10: return 4
  default:
    var c = 1
    while c * c < n { c += 1 }
    return c
  }
}

func zoneConfig(for layoutName: String) -> ZoneConfig? {
  switch layoutName {
  case "term-left-half": return ZoneConfig(side: "left", divisor: 2)
  case "term-left-third": return ZoneConfig(side: "left", divisor: 3)
  case "term-left-quarter": return ZoneConfig(side: "left", divisor: 4)
  case "term-right-half": return ZoneConfig(side: "right", divisor: 2)
  case "term-right-third": return ZoneConfig(side: "right", divisor: 3)
  case "term-right-quarter": return ZoneConfig(side: "right", divisor: 4)
  default: return nil
  }
}

func zoneColumnCounts(for n: Int) -> [Int] {
  if n < 1 { return [] }
  let maxRowsPerColumn = 4
  var colCount = n / maxRowsPerColumn
  if n % maxRowsPerColumn > 0 { colCount += 1 }
  let baseCount = n / colCount
  let remainderCount = n % colCount
  return (1...colCount).map { $0 <= remainderCount ? baseCount + 1 : baseCount }
}

func absValue(_ n: Int) -> Int {
  n < 0 ? -n : n
}

func shouldSwap(_ left: WindowRecord, _ right: WindowRecord, useColumnOrder: Bool, useRightToLeft: Bool) -> Bool {
  let laneTolerance = 48
  let leftX = left.frame.left
  let leftY = left.frame.top
  let rightX = right.frame.left
  let rightY = right.frame.top

  if useColumnOrder {
    if absValue(leftX - rightX) > laneTolerance {
      return useRightToLeft ? leftX < rightX : leftX > rightX
    }
    if absValue(leftY - rightY) > laneTolerance {
      return leftY > rightY
    }
    return useRightToLeft ? leftX < rightX : leftX > rightX
  }

  if absValue(leftY - rightY) > laneTolerance {
    return leftY > rightY
  }
  if absValue(leftX - rightX) > laneTolerance {
    return leftX > rightX
  }
  return left.sourceIndex > right.sourceIndex
}

func sortedRecords(_ records: [WindowRecord], useColumnOrder: Bool, useRightToLeft: Bool) -> [WindowRecord] {
  records.sorted { left, right in
    shouldSwap(right, left, useColumnOrder: useColumnOrder, useRightToLeft: useRightToLeft)
  }
}

func frameEquals(_ left: Rect, _ right: Rect) -> Bool {
  left.left == right.left && left.top == right.top && left.right == right.right && left.bottom == right.bottom
}

func buildOperations(
  records: [WindowRecord],
  screenRects: [Rect],
  zoneLayout: String?,
  gap: Int,
  margins: (top: Int, right: Int, bottom: Int, left: Int)
) -> [MoveOperation] {
  let advancedMode = zoneLayout != nil
  let zoneCfg = zoneLayout.flatMap(zoneConfig(for:))

  var groups = Array(repeating: [WindowRecord](), count: screenRects.count)
  for record in records {
    let index = nearestScreenIndex(for: record.frame.centerX, pointY: record.frame.centerY, rects: screenRects)
    groups[index].append(record)
  }

  var operations: [MoveOperation] = []
  for (screenIndex, rawGroup) in groups.enumerated() where !rawGroup.isEmpty {
    let group = sortedRecords(rawGroup, useColumnOrder: advancedMode, useRightToLeft: zoneCfg?.side == "right")
    let screen = screenRects[screenIndex]
    let availLeft = screen.left + margins.left
    let availTop = screen.top + margins.top
    let availRight = screen.right - margins.right
    let availBottom = screen.bottom - margins.bottom
    let availW = max(availRight - availLeft, 200)
    let availH = max(availBottom - availTop, 200)

    var zoneLeft = availLeft
    let zoneTop = availTop
    var zoneRight = availLeft + availW
    let zoneBottom = availTop + availH

    if let zoneCfg, zoneCfg.divisor > 0 {
      let zoneWidth = availW / zoneCfg.divisor
      if zoneCfg.side == "left" {
        zoneRight = availLeft + zoneWidth
      } else {
        zoneLeft = zoneRight - zoneWidth
      }
    }

    let zoneW = zoneRight - zoneLeft
    let zoneH = zoneBottom - zoneTop

    if let zoneCfg {
      let counts = zoneColumnCounts(for: group.count)
      let colCount = counts.count
      let maxRows = counts.max() ?? 1
      let cellW = (zoneW - (gap * max(colCount - 1, 0))) / max(colCount, 1)
      let cellH = (zoneH - (gap * max(maxRows - 1, 0))) / max(maxRows, 1)
      var recordIndex = 0

      for logicalCol in 0..<colCount {
        let colRows = counts[logicalCol]
        let visualCol = zoneCfg.side == "right" ? (colCount - 1 - logicalCol) : logicalCol
        let x1 = zoneLeft + (visualCol * (cellW + gap))
        let x2 = (visualCol == colCount - 1) ? zoneRight : (x1 + cellW)

        for row in 0..<colRows {
          let y1 = zoneTop + (row * (cellH + gap))
          let y2 = (row == maxRows - 1) ? zoneBottom : (y1 + cellH)
          let record = group[recordIndex]
          let target = Rect(left: x1, top: y1, right: x2, bottom: y2)
          if !frameEquals(record.frame, target) {
            operations.append(MoveOperation(record: record, target: target))
          }
          recordIndex += 1
        }
      }
    } else {
      let colCount = colCount(for: group.count)
      let rowCount = Int(ceil(Double(group.count) / Double(colCount)))
      let cellW = (zoneW - (gap * max(colCount - 1, 0))) / max(colCount, 1)
      let cellH = (zoneH - (gap * max(rowCount - 1, 0))) / max(rowCount, 1)

      for (index, record) in group.enumerated() {
        let row = index / colCount
        let col = index % colCount
        let x1 = zoneLeft + (col * (cellW + gap))
        let y1 = zoneTop + (row * (cellH + gap))
        let x2 = (col == colCount - 1) ? zoneRight : (x1 + cellW)
        let y2 = (row == rowCount - 1) ? zoneBottom : (y1 + cellH)
        let target = Rect(left: x1, top: y1, right: x2, bottom: y2)
        if !frameEquals(record.frame, target) {
          operations.append(MoveOperation(record: record, target: target))
        }
      }
    }
  }

  return operations
}

func applyOperations(_ operations: [MoveOperation]) throws {
  for operation in operations {
    let position = CGPoint(x: operation.target.left, y: operation.target.top)
    let size = CGSize(width: max(operation.target.width, 1), height: max(operation.target.height, 1))
    let posResult = setCGPoint(operation.record.element, attribute: kAXPositionAttribute, value: position)
    let sizeResult = setCGSize(operation.record.element, attribute: kAXSizeAttribute, value: size)
    if posResult != .success || sizeResult != .success {
      throw TileCoreError.accessibilityDenied
    }
  }
}

func appsForScope(scope: String, invoking: TerminalApp?) throws -> [TerminalApp] {
  if scope == "all" {
    return TerminalApp.allCases
  }
  guard let invoking else {
    throw TileCoreError.unsupportedInvokingApp
  }
  return [invoking]
}

func executeTile(options: TileExecutionOptions) throws -> TileExecutionResult {
  let zoneLayout = options.zoneArgument.flatMap(zoneLayoutFromArg)
  if options.zoneArgument != nil && zoneLayout == nil {
    throw TileCoreError.invalidInput("无效分区: \(options.zoneArgument!)（请使用 zl2/zl3/zl4/zr2/zr3/zr4）")
  }

  let environment = options.environment
  let gap = Int(environment["TILE_GAP"] ?? "") ?? 10
  let margins = (
    top: Int(environment["TILE_MARGIN_TOP"] ?? "") ?? 6,
    right: Int(environment["TILE_MARGIN_RIGHT"] ?? "") ?? 8,
    bottom: Int(environment["TILE_MARGIN_BOTTOM"] ?? "") ?? 8,
    left: Int(environment["TILE_MARGIN_LEFT"] ?? "") ?? 8
  )
  let debug = environment["TILE_DEBUG"] == "1"
  let configScope = readConfigScope(environment: environment)
  let scope = normalizeScope(environment["TILE_SCOPE"] ?? configScope)
  let invoking = normalizedFrontmostTerminalApp(environment: environment, invokingAppOverride: options.invokingAppOverride)
  let apps = try appsForScope(scope: scope, invoking: invoking)

  let records = try collectWindowRecords(for: apps, promptForAccessibility: options.promptForAccessibility)
  if records.isEmpty {
    return TileExecutionResult(
      message: "未检测到 iTerm2 / Terminal / Ghostty 窗口。",
      debugMessage: debug ? "NO_WINDOWS" : nil
    )
  }

  if records.count == 1 && zoneLayout == nil {
    return TileExecutionResult(
      message: "当前只检测到 1 个终端窗口，无法平铺。",
      debugMessage: debug ? "ONLY_ONE_WINDOW" : nil
    )
  }

  let screenRects = try visibleRectsTopLeft()
  let operations = buildOperations(records: records, screenRects: screenRects, zoneLayout: zoneLayout, gap: gap, margins: margins)
  try applyOperations(operations)

  if debug {
    let itermCount = records.filter { $0.app == .iTerm2 }.count
    let terminalCount = records.filter { $0.app == .terminal }.count
    let ghosttyCount = records.filter { $0.app == .ghostty }.count
    let target = invoking?.rawValue ?? ""
    return TileExecutionResult(
      message: nil,
      debugMessage: "OK,iterm=\(itermCount),terminal=\(terminalCount),ghostty=\(ghosttyCount),zoneLayout=\(zoneLayout ?? ""),scope=\(scope),target=\(target)"
    )
  }

  return TileExecutionResult(message: nil, debugMessage: nil)
}
