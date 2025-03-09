import SecretInputFormik from 'src/components/inputs/formik/SecretInput'
import TextInputFormik from 'src/components/inputs/formik/TextInput'
import TextareaFormik from 'src/components/inputs/formik/TextareaInput'
import * as Yup from 'yup'

import { secretTest } from './helper'

export default {
  code: 'nostr',
  name: 'Nostr',
  title: 'Nostr (Direct Messages)',
  elements: [
    {
      code: 'privateKey',
      display: 'Private Key (hex)',
      component: SecretInputFormik,
      description: 'The private key used to sign messages (64 character hex)'
    },
    {
      code: 'relays',
      display: 'Relay URLs',
      component: TextareaFormik,
      description: 'List of relay URLs (one per line)',
      face: true
    }
  ],
  getValidationSchema: account => {
    return Yup.object().shape({
      privateKey: Yup.string('Private key must be a string')
        .matches(/^[0-9a-f]{64}$/, 'Must be a valid 64-character hex private key')
        .required('Private key is required')
        .test(secretTest(account?.privateKey, 'private key')),
      relays: Yup.string('Relay URLs must be a string')
        .test('valid-urls', 'Must be valid websocket URLs (one per line)', value => {
          if (!value) return true
          const urls = value.split('\n').map(u => u.trim()).filter(Boolean)
          return urls.every(url => url.startsWith('wss://'))
        })
    })
  }
} 