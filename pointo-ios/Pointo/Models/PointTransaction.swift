import Foundation

struct PointTransaction: Identifiable, Hashable, Codable {
    enum Reason: Codable, Hashable {
        case signupBonus
        case dailyCheckIn
        case walkMilestone(steps: Int)
        case missionCompleted(missionId: String)
        case referralInstall(code: String)
        case referralInvite(code: String)
        case redeem(rewardId: String)
        case adjustment(note: String)

        var localizationKey: String {
            switch self {
            case .signupBonus: return "txn.signup"
            case .dailyCheckIn: return "txn.daily"
            case .walkMilestone: return "txn.walk"
            case .missionCompleted: return "txn.mission"
            case .referralInstall: return "txn.referral.install"
            case .referralInvite: return "txn.referral.invite"
            case .redeem: return "txn.redeem"
            case .adjustment: return "txn.adjustment"
            }
        }

        var symbol: String {
            switch self {
            case .signupBonus: return "sparkles"
            case .dailyCheckIn: return "calendar.badge.checkmark"
            case .walkMilestone: return "figure.walk"
            case .missionCompleted: return "checkmark.seal.fill"
            case .referralInstall: return "link.badge.plus"
            case .referralInvite: return "person.2.fill"
            case .redeem: return "gift.fill"
            case .adjustment: return "slider.horizontal.3"
            }
        }
    }

    let id: UUID
    let amount: Int
    let reason: Reason
    let createdAt: Date

    init(
        id: UUID = UUID(),
        amount: Int,
        reason: Reason,
        createdAt: Date = Date()
    ) {
        self.id = id
        self.amount = amount
        self.reason = reason
        self.createdAt = createdAt
    }

    var isCredit: Bool { amount >= 0 }
}
