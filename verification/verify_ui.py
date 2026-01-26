from playwright.sync_api import sync_playwright

def verify(page, url, name):
    print(f"Navigating to {url}...")
    page.goto(url)
    page.wait_for_load_state('networkidle')
    # Wait a bit for animations/fonts
    page.wait_for_timeout(1000)
    print(f"Taking screenshot for {name}...")
    page.screenshot(path=f"verification/{name}.png")

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1920, "height": 1080})
    try:
        verify(page, "http://localhost:8000/valorant.html", "valorant")
        verify(page, "http://localhost:8000/truckersmp.html", "truckersmp")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        browser.close()
