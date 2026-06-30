import SwiftUI

@main
struct PointoApp: App {
    @StateObject private var environment = AppEnvironment.live()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(environment)
                .environmentObject(environment.auth)
                .environmentObject(environment.points)
                .environmentObject(environment.steps)
                .environmentObject(environment.referral)
                .environmentObject(environment.rewards)
                .preferredColorScheme(.light)
                .tint(PointoTheme.brandPrimary)
                .onOpenURL { url in
                    environment.referral.handleIncomingURL(url)
                }
        }
    }
}
