
from playwright.sync_api import sync_playwright
import os

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 1. Verify Valorant Page
        print("Verifying Valorant page...")
        page.goto("file://" + os.path.abspath("valorant.html"))

        # Wait for fonts and layout
        page.wait_for_timeout(1000)

        # Verify Navbar Width (approx check via evaluation)
        navbar_width = page.evaluate("document.querySelector('.navbar-content').offsetWidth")
        # Note: offsetWidth might be full width if max-width constrains it, but let's check styles
        navbar_style_max_width = page.evaluate("getComputedStyle(document.querySelector('.navbar-content')).maxWidth")
        print(f"Valorant Navbar Max Width: {navbar_style_max_width}")

        # Verify Settings FAB z-index
        fab_zindex = page.evaluate("getComputedStyle(document.getElementById('settings-fab')).zIndex")
        print(f"Valorant Settings FAB z-index: {fab_zindex}")

        # Verify Language Selector Active Color
        lang_active_color = page.evaluate("getComputedStyle(document.querySelector('.lang-track button.active')).color")
        print(f"Valorant Lang Active Color: {lang_active_color}")

        page.screenshot(path="verification/valorant_verification.png", full_page=False)

        # 2. Verify TruckersMP Page
        print("Verifying TruckersMP page...")
        page.goto("file://" + os.path.abspath("truckersmp.html"))
        page.wait_for_timeout(1000)

        page.screenshot(path="verification/truckersmp_verification.png", full_page=False)

        browser.close()

if __name__ == "__main__":
    run_verification()
