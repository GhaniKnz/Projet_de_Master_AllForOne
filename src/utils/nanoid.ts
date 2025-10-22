const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

export function nanoid(size = 16) {
  let id = ''
  for (let i = 0; i < size; i++) {
    const index = Math.floor(Math.random() * alphabet.length)
    id += alphabet[index]
  }
  return id
}

export default nanoid
