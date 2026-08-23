export const PASSWORD_RESET_PATH = '/redefinir-senha'

export function getPasswordResetRedirect(origin) {
  return `${String(origin || '').replace(/\/$/, '')}${PASSWORD_RESET_PATH}`
}

export function validateNewPassword(password, confirmation) {
  if (!password || password.length < 6) {
    return 'A senha precisa ter ao menos 6 caracteres.'
  }

  if (password !== confirmation) {
    return 'As senhas não coincidem.'
  }

  return null
}
