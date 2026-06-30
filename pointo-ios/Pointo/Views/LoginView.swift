import SwiftUI

struct LoginView: View {
    @EnvironmentObject private var auth: AuthService

    @State private var phoneNumber: String = ""
    @State private var displayName: String = ""
    @State private var verificationCode: String = ""
    @State private var errorMessage: String?
    @State private var isWorking: Bool = false

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    PointoTheme.brandPrimary.opacity(0.92),
                    PointoTheme.brandDark
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 22) {
                    header

                    Group {
                        if case .awaitingCode(let phone) = auth.state {
                            verifyCard(phone: phone)
                        } else {
                            phoneCard
                        }
                    }
                    .pointoPagePadding()
                }
                .padding(.top, 40)
                .padding(.bottom, 30)
            }
        }
    }

    // MARK: - Header

    private var header: some View {
        VStack(spacing: 10) {
            Text("login.eyebrow")
                .font(.caption.weight(.bold))
                .textCase(.uppercase)
                .foregroundStyle(.white.opacity(0.8))
            Text("Pointo")
                .font(.system(size: 44, weight: .black, design: .rounded))
                .foregroundStyle(.white)
            Text("login.tagline")
                .font(.subheadline)
                .multilineTextAlignment(.center)
                .foregroundStyle(.white.opacity(0.85))
                .padding(.horizontal, 40)
        }
    }

    // MARK: - Phone step

    private var phoneCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            CardTitle(
                titleKey: "login.phone.title",
                subtitleKey: "login.phone.subtitle"
            )

            VStack(alignment: .leading, spacing: 6) {
                Text("login.field.phone")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(PointoTheme.mutedText)
                TextField("090-0000-0000", text: $phoneNumber)
                    .keyboardType(.phonePad)
                    .textContentType(.telephoneNumber)
                    .textFieldStyle(.plain)
                    .padding(12)
                    .background(
                        RoundedRectangle(cornerRadius: PointoTheme.Radius.chip)
                            .stroke(PointoTheme.subtleBorder, lineWidth: 1)
                    )
            }

            if let errorMessage {
                Text(errorMessage)
                    .font(.footnote)
                    .foregroundStyle(.red)
            }

            Button {
                requestCode()
            } label: {
                Text("login.phone.cta")
            }
            .buttonStyle(PointoPrimaryButtonStyle(isLoading: isWorking))
            .disabled(phoneNumber.trimmingCharacters(in: .whitespaces).isEmpty || isWorking)

            VStack(alignment: .leading, spacing: 4) {
                Label("login.phone.helperJP", systemImage: "checkmark.seal.fill")
                Label("login.phone.helperSecure", systemImage: "lock.shield.fill")
                Label("login.phone.helperReward", systemImage: "gift.fill")
            }
            .font(.footnote)
            .foregroundStyle(PointoTheme.mutedText)
            .labelStyle(.titleAndIcon)
        }
        .pointoCard()
    }

    // MARK: - Verify step

    private func verifyCard(phone: String) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            CardTitle(
                titleKey: "login.code.title",
                subtitleKey: "login.code.subtitle"
            )

            Text(phone)
                .font(.headline)
                .foregroundStyle(PointoTheme.brandDark)
                .padding(.vertical, 6)
                .padding(.horizontal, 10)
                .background(
                    Capsule().fill(PointoTheme.brandSurface)
                )

            VStack(alignment: .leading, spacing: 6) {
                Text("login.field.name")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(PointoTheme.mutedText)
                TextField("login.field.name.placeholder", text: $displayName)
                    .textContentType(.name)
                    .padding(12)
                    .background(
                        RoundedRectangle(cornerRadius: PointoTheme.Radius.chip)
                            .stroke(PointoTheme.subtleBorder, lineWidth: 1)
                    )
            }

            VStack(alignment: .leading, spacing: 6) {
                Text("login.field.code")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(PointoTheme.mutedText)
                TextField("------", text: $verificationCode)
                    .keyboardType(.numberPad)
                    .textContentType(.oneTimeCode)
                    .font(.system(.title3, design: .monospaced))
                    .padding(12)
                    .background(
                        RoundedRectangle(cornerRadius: PointoTheme.Radius.chip)
                            .stroke(PointoTheme.subtleBorder, lineWidth: 1)
                    )
            }

            if let lastSentCode = auth.lastSentCode {
                Text(String(format: NSLocalizedString("login.demo.codeHint", comment: ""), lastSentCode))
                    .font(.caption)
                    .foregroundStyle(PointoTheme.brandPrimary)
            }

            if let errorMessage {
                Text(errorMessage)
                    .font(.footnote)
                    .foregroundStyle(.red)
            }

            Button {
                verifyCode()
            } label: {
                Text("login.code.cta")
            }
            .buttonStyle(PointoPrimaryButtonStyle(isLoading: isWorking))
            .disabled(verificationCode.count < 6 || isWorking)

            Button {
                auth.cancelCodeEntry()
                verificationCode = ""
                errorMessage = nil
            } label: {
                Text("login.code.changeNumber")
            }
            .buttonStyle(PointoSecondaryButtonStyle())
        }
        .pointoCard()
    }

    // MARK: - Actions

    private func requestCode() {
        errorMessage = nil
        isWorking = true
        do {
            try auth.requestCode(for: phoneNumber)
        } catch {
            errorMessage = error.localizedDescription
        }
        isWorking = false
    }

    private func verifyCode() {
        errorMessage = nil
        isWorking = true
        do {
            try auth.verify(code: verificationCode, displayName: displayName)
        } catch {
            errorMessage = error.localizedDescription
        }
        isWorking = false
    }
}

#Preview {
    LoginView()
        .environmentObject(AuthService())
}
