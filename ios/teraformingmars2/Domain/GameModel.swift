import Foundation

// MARK: - Resource

struct Resource: Identifiable, Codable, Equatable, Hashable {
    let id: UUID
    var name: String
    var amount: Int
    var production: Int
    var isMegaCredit: Bool
    var isEnergy: Bool
    var isHeat: Bool

    static let initialResources: [Resource] = [
        Resource(id: UUID(), name: "MC", amount: 20, production: 0, isMegaCredit: true, isEnergy: false, isHeat: false),
        Resource(id: UUID(), name: "Steel", amount: 5, production: 0, isMegaCredit: false, isEnergy: false, isHeat: false),
        Resource(id: UUID(), name: "Titanium", amount: 3, production: 0, isMegaCredit: false, isEnergy: false, isHeat: false),
        Resource(id: UUID(), name: "Plants", amount: 4, production: 2, isMegaCredit: false, isEnergy: false, isHeat: false),
        Resource(id: UUID(), name: "Energy", amount: 2, production: 1, isMegaCredit: false, isEnergy: true, isHeat: false),
        Resource(id: UUID(), name: "Heat", amount: 0, production: 0, isMegaCredit: false, isEnergy: false, isHeat: true),
    ]

    init(id: UUID = UUID(), name: String, amount: Int, production: Int, isMegaCredit: Bool = false, isEnergy: Bool = false, isHeat: Bool = false) {
        self.id = id
        self.name = name
        self.amount = amount
        self.production = production
        self.isMegaCredit = isMegaCredit
        self.isEnergy = isEnergy
        self.isHeat = isHeat
    }

    static func == (lhs: Resource, rhs: Resource) -> Bool {
        lhs.id == rhs.id &&
        lhs.name == rhs.name &&
        lhs.amount == rhs.amount &&
        lhs.production == rhs.production &&
        lhs.isMegaCredit == rhs.isMegaCredit &&
        lhs.isEnergy == rhs.isEnergy &&
        lhs.isHeat == rhs.isHeat
    }
}

// MARK: - GameState

struct GameState: Codable, Equatable {
    var version: Int
    var resources: [Resource]
    var tr: Int
}

extension GameState {
    static let initial = GameState(version: 1, resources: Resource.initialResources, tr: 20)
}

// MARK: - GameSnapshot (for Undo/Redo)

struct GameSnapshot: Codable, Equatable {
    let resources: [Resource]
    let tr: Int
}
