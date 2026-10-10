//
//  CaptureWebView.swift
//
import SwiftUI
import WebKit

struct CaptureWebView: UIViewRepresentable {
    let url: URL

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        // getUserMedia needs inline playback; the viewfinder is a <video playsinline>.
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.websiteDataStore = .default() // keeps login + IndexedDB upload queue

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.uiDelegate = context.coordinator
        webView.navigationDelegate = context.coordinator
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.bounces = false
        webView.allowsBackForwardNavigationGestures = false

        let refresh = UIRefreshControl()
        refresh.addTarget(context.coordinator, action: #selector(Coordinator.reload(_:)), for: .valueChanged)
        webView.scrollView.refreshControl = refresh
        context.coordinator.webView = webView

        webView.load(URLRequest(url: url, cachePolicy: .reloadRevalidatingCacheData))
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKUIDelegate, WKNavigationDelegate {
        weak var webView: WKWebView?

        @objc func reload(_ sender: UIRefreshControl) {
            webView?.reload()
            sender.endRefreshing()
        }

        // The OS camera prompt (NSCameraUsageDescription) already asked the
        // user once; don't stack a second per-page web prompt on top of it.
        @available(iOS 15.0, *)
        func webView(
            _ webView: WKWebView,
            requestMediaCapturePermissionFor origin: WKSecurityOrigin,
            initiatedByFrame frame: WKFrameInfo,
            type: WKMediaCaptureType,
            decisionHandler: @escaping (WKPermissionDecision) -> Void
        ) {
            decisionHandler(origin.host == "motorcycle-verification-capture.web.app" ? .grant : .prompt)
        }

        // DeviceMotionEvent.requestPermission() — drives the level line.
        @available(iOS 15.0, *)
        func webView(
            _ webView: WKWebView,
            requestDeviceOrientationAndMotionPermissionFor origin: WKSecurityOrigin,
            initiatedByFrame frame: WKFrameInfo,
            decisionHandler: @escaping (WKPermissionDecision) -> Void
        ) {
            decisionHandler(origin.host == "motorcycle-verification-capture.web.app" ? .grant : .prompt)
        }

        // window.confirm() — used before leaving with photos still uploading.
        func webView(
            _ webView: WKWebView,
            runJavaScriptConfirmPanelWithMessage message: String,
            initiatedByFrame frame: WKFrameInfo,
            completionHandler: @escaping (Bool) -> Void
        ) {
            let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "取消", style: .cancel) { _ in completionHandler(false) })
            alert.addAction(UIAlertAction(title: "確定", style: .default) { _ in completionHandler(true) })
            present(alert, orElse: { completionHandler(false) })
        }

        func webView(
            _ webView: WKWebView,
            runJavaScriptAlertPanelWithMessage message: String,
            initiatedByFrame frame: WKFrameInfo,
            completionHandler: @escaping () -> Void
        ) {
            let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "好", style: .default) { _ in completionHandler() })
            present(alert, orElse: completionHandler)
        }

        private func present(_ alert: UIAlertController, orElse fallback: @escaping () -> Void) {
            guard let root = UIApplication.shared.connectedScenes
                .compactMap({ ($0 as? UIWindowScene)?.keyWindow?.rootViewController }).first
            else { return fallback() }
            var top = root
            while let next = top.presentedViewController { top = next }
            top.present(alert, animated: true)
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            let html = """
            <meta name="viewport" content="width=device-width,initial-scale=1">
            <body style="background:#0b0f14;color:#e9eef5;font-family:-apple-system;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center">
            <div><p>無法連線到採集服務</p><p style="color:#8b97a8;font-size:14px">\(error.localizedDescription)</p><p style="color:#8b97a8;font-size:14px">往下拉可重新整理</p></div></body>
            """
            webView.loadHTMLString(html, baseURL: nil)
        }
    }
}
