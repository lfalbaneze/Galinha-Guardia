"""Follow the visible menu flow instead of clicking hidden setup controls."""
from playwright.sync_api import Page
from sprite_grounding import check_sprite_grounding

READY = '[CharacterArt, GooseArt, FoxArt, OwlArt, ThorArt, ScarecrowArt, FarmSprites].every(art => art.ready)'


def start_adventure(page: Page) -> None:
    # A fixed poll also works in deterministic tests that stop the gameplay RAF.
    page.wait_for_function(READY, polling=50)
    check_sprite_grounding(page)
    page.locator('#newAdventureBtn').click()
    page.locator('#startBtn').click()
    page.wait_for_function("state.phase === 'playing'", polling=50)


def equip_from_pause(page: Page, skin: str) -> None:
    page.locator('#pauseBtn').click()
    page.locator('#menuCharacterBtn').click()
    page.locator('#menuSkinSelect').select_option(skin)
    page.locator('#menuBackBtn').click()
    page.locator('#continueBtn').click()
    page.wait_for_function("state.phase === 'playing'", polling=50)
