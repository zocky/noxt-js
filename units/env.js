export const info = {
  name: 'env',
  version: '1.0.0',
  description: 'Environment',
}

export default mlm => ({
  'define.DEV': () => process.env.NODE_ENV !== 'production',
  'define.PROD': () => process.env.NODE_ENV === 'production',
  'onBeforeLoad': () => {
    process.env.NODE_ENV ||= 'development'
  }
})
  