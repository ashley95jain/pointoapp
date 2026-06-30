import SwiftUI

/// Centralised design tokens for Pointo. Colors are mirrored in the
/// `Assets.xcassets` catalog so that designers can tweak them without code
/// changes, but we expose Swift accessors here for ergonomic use in views.
enum PointoTheme {
    static let brandPrimary = Color("BrandPrimary")
    static let brandDark = Color("BrandDark")
    static let brandSurface = Color("BrandSurface")
    static let brandAccent = Color("AccentColor")

    static let cardBackground = Color(.systemBackground)
    static let mutedText = Color(.secondaryLabel)
    static let subtleBorder = Color.black.opacity(0.06)

    enum Radius {
        static let card: CGFloat = 20
        static let chip: CGFloat = 12
        static let button: CGFloat = 14
    }

    enum Spacing {
        static let pageHorizontal: CGFloat = 20
        static let sectionGap: CGFloat = 16
        static let intraCardGap: CGFloat = 12
    }
}

extension View {
    /// Standard card chrome used across Pointo screens.
    func pointoCard(padding: CGFloat = 18) -> some View {
        self
            .padding(padding)
            .background(
                RoundedRectangle(cornerRadius: PointoTheme.Radius.card, style: .continuous)
                    .fill(PointoTheme.cardBackground)
            )
            .overlay(
                RoundedRectangle(cornerRadius: PointoTheme.Radius.card, style: .continuous)
                    .stroke(PointoTheme.subtleBorder, lineWidth: 1)
            )
            .shadow(color: PointoTheme.brandDark.opacity(0.06), radius: 14, x: 0, y: 6)
    }

    func pointoPagePadding() -> some View {
        self.padding(.horizontal, PointoTheme.Spacing.pageHorizontal)
    }
}
