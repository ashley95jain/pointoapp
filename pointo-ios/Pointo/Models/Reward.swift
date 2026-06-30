import Foundation

/// Reward items the user can redeem in the Pointo wallet. Japan-focused
/// catalogue: konbini gift codes, mobile carrier credits, PayPay top-up etc.
struct Reward: Identifiable, Hashable {
    enum Category: String, CaseIterable, Codable {
        case giftCard
        case ePay
        case mobile
        case charity
    }

    let id: String
    let titleKey: String
    let partnerName: String
    let cost: Int
    let category: Category
    let symbol: String

    static let catalogue: [Reward] = [
        Reward(
            id: "amazon_500",
            titleKey: "reward.amazon.500",
            partnerName: "Amazon Japan",
            cost: 500,
            category: .giftCard,
            symbol: "cart.fill"
        ),
        Reward(
            id: "starbucks_1000",
            titleKey: "reward.starbucks.1000",
            partnerName: "Starbucks Japan",
            cost: 1000,
            category: .giftCard,
            symbol: "cup.and.saucer.fill"
        ),
        Reward(
            id: "paypay_500",
            titleKey: "reward.paypay.500",
            partnerName: "PayPay",
            cost: 500,
            category: .ePay,
            symbol: "yensign.circle.fill"
        ),
        Reward(
            id: "rakuten_1000",
            titleKey: "reward.rakuten.1000",
            partnerName: "楽天ポイント",
            cost: 1000,
            category: .ePay,
            symbol: "r.square.fill"
        ),
        Reward(
            id: "docomo_dpoint_500",
            titleKey: "reward.dpoint.500",
            partnerName: "dポイント",
            cost: 500,
            category: .mobile,
            symbol: "d.square.fill"
        ),
        Reward(
            id: "seven_eleven_300",
            titleKey: "reward.seven.300",
            partnerName: "セブン-イレブン",
            cost: 300,
            category: .giftCard,
            symbol: "bag.fill"
        ),
        Reward(
            id: "charity_500",
            titleKey: "reward.charity.500",
            partnerName: "日本ユニセフ協会",
            cost: 500,
            category: .charity,
            symbol: "heart.fill"
        )
    ]
}
