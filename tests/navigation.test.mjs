import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accountHome, isClientView } from '../src/navigation.js';

test('el administrador tiene panel propio, independientemente del tipo de cuenta', () => {
  for (const tipo_cuenta of ['personal', 'negocios']) {
    const user = { tipo_cuenta, is_admin: true };
    assert.equal(accountHome(user), '/admin');
    assert.equal(isClientView(user, '/admin/usuarios'), false);
    assert.equal(isClientView(user, '/mi-cuenta'), false);
    assert.equal(isClientView(user, '/negocios/1'), true);
  }
});

test('las cuentas ordinarias conservan su destino y navegación', () => {
  const personal = { tipo_cuenta: 'personal', is_admin: false };
  const owner = { tipo_cuenta: 'negocios', is_admin: false };
  assert.equal(accountHome(personal), '/inicio');
  assert.equal(accountHome(owner), '/dashboard');
  assert.equal(isClientView(personal, '/mi-cuenta'), true);
  assert.equal(isClientView(owner, '/dashboard'), false);
  assert.equal(isClientView(owner, '/videos'), true);
});
