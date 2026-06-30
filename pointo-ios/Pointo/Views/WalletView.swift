import SwiftUI

struct WalletView: View {
    @EnvironmentObject private var points: PointsStore
    @EnvironmentObject private var catalog: RewardCatalog
    @EnvironmentObject private var auth: AuthService

    @State private var redeemError: String?
    @State private var redeemedReward: Reward?
    @State private var selectedCategory: Reward.Category?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: PointoTheme.Spacing.sectionGap) {
                    balanceCard
                    categoryPicker
                    rewardGrid
                    historySection
                }
                .padding(PointoTheme.Spacing.pageHorizontal)
                .padding(.vertical, 8)
            }
            .background(PointoTheme.brandSurface.opacity(0.4))
            .navigationTitle("tab.wallet")
            .navigationBarTitleDisplayMode(.inline)
            .alert("wallet.redeem.errorTitle", isPresented: Binding(
                get: { redeemError != nil },
                set: { if !$0 { redeemError = nil } }
            )) {
                Button("common.ok", role: .cancel) { redeemError = nil }
            } message: {
                Text(redeemError ?? "")
            }
            .sheet(item: $redeemedReward) { reward in
                RedeemConfirmation(reward: reward) { redeemedReward = nil }
                    .presentationDetents([.fraction(0.5)])
            }
        }
    }

    // MARK: - Sections

    private var balanceCard: some View {
        PointsHeaderCard(
            balance: points.balance,
            userName: auth.currentUser?.displayName ?? "Pointo会員"
        )
    }

    private var categoryPicker: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                CategoryChip(titleKey: "wallet.category.all", isSelected: selectedCategory == nil) {
                    selectedCategory = nil
                }
                ForEach(Reward.Category.allCases, id: \.self) { cat in
                    CategoryChip(
                        titleKey: localizedCategoryKey(cat),
                        isSelected: selectedCategory == cat
                    ) {
                        selectedCategory = (selectedCategory == cat) ? nil : cat
                    }
                }
            }
        }
    }

    private var rewardGrid: some View {
        LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
            ForEach(filteredRewards) { reward in
                RewardCard(reward: reward, balance: points.balance) {
                    redeem(reward)
                }
            }
        }
    }

    private var historySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(titleKey: "wallet.history.title")

            if points.transactions.isEmpty {
                Text("wallet.history.empty")
                    .font(.footnote)
                    .foregroundStyle(PointoTheme.mutedText)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 20)
            } else {
                VStack(spacing: 10) {
                    ForEach(points.transactions.prefix(20)) { txn in
                        TransactionRow(transaction: txn)
                    }
                }
            }
        }
        .pointoCard()
    }

    // MARK: - Helpers

    private var filteredRewards: [Reward] {
        guard let selectedCategory else { return catalog.rewards }
        return catalog.rewards(in: selectedCategory)
    }

    private func redeem(_ reward: Reward) {
        if points.balance < reward.cost {
            redeemError = NSLocalizedString("wallet.redeem.insufficient", comment: "")
            return
        }
        if points.redeem(reward) {
            redeemedReward = reward
        } else {
            redeemError = NSLocalizedString("wallet.redeem.failed", comment: "")
        }
    }

    private func localizedCategoryKey(_ cat: Reward.Category) -> LocalizedStringKey {
        switch cat {
        case .giftCard: return "wallet.category.giftCard"
        case .ePay: return "wallet.category.ePay"
        case .mobile: return "wallet.category.mobile"
        case .charity: return "wallet.category.charity"
        }
    }
}

// MARK: - Reward grid item

private struct RewardCard: View {
    let reward: Reward
    let balance: Int
    let onTap: () -> Void

