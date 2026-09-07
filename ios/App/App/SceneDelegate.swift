import UIKit
import Capacitor

/// Enables iOS's native edge-swipe back/forward gesture on the app's single
/// WKWebView. Off by default in WKWebView — Capacitor doesn't expose a
/// capacitor.config.ts toggle for this, so it's set here once the webview is
/// ready. Safe to enable broadly: the app's router uses real HTML5 history
/// (createWebHistory), so this gesture just calls the same history.back()
/// every in-app "上一頁" already relies on. The couple of screens whose
/// header back button intentionally goes to a fixed destination instead of
/// raw history (ChatRoomView.vue, VerificationStepsView.vue) will have that
/// same divergence from history.back() via this gesture — same tradeoff as
/// Android's hardware/gesture back button, which src/main.ts's
/// `backButton` listener (@capacitor/app) also drives through router.back().
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        webView?.allowsBackForwardNavigationGestures = true
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = MainViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
