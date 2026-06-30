import SwiftUI

struct WalkView: View {
    @EnvironmentObject private var steps: StepCounter
    @EnvironmentObject private var points: PointsStore

    private let goal = 10_000

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: PointoTheme.Spacing.sectionGap) {
                    headerCard
                    statsRow
                    milestoneList
                    if steps.authorization != .authorized {
                        permissionCard
                    }
                    demoControls
                }
                .padding(PointoTheme.Spacing.pageHorizontal)
                .padding(.vertical, 8)
            }
            .background(PointoTheme.brandSurface.opacity(0.4))
            .navigationTitle("tab.walk")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private var headerCard: some View {
        VStack(spacing: 14) {
            ZStack {
                Circle()
                    .stroke(Color.white.opacity(0.2), lineWidth: 18)
                    .frame(width: 180, height: 180)
                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(
                        LinearGradient(
                            colors: [.white, .white.opacity(0.6)],
                            startPoint: .top,
                            endPoint: .bottom
                        ),
                        style: StrokeStyle(lineWidth: 18, lineCap: .round)
                    )
                    .rotationEffect(.degrees(-90))
                    .frame(width: 180, height: 180)
                    .animation(.easeOut(duration: 0.6), value: progress)

                VStack(spacing: 4) {
                    Text("\(steps.todaySteps)")
                        .font(.system(size: 44, weight: .heavy, design: .rounded))
                        .foregroundStyle(.white)
                        .contentTransition(.numericText(value: Double(steps.todaySteps)))
                    Text("walk.stepsUnit")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.white.opacity(0.75))
                    Text(String(
                        format: NSLocalizedString("walk.goal.fmt", comment: ""),
                        goal
                    ))
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.7))
                }
            }
            .padding(.vertical, 8)

            HStack(spacing: 14) {
                StatChip(
                    symbol: "ruler.fill",
                    title: "walk.distance",
                    value: String(format: "%.2f km", steps.distanceMeters / 1000)
                )
                StatChip(
                    symbol: "clock.fill",
                    title: "walk.active",
                    value: String(format: "%d min", steps.activeMinutes)
                )
                StatChip(
                    symbol: "flame.fill",
                    title: "walk.calories",
                    value: "\(Int(Double(steps.todaySteps) * 0.04)) kcal"
                )
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

    private var statsRow: some View {
        HStack(spacing: 12) {
            StatTile(
                titleKey: "walk.stats.earnedToday",
                value: "\(earnedFromSteps)",
                symbol: "yensign.circle.fill"
            )
            StatTile(
                titleKey: "walk.stats.streak",
                value: "3 days",
                symbol: "flame.fill"
            )
        }
    }

    private var milestoneList: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(titleKey: "walk.milestones.title")

            VStack(spacing: 10) {
                MilestoneRow(target: 3_000, reward: 30, current: steps.todaySteps)
                MilestoneRow(target: 5_000, reward: 60, current: steps.todaySteps)
                MilestoneRow(target: 8_000, reward: 100, current: steps.todaySteps)
                MilestoneRow(target: 10_000, reward: 200, current: steps.todaySteps)
            }
        }
        .pointoCard()
    }

    private var permissionCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label(LocalizedStringKey("walk.permission.title"), systemImage: "figure.walk.motion")
                .font(.headline)
                .foregroundStyle(PointoTheme.brandDark)
            Text("walk.permission.body")
                .font(.footnote)
                .foregroundStyle(PointoTheme.mutedText)

            Button {
                steps.start()
            } label: {
                Text("walk.permission.cta")
            }
            .buttonStyle(PointoPrimaryButtonStyle())
        }
        .pointoCard()
    }

    private var demoControls: some View {
        VStack(alignment: .leading, spacing: 10) {
            CardTitle(
                titleKey: "walk.demo.title",
                subtitleKey: "walk.demo.subtitle"
            )
            HStack {
                Button {
                    steps.injectDemoSteps(1_500)
                } label: {
                    Label("walk.demo.add", systemImage: "plus.circle.fill")
                }
                .buttonStyle(PointoSecondaryButtonStyle())

                Button {
                    steps.resetDemoSteps()
                } label: {
                    Label("walk.demo.reset", systemImage: "arrow.counterclockwise")
                }
                .buttonStyle(PointoSecondaryButtonStyle())
            }
        }
        .pointoCard()
    }

    private var progress: Double {
        min(1, Double(steps.todaySteps) / Double(goal))
    }

    private var earnedFromSteps: Int {
        points.transactions
            .filter {
                if case .walkMilestone = $0.reason { return true }
                return false
            }
            .map(\.amount)
            .reduce(0, +)
    }
}

private struct StatChip: View {
    let symbol: String
    let title: LocalizedStringKey
    let value: String

    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: symbol)
                .font(.subheadline)
                .foregroundStyle(.white.opacity(0.85))
            Text(value)
                .font(.subheadline.weight(.bold))
                .foregroundStyle(.white)
            Text(title)
                .font(.caption2)
                .foregroundStyle(.white.opacity(0.7))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(Color.white.opacity(0.12))
        )
    }
}

private struct MilestoneRow: View {
    let target: Int
    let reward: Int
    let current: Int

    var body: some View {
        let achieved = current >= target
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(achieved ? Color.green.opacity(0.15) : PointoTheme.brandSurface)
                Image(systemName: achieved ? "checkmark.circle.fill" : "figure.walk")
                    .font(.headline)
                    .foregroundStyle(achieved ? .green : PointoTheme.brandPrimary)
            }
            .frame(width: 40, height: 40)

            VStack(alignment: .leading, spacing: 4) {
                Text(String(format: NSLocalizedString("walk.milestone.target", comment: ""), target))
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(PointoTheme.brandDark)
                ProgressView(value: min(1, Double(current) / Double(target)))
                    .tint(achieved ? .green : PointoTheme.brandPrimary)
            }

            Spacer()

            VStack {
                Text("+\(reward)")
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(achieved ? .green : PointoTheme.brandPrimary)
                Text("home.pointsUnit")
                    .font(.caption2)
                    .foregroundStyle(PointoTheme.mutedText)
            }
        }
        .padding(.vertical, 6)
    }
}

#Preview {
    WalkView()
        .environmentObject(AuthService())
        .environmentObject(PointsStore())
        .environmentObject(StepCounter())
}
