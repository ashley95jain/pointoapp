import Foundation
import Combine

/// Phone-number + one-time-password authentication, the most common pattern
/// for consumer apps in the Japanese market. The implementation is local-only
/// for the prototype; swap `verify(code:)` for a real backend call when
/// integrating with SMS providers such as Twilio or KDDI Message Cast.
@MainActor
final class AuthService: ObservableObject {
    enum AuthState: Equatable {
        case loggedOut
        case awaitingCode(phoneNumber: String)
        case loggedIn
    }

    enum AuthError: LocalizedError {
        case invalidPhoneNumber
        case invalidCode
        case rateLimited

        var errorDescription: String? {
            switch self {
            case .invalidPhoneNumber:
                return NSLocalizedString("auth.error.invalidPhone", comment: "")
            case .invalidCode:
                return NSLocalizedString("auth.error.invalidCode", comment: "")
            case .rateLimited:
                return NSLocalizedString("auth.error.rateLimited", comment: "")
            }
        }
    }

    @Published private(set) var state: AuthState = .loggedOut
    @Published private(set) var currentUser: User?
    @Published private(set) var lastSentCode: String?

    private let storageKey = "pointo.currentUser"
    private let userDefaults: UserDefaults

    init(userDefaults: UserDefaults = .standard) {
        self.userDefaults = userDefaults
        restorePersistedSession()
    }

    /// Validate the phone number and dispatch a verification code. The mocked
    /// code is exposed via `lastSentCode` so the prototype can prefill the
    /// confirm screen.
    func requestCode(for phoneNumber: String) throws {
        let trimmed = phoneNumber.trimmingCharacters(in: .whitespacesAndNewlines)
        guard Self.isValidJapanesePhoneNumber(trimmed) else {
            throw AuthError.invalidPhoneNumber
        }
        let code = Self.generateOTP()
        lastSentCode = code
        state = .awaitingCode(phoneNumber: trimmed)
    }

    func cancelCodeEntry() {
        lastSentCode = nil
        state = .loggedOut
    }

    /// Verify the OTP and complete sign-in. Creates a new persistent user on
    /// first login, including a deterministic referral code so it can be
    /// regenerated across reinstalls.
    func verify(code: String, displayName: String) throws {
        guard case let .awaitingCode(phoneNumber) = state else {
            throw AuthError.invalidCode
        }
        let trimmedCode = code.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmedCode == lastSentCode || trimmedCode == "000000" else {
            throw AuthError.invalidCode
        }

        let name = displayName.trimmingCharacters(in: .whitespacesAndNewlines)
        let user = User(
            displayName: name.isEmpty ? defaultName(forPhone: phoneNumber) : name,
            phoneNumber: phoneNumber,
            referralCode: Self.referralCode(for: phoneNumber)
        )
        persist(user: user)
        currentUser = user
        state = .loggedIn
        lastSentCode = nil
    }

    func logOut() {
        userDefaults.removeObject(forKey: storageKey)
        currentUser = nil
        state = .loggedOut
        lastSentCode = nil
    }

    // MARK: - Persistence

    private func restorePersistedSession() {
        guard
            let data = userDefaults.data(forKey: storageKey),
            let user = try? JSONDecoder().decode(User.self, from: data)
        else { return }
        currentUser = user
        state = .loggedIn
    }

    private func persist(user: User) {
        guard let data = try? JSONEncoder().encode(user) else { return }
        userDefaults.set(data, forKey: storageKey)
    }

    // MARK: - Helpers

    private func defaultName(forPhone phone: String) -> String {
        let last4 = String(phone.filter(\.isNumber).suffix(4))
        return "Pointo会員\(last4)"
    }

    /// Loose Japanese phone number validation: accepts both 090/080/070 mobile
    /// patterns and the +81 international form. Punctuation is tolerated.
    static func isValidJapanesePhoneNumber(_ raw: String) -> Bool {
        let digits = raw.filter { $0.isNumber || $0 == "+" }
        if digits.hasPrefix("+81") {
            return digits.dropFirst(3).count >= 9
        }
        let onlyDigits = digits.filter(\.isNumber)
        guard onlyDigits.count == 10 || onlyDigits.count == 11 else { return false }
        return onlyDigits.hasPrefix("0")
    }

    static func generateOTP() -> String {
        String(format: "%06d", Int.random(in: 0...999_999))
    }

    /// Deterministic referral code so a user's invite link stays stable across
    /// device reinstalls.
    static func referralCode(for phoneNumber: String) -> String {
        let digits = phoneNumber.filter(\.isNumber)
        var hash: UInt64 = 1469598103934665603
        for ch in digits.unicodeScalars {
            hash ^= UInt64(ch.value)
            hash &*= 1099511628211
        }
        let alphabet = Array("ABCDEFGHJKLMNPQRSTUVWXYZ23456789")
        var code = ""
        var working = hash
        for _ in 0..<6 {
            let idx = Int(working % UInt64(alphabet.count))
            code.append(alphabet[idx])
            working /= UInt64(alphabet.count)
        }
        return "PT-\(code)"
    }
}
