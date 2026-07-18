import XCTest

final class teraformingmars2UITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["-UITesting"]
        app.launch()
    }

    override func tearDownWithError() throws {
        app.terminate()
    }

    func testAppLaunchesSuccessfully() {
        XCTAssertTrue(app.staticTexts["Terraform Rating 20"].waitForExistence(timeout: 2),
                      "App should display TR text")
    }

    func testResourceCardsAreDisplayed() {
        let mcText = app.staticTexts["MC"]
        XCTAssertTrue(mcText.exists, "MC resource card should be displayed")
    }

    func testTRUpdatesAndCanBeUndone() {
        app.buttons["Increase TR"].tap()
        XCTAssertTrue(app.staticTexts["Terraform Rating 21"].waitForExistence(timeout: 1))
        app.buttons["Undo"].tap()
        XCTAssertTrue(app.staticTexts["Terraform Rating 20"].waitForExistence(timeout: 1))
    }
}
