import { afterEach, describe, expect, it } from 'vitest'

import { createDrawer, destroyDrawers } from '../src'
import { createEl, resolveRenderable } from '../src/vanilla/dialog-content'

afterEach(() => {
  destroyDrawers()
  document.body.innerHTML = ''
})

describe('content slots', () => {
  it('accept elements as title and description', () => {
    const title = document.createElement('strong')
    title.textContent = 'Element title'
    const description = document.createElement('em')
    description.textContent = 'Element description'
    const drawer = createDrawer({ id: 'element-slots', title, description, open: true })
    const dialog = drawer.element!.querySelector('[role="dialog"]')!
    expect(dialog.querySelector('strong')).toBe(title)
    expect(dialog.querySelector('em')).toBe(description)
  })

  it('replace the previous body content on update', () => {
    const drawer = createDrawer({ id: 'body-swap', title: 'Body', content: 'First', open: true })
    const second = document.createElement('section')
    second.textContent = 'Second'
    drawer.update({ content: second })
    const body = drawer.element!.querySelector('[data-drawer-body]')!
    expect(body.textContent).toContain('Second')
    expect(body.textContent).not.toContain('First')
  })

  it('render nothing for values that are not text or elements', () => {
    expect(resolveRenderable(() => 'not an element' as unknown as HTMLElement)).toEqual({})
    expect(resolveRenderable({} as unknown as HTMLElement)).toEqual({})
  })
})

describe('createEl', () => {
  it('maps boolean attributes and skips empty children', () => {
    const element = createEl(
      'button',
      { disabled: true, hidden: false, title: null, 'data-count': 2 },
      [null, 'Label', undefined, document.createElement('span')]
    )
    expect(element.hasAttribute('disabled')).toBe(true)
    expect(element.hasAttribute('hidden')).toBe(false)
    expect(element.hasAttribute('title')).toBe(false)
    expect(element.getAttribute('data-count')).toBe('2')
    expect(element.childNodes).toHaveLength(2)
  })
})
