import Foundation
import Combine

/// Manages the user's referral link, deep-link ingestion, and bookkeeping for
/// invited friends. Designed to interoperate with iOS Universal Links of the
/// form `https://pointo.app/join/<CODE>` and the custom URL scheme
/// `pointo://join/<CODE>`.
@MainActor
final class ReferralService: ObservableObject {
    static let installRewardPoints = 300
    static let inviteRewardPoints = 250

    @Published private(set) var invitedFriends: [InvitedFriend] = []
    @Published private(set) var lastConsumedCode: String?
    @Published var ownReferralCode: String = "PT-WELCOME"

    private let storageKey = "pointo.referrals"
    private let consumedKey = "pointo.referrals.consumed"
    private let userDefaults: UserDefaults

    struct InvitedFriend: Identifiable, Codable, Hashable {
        let id: UUID
        let referralCode: String
        let invitedAt: Date
        var didInstall: Bool
        var didFirstAction: Bool
    }

    init(userDefaults: UserDefaults = .standard) {
        self.userDefaults = userDefaults
        restore()
    }

    func bindOwnReferralCode(_ code: String) {
        ownReferralCode = code
    }

    var universalLink: URL {
        URL(string: "https://pointo.app/join/\(ownReferralCode)")!
    }

    var shareText: String {
        String(
            format: NSLocalizedString("referral.share.body", comment: ""),
            ownReferralCode,
            universalLink.absoluteString
        )
    }

    /// Process an incoming Universal Link or custom-scheme URL. Returns the
    /// referral code that was extracted so callers can show feedback to the
    /// user.
    @discardableResult
    func handleIncomingURL(_ url: URL) -> String? {
        guard let code = Self.extractCode(from: url) else { return nil }
        let consumedCodes = Set(userDefaults.stringArray(forKey: consumedKey) ?? [])
        guard !consumedCodes.contains(code) else {
            lastConsumedCode = nil
            return nil
        }
        var updated = consumedCodes
        updated.insert(code)
        userDefaults.set(Array(updated), forKey: consumedKey)
        lastConsumedCode = code
        return code
    }

    /// Record a manual invite (e.g. when the user taps "Share with a friend").
    /// In production the server would confirm whether the invitee really
    /// installed; we optimistically credit a smaller reward immediately and
    /// reconcile later.
    func recordInvite() -> InvitedFriend {
        let friend = InvitedFriend(
            id: UUID(),
            referralCode: ownReferralCode,
            invitedAt: Date(),
            didInstall: false,
            didFirstAction: false
        )
        invitedFriends.insert(friend, at: 0)
        persist()
        return friend
    }

    /// Mark the most recent invite as installed. Returns the friend so the UI
    /// can show a celebration.
    @discardableResult
    func markLatestInviteInstalled() -> InvitedFriend? {
        guard let idx = invitedFriends.firstIndex(where: { !$0.didInstall }) else { return nil }
        invitedFriends[idx].didInstall = true
        invitedFriends[idx].didFirstAction = true
        persist()
        return invitedFriends[idx]
    }

    // MARK: - Persistence

    private func persist() {
        guard let data = try? JSONEncoder().encode(invitedFriends) else { return }
        userDefaults.set(data, forKey: storageKey)
    }

    private func restore() {
        guard
            let data = userDefaults.data(forKey: storageKey),
            let friends = try? JSONDecoder().decode([InvitedFriend].self, from: data)
        else { return }
        invitedFriends = friends
    }

    // MARK: - URL parsing

    static func extractCode(from url: URL) -> String? {
        let components = url.pathComponents.filter { $0 != "/" }
        if let joinIndex = components.firstIndex(of: "join"), joinIndex + 1 < components.count {
            return components[joinIndex + 1].uppercased()
        }
        if url.scheme?.lowercased() == "pointo", let host = url.host, host.lowercased() == "join" {
            return components.first?.uppercased()
        }
        if let comp = URLComponents(url: url, resolvingAgainstBaseURL: false),
           let codeItem = comp.queryItems?.first(where: { $0.name == "code" })?.value {
            return codeItem.uppercased()
        }
        return nil
    }
}
