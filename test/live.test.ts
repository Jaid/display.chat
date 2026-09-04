import type {Browser, Page} from 'puppeteer-core'

import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, test} from 'bun:test'
import {existsSync} from 'node:fs'

import countPixels from 'count-in-png'
import puppeteer from 'puppeteer-core'

import screenshot from './lib/screenshot.ts'
import ViteSession from './lib/ViteSession.ts'

/** Inserts a preset so that the screenshots show a rendered chat instead of the empty state. */
const insertPreset = async (page: Page, title: string) => {
  await page.waitForFunction(() => document.querySelectorAll('button').length > 0)
  await page.evaluate(name => {
    const button = [...document.querySelectorAll('button')].find(candidate => candidate.textContent?.includes(name))
    button?.click()
  }, title)
  await page.waitForFunction(() => document.querySelectorAll('[data-side]').length > 0)
  await new Promise(resolve => setTimeout(resolve, 1500))
}
type BrowserName = 'chrome' | 'firefox'

const browserPaths: Record<BrowserName, Array<string | null | undefined>> = {
  chrome: [
    Bun.env.CHROME_PATH,
    Bun.which('chrome'),
    Bun.which('chrome.exe'),
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  ],
  firefox: [
    Bun.env.FIREFOX_PATH,
    Bun.which('firefox'),
    Bun.which('firefox.exe'),
    'C:/Program Files/Mozilla Firefox/firefox.exe',
    'C:/Program Files (x86)/Mozilla Firefox/firefox.exe',
  ],
}
const getBrowserPath = (host: BrowserName) => browserPaths[host].find(path => Boolean(path && existsSync(path)))
for (const host of ['chrome', 'firefox'] as const) {
  const executablePath = getBrowserPath(host)
  describe.if(Boolean(Bun.env.target) && Boolean(executablePath))(host, () => {
    let vite: ViteSession
    let page: Page
    let browser: Browser
    let externalRequests: Array<string>
    let pageErrors: Array<string>
    beforeAll(async () => {
      vite = new ViteSession({root: Bun.env.target})
      await vite.init()
      browser = await puppeteer.launch({
        browser: host,
        executablePath: executablePath!,
        defaultViewport: {
          width: 1920,
          height: 960,
        },
        args: host === 'chrome' ? ['--no-sandbox', '--disable-setuid-sandbox', '--enable-font-antialiasing', '--font-render-hinting=medium', '--flag-switches-begin', '--enable-experimental-web-platform-features', '--enable-features=JXLImageFormat,OverlayScrollbar', '--flag-switches-end'] : undefined,
      })
    })
    afterAll(async () => {
      await browser.close()
      await vite[Symbol.asyncDispose]()
    })
    beforeEach(async () => {
      page = await browser.newPage()
      externalRequests = []
      pageErrors = []
      const origin = new URL(vite.url).origin
      page.on('request', request => {
        const url = request.url()
        if (/^https?:/u.test(url) && new URL(url).origin !== origin) {
          externalRequests.push(url)
        }
      })
      page.on('pageerror', error => pageErrors.push(error instanceof Error ? error.message : String(error)))
      await page.goto(vite.url, {waitUntil: 'domcontentloaded'})
      await page.waitForSelector('body>div>*')
    })
    afterEach(async () => {
      await page.close()
    })
    test('static HTML after React render', async () => {
      const html = await page.content()
      await Bun.write('out/test/render.html', html)
      expect(html.length).toBeGreaterThan(0)
    }, {timeout: 10_000})
    test('real interaction', async () => {
      const title = await page.title()
      const pageText = await page.evaluate(() => document.body.innerText)
      expect(title.length).toBeGreaterThan(0)
      expect(typeof pageText).toBe('string')
    }, {timeout: 60_000})
    test('inserting a preset renders messages', async () => {
      await insertPreset(page, 'Tool call')
      const messages = await page.evaluate(() => document.querySelectorAll('[data-side]').length)
      expect(messages).toBeGreaterThan(2)
    }, {timeout: 60_000})
    test('is self-contained at runtime', async () => {
      await insertPreset(page, 'Tool call')
      await page.waitForFunction(() => !document.querySelector('[data-syntax-state="loading"]'))
      expect(externalRequests).toEqual([])
      expect(pageErrors).toEqual([])
    }, {timeout: 60_000})
    if (host === 'chrome') { // Skipping Firefox for now because it seemingly does not support `page.emulateMediaFeatures`
      test('exports a rendered PNG', async () => {
        await insertPreset(page, 'Every block kind')
        await page.evaluate(() => {
          const button = [...document.querySelectorAll('button')].find(candidate => candidate.textContent?.includes('Download PNG'))
          button?.click()
        })
        await page.waitForFunction(() => document.body.innerText.includes('Download started'))
        expect(pageErrors).toEqual([])
      }, {timeout: 60_000})
      describe.each(['page', 'content'])('%s screenshot', scope => {
        test.each(['dark', 'light'])('%s', async theme => {
          await insertPreset(page, 'Tool call')
          const image = await screenshot(page, {
            colorScheme: theme,
            element: scope === 'content' ? 'body>div>*' : undefined,
          })
          await Bun.write(`out/test/screenshots/${host}_${theme}_${scope}.png`, image)
          const pixels = countPixels(image)
          expect(pixels).toBeGreaterThan(100)
        }, {timeout: 30_000})
      })
    }
  })
}
