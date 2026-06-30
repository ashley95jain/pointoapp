import SwiftUI

struct MainTabView: View {
    var body: some View {
        TabView {
            HomeView()
                .tabItem {
                    Label("tab.home", systemImage: "house.fill")
                }

            WalkView()
                .tabItem {
                    Label("tab.walk", systemImage: "figure.walk")
                }

            ReferralView()
                .tabItem {
                    Label("tab.refer", systemImage: "person.2.fill")
                }

            WalletView()
                .tabItem {
                    Label("tab.wallet", systemImage: "wallet.pass.fill")
                }
        }
    }
}

#Preview {
    MainTabView()
        .environmentObject(AuthService())
        .environmentObject(PointsStore())
        .environmentObject(StepCounter())
        .environmentObject(ReferralService())
        .environmentObject(RewardCatalog())
}
