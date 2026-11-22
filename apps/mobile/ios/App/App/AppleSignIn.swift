import UIKit
import Capacitor
import AuthenticationServices
import WebKit

// Sign in with Apple for the iPhone app (Apple guideline 4.8: an app offering Discord sign-in must offer
// it too). smashy.gg's sign-in page calls window.Capacitor.Plugins.AppleSignIn.authorize({ nonce }) and
// hands the identity token Apple returns to Supabase, which checks it against the nonce. Written here
// instead of a community plugin because those pin an older Capacitor.

/// The app's main screen: Capacitor's web view, plus Smashy's own plugin.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(AppleSignInPlugin())
        // Smashy draws its own flame-red scroll bar (components/ScrollIndicator.tsx on the site): hide
        // iOS's, and mark every page so the site knows to draw it.
        webView?.scrollView.showsVerticalScrollIndicator = false
        let mark = WKUserScript(source: "document.documentElement.setAttribute('data-native-scroll','')",
                                injectionTime: .atDocumentStart, forMainFrameOnly: true)
        webView?.configuration.userContentController.addUserScript(mark)
        // Swipe in from the left edge to go back (and from the right to go forward), like Safari
        // (Matthew, 2026-11-19). Works with the site's in-app page changes too.
        webView?.allowsBackForwardNavigationGestures = true
    }
}

@objc(AppleSignInPlugin)
public class AppleSignInPlugin: CAPPlugin, CAPBridgedPlugin, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    public let identifier = "AppleSignInPlugin"
    public let jsName = "AppleSignIn"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authorize", returnType: CAPPluginReturnPromise),
    ]

    private var pending: CAPPluginCall?
    private var controller: ASAuthorizationController?

    /// Shows Apple's sign-in sheet. `nonce` is the SHA-256 of a random value the site keeps.
    @objc func authorize(_ call: CAPPluginCall) {
        guard let nonce = call.getString("nonce"), !nonce.isEmpty else {
            call.reject("Missing nonce", "failed")
            return
        }
        DispatchQueue.main.async {
            self.pending?.reject("Replaced by a newer sign-in", "canceled")
            self.pending = call
            let request = ASAuthorizationAppleIDProvider().createRequest()
            request.requestedScopes = [.email]
            request.nonce = nonce
            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            self.controller = controller
            controller.performRequests()
        }
    }

    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return bridge?.viewController?.view.window ?? UIWindow()
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let call = finish() else { return }
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let data = credential.identityToken,
              let token = String(data: data, encoding: .utf8) else {
            call.reject("Apple returned no identity token", "failed")
            return
        }
        // The one-time code lets the server keep the Apple link, so deleting the account can cancel it.
        let code = credential.authorizationCode.flatMap { String(data: $0, encoding: .utf8) } ?? ""
        call.resolve(["identityToken": token, "authorizationCode": code])
    }

    public func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        guard let call = finish() else { return }
        let canceled = (error as? ASAuthorizationError)?.code == .canceled
        call.reject(error.localizedDescription, canceled ? "canceled" : "failed")
    }

    private func finish() -> CAPPluginCall? {
        let call = pending
        pending = nil
        controller = nil
        return call
    }
}
