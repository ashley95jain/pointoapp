import Foundation
import Combine

/// Exposes the redeemable reward catalogue. Kept as a separate observable so
/// the API can later be powered by a remote configuration (for partner
/// promotions, seasonal campaigns, etc.) without churning the views.
@MainActor
final class RewardCatalog: ObservableObject {
    @Published private(set) var rewards: [Reward]

    init(rewards: [Reward] = Reward.catalogue) {
        self.rewards = rewards
    }

    func rewards(in category: Reward.Category) -> [Reward] {
        rewards.filter { $0.category == category }
    }

    func refresh() {
        // Placeholder for a future network refresh. Kept here so views can
        // already wire up a pull-to-refresh affordance.
    }
}
