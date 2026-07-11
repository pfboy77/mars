import SwiftUI

// MARK: - GameViewModel

@Observable
class GameViewModel {
    var resources: [Resource]
    var tr: Int
    var undoStack: [GameSnapshot] = []
    var redoStack: [GameSnapshot] = []
    var deltaValues: [UUID: Int] = [:]

    private let gameStateKey = "GameStateKey"
    private let gameVersion = 1

    init() {
        if let data = UserDefaults.standard.data(forKey: gameStateKey),
           let state = try? JSONDecoder().decode(GameState.self, from: data) {
            self.resources = state.resources
            self.tr = state.tr
        } else {
            let initialState = createInitialState()
            self.resources = initialState.resources
            self.tr = initialState.tr
        }
    }

    func savePersistentState() {
        let state = GameState(version: gameVersion, resources: resources, tr: tr)
        if let data = try? JSONEncoder().encode(state) {
            UserDefaults.standard.set(data, forKey: gameStateKey)
        }
    }

    func applyAdd(resourceNamed name: String, delta: Int) {
        saveState()
        if let newState = applyAdd(state: GameState(version: gameVersion, resources: resources, tr: tr),
                                   resourceName: name, delta: delta) {
            resources = newState.resources
            tr = newState.tr
            savePersistentState()
        }
    }

    func applySubtract(resourceNamed name: String, delta: Int) {
        saveState()
        if let newState = applySubtract(state: GameState(version: gameVersion, resources: resources, tr: tr),
                                        resourceName: name, delta: delta) {
            resources = newState.resources
            tr = newState.tr
            savePersistentState()
        }
    }

    func applyProduction() {
        saveState()
        let newState = applyProduction(state: GameState(version: gameVersion, resources: resources, tr: tr))
        resources = newState.resources
        tr = newState.tr
        savePersistentState()
    }

    func applyReset() {
        saveState()
        let newState = applyReset(state: GameState(version: gameVersion, resources: resources, tr: tr))
        resources = newState.resources
        tr = newState.tr
        savePersistentState()
    }

    func updateProduction(for name: String, production: Int) {
        saveState()
        if let newState = applyUpdateProduction(state: GameState(version: gameVersion, resources: resources, tr: tr),
                                                resourceName: name, newProduction: production) {
            resources = newState.resources
            tr = newState.tr
            savePersistentState()
        }
    }

    func incrementTR() {
        let newTR = min(tr + 1, 100)
        if newTR != tr {
            tr = newTR
            savePersistentState()
        }
    }

    func decrementTR() {
        let newTR = max(tr - 1, 0)
        if newTR != tr {
            tr = newTR
            savePersistentState()
        }
    }

    func undo() {
        guard let last = undoStack.popLast() else { return }
        redoStack.append(snapshot(GameState(version: gameVersion, resources: resources, tr: tr)))
        let restored = restore(from: last, version: gameVersion)
        resources = restored.resources
        tr = restored.tr
        savePersistentState()
    }

    func redo() {
        guard let next = redoStack.popLast() else { return }
        undoStack.append(snapshot(GameState(version: gameVersion, resources: resources, tr: tr)))
        let restored = restore(from: next, version: gameVersion)
        resources = restored.resources
        tr = restored.tr
        savePersistentState()
    }

    func setDelta(uuid: UUID, value: Int) {
        deltaValues[uuid] = value
    }

    private func saveState() {
        undoStack = pushSnapshot(to: &undoStack, state: GameState(version: gameVersion, resources: resources, tr: tr))
        redoStack.removeAll()
    }
}

// MARK: - ContentView

struct ContentView: View {
    @State private var viewModel = GameViewModel()

