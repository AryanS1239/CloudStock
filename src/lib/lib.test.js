import { describe, it, expect } from 'vitest'
import { stockStatus, friendlyError, formatCurrency } from './format.js'
import { validateProduct, validateMovement, validateCredentials } from './validation.js'

describe('stockStatus', () => {
  it('flags out of stock, low stock and ok', () => {
    expect(stockStatus(0, 5)).toBe('out')
    expect(stockStatus(5, 5)).toBe('low')
    expect(stockStatus(3, 5)).toBe('low')
    expect(stockStatus(6, 5)).toBe('ok')
  })
})

describe('validateProduct', () => {
  const good = { sku: 'A-1', name: 'Widget', description: '', unit_price: '10', low_stock_threshold: '5' }
  it('accepts a valid product', () => expect(validateProduct(good)).toEqual({}))
  it('rejects missing and invalid fields', () => {
    const e = validateProduct({ sku: ' ', name: '', unit_price: '-1', low_stock_threshold: '2.5' })
    expect(Object.keys(e).sort()).toEqual(['low_stock_threshold', 'name', 'sku', 'unit_price'])
  })
})

describe('validateMovement', () => {
  const product = { id: '1', quantity: 10 }
  it('accepts stock in and valid stock out', () => {
    expect(validateMovement({ product, type: 'in', quantity: '500' })).toEqual({})
    expect(validateMovement({ product, type: 'out', quantity: '10' })).toEqual({})
  })
  it('blocks insufficient stock', () => {
    expect(validateMovement({ product, type: 'out', quantity: '11' }).quantity).toMatch(/Only 10/)
  })
  it('blocks zero, negative, decimal and empty quantities', () => {
    for (const q of ['0', '-3', '1.5', '']) {
      expect(validateMovement({ product, type: 'in', quantity: q }).quantity).toBeTruthy()
    }
  })
  it('requires a product', () => expect(validateMovement({ product: null, type: 'in', quantity: '1' }).product).toBeTruthy())
})

describe('validateCredentials', () => {
  it('validates email, password length and name on register', () => {
    expect(validateCredentials({ email: 'a@b.co', password: '12345678' }, 'login')).toEqual({})
    expect(Object.keys(validateCredentials({ email: 'bad', password: 'short', fullName: '' }, 'register')).sort())
      .toEqual(['email', 'fullName', 'password'])
  })
})

describe('friendlyError', () => {
  it('maps database errors to readable messages', () => {
    expect(friendlyError({ code: '23505', message: 'duplicate key value' })).toMatch(/already exists/)
    expect(friendlyError({ code: '23514', message: 'Insufficient stock: requested 9, available 3' })).toMatch(/Insufficient stock/)
    expect(friendlyError({ code: '42501', message: 'permission denied for table products' })).toMatch(/permission/)
  })
  it('formats rupee currency', () => expect(formatCurrency(1500)).toContain('1,500'))
})
