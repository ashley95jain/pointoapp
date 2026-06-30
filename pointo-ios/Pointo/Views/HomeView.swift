import SwiftUI

struct HomeView: View {
    @EnvironmentObject private var auth: AuthService
    @EnvironmentObject private var points: PointsStore
    @EnvironmentObject private var referral: ReferralService
    @EnvironmentObject private var steps: StepCounter

    @State private var celebration: CelebrationItem?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: PointoTheme.Spacing.sectionGap) {
                    PointsHeaderCard(
                        balance: points.balance,
                        userName: auth.currentUser?.displayName ?? "Pointo会員"
                    )
                    .pointoPagePadding()

                    quickStatsSection
                        .pointoPagePadding()

                    missionsSection
                        .pointoPagePadding()

                    referralCallout
                        .pointoPagePadding()
                }
                .padding(.vertical, 16)
            }
            .background(PointoTheme.brandSurface.opacity(0.4))
            .navigationTitle("tab.home")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button(role: .destructive) {
                            auth.logOut()
                        } label: {
                            Label("home.menu.logout", systemImage: "rectangle.portrait.and.arrow.right")
                        }
                    } label: {
                        Image(systemName: "person.crop.circle")
                            .foregroundStyle(PointoTheme.brandPrimary)
                    }
                }
            }
        }
        .sheet(item: $celebration) { item in
            CelebrationSheet(item: item) { celebration = nil }
                .presentationDetents([.fraction(0.45)])
        }
    }

    // MARK: - Sections

    private var quickStatsSection: some View {
        HStack(spacing: 12) {
            StatTile(
                titleKey: "home.stats.steps",
                value: "\(steps.todaySteps)",
                symbol: "figure.walk"
            )
            StatTile(
                titleKey: "home.stats.referrals",
                value: "\(referral.invitedFriends.count)",
                symbol: "person.2.fill"
            )
            StatTile(
                titleKey: "home.stats.missions",
                value: "\(points.missions.filter(\.completed).count)/\(points.missions.count)",
                symbol: "checkmark.seal.fill"
            )
        }
    }

    private var missionsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(titleKey: "home.missions.title")

            VStack(spacing: 10) {
                ForEach(points.missions) { mission in
                    MissionRow(mission: mission) {
                        handleMissionTap(mission)
                    }
                }
            }
        }
        .pointoCard()
    }

    private var referralCallout: some View {
        VStack(alignment: .leading, spacing: 10) {
            CardTitle(
                titleKey: "home.refer.title",
                subtitleKey: "home.refer.subtitle"
            )
            HStack(spacing: 12) {
                Image(systemName: "qrcode")
                    .font(.title2)
                    .foregroundStyle(PointoTheme.brandPrimary)
                    .frame(width: 44, height: 44)
                    .background(
                        Circle().fill(PointoTheme.brandSurface)
                    )
                VStack(alignment: .leading, spacing: 2) {
                    Text(referral.ownReferralCode)
                        .font(.headline.monospaced())
                        .foregroundStyle(PointoTheme.brandDark)
                    Text(referral.universalLink.absoluteString)
                        .font(.caption)
                        .foregroundStyle(PointoTheme.mutedText)
                        .lineLimit(1)
                        .truncationMode(.middle)
                }
                Spacer()
                ShareLink(item: referral.universalLink, message: Text(referral.shareText)) {
                    Image(systemName: "square.and.arrow.up")
                        .font(.headline)
                        .foregroundStyle(.white)
                        .padding(10)
                        .background(
                            Circle().fill(PointoTheme.brandPrimary)
                        )
                }
            }
        }
        .pointoCard()
    }

    // MARK: - Actions

    private func handleMissionTap(_ mission: Mission) {
        guard !mission.completed else { return }
        switch mission.kind {
        case .install:
            points.credit(amount: mission.rewardPoints, reason: .missionCompleted(missionId: mission.id))
            celebration = .init(titleKey: "celebration.install.title", points: mission.rewardPoints)
        case .invite:
            _ = referral.recordInvite()
            points.credit(amount: mission.rewardPoints, reason: .referralInvite(code: referral.ownReferralCode))
            celebration = .init(titleKey: "celebration.invite.title", points: mission.rewardPoints)
        case .daily:
            points.credit(amount: mission.rewardPoints, reason: .dailyCheckIn)
            celebration = .init(titleKey: "celebration.daily.title", points: mission.rewardPoints)
        case .partnerOffer:
            points.credit(amount: mission.rewardPoints, reason: .missionCompleted(missionId: mission.id))
            celebration = .init(titleKey: "celebration.partner.title", points: mission.rewardPoints)
        case .walk:
            celebration = .init(titleKey: "celebration.walk.hint", points: 0)
        }
    }
}

// MARK: - Celebration sheet

struct CelebrationItem: Identifiable {
    let id = UUID()
    let titleKey: LocalizedStringKey
    let points: Int
}

private struct CelebrationSheet: View {
    let item: CelebrationItem
    let onDismiss: () -> Void

    var body: some View {
        VStack(spacing: 18) {
            ZStack {
                Circle()
                    .fill(PointoTheme.brandSurface)
                    .frame(width: 96, height: 96)
                Image(systemName: "sparkles")
                    .font(.system(size: 44, weight: .bold))
                    .foregroundStyle(PointoTheme.brandPrimary)
            }
            .padding(.top, 28)

            Text(item.titleKey)
                .font(.title2.weight(.bold))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 24)

            if item.points > 0 {
                Text("+\(item.points) pt")
                    .font(.system(.largeTitle, design: .rounded).weight(.heavy))
                    .foregroundStyle(PointoTheme.brandPrimary)
            }

            Button {
                onDismiss()
            } label: {
                Text("common.continue")
            }
            .buttonStyle(PointoPrimaryButtonStyle())
            .padding(.horizontal, 24)

            Spacer()
        }
        .frame(maxWidth: .infinity)
    }
}

#Preview {
    HomeView()
        .environmentObject(AuthService())
        .environmentObject(PointsStore())
        .environmentObject(StepCounter())
        .environmentObject(ReferralService())
}
