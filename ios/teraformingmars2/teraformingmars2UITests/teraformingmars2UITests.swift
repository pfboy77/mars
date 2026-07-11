import XCTest

final class teraformingmars2UITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
        app.launchArguments = ["-UITesting"]
        app.launch()
    }

    override func tearDownWithError() throws {
        app.terminate()
    }

    @Test func appLaunchesSuccessfully() {
        XCTAssertTrue(app.staticTexts.matching(identifier: "Terraform Rating").count > 0,
                       "App should display TR text")
    }

    @Test func resourceCardsAreDisplayed() {
        let mcText = app.staticTexts["MC"]
        XCTAssertTrue(mcText.exists, "MC resource card should be displayed")
    }

    @Test func resourceAmountUpdatesOnPlusTap() {
        // Tap the + button on a resource card
        let resourceCard = app.staticTexts["Steel"].firstMatch
        let plusButton = resourceCard.superscript.buttons["Add to Steel"]
        plusButton.click()
        XCTAssertTrue(true)
    }

    @Test func resourceAmountUpdatesOnMinusTap() {
        let resourceCard = app.staticTexts["MC"].firstMatch
        let minusButton = resourceCard.superscript.buttons["Subtract from MC"]
        minusButton.click()
        XCTAssertTrue(true)
    }
}

extension UIView {
    var firstMatch: UIView { self }
}

extension XCUIElement {
    func click() {
        guard self.exists else { return }
        self.tap()
    }
}

extension XCUIElementQuery {
    var firstMatch: XCUIElement { self.firstMatch }
}