    var body: some View {
        let canAfford = balance >= reward.cost
        VStack(alignment: .leading, spacing: 10) {
            ZStack {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(PointoTheme.brandSurface)
                Image(systemName: reward.symbol)
                    .font(.title2)
                    .foregroundStyle(PointoTheme.brandPrimary)
            }
            .frame(height: 70)

            VStack(alignment: .leading, spacing: 4) {
                Text(reward.partnerName)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(PointoTheme.mutedText)
                Text(LocalizedStringKey(reward.titleKey))
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(PointoTheme.brandDark)
                    .lineLimit(2)
            }

            HStack {
                Text("\(reward.cost) pt")
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(PointoTheme.brandPrimary)
                Spacer()
                Button(action: onTap) {
                    Text("wallet.redeem.cta")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(.white)
                        .padding(.vertical, 6)
                        .padding(.horizontal, 12)
                        .background(
                            Capsule()
                                .fill(canAfford ? PointoTheme.brandPrimary : Color.gray.opacity(0.35))
                        )
                }
                .disabled(!canAfford)
            }
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: PointoTheme.Radius.card, style: .continuous)
                .fill(PointoTheme.cardBackground)
        )
        .overlay(
            RoundedRectangle(cornerRadius: PointoTheme.Radius.card, style: .continuous)
                .stroke(PointoTheme.subtleBorder, lineWidth: 1)
        )
    }
}

// MARK: - Category chip

private struct CategoryChip: View {
    let titleKey: LocalizedStringKey
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(titleKey)
                .font(.subheadline.weight(.semibold))
                .padding(.vertical, 8)
                .padding(.horizontal, 14)
                .background(
                    Capsule()
                        .fill(isSelected ? PointoTheme.brandPrimary : Color.white)
                )
                .foregroundStyle(isSelected ? .white : PointoTheme.brandDark)
                .overlay(
                    Capsule()
                        .stroke(isSelected ? Color.clear : PointoTheme.subtleBorder, lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Transaction row

private struct TransactionRow: View {
    let transaction: PointTransaction

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: transaction.reason.symbol)
                .font(.headline)
                .foregroundStyle(transaction.isCredit ? PointoTheme.brandPrimary : .red)
                .frame(width: 36, height: 36)
                .background(
                    Circle().fill(PointoTheme.brandSurface)
                )

            VStack(alignment: .leading, spacing: 2) {
                Text(LocalizedStringKey(transaction.reason.localizationKey))
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(PointoTheme.brandDark)
                Text(transaction.createdAt, style: .relative)
                    .font(.caption)
                    .foregroundStyle(PointoTheme.mutedText)
            }
            Spacer()
            Text((transaction.amount > 0 ? "+" : "") + "\(transaction.amount) pt")
                .font(.subheadline.weight(.bold))
                .foregroundStyle(transaction.isCredit ? PointoTheme.brandPrimary : .red)
        }
    }
}

// MARK: - Redeem confirmation

private struct RedeemConfirmation: View {
    let reward: Reward
    let onClose: () -> Void

    var body: some View {
        VStack(spacing: 18) {
            ZStack {
                Circle()
                    .fill(PointoTheme.brandSurface)
                    .frame(width: 96, height: 96)
                Image(systemName: reward.symbol)
                    .font(.system(size: 40, weight: .bold))
                    .foregroundStyle(PointoTheme.brandPrimary)
            }
            .padding(.top, 28)

            VStack(spacing: 6) {
                Text("wallet.redeem.successTitle")
                    .font(.title2.weight(.bold))
                Text(reward.partnerName)
                    .font(.headline)
                    .foregroundStyle(PointoTheme.mutedText)
                Text(LocalizedStringKey(reward.titleKey))
                    .font(.subheadline)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 24)
            }

            Text("wallet.redeem.deliveryHint")
                .font(.footnote)
                .multilineTextAlignment(.center)
                .foregroundStyle(PointoTheme.mutedText)
                .padding(.horizontal, 24)

            Button(action: onClose) {
                Text("common.done")
            }
            .buttonStyle(PointoPrimaryButtonStyle())
            .padding(.horizontal, 24)

            Spacer()
        }
        .frame(maxWidth: .infinity)
    }
}

#Preview {
    WalletView()
        .environmentObject(AuthService())
        .environmentObject(PointsStore())
        .environmentObject(RewardCatalog())
}
