import test from 'node:test';
import assert from 'node:assert/strict';
import { googleMapsEmbed } from '../src/googleMapsEmbed.js';
const source = 'https://www.google.com/maps/embed?pb=!1m2!2m1!1sCochabamba';
test('acepta el enlace oficial o extrae solo el src del iframe', () => {
  const expected = googleMapsEmbed(source);
  assert.ok(expected.startsWith('https://www.google.com/maps/embed?pb='));
  assert.equal(googleMapsEmbed(`<iframe src="${source}" width="600" height="450" style="border:0" allowfullscreen loading="lazy"></iframe>`), expected);
  assert.equal(googleMapsEmbed(''), '');
  assert.equal(googleMapsEmbed(`https://google.com/maps/embed?pb=!1m2!2m1!1sCochabamba`), expected);
});
test('rechaza enlaces compartidos, dominios ajenos, scripts y APIs con clave', () => {
  for (const value of ['https://maps.app.goo.gl/abcd', 'http://www.google.com/maps/embed?pb=x', 'https://www.google.com.evil.example/maps/embed?pb=x', 'https://evil.example/maps/embed?pb=x', 'javascript:alert(1)', 'https://user:pass@www.google.com/maps/embed?pb=x', 'https://www.google.com/maps/embed/v1/place?key=secret&q=x', '<iframe src="https://evil.example/"></iframe>', `<iframe src="${source}"></iframe><iframe src="${source}"></iframe>`, 'https://www.google.com/maps/embed?pb=x&pb=y']) assert.equal(googleMapsEmbed(value), null, value);
});
