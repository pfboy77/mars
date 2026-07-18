import Foundation
import Testing
@testable import teraformingmars2

struct GameReducerTests {
    @Test func initialGameState() {
        let state = createInitialState()
        #expect(state.version == 1)
        #expect(state.tr == 20)
        #expect(state.resources.count == 6)
        #expect(state.resources.allSatisfy { $0.amount == 0 })
        #expect(state.resources.allSatisfy { $0.production == 0 })
    }

    @Test func resourceEquatable() {
        let id = UUID()
        let r1 = Resource(id: id, name: "Test", amount: 10, production: 1, isMegaCredit: true, isEnergy: false, isHeat: false)
        let r2 = Resource(id: id, name: "Test", amount: 10, production: 1, isMegaCredit: true, isEnergy: false, isHeat: false)
        #expect(r1 == r2)
    }

    @Test func addResource() {
        var state = createInitialState()
        if let newState = applyAdd(state: state, resourceName: "Steel", delta: 5) {
            state = newState
            let steel = state.resources.first { $0.name == "Steel" }!
            #expect(steel.amount == 5)
        }
    }

    @Test func subtractResource() {
        var state = createInitialState()
        if let newState = applySubtract(state: state, resourceName: "Plants", delta: 2) {
            state = newState
            let plants = state.resources.first { $0.name == "Plants" }!
            #expect(plants.amount == 0)
        }
    }

    @Test func subtractResourceCannotGoBelowZero() {
        var state = createInitialState()
        if let newState = applySubtract(state: state, resourceName: "Heat", delta: 99) {
            state = newState
            let heat = state.resources.first { $0.name == "Heat" }!
            #expect(heat.amount == 0)
        }
    }

    @Test func productionTransfersEnergyToHeat() {
        var state = createInitialState()
        state.resources[state.resources.firstIndex(where: { $0.isEnergy })!].amount = 2
        let newState = applyProduction(state: state)
        let energy = newState.resources.first { $0.isEnergy }!
        let heat = newState.resources.first { $0.isHeat }!
        #expect(energy.amount == 0)
        #expect(heat.amount == 2)
    }

    @Test func productionAddsProduction() {
        let state = createInitialState()
        let newState = applyProduction(state: state)
        let steel = newState.resources.first { $0.name == "Steel" }!
        #expect(steel.amount == 0) // Steel production=0, not MC so no TR
    }

    @Test func productionAddsTRToMC() {
        let state = createInitialState()
        let newState = applyProduction(state: state)
        let mc = newState.resources.first { $0.isMegaCredit }!
        #expect(mc.amount == 20) // MC=0, production=0, TR=20
    }

    @Test func resetSetsAllToZero() {
        var state = createInitialState()
        // Manually set some values
        var resources = state.resources
        resources[0].amount = 100
        resources[1].amount = 50
        state.resources = resources

        let newState = applyReset(state: state)
        #expect(newState.tr == 20)
        #expect(newState.resources[0].amount == 0)
        #expect(newState.resources[1].amount == 0)
    }

    @Test func incrementTR() {
        let state = createInitialState()
        let newState = applyIncrementTR(state: state)
        #expect(newState.tr == 21)
    }

    @Test func decrementTR() {
        let state = createInitialState()
        let newState = applyDecrementTR(state: state)
        #expect(newState.tr == 19)
    }

    @Test func trClampedToZero() {
        var state = createInitialState()
        // Set TR to 0 manually
        state.tr = 0
        let newState = applyDecrementTR(state: state)
        #expect(newState.tr == 0)
    }

    @Test func trClampedToHundred() {
        var state = createInitialState()
        state.tr = 100
        let newState = applyIncrementTR(state: state)
        #expect(newState.tr == 100)
    }

    @Test func updateProduction() {
        let state = createInitialState()
        if let newState = applyUpdateProduction(state: state, resourceName: "Steel", newProduction: 5) {
            let steel = newState.resources.first { $0.name == "Steel" }!
            #expect(steel.production == 5)
        }
    }

    @Test func undoRedoCycle() {
        var state = createInitialState()
        var undoStack: [GameSnapshot] = []

        // Snapshot current
        undoStack = pushSnapshot(to: &undoStack, state: state)

        // Apply change
        if let changed = applyAdd(state: state, resourceName: "Steel", delta: 10) {
            state = changed
        }

        // Undo
        let restored = popUndo(from: &undoStack)
        #expect(restored != nil)
        #expect(restored!.resources[0].amount == 0) // MC should be back to initial
    }

    @Test func gameStateCodable() {
        let state = createInitialState()
        let encoder = JSONEncoder()
        let decoder = JSONDecoder()

        let data = try! encoder.encode(state)
        let decoded = try! decoder.decode(GameState.self, from: data)
        #expect(decoded == state)
    }

    @Test func migrateVersionOneState() {
        let state = createInitialState()
        let data = try! JSONEncoder().encode(state)
        let migrated = migrateGameState(from: data, to: 1)
        #expect(migrated != nil)
        let decoded = try! JSONDecoder().decode(GameState.self, from: migrated!)
        #expect(decoded == state)
    }

    @Test func rejectsUnsupportedMigrationTarget() {
        let data = try! JSONEncoder().encode(createInitialState())
        #expect(migrateGameState(from: data, to: 2) == nil)
    }
}


@Suite(.serialized)
struct ViewModelTests {
    @Test func viewModelInitializesFromDefaults() {
        let defaults = UserDefaults.standard
        defaults.removeObject(forKey: "GameStateKey")
        let vm = GameViewModel()
        #expect(vm.tr == 20)
        #expect(vm.resources.count == 6)
        defaults.removeObject(forKey: "GameStateKey")
    }

    @Test func viewModelSaveAndRestore() {
        let defaults = UserDefaults.standard
        defaults.removeObject(forKey: "GameStateKey")
        let vm = GameViewModel()
        vm.tr = 42
        vm.resources[0].amount = 100
        vm.savePersistentState()

        let vm2 = GameViewModel()
        #expect(vm2.tr == 42)
        #expect(vm2.resources[0].amount == 100)

        // Clean up
        defaults.removeObject(forKey: "GameStateKey")
    }

    @Test func saveAndRestoreVersion() {
        let defaults = UserDefaults.standard
        defaults.removeObject(forKey: "GameStateKey")
        let vm = GameViewModel()
        vm.savePersistentState()
        let data = defaults.data(forKey: "GameStateKey")
        let state = try! JSONDecoder().decode(GameState.self, from: data!)
        #expect(state.version == 1)
        defaults.removeObject(forKey: "GameStateKey")
    }

    @Test func initialStateVersionIsOne() {
        let state = createInitialState()
        #expect(state.version == 1)
    }

    @Test func trChangesCanBeUndoneAndRedone() {
        let defaults = UserDefaults.standard
        defaults.removeObject(forKey: "GameStateKey")
        let vm = GameViewModel()

        vm.incrementTR()
        #expect(vm.tr == 21)
        vm.undo()
        #expect(vm.tr == 20)
        vm.redo()
        #expect(vm.tr == 21)

        defaults.removeObject(forKey: "GameStateKey")
    }

}
