import SecretInputFormik from 'src/components/inputs/formik/SecretInput'
import TextInputFormik from 'src/components/inputs/formik/TextInput'
import * as Yup from 'yup'

import { secretTest } from './helper'

export default {
  code: 'nostr',
  name: 'Nostr',
  title: 'Nostr (SMS)',
  elements: [
    {
      code: 'privateKey',
      display: 'Private Key (hex)',
      description: 'The private key used to sign messages',
      component: SecretInputFormik
    },
    {
      code: 'relays',
      display: 'Relay URLs',
      description: 'WebSocket URLs of Nostr relays (one per line)',
      component: TextInputFormik,
      face: true,
      inputProps: {
        placeholder: 'wss://relay.damus.io\nwss://nos.lol\nwss://relay.nostr.band',
        multiline: true,
        rows: 3
      }
    },
    {
      code: 'toNumber',
      display: 'Notifications Public Key (hex)',
      description: 'The Nostr public key to send notifications to',
      component: TextInputFormik,
      face: true
    }
  ],
  getValidationSchema: account => {
    return Yup.object().shape({
      privateKey: Yup.string('The private key must be a string')
        .matches(/^[0-9a-f]{64}$/, 'Must be a valid 64-character hex private key')
        .required('Private key is required')
        .test(secretTest(account?.privateKey, 'private key')),
      relays: Yup.string('Relay URLs must be a string')
        .test('valid-urls', 'Must be valid websocket URLs (one per line)', value => {
          if (!value) return true // Allow empty to use defaults
          const urls = value.split('\n').map(u => u.trim()).filter(Boolean)
          return urls.every(url => /^wss:\/\/.+/.test(url))
        }),
      toNumber: Yup.string('The notifications public key must be a string')
        .matches(/^[0-9a-f]{64}$/, 'Must be a valid 64-character hex public key')
        .required('Notifications public key is required')
    })
  }
}
