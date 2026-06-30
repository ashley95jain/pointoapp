import SwiftUI

struct ReferralView: View {
    @EnvironmentObject private var referral: ReferralService
    @EnvironmentObject private var points: PointsStore

    @State private var copiedFeedback = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: PointoTheme.Spacing.sectionGap) {
                    heroCard
                    rewardBreakdown
                    invitedList
                    howItWorks
                }
                .padding(PointoTheme.Spacing.pageHorizontal)
                .padding(.vertical, 8)
            }
            .background(PointoTheme.brandSurface.opacity(0.4))
            .navigationTitle("tab.refer")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private var heroCard: some View {
        VStack(spacing: 18) {
            VStack(spacing: 6) {
                Text("referral.hero.eyebrow")
                    .font(.caption.weight(.semibold))
                    .textCase(.uppercase)
                    .foregroundStyle(.white.opacity(0.75))
                Text("referral.hero.title")
                    .font(.title2.weight(.heavy))
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.white)
            }

            VStack(spacing: 8) {
                Text(referral.ownReferralCode)
                    .font(.system(size: 30, weight: .black, design: .monospaced))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 26)
                    .padding(.vertical, 12)
                    .background(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .stroke(Color.white.opacity(0.5), lineWidth: 1)
                    )
                Text(referral.universalLink.absoluteString)
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.85))
                    .lineLimit(1)
                    .truncationMode(.middle)
            }

            HStack(spacing: 10) {
                Button {
                    UIPasteboard.general.string = referral.universalLink.absoluteString
                    withAnimation { copiedFeedback = true }
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1.4) {
                        withAnimation { copiedFeedback = false }
                    }
                } label: {
                    Label(copiedFeedback
                          ? LocalizedStringKey("referral.copied")
                          : LocalizedStringKey("referral.copy"),
                          systemImage: copiedFeedback ? "checkmark.circle.fill" : "doc.on.doc.fill")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.white)
                        .padding(.vertical, 12)
                        .frame(maxWidth: .infinity)
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color.white.opacity(0.18))
                        )
                }

                ShareLink(
                    item: referral.universalLink,
                    message: Text(referral.shareText)
                ) {
                    Label("referral.share", systemImage: "paperplane.fill")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(PointoTheme.brandPrimary)
                        .padding(.vertical, 12)
                        .frame(maxWidth: .infinity)
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color.white)
                        )
                }
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity)
        .background(
            LinearGradient(
                colors: [PointoTheme.brandPrimary, PointoTheme.brandDark],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: PointoTheme.Radius.card, style: .continuous))
        .shadow(color: PointoTheme.brandDark.opacity(0.25), radius: 18, x: 0, y: 10)
    }

    private var rewardBreakdown: some View {
        VStack(alignment: .leading, spacing: 12) {
            CardTitle(
                titleKey: "referral.rewards.title",
                subtitleKey: "referral.rewards.subtitle"
            )

            VStack(spacing: 10) {
                RewardLine(
                    symbol: "arrow.down.app.fill",
                    titleKey: "referral.reward.install.title",
                    detailKey: "referral.reward.install.detail",
                    value: "+\(ReferralService.installRewardPoints) pt"
                )
                RewardLine(
                    symbol: "person.badge.plus",
                    titleKey: "referral.reward.invite.title",
                    detailKey: "referral.reward.invite.detail",
                    value: "+\(ReferralService.inviteRewardPoints) pt"
                )
                RewardLine(
                    symbol: "infinity.circle.fill",
                    titleKey: "referral.reward.ongoing.title",
                    detailKey: "referral.reward.ongoing.detail",
                    value: "5%"
                )
            }
        }
        .pointoCard()
    }

    private var invitedList: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(titleKey: "referral.invited.title")

            if referral.invitedFriends.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "person.2.slash")
                        .font(.title)
                        .foregroundStyle(PointoTheme.mutedText)
                    Text("referral.invited.empty")
                        .font(.footnote)
                        .foregroundStyle(PointoTheme.mutedText)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 20)
            } else {
                VStack(spacing: 8) {
                    ForEach(referral.invitedFriends) { friend in
                        HStack {
                            Image(systemName: friend.didInstall ? "checkmark.seal.fill" : "hourglass")
                                .foregroundStyle(friend.didInstall ? .green : PointoTheme.brandPrimary)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(friend.referralCode)
                                    .font(.subheadline.weight(.semibold))
                                Text(friend.invitedAt, style: .relative)
                                    .font(.caption)
                                    .foregroundStyle(PointoTheme.mutedText)
                            }
                            Spacer()
                            Text(friend.didInstall
                                 ? LocalizedStringKey("referral.status.installed")
                                 : LocalizedStringKey("referral.status.pending"))
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(friend.didInstall ? .green : PointoTheme.brandPrimary)
                        }
                        .padding(.vertical, 6)
                    }
                }
            }
        }
        .pointoCard()
    }

    private var howItWorks: some View {
        VStack(alignment: .leading, spacing: 10) {
            CardTitle(titleKey: "referral.how.title")
            StepListItem(index: 1, titleKey: "referral.how.step1")
            StepListItem(index: 2, titleKey: "referral.how.step2")
            StepListItem(index: 3, titleKey: "referral.how.step3")
        }
        .pointoCard()
    }
}

private struct RewardLine: View {
    let symbol: String
    let titleKey: LocalizedStringKey
    let detailKey: LocalizedStringKey
    let value: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: symbol)
                .font(.headline)
                .foregroundStyle(PointoTheme.brandPrimary)
                .frame(width: 32, height: 32)
                .background(
                    Circle().fill(PointoTheme.brandSurface)
                )
            VStack(alignment: .leading, spacing: 2) {
                Text(titleKey)
                    .font(.subheadline.weight(.semibold))
                Text(detailKey)
                    .font(.caption)
                    .foregroundStyle(PointoTheme.mutedText)
            }
            Spacer()
            Text(value)
                .font(.subheadline.weight(.bold))
                .foregroundStyle(PointoTheme.brandPrimary)
        }
    }
}

private struct StepListItem: View {
    let index: Int
    let titleKey: LocalizedStringKey

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text("\(index)")
                .font(.subheadline.weight(.bold))
                .foregroundStyle(.white)
                .frame(width: 26, height: 26)
                .background(Circle().fill(PointoTheme.brandPrimary))
            Text(titleKey)
                .font(.subheadline)
                .foregroundStyle(PointoTheme.brandDark)
        }
    }
}

#Preview {
    ReferralView()
        .environmentObject(ReferralService())
        .environmentObject(PointsStore())
}
