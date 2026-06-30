import Foundation
import Combine
import CoreMotion

/// Wraps `CMPedometer` so we can observe today's step count as a published
/// property. Falls back to a simulated stream when running on a device that
/// does not expose step counting (such as a Mac running the iPhone build, or
/// a simulator without motion data injection).
@MainActor
final class StepCounter: ObservableObject {
    enum AuthorizationState {
        case notDetermined
        case authorized
        case denied
        case unavailable
    }

    @Published private(set) var todaySteps: Int = 0
    @Published private(set) var distanceMeters: Double = 0
    @Published private(set) var activeMinutes: Int = 0
    @Published private(set) var authorization: AuthorizationState = .notDetermined
    @Published private(set) var isTracking: Bool = false

    private let pedometer = CMPedometer()
    private var simulator: Timer?

    init() {
        refreshAuthorization()
    }

    func start() {
        guard !isTracking else { return }
        isTracking = true

        if CMPedometer.isStepCountingAvailable() {
            let startOfDay = Calendar.current.startOfDay(for: Date())
            pedometer.queryPedometerData(from: startOfDay, to: Date()) { [weak self] data, _ in
                Task { @MainActor in
                    self?.apply(data: data)
                }
            }
            pedometer.startUpdates(from: startOfDay) { [weak self] data, _ in
                Task { @MainActor in
                    self?.apply(data: data)
                }
            }
            refreshAuthorization()
        } else {
            authorization = .unavailable
            startSimulator()
        }
    }

    func stop() {
        pedometer.stopUpdates()
        simulator?.invalidate()
        simulator = nil
        isTracking = false
    }

    /// Convenience for the demo flow that lets testers add steps from the UI.
    func injectDemoSteps(_ amount: Int) {
        let next = todaySteps &+ amount
        todaySteps = max(0, next)
        distanceMeters = Double(todaySteps) * 0.78
        activeMinutes = todaySteps / 110
    }

    /// Clears the demo step counter back to zero.
    func resetDemoSteps() {
        todaySteps = 0
        distanceMeters = 0
        activeMinutes = 0
    }

    // MARK: - Internal helpers

    private func apply(data: CMPedometerData?) {
        guard let data else { return }
        todaySteps = data.numberOfSteps.intValue
        if let distance = data.distance {
            distanceMeters = distance.doubleValue
        }
        if let active = data.currentPace {
            activeMinutes = Int(active.doubleValue / 60.0)
        }
    }

    private func refreshAuthorization() {
        switch CMPedometer.authorizationStatus() {
        case .notDetermined:
            authorization = .notDetermined
        case .authorized:
            authorization = .authorized
        case .denied, .restricted:
            authorization = .denied
        @unknown default:
            authorization = .notDetermined
        }
        if !CMPedometer.isStepCountingAvailable() {
            authorization = .unavailable
        }
    }

    private func startSimulator() {
        simulator?.invalidate()
        let timer = Timer(timeInterval: 4.0, repeats: true) { [weak self] _ in
            Task { @MainActor in
                guard let self else { return }
                self.todaySteps += Int.random(in: 35...90)
                self.distanceMeters = Double(self.todaySteps) * 0.78
                self.activeMinutes = self.todaySteps / 110
            }
        }
        RunLoop.main.add(timer, forMode: .common)
        simulator = timer
    }
}
