export function validateProduct(f) {
  const errors = {}
  const sku = (f.sku || '').trim()
  const name = (f.name || '').trim()
  if (!sku) errors.sku = 'SKU is required.'
  else if (sku.length > 40) errors.sku = 'SKU must be 40 characters or fewer.'
  if (!name) errors.name = 'Name is required.'
  else if (name.length > 120) errors.name = 'Name must be 120 characters or fewer.'
  if ((f.description || '').length > 1000) errors.description = 'Description must be 1000 characters or fewer.'
  const price = Number(f.unit_price)
  if (f.unit_price === '' || Number.isNaN(price) || price < 0) errors.unit_price = 'Enter a price of 0 or more.'
  const thr = Number(f.low_stock_threshold)
  if (f.low_stock_threshold === '' || !Number.isInteger(thr) || thr < 0) errors.low_stock_threshold = 'Enter a whole number of 0 or more.'
  return errors
}

export function validateMovement({ product, type, quantity }) {
  const errors = {}
  if (!product) errors.product = 'Choose a product.'
  const q = Number(quantity)
  if (quantity === '' || !Number.isInteger(q) || q <= 0) errors.quantity = 'Enter a whole number greater than 0.'
  else if (type === 'out' && product && q > product.quantity) {
    errors.quantity = `Only ${product.quantity} in stock.`
  }
  return errors
}

export function validateCredentials({ email, password, fullName }, mode) {
  const errors = {}
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').trim())) errors.email = 'Enter a valid email address.'
  if (!password || password.length < 8) errors.password = 'Password must be at least 8 characters.'
  if (mode === 'register' && !(fullName || '').trim()) errors.fullName = 'Enter your name.'
  return errors
}