    var body: some View {
        VStack(spacing: 8) {
            // Toolbar: Undo/Redo + TR + Buttons
            HStack {
                Button("↩︎") {
                    withAnimation { viewModel.undo() }
                }
                .disabled(viewModel.undoStack.isEmpty)
                .font(.headline)
                .padding(6)
                .background(Color(.systemGray5))
                .cornerRadius(8)
                .accessibilityLabel("Undo")

                Button("↪︎") {
                    withAnimation { viewModel.redo() }
                }
                .disabled(viewModel.redoStack.isEmpty)
                .font(.headline)
                .padding(6)
                .background(Color(.systemGray5))
                .cornerRadius(8)
                .accessibilityLabel("Redo")

                Spacer()

                HStack(spacing: 8) {
                    Text("TR: \(viewModel.tr)")
                        .font(.headline)
                        .accessibilityLabel("Terraform Rating \(viewModel.tr)")

                    Button("-") {
                        viewModel.decrementTR()
                    }
                    .font(.headline)
                    .padding(4)
                    .background(Color(.systemGray5))
                    .cornerRadius(6)
                    .accessibilityLabel("Decrease TR")

                    Button("+") {
                        viewModel.incrementTR()
                    }
                    .font(.headline)
                    .padding(4)
                    .background(Color(.systemGray5))
                    .cornerRadius(6)
                    .accessibilityLabel("Increase TR")
                }

                Button("リセット") {
                    viewModel.applyReset()
                }
                .font(.headline)
                .padding(6)
                .background(Color.red.opacity(0.8))
                .foregroundColor(.white)
                .cornerRadius(8)
                .accessibilityLabel("Reset all resources")

                Button("▶︎ 産出") {
                    viewModel.applyProduction()
                }
                .font(.headline)
                .padding(6)
                .background(Color.blue)
                .foregroundColor(.white)
                .cornerRadius(8)
                .accessibilityLabel("Production phase")
            }
            .padding(.horizontal)

            // Resources Grid
            let columns = Array(repeating: GridItem(.flexible(), spacing: 8), count: 3)
            LazyVGrid(columns: columns, spacing: 8) {
                ForEach(viewModel.$resources) { $resource in
                    VStack(spacing: 4) {
                        Text(resource.name)
                            .font(.headline)
                            .accessibilityLabel(resource.name)

                        Text("資源: \(resource.amount)")
                            .font(.subheadline)
                            .accessibilityLabel("\(resource.name) \(resource.amount)")

                        HStack(spacing: 4) {
                            TextField("±", text: Binding(
                                get: {
                                    let v = viewModel.deltaValues[resource.id] ?? 0
                                    return v == 0 ? "" : String(v)
                                },
                                set: { newText in
                                    if let v = Int(newText) {
                                        viewModel.setDelta(uuid: resource.id, value: v)
                                    } else {
                                        viewModel.setDelta(uuid: resource.id, value: 0)
                                    }
                                }
                            ))
                            .keyboardType(.numberPad)
                            .frame(width: 40)
                            .textFieldStyle(RoundedBorderTextFieldStyle())

                            Button("＋") {
                                viewModel.applyAdd(resourceNamed: resource.name,
                                                   delta: viewModel.deltaValues[resource.id] ?? 0)
                                viewModel.setDelta(uuid: resource.id, value: 0)
                            }
                            .font(.subheadline)
                            .buttonStyle(.bordered)
                            .accessibilityLabel("Add to \(resource.name)")

                            Button("−") {
                                viewModel.applySubtract(resourceNamed: resource.name,
                                                        delta: viewModel.deltaValues[resource.id] ?? 0)
                                viewModel.setDelta(uuid: resource.id, value: 0)
                            }
                            .font(.subheadline)
                            .buttonStyle(.bordered)
                            .accessibilityLabel("Subtract from \(resource.name)")
                        }

                        Stepper("産出: \(resource.production)",
                                onIncrement: {
                                    viewModel.saveState()
                                    viewModel.updateProduction(for: resource.name,
                                                               production: resource.production + 1)
                                },
                                onDecrement: {
                                    viewModel.saveState()
                                    viewModel.updateProduction(for: resource.name,
                                                               production: resource.production - 1)
                                })
                            .font(.subheadline)
                    }
                    .padding(6)
                    .background(Color(.systemGray6))
                    .cornerRadius(8)
                    .frame(minHeight: 120)
                }
            }
            .padding(.horizontal, 8)
        }
        .hideKeyboardOnTap()
    }
}

// MARK: - Keyboard Helper

extension View {
    func hideKeyboardOnTap() -> some View {
        self.onTapGesture {
            UIApplication.shared.sendAction(
                #selector(UIResponder.resignFirstResponder),
                to: nil, from: nil, for: nil
            )
        }
    }
}

// MARK: - Preview

#Preview {
    ContentView()
}
