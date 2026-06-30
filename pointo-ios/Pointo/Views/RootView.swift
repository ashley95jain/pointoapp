import SwiftUI

struct RootView: View {
    @EnvironmentObject private var auth: AuthService
    @EnvironmentObject private var referral: ReferralService

    var body: some View {
        Group {
            switch auth.state {
            case .loggedIn:
                MainTabView()
                    .transition(.opacity.combined(with: .move(edge: .trailing)))
            default:
                LoginView()
                    .transition(.opacity.combined(with: .move(edge: .leading)))
            }
        }
        .animation(.easeInOut(duration: 0.25), value: auth.state)
        .onChange(of: auth.currentUser) { _, newValue in
            if let newValue {
                referral.bindOwnReferralCode(newValue.referralCode)
            }
        }
        .onAppear {
            if let user = auth.currentUser {
                referral.bindOwnReferralCode(user.referralCode)
            }
        }
    }
}

#Preview {
    RootView()
        .environmentObject(AuthService())
        .environmentObject(PointsStore())
        .environmentObject(StepCounter())
        .environmentObject(ReferralService())
        .environmentObject(RewardCatalog())
}
