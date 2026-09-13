import Cocoa
import WebKit

final class GameDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate {
    var window: NSWindow!
    var webView: WKWebView!
    let verifying = CommandLine.arguments.contains("--verify-game")

    func applicationDidFinishLaunching(_ notification: Notification) {
        let menu = NSMenu()
        let appItem = NSMenuItem()
        let appMenu = NSMenu()
        appMenu.addItem(withTitle: "О программе «Гуров»", action: #selector(showAbout), keyEquivalent: "")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "Скрыть «Гуров»", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        appMenu.addItem(withTitle: "Завершить «Гуров»", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appItem.submenu = appMenu
        menu.addItem(appItem)
        let viewItem = NSMenuItem()
        let viewMenu = NSMenu(title: "Вид")
        let full = NSMenuItem(title: "Полный экран", action: #selector(toggleFullscreen), keyEquivalent: "f")
        full.keyEquivalentModifierMask = [.command, .control]
        viewMenu.addItem(full)
        viewItem.submenu = viewMenu
        menu.addItem(viewItem)
        NSApp.mainMenu = menu

        let config = WKWebViewConfiguration()
        config.websiteDataStore = verifying ? .nonPersistent() : .default()
        config.mediaTypesRequiringUserActionForPlayback = []
        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.setValue(false, forKey: "drawsBackground")
        if #available(macOS 13.3, *) { webView.isInspectable = false }

        let screen = NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1440, height: 900)
        let width = min(1280.0, screen.width - 50)
        let height = min(720.0, screen.height - 100)
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: width, height: height), styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
        window.title = "Гуров — Последний удовл"
        window.backgroundColor = NSColor(calibratedRed: 0.04, green: 0.07, blue: 0.12, alpha: 1)
        window.appearance = NSAppearance(named: .darkAqua)
        window.minSize = NSSize(width: 840, height: 500)
        window.collectionBehavior = [.fullScreenPrimary]
        window.contentView = webView
        window.center()
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        guard let game = Bundle.main.resourceURL?.appendingPathComponent("game"), FileManager.default.fileExists(atPath: game.appendingPathComponent("index.html").path) else {
            let alert = NSAlert(); alert.messageText = "Не найдены файлы игры"; alert.informativeText = "Пересоберите приложение: python3 build.py"; alert.runModal(); NSApp.terminate(nil); return
        }
        webView.loadFileURL(game.appendingPathComponent("index.html"), allowingReadAccessTo: game)
    }
    @objc func toggleFullscreen() { window.toggleFullScreen(nil) }
    @objc func showAbout() {
        NSApp.orderFrontStandardAboutPanel(options: [.applicationName: "Гуров — Последний удовл", .applicationVersion: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "2.7.0", .credits: NSAttributedString(string: "Авторская игра о вымышленном профессоре.\nЧетыре главы, одно доказательство.\nВнешность вдохновлена открытым портретом С. И. Гурова, ВМК МГУ.")])
    }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        guard verifying else { return }
        let script = """
        const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
        const resumeAutoPause = () => {
            if (gurov.state.mode === 'modal' && document.getElementById('modal-title').textContent === 'Мысль не потеряна.') document.querySelector('#modal-actions button').click();
        };
        for (let i = 0; i < 100 && !window.gurov?.state.assetReady; i++) await wait(50);
        if (!window.gurov?.state.assetReady) throw Error('Sprite not loaded');
        // Decoding a track and resuming its context complete independently.
        // Wait for both before checking autoplay, without a click or keypress.
        for (let i = 0; i < 100 && (gurov.state.audio.track !== 'menu' || gurov.state.audio.context !== 'running'); i++) await wait(50);
        const menuAudio = gurov.state.audio;
        if (gurov.state.mode !== 'menu' || menuAudio.context !== 'running' || menuAudio.track !== 'menu' || menuAudio.nodes !== 1 || menuAudio.master < .5) throw Error('Menu music did not autoplay: ' + JSON.stringify(menuAudio));
        await wait(200);
        if (gurov.state.audio.time <= menuAudio.time) throw Error('Menu audio clock is stopped');
        document.getElementById('start').click();
        if (gurov.state.mode === 'prologue') document.getElementById('prologue-skip').click();
        document.querySelector('#modal-actions button').click();
        await wait(400);
        resumeAutoPause();
        const x = gurov.state.player.x;
        for (let i = 0; i < 24 && gurov.state.player.x < x + 90; i++) {
            resumeAutoPause();
            dispatchEvent(new KeyboardEvent('keydown', {code:'KeyD'}));
            await wait(50);
        }
        dispatchEvent(new KeyboardEvent('keyup', {code:'KeyD'}));
        if (gurov.state.player.x < x + 50) throw Error('Native keyboard movement failed');
        dispatchEvent(new KeyboardEvent('keydown', {code:'Space'}));
        await wait(200);
        dispatchEvent(new KeyboardEvent('keyup', {code:'Space'}));
        await wait(250);
        resumeAutoPause();
        dispatchEvent(new KeyboardEvent('keydown', {code:'Escape'}));
        if (gurov.state.mode !== 'modal') throw Error('Pause failed');
        document.querySelector('#modal-actions button').click();
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        for (const cue of ['menu','field','erik','erik-tension','ivan','ivan-tension']) {
            const track = await GurovMusicBank.get(cue, audioContext);
            if (track.buffer.duration < 20) throw Error('Invalid music buffer: ' + cue);
        }
        await audioContext.close();
        const voiceCheck = new GurovSound();
        voiceCheck.init(); voiceCheck.requested = 'unavailable';
        for (const actor of ['erik','dyukova']) {
            const entry = Object.entries(GurovVoiceManifest).find(([key, meta]) => meta.actor === actor);
            await voiceCheck.speak(actor, entry[0].slice(actor.length + 1), 4);
            if (!voiceCheck.voiceActive || voiceCheck.voiceLanguage !== 'ru-RU' || voiceCheck.voiceDuration < .3) throw Error('Native Russian voice failed: ' + actor);
            await wait(200);
            voiceCheck.stopSpeech();
        }
        voiceCheck.close();
        return JSON.stringify({engine:'WKWebView',menuAutoplay:menuAudio,state:gurov.state,music:GurovMusicBank.loaded,save:!!localStorage.getItem('gurov-last-lemma-v1')});
        """
        webView.callAsyncJavaScript(script, arguments: [:], in: nil, in: .page) { result in
            switch result {
            case .success(let value):
                print("NATIVE SMOKE PASS: \(value)")
                let config = WKSnapshotConfiguration()
                webView.takeSnapshot(with: config) { image, error in
                    if let image = image, let tiff = image.tiffRepresentation, let bitmap = NSBitmapImageRep(data: tiff), let png = bitmap.representation(using: .png, properties: [:]) {
                        let url = URL(fileURLWithPath: FileManager.default.currentDirectoryPath).appendingPathComponent("tests/.output/native.png")
                        try? FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
                        try? png.write(to: url)
                    }
                    NSApp.terminate(nil)
                }
            case .failure(let error):
                fputs("NATIVE SMOKE FAILED: \(error)\n", stderr)
                exit(1)
            }
        }
    }
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if let url = navigationAction.request.url, ["https", "http"].contains(url.scheme ?? "") {
            NSWorkspace.shared.open(url); decisionHandler(.cancel)
        } else { decisionHandler(.allow) }
    }
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = navigationAction.request.url, ["https", "http"].contains(url.scheme ?? "") { NSWorkspace.shared.open(url) }; return nil
    }
}

let app = NSApplication.shared
let delegate = GameDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
