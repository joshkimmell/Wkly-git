//
//  SceneDelegate.swift
//  App
//
//  Created by Josh Kimmell on 4/29/26.
//


import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = (scene as? UIWindowScene) else { return }
        self.window = UIWindow(windowScene: windowScene)
        self.window?.rootViewController = CAPBridgeViewController()
        self.window?.makeKeyAndVisible()
    }
}
