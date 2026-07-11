import XCTest

final class teraformingmars2UITestsLaunchTests: XCTestCase {
    var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launch()
    }

    @Test func launchSucceeds() {
        let window = app.windows.firstMatch
        XCTAssertTrue(window.exists, "Main window should exist")
    }
}
