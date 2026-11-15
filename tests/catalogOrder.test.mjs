import test from 'node:test';
import assert from 'node:assert/strict';
import { businessOpening, orderBusinesses, catalogTime } from '../src/catalogOrder.js';
const business = { id: 1, nombre: 'Café', estado: 'activo', dias_atencion: 'lun,mar,mie,jue,vie', hora_apertura: '08:00', hora_cierre: '18:00' };
const time = { key: '2026-11-16', day: 1, minute: 600 };
test('apertura inclusiva, cierre exclusivo y días sin atención', () => {
  assert.equal(businessOpening(business, { ...time, minute: 480 }), 'open');
  assert.equal(businessOpening(business, { ...time, minute: 1080 }), 'closed');
  assert.equal(businessOpening(business, { ...time, day: 0 }), 'closed');
  assert.equal(businessOpening({ ...business, dias_atencion: '' }, time), 'unknown');
  assert.equal(businessOpening({ ...business, hora_apertura: '18:00' }, time), 'unknown');
});
test('un horario nocturno continúa desde el día anterior', () => {
  const night = { ...business, dias_atencion: 'lun', hora_apertura: '22:00', hora_cierre: '02:00' };
  assert.equal(businessOpening(night, { ...time, day: 1, minute: 1380 }), 'open');
  assert.equal(businessOpening(night, { ...time, day: 2, minute: 60 }), 'open');
  assert.equal(businessOpening(night, { ...time, day: 2, minute: 120 }), 'closed');
  assert.equal(businessOpening(night, { ...time, day: 1, minute: 60 }), 'closed');
});
test('la hora y la fecha corresponden a Bolivia independientemente del dispositivo', () => {
  const local = catalogTime(new Date('2026-11-17T03:30:00Z'));
  assert.deepEqual(local, { key: '2026-11-16', day: 1, minute: 1410 });
});
test('abiertos primero, cerrados después y desconocidos al final; oculta inactivos', () => {
  const items = [{ ...business, id: 3, hora_apertura: '' }, { ...business, id: 2, hora_cierre: '09:00' }, business, { ...business, id: 4, estado: 'suspendido' }, { ...business, id: 5, estado: 'archivado' }];
  assert.deepEqual(orderBusinesses(items, 'open', time).map((b) => b.id), [1, 2, 3]);
  assert.equal(items[0].id, 3);
});
test('rotación estable en un día e independiente del orden de llegada', () => {
  const items = Array.from({ length: 20 }, (_, i) => ({ ...business, id: i + 1 }));
  const ids = (items, date) => orderBusinesses(items, 'open', date).map((b) => b.id);
  assert.deepEqual(ids(items, time), ids([...items].reverse(), time));
  assert.notDeepEqual(ids(items, time), ids(items, { ...time, key: '2026-11-17' }));
});
test('orden alfabético y más recientes respetan la elección', () => {
  const items = [{ ...business, id: 3, nombre: 'Zapatería' }, { ...business, id: 1, nombre: 'Árbol' }, { ...business, id: 2, nombre: 'Café' }];
  assert.deepEqual(orderBusinesses(items, 'name', time).map((b) => b.id), [1, 2, 3]);
  assert.deepEqual(orderBusinesses(items, 'recent', time).map((b) => b.id), [3, 2, 1]);
});
