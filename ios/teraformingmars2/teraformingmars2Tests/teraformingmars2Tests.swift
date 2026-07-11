import Testing
@testable import teraformingmars2

struct GameReducerTests {
    @Test func initialGameState() {
        let state = createInitialState()
        #expect(state.version == 1)
        #expect(state.tr == 20)
        #expect(state.resources.count == 6)
        #expect(state.resources[0].amount == 20) // MC
        #expect(state.resources[1].amount == 5)  // Steel
        #expect(state.resources[2].amount == 3)  // Titanium
        #expect(state.resources[3].amount == 4)  // Plants
        #expect(state.resources[4].amount == 2)  // Energy
        #expect(state.resources[5].amount == 0)  // Heat
    }

    @Test func resourceEquatable() {
        let r1 = Resource(id: UUID(), name: "Test", amount: 10, production: 1, isMegaCredit: true, isEnergy: false, isHeat: false)
        let r2 = Resource(id: UUID(), name: "Test", amount: 10, production: 1, isMegaCredit: true, isEnergy: false, isHeat: false)
        #expect(r1 == r2)
    }

    @Test func addResource() {
        var state = createInitialState()
        if let newState = applyAdd(state: state, resourceName: "Steel", delta: 5) {
            state = newState
            let steel = state.resources.first { $0.name == "Steel" }!
            #expect(steel.amount == 10)
        }
    }

    @Test func subtractResource() {
        var state = createInitialState()
        if let newState = applySubtract(state: state, resourceName: "Plants", delta: 2) {
            state = newState
            let plants = state.resources.first { $0.name == "Plants" }!
            #expect(plants.amount == 2)
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
        // Energy=2, Heat=0
        let newState = applyProduction(state: state)
        let energy = newState.resources.first { $0.isEnergy }!
        let heat = newState.resources.first { $0.isHeat }!
        #expect(energy.amount == 0)
        #expect(heat.amount == 2)
    }

    @Test func productionAddsProduction() {
        var state = createInitialState()
        let newState = applyProduction(state: state)
        let steel = newState.resources.first { $0.name == "Steel" }!
        #expect(steel.amount == 5) // Steel production=0, not MC so no TR
    }

    @Test func productionAddsTRToMC() {
        var state = createInitialState()
        let newState = applyProduction(state: state)
        let mc = newState.resources.first { $0.isMegaCredit }!
        #expect(mc.amount == 20 + 20) // MC=20, production=0, TR=20
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
        var state = createInitialState()
        let newState = applyIncrementTR(state: state)
        #expect(newState.tr == 21)
    }

    @Test func decrementTR() {
        var state = createInitialState()
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
        var state = createInitialState()
        if let newState = applyUpdateProduction(state: state, resourceName: "Steel", newProduction: 5) {
            let steel = newState.resources.first { $0.name == "Steel" }!
            #expect(steel.production == 5)
        }
    }

    @Test func undoRedoCycle() {
        var state = createInitialState()
        var undoStack: [GameSnapshot] = []
        var redoStack: [GameSnapshot] = []

        // Snapshot current
        undoStack = pushSnapshot(to: &undoStack, state: state)

        // Apply change
        if let changed = applyAdd(state: state, resourceName: "Steel", delta: 10) {
            state = changed
        }

        // Undo
        let restored = popUndo(from: &undoStack)
        #expect(restored != nil)
        #expect(restored!.resources[0].amount == 20) // MC should be back to initial
    }

    @Test func gameStateCodable() {
        let state = createInitialState()
        let encoder = JSONEncoder()
        let decoder = JSONDecoder()

        let data = try! encoder.encode(state)
        let decoded = try! decoder.decode(GameState.self, from: data)
        #expect(decoded == state)
    }
}

struct ViewModelTests {
    @Test func viewModelInitializesFromDefaults() {
        let defaults = UserDefaults.standard
        defaults.removeObject(forKey: "GameStateKey")
        let vm = GameViewModel()
        #expect(vm.tr == 20)
        #expect(vm.resources.count == 6)
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
}
