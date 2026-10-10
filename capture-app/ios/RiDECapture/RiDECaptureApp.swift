//
//  RiDECaptureApp.swift
//  RiDE 採集 — native shell for the developer capture web app.
//
//  The app itself lives at /capture/ on its own Hosting site (capture-app/ in the
//  repo); this shell only hosts it in a WKWebView so it can be installed on a
//  phone, gets proper camera/motion permission prompts, and picks up every
//  web deploy without reinstalling.
//
import SwiftUI

@main
struct RiDECaptureApp: App {
    var body: some Scene {
        WindowGroup {
            CaptureWebView(url: URL(string: "https://motorcycle-verification-capture.web.app/capture/")!)
                .ignoresSafeArea()
                .background(Color(red: 11 / 255, green: 15 / 255, blue: 20 / 255))
                .preferredColorScheme(.dark)
        }
    }
}
