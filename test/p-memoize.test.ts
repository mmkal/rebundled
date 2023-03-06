import {configs} from '../src/configs'

test('p-memoize', async () => {
  process.argv = ['node', 'entrypoint.js', '--dry-run']
  expect(configs.find(c => c.package === 'p-memoize')!).toMatchInlineSnapshot(`
    Object {
      "package": "p-memoize",
      "scripts": Object {
        "bundle": [Function],
        "install": [Function],
        "modify": [Function],
        "publish": [Function],
      },
    }
  `)
})
