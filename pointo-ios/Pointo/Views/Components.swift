import SwiftUI

// MARK: - Buttons

struct PointoPrimaryButtonStyle: ButtonStyle {
    var isLoading: Bool = false

    func makeBody(configuration: Configuration) -> some View {
        HStack(spacing: 8) {
            if isLoading {
                ProgressView()
                    .progressViewStyle(.circular)
                    .tint(.white)
            }
            configuration.label
                .font(.headline)
        }
        .foregroundStyle(.white)
        .padding(.vertical, 14)
        .frame(maxWidth: .infinity)
        .background(
            RoundedRectangle(cornerRadius: PointoTheme.Radius.button, style: .continuous)
                .fill(PointoTheme.brandPrimary)
        )
        .opacity(configuration.isPressed ? 0.85 : 1)
        .scaleEffect(configuration.isPressed ? 0.98 : 1)
        .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}

struct PointoSecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .foregroundStyle(PointoTheme.brandPrimary)
            .padding(.vertical, 12)
            .frame(maxWidth: .infinity)
            .background(
                RoundedRectangle(cornerRadius: PointoTheme.Radius.button, style: .continuous)
                    .stroke(PointoTheme.brandPrimary, lineWidth: 1.5)
            )
            .opacity(configuration.isPressed ? 0.7 : 1)
    }
}

// MARK: - Section header

struct SectionHeader: View {
    let titleKey: LocalizedStringKey
    var actionTitle: LocalizedStringKey?
    var action: (() -> Void)?

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            Text(titleKey)
                .font(.title3.weight(.bold))
                .foregroundStyle(PointoTheme.brandDark)
            Spacer()
            if let actionTitle, let action {
                Button(action: action) {
                    Text(actionTitle)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(PointoTheme.brandPrimary)
                }
            }
        }
    }
}

// MARK: - Mission row

struct MissionRow: View {
    let mission: Mission
    var onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(alignment: .top, spacing: 14) {
                ZStack {
                    Circle()
                        .fill(PointoTheme.brandSurface)
                    Image(systemName: missionSymbol)
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(PointoTheme.brandPrimary)
                }
                .frame(width: 42, height: 42)

                VStack(alignment: .leading, spacing: 6) {
                    Text(LocalizedStringKey(mission.titleKey))
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(PointoTheme.brandDark)
                    Text(LocalizedStringKey(mission.descriptionKey))
                        .font(.footnote)
                        .foregroundStyle(PointoTheme.mutedText)
                        .lineLimit(2)

                    if let target = mission.target {
                        ProgressView(value: mission.progressFraction)
                            .tint(PointoTheme.brandPrimary)
                            .padding(.top, 2)
                        Text("\(mission.progress) / \(target)")
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(PointoTheme.mutedText)
                    }
                }

                Spacer(minLength: 8)

                VStack(spacing: 4) {
                    Text("+\(mission.rewardPoints)")
                        .font(.headline)
                        .foregroundStyle(PointoTheme.brandPrimary)
                    Text(mission.completed
                         ? LocalizedStringKey("common.claimed")
                         : LocalizedStringKey(mission.ctaKey))
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(mission.completed ? .green : PointoTheme.mutedText)
                }
            }
            .padding(14)
            .background(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(mission.completed
                          ? Color.green.opacity(0.08)
                          : PointoTheme.brandSurface.opacity(0.5))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(mission.completed
                            ? Color.green.opacity(0.35)
                            : Color.clear, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    private var missionSymbol: String {
        switch mission.kind {
        case .install: return "arrow.down.app.fill"
        case .walk: return "figure.walk"
        case .invite: return "person.2.fill"
        case .daily: return "calendar.badge.checkmark"
        case .partnerOffer: return "tag.fill"
        }
    }
}

// MARK: - Points header

struct PointsHeaderCard: View {
    let balance: Int
    let userName: String

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("home.greeting")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.white.opacity(0.75))
                    Text(userName)
                        .font(.title3.weight(.bold))
                        .foregroundStyle(.white)
                }
                Spacer()
                Image(systemName: "yensign.circle.fill")
                    .font(.system(size: 28, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.85))
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("home.balanceLabel")
                    .font(.caption.weight(.semibold))
                    .textCase(.uppercase)
                    .foregroundStyle(.white.opacity(0.6))
                HStack(alignment: .lastTextBaseline, spacing: 6) {
                    Text("\(balance)")
                        .font(.system(size: 42, weight: .heavy, design: .rounded))
                        .foregroundStyle(.white)
                        .contentTransition(.numericText(value: Double(balance)))
                    Text("home.pointsUnit")
                        .font(.title3.weight(.semibold))
                        .foregroundStyle(.white.opacity(0.85))
                }
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            LinearGradient(
                colors: [PointoTheme.brandPrimary, PointoTheme.brandDark],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: PointoTheme.Radius.card, style: .continuous))
        .shadow(color: PointoTheme.brandDark.opacity(0.25), radius: 20, x: 0, y: 12)
    }
}

// MARK: - Card title

struct CardTitle: View {
    let titleKey: LocalizedStringKey
    var subtitleKey: LocalizedStringKey?

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(titleKey)
                .font(.headline)
                .foregroundStyle(PointoTheme.brandDark)
            if let subtitleKey {
                Text(subtitleKey)
                    .font(.footnote)
                    .foregroundStyle(PointoTheme.mutedText)
            }
        }
    }
}

// MARK: - Stat tile

struct StatTile: View {
    let titleKey: LocalizedStringKey
    let value: String
    var symbol: String = "chart.bar.fill"

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Image(systemName: symbol)
                .foregroundStyle(PointoTheme.brandPrimary)
            Text(value)
                .font(.title3.weight(.bold))
                .foregroundStyle(PointoTheme.brandDark)
            Text(titleKey)
                .font(.caption)
                .foregroundStyle(PointoTheme.mutedText)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(PointoTheme.brandSurface)
        )
    }
}
