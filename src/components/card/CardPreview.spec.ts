import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import CardPreview from './CardPreview.vue'
import type { UploadDisplay, UploadedArtwork, UploadOrientation } from '../../types/card'

const artwork: UploadedArtwork = {
  name: 'photo.png',
  size: 1,
  type: 'image/png',
  url: 'blob:photo',
}

function mountPreview(uploadOrientation?: UploadOrientation, uploadDisplay?: UploadDisplay) {
  return mount(CardPreview, {
    props: {
      design: { id: 'sport-01', name: 'Striped Club Shield', category: 'Sport', number: '01' },
      finish: 'Black',
      engravingStyle: 'name',
      holderName: 'ALEX MORGAN',
      uploadedArtwork: artwork,
      uploadOrientation,
      uploadDisplay,
    },
  })
}

describe('CardPreview uploaded artwork placement', () => {
  it('defaults to landscape in the artwork spot, keeping the finish', () => {
    const wrapper = mountPreview()
    expect(wrapper.get('.card-upload').attributes('data-placement')).toBe('slot')
    // The finish image (with its printed chip) stays visible, so no extra chip is drawn.
    expect(wrapper.find('.payment-chip').exists()).toBe(false)
  })

  it.each([
    ['landscape', 'cover', 'cover'],
    ['portrait', 'cover', 'cover-rotated'],
    ['portrait', 'default', 'slot-rotated'],
  ] as const)('%s + %s → %s', (orientation, display, placement) => {
    const wrapper = mountPreview(orientation, display)
    expect(wrapper.get('.card-upload').attributes('data-placement')).toBe(placement)
  })

  it('draws the chip and keeps text light when the upload covers the card', () => {
    const wrapper = mountPreview('landscape', 'cover')
    expect(wrapper.find('.payment-chip').exists()).toBe(true)
    expect(wrapper.get('.metal-card').attributes('style')).toContain('color: rgb(242, 242, 245)')
  })
})
