import Foundation
import Combine

/// In-memory ledger of point credits/debits with simple persistence to
/// `UserDefaults`. The interface is intentionally thin so it can be swapped
/// for a remote ledger backed by Firestore, Supabase, or a custom service
/// without changing call sites.
@MainActor
final class PointsStore: ObservableObject {
    @Published private(set) var balance: Int = 0
    @Published private(set) var transactions: [PointTransaction] = []
    @Published private(set) var missions: [Mission] = Mission.defaults

    private let walkMilestones: [Int] = [3_000, 5_000, 8_000, 10_000]
    private(set) var claimedWalkMilestones: Set<Int> = []

    private let userDefaults: UserDefaults
    private let storageKey = "pointo.ledger"

    init(userDefaults: UserDefaults = .standard) {
        self.userDefaults = userDefaults
        restorePersistedLedger()
    }

    // MARK: - Lifecycle

    func bootstrapForSession() {
        if transactions.isEmpty {
            credit(amount: 120, reason: .signupBonus)
        }
    }

    func resetForLogout() {
        balance = 0
        transactions = []
        missions = Mission.defaults
        claimedWalkMilestones = []
        userDefaults.removeObject(forKey: storageKey)
    }

    // MARK: - Crediting

    func credit(amount: Int, reason: PointTransaction.Reason) {
        guard amount != 0 else { return }
        let txn = PointTransaction(amount: amount, reason: reason)
        transactions.insert(txn, at: 0)
        balance = max(0, balance + amount)

        applyToMissions(reason: reason, amount: amount)
        persist()
    }

    /// Credit walk milestones based on the current step count. Each milestone
    /// is only paid once per day's tracking session.
    func creditWalkRewards(forSteps steps: Int) {
        for milestone in walkMilestones where steps >= milestone && !claimedWalkMilestones.contains(milestone) {
            claimedWalkMilestones.insert(milestone)
            let reward = walkMilestoneReward(for: milestone)
            credit(amount: reward, reason: .walkMilestone(steps: milestone))
        }
        updateWalkMissionProgress(steps: steps)
    }

    /// Attempt to redeem a reward. Returns false when the balance is too low.
    @discardableResult
    func redeem(_ reward: Reward) -> Bool {
        guard balance >= reward.cost else { return false }
        credit(amount: -reward.cost, reason: .redeem(rewardId: reward.id))
        return true
    }

    /// Manually mark a mission as completed (e.g. for the "install" or
    /// "invite" missions where the underlying event is detected elsewhere).
    func completeMission(id: String) {
        guard let idx = missions.firstIndex(where: { $0.id == id }), !missions[idx].completed else { return }
        var mission = missions[idx]
        mission.completed = true
        if let target = mission.target {
            mission.progress = target
        }
        missions[idx] = mission
        credit(amount: mission.rewardPoints, reason: .missionCompleted(missionId: mission.id))
    }

    // MARK: - Mission progress

    private func applyToMissions(reason: PointTransaction.Reason, amount: Int) {
        switch reason {
        case .referralInstall:
            markCompleted(id: "install")
        case .referralInvite:
            markCompleted(id: "invite_friend")
        case .dailyCheckIn:
            markCompleted(id: "daily_checkin")
        case .missionCompleted(let id):
            markCompleted(id: id)
        case .walkMilestone(let steps):
            if steps >= 8_000 {
                markCompleted(id: "walk_8000")
            }
        default:
            break
        }
    }

    private func updateWalkMissionProgress(steps: Int) {
        guard let idx = missions.firstIndex(where: { $0.id == "walk_8000" }) else { return }
        var mission = missions[idx]
        mission.progress = min(steps, mission.target ?? steps)
        if let target = mission.target, mission.progress >= target {
            mission.completed = true
        }
        missions[idx] = mission
    }

    private func markCompleted(id: String) {
        guard let idx = missions.firstIndex(where: { $0.id == id }) else { return }
        missions[idx].completed = true
        if let target = missions[idx].target {
            missions[idx].progress = target
        }
    }

    private func walkMilestoneReward(for milestone: Int) -> Int {
        switch milestone {
        case 0..<3_000: return 0
        case 3_000..<5_000: return 30
        case 5_000..<8_000: return 60
        case 8_000..<10_000: return 100
        default: return 200
        }
    }

    // MARK: - Persistence

    private struct LedgerSnapshot: Codable {
        var balance: Int
        var transactions: [PointTransaction]
        var completedMissionIDs: [String]
        var walkProgress: Int
        var claimedWalkMilestones: [Int]
    }

    private func persist() {
        let snapshot = LedgerSnapshot(
            balance: balance,
            transactions: transactions,
            completedMissionIDs: missions.filter(\.completed).map(\.id),
            walkProgress: missions.first(where: { $0.id == "walk_8000" })?.progress ?? 0,
            claimedWalkMilestones: Array(claimedWalkMilestones)
        )
        if let data = try? JSONEncoder().encode(snapshot) {
            userDefaults.set(data, forKey: storageKey)
        }
    }

    private func restorePersistedLedger() {
        guard
            let data = userDefaults.data(forKey: storageKey),
            let snapshot = try? JSONDecoder().decode(LedgerSnapshot.self, from: data)
        else { return }
        balance = snapshot.balance
        transactions = snapshot.transactions
        claimedWalkMilestones = Set(snapshot.claimedWalkMilestones)
        let completed = Set(snapshot.completedMissionIDs)
        missions = Mission.defaults.map { mission in
            var updated = mission
            updated.completed = completed.contains(mission.id)
            if mission.id == "walk_8000" {
                updated.progress = snapshot.walkProgress
            } else if updated.completed, let target = mission.target {
                updated.progress = target
            }
            return updated
        }
    }
}
