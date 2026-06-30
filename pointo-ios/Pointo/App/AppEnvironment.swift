import Foundation
import Combine

/// Top-level dependency container. Built once at launch and propagated through
/// SwiftUI's environment so that views can observe shared state without
/// creating their own service instances.
@MainActor
final class AppEnvironment: ObservableObject {
    let auth: AuthService
    let points: PointsStore
    let steps: StepCounter
    let referral: ReferralService
    let rewards: RewardCatalog

    private var cancellables: Set<AnyCancellable> = []

    init(
        auth: AuthService,
        points: PointsStore,
        steps: StepCounter,
        referral: ReferralService,
        rewards: RewardCatalog
    ) {
        self.auth = auth
        self.points = points
        self.steps = steps
        self.referral = referral
        self.rewards = rewards

        wireMissionCompletion()
        wireReferralBonus()
        wireSessionLifecycle()
    }

    static func live() -> AppEnvironment {
        let auth = AuthService()
        let points = PointsStore()
        let steps = StepCounter()
        let referral = ReferralService()
        let rewards = RewardCatalog()
        return AppEnvironment(
            auth: auth,
            points: points,
            steps: steps,
            referral: referral,
            rewards: rewards
        )
    }

    /// Award walk-to-earn points whenever the user crosses a step milestone.
    private func wireMissionCompletion() {
        steps.$todaySteps
            .removeDuplicates()
            .sink { [weak self] steps in
                guard let self else { return }
                self.points.creditWalkRewards(forSteps: steps)
            }
            .store(in: &cancellables)
    }

    /// Award the referral install bonus when a deep link is opened.
    private func wireReferralBonus() {
        referral.$lastConsumedCode
            .compactMap { $0 }
            .sink { [weak self] code in
                self?.points.credit(
                    amount: ReferralService.installRewardPoints,
                    reason: .referralInstall(code: code)
                )
            }
            .store(in: &cancellables)
    }

    /// Reset volatile session state when the user logs out.
    private func wireSessionLifecycle() {
        auth.$currentUser
            .sink { [weak self] user in
                guard let self else { return }
                if user == nil {
                    self.points.resetForLogout()
                    self.steps.stop()
                } else {
                    self.points.bootstrapForSession()
                    self.steps.start()
                }
            }
            .store(in: &cancellables)
    }
}
