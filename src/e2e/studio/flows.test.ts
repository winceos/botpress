import { clickOn, fillField, expectMatchElement } from '../expectPuppeteer'
import { clickOnTreeNode, CONFIRM_DIALOG, expectBotApiCallSuccess, gotoStudio, loginIfNeeded } from '../utils'

describe('Studio - Flows', () => {
  beforeAll(async () => {
    await loginIfNeeded()
    if (!page.url().includes('studio')) {
      await gotoStudio()
    }
  })

  it('Load Flows', async () => {
    await clickOn('#bp-menu_Flows')
  })

  it('Create new flow', async () => {
    await clickOn('#btn-add-flow')
    await fillField('#input-flow-name', 'test_flow')
    await Promise.all([expectBotApiCallSuccess('flows'), clickOn('#btn-submit')])
  })

  it('Create new Node', async () => {
    await page.mouse.click(500, 150)
    await page.mouse.click(500, 150, { button: 'right' })
    await page.waitForSelector('li > .bp3-menu-item > .bp3-text-overflow-ellipsis')
    await page.click('li > .bp3-menu-item > .bp3-text-overflow-ellipsis', { button: 'left' })
  })

  it('Open node properties', async () => {
    const element = await expectMatchElement('.srd-node--selected', { text: /node-[0-9]*/ })
    await clickOn('div', {}, element)
    await page.waitForSelector('#btn-add-element')
    await clickOn('#btn-add-element')
    await clickOn('.bp3-dialog-close-button')
  })

  it('Check default transition', async () => {
    await page.waitForSelector('#node-props-modal-standard-node-tabs-tab-transitions')
    await clickOn('#node-props-modal-standard-node-tabs-tab-transitions')
    await page.hover('#node-props-modal-standard-node-tabs-pane-transitions > div')
    await clickOn('#node-props-modal-standard-node-tabs-pane-transitions a', { clickCount: 1, text: 'Edit' })
    await clickOn('.bp3-dialog-close-button')
  })

  it('Rename flow', async () => {
    await clickOnTreeNode('test_flow', 'right')
    await clickOn('#btn-rename')
    await fillField('#input-flow-name', 'test_flow_renamed')

    await Promise.all([expectBotApiCallSuccess('flows/test_flow_renamed.flow.json', 'POST'), clickOn('#btn-submit')])
  })

  it('Delete flow', async () => {
    await clickOnTreeNode('test_flow_renamed', 'right')

    await Promise.all([
      expectBotApiCallSuccess('flows/test_flow_renamed.flow.json/delete', 'POST'),
      clickOn('#btn-delete'),
      clickOn(CONFIRM_DIALOG.ACCEPT)
    ])
  })

  it('Duplicate flow', async () => {
    await clickOnTreeNode('memory', 'right')
    await clickOn('#btn-duplicate')
    await fillField('#input-flow-name', 'new_duplicated_flow')

    await Promise.all([expectBotApiCallSuccess('flows', 'POST'), clickOn('#btn-submit')])
    await page.waitFor(3000)
  })
})
