import { bpConfig } from '../../../jest-puppeteer.config'
import { clickOn, expectMatch, expectMatchElement, fillField } from '../expectPuppeteer'
import { autoAnswerDialog, closeToaster, expectAdminApiCallSuccess, gotoAndExpect } from '../utils'

describe('Admin - Users', () => {
  const testUserEmail = 'someguy@me.com'

  beforeAll(async () => {
    await gotoAndExpect(`${bpConfig.host}/admin/workspace/users`)
  })

  const clickButtonForUser = async (buttonId: string, userId: string) => {
    const botRow = await expectMatchElement('.bp_table-row', { text: userId })
    await clickOn('#btn-menu', undefined, botRow)
    await clickOn(buttonId)
  }

  it('Create a new collaborator', async () => {
    await clickOn('#tab-collaborators')
    await clickOn('#btn-create')
    await fillField('#select-email', testUserEmail)
    await page.keyboard.press('Enter')

    await clickOn('#select-role')
    await fillField('input[placeholder="Filter..."]', 'Developer')

    await page.keyboard.press('Enter')

    await Promise.all([
      expectAdminApiCallSuccess(`users`, 'POST'),
      expectAdminApiCallSuccess(`users`, 'GET'),
      clickOn('#btn-submit')
    ])

    await expectMatch('Account Created')

    await clickOn('button[aria-label="Close"]')
  })

  it('Reset user password', async () => {
    await clickOn('#div-role-dev')
    await page.waitFor(500) // Delay for the collapse animation

    autoAnswerDialog()

    await Promise.all([
      expectAdminApiCallSuccess(`users/reset/default/${testUserEmail}`, 'GET'),
      clickButtonForUser('#btn-resetPassword', testUserEmail)
    ])

    await expectMatch('Your password has been reset')
    await closeToaster()

    await clickOn('button[aria-label="Close"]')
  })

  it('Change role to administrator', async () => {
    await page.waitFor(500)
    await clickButtonForUser('#btn-changeRole', testUserEmail)
    await Promise.all([expectAdminApiCallSuccess(`users/workspace/update_role`, 'POST'), clickOn('#btn-role-admin')])
  })

  it('Delete created user', async () => {
    await clickOn('#div-role-admin')
    await page.waitFor(500)

    autoAnswerDialog()

    await Promise.all([
      expectAdminApiCallSuccess(`users/default/${testUserEmail}/delete`, 'POST'),
      clickButtonForUser('#btn-deleteUser', testUserEmail)
    ])
  })
})
