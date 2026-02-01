from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1920, 'height': 1080})

        # 1. Verify Valorant HTML
        cwd = os.getcwd()
        valorant_path = f"file://{cwd}/valorant.html"
        print(f"Navigating to {valorant_path}")
        page.goto(valorant_path)

        # Wait for fonts and layout
        page.wait_for_timeout(2000)

        # Screenshot Navbar
        page.locator('.navbar-size').screenshot(path='verification/valorant_navbar.png')

        # Screenshot Language Selector
        # Wait for lang selector to be initialized
        page.wait_for_selector('.lang-track button.active')
        page.locator('.lang-selector').screenshot(path='verification/valorant_lang.png')

        # Screenshot Settings FAB
        # It's fixed position, so taking a viewport screenshot might be better or element screenshot
        page.locator('#settings-fab').screenshot(path='verification/valorant_fab.png')

        # 2. Verify TruckersMP HTML
        truckers_path = f"file://{cwd}/truckersmp.html"
        print(f"Navigating to {truckers_path}")
        page.goto(truckers_path)

        page.wait_for_timeout(2000)

        page.locator('.navbar-size').screenshot(path='verification/truckersmp_navbar.png')
        page.wait_for_selector('.lang-track button.active')
        page.locator('.lang-selector').screenshot(path='verification/truckersmp_lang.png')
        page.locator('#settings-fab').screenshot(path='verification/truckersmp_fab.png')

        browser.close()

if __name__ == "__main__":
    run()
