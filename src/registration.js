export function registrationWaiting(account) {
  return Boolean(account?.registro_disponible_desde && Date.now() < new Date(`${account.registro_disponible_desde}Z`).getTime());
}
