import Foundation

struct User: Codable, Identifiable, Hashable {
    let id: UUID
    var displayName: String
    var phoneNumber: String
    var referralCode: String
    var joinedAt: Date
    var prefecture: Prefecture?

    init(
        id: UUID = UUID(),
        displayName: String,
        phoneNumber: String,
        referralCode: String,
        joinedAt: Date = Date(),
        prefecture: Prefecture? = nil
    ) {
        self.id = id
        self.displayName = displayName
        self.phoneNumber = phoneNumber
        self.referralCode = referralCode
        self.joinedAt = joinedAt
        self.prefecture = prefecture
    }
}

/// Japan's 47 prefectures, used for personalisation and reward filtering. A
/// subset is included as a starting point; the rest can be added without
/// touching call sites.
enum Prefecture: String, Codable, CaseIterable, Identifiable {
    case tokyo = "東京都"
    case osaka = "大阪府"
    case kyoto = "京都府"
    case hokkaido = "北海道"
    case fukuoka = "福岡県"
    case aichi = "愛知県"
    case kanagawa = "神奈川県"
    case okinawa = "沖縄県"

    var id: String { rawValue }

    var localizedName: String { rawValue }
}
