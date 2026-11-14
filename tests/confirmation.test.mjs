import { test } from "node:test";
import assert from "node:assert/strict";
import { createConfirmationController } from "../src/confirmationController.js";

test("cancelar no ejecuta la operación y permite preguntar después", async () => {
  const controller = createConfirmationController(() => {});
  let writes = 0;
  const operation = (async () => {
    if (await controller.request("Guardar", "save")) writes++;
  })();
  controller.cancel();
  await operation;
  assert.equal(writes, 0);
  const next = controller.request("Editar", "edit");
  controller.answer(true);
  assert.equal(await next, true);
});

test("solo confirmar explícitamente permite eliminar una vez", async () => {
  const controller = createConfirmationController(() => {});
  let deletions = 0;
  const operation = (async () => {
    if (await controller.request("Eliminar", "delete")) deletions++;
  })();
  controller.answer(true);
  controller.answer(true);
  await operation;
  assert.equal(deletions, 1);
});

test("una segunda solicitud no sustituye la decisión pendiente", async () => {
  const controller = createConfirmationController(() => {});
  const first = controller.request("Eliminar primero", "delete");
  assert.equal(await controller.request("Guardar otro", "save"), false);
  controller.cancel();
  assert.equal(await first, false);
});

test("otras acciones no muestran confirmación", async () => {
  let displayed = false;
  const controller = createConfirmationController(() => {
    displayed = true;
  });
  assert.equal(await controller.request("Preferencia", "preference"), false);
  assert.equal(displayed, false);
});

test('cancelar el cierre mantiene la sesión y confirmar permite cerrarla', async () => {
  const controller = createConfirmationController(() => {});
  let closed = 0;
  const attempt = async () => { if (await controller.request('Cerrar sesión', 'logout')) closed++; };
  const cancelled = attempt();
  controller.cancel();
  await cancelled;
  assert.equal(closed, 0);
  const confirmed = attempt();
  controller.answer(true);
  await confirmed;
  assert.equal(closed, 1);
});
