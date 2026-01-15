from playwright.sync_api import sync_playwright, expect
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1920, 'height': 1080})

        # We will verify Valorant and TruckersMP pages
        pages_to_verify = [
            ("valorant.html", "verification_valorant.png"),
            ("truckersmp.html", "verification_truckersmp.png")
        ]

        cwd = os.getcwd()

        for filename, screenshot_name in pages_to_verify:
            page = context.new_page()
            url = f"file://{os.path.join(cwd, filename)}"
            print(f"Navigating to {url}")
            page.goto(url)

            # Wait for fonts and JS
            page.wait_for_load_state("networkidle")
            page.evaluate("document.fonts.ready")

            # 1. NAVBAR STANDARDIZATION
            # Check navbar content width
            navbar_content = page.locator(".navbar-content")
            max_width = navbar_content.evaluate("el => getComputedStyle(el).maxWidth")
            print(f"[{filename}] Navbar max-width: {max_width}")
            if max_width != "1200px":
                print(f"ERROR: [{filename}] Navbar max-width is NOT 1200px")

            # Check Absolute Centering of .nav-track
            nav_track = page.locator(".nav-track")
            position = nav_track.evaluate("el => getComputedStyle(el).position")
            left = nav_track.evaluate("el => getComputedStyle(el).left")
            transform = nav_track.evaluate("el => getComputedStyle(el).transform")

            print(f"[{filename}] Nav Track: pos={position}, left={left}, transform={transform}")

            # 2. SETTINGS FAB
            fab = page.locator("#settings-fab")
            z_index = fab.evaluate("el => getComputedStyle(el).zIndex")
            pointer_events = fab.evaluate("el => getComputedStyle(el).pointerEvents")
            parent_tag = fab.evaluate("el => el.parentElement.tagName")

            print(f"[{filename}] FAB: z-index={z_index}, pointer-events={pointer_events}, parent={parent_tag}")

            if z_index != "2147483647":
                 print(f"ERROR: [{filename}] FAB z-index is incorrect")

            # Click it to ensure it works and opens settings
            fab.click()
            page.wait_for_timeout(500) # Wait for animation
            settings_panel = page.locator("#settings-panel")
            expect(settings_panel).to_be_visible()
            print(f"[{filename}] Settings panel opened successfully")

            # Close settings
            fab.click()
            page.wait_for_timeout(500)

            # 3. LANGUAGE SELECTOR
            # Check active button color
            # We need to see which is active. Default is TR from script.
            active_lang = page.locator(".lang-track button.active")
            color = active_lang.evaluate("el => getComputedStyle(el).color")
            # Accent color #ffae00 is rgb(255, 174, 0)
            print(f"[{filename}] Active Lang Color: {color}")

            # Take screenshot
            output_path = os.path.join("verification", screenshot_name)
            page.screenshot(path=output_path)
            print(f"Screenshot saved to {output_path}")

            page.close()

        browser.close()

if __name__ == "__main__":
    run()
