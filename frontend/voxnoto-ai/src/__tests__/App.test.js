import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import App from '../App.vue'

describe('App.vue', () => {
  it('renders Record and Upload buttons', () => {
    const wrapper = mount(App)
    expect(wrapper.text()).toContain('Record Audio')
    expect(wrapper.text()).toContain('Upload File')
  })

  it('shows VoxNoto title', () => {
    const wrapper = mount(App)
    expect(wrapper.text()).toContain('VoxNoto')
  })

  it('does not show results on initial load', () => {
    const wrapper = mount(App)
    expect(wrapper.find('.result-card').exists()).toBe(false)
  })
})
