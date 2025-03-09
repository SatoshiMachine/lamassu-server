import SecretInputFormik from 'src/components/inputs/formik/SecretInput'
import TextInputFormik from 'src/components/inputs/formik/TextInput'
import * as Yup from 'yup'

import { secretTest } from './helper'

export default {
  code: 'nostr',
  name: 'Nostr',
  title: 'Nostr (Direct Messages)',
  elements: [
    {
      code: 'privateKey',
      display: 'Private Key',
      component: SecretInputFormik
    },
    {
      code: 'relayUrl',
      display: 'Relay URL',
      component: TextInputFormik,
      face: true
    }
  ],
  getValidationSchema: account => {
    return Yup.object().shape({
      privateKey: Yup.string('The private key must be a string')
        .max(64, 'The private key is too long')
        .test(secretTest(account?.privateKey, 'private key')),
      relayUrl: Yup.string('The relay URL must be a string')
        .max(200, 'The relay URL is too long')
        .required('The relay URL is required')
        .url('Must be a valid URL')
    })
  }
} 