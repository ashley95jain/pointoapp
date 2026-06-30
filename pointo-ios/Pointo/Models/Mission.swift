import Foundation

struct Mission: Identifiable, Hashable {
    enum Kind: String, Codable {
        case install
        case walk
        case invite
        case daily
        case partnerOffer
    }

    let id: String
    let kind: Kind
    let titleKey: String
    let descriptionKey: String
    let rewardPoints: Int
    let target: Int?
    var progress: Int
    var completed: Bool
    var ctaKey: String

    init(
        id: String,
        kind: Kind,
        titleKey: String,
        descriptionKey: String,
        rewardPoints: Int,
        target: Int? = nil,
        progress: Int = 0,
        completed: Bool = false,
        ctaKey: String = "common.claim"
    ) {
        self.id = id
        self.kind = kind
        self.titleKey = titleKey
        self.descriptionKey = descriptionKey
        self.rewardPoints = rewardPoints
        self.target = target
        self.progress = progress
        self.completed = completed
        self.ctaKey = ctaKey
    }

    var progressFraction: Double {
        guard let target, target > 0 else { return completed ? 1 : 0 }
        return min(1, max(0, Double(progress) / Double(target)))
    }
}

extension Mission {
    static let defaults: [Mission] = [
        Mission(
            id: "install",
            kind: .install,
            titleKey: "mission.install.title",
            descriptionKey: "mission.install.description",
            rewardPoints: 300,
            ctaKey: "mission.install.cta"
        ),
        Mission(
            id: "walk_8000",
            kind: .walk,
            titleKey: "mission.walk.title",
            descriptionKey: "mission.walk.description",
            rewardPoints: 500,
            target: 8000,
            ctaKey: "mission.walk.cta"
        ),
        Mission(
            id: "invite_friend",
            kind: .invite,
            titleKey: "mission.invite.title",
            descriptionKey: "mission.invite.description",
            rewardPoints: 250,
            ctaKey: "mission.invite.cta"
        ),
        Mission(
            id: "daily_checkin",
            kind: .daily,
            titleKey: "mission.daily.title",
            descriptionKey: "mission.daily.description",
            rewardPoints: 30,
            ctaKey: "mission.daily.cta"
        ),
        Mission(
            id: "partner_konbini",
            kind: .partnerOffer,
            titleKey: "mission.partner.title",
            descriptionKey: "mission.partner.description",
            rewardPoints: 120,
            ctaKey: "mission.partner.cta"
        )
    ]
}
