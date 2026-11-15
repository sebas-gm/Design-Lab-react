import { useId, useState } from "react";

const pad = (value) => String(value).padStart(2, '0');

export default function BusinessTimePicker({ name, label, initial = '' }) {
  const id = useId();
  const [hour, setHour] = useState(initial ? initial.slice(0, 2) : '');
  const [minute, setMinute] = useState(initial ? initial.slice(3, 5) : '');
  return (
    <fieldset className="business-time-picker" data-time-name={name}>
      <legend>{label}</legend>
      <input type="hidden" name={name} value={hour !== '' && minute !== '' ? `${hour}:${minute}` : ''} />
      <div className="business-time-controls">
        <label htmlFor={`${id}-hour`}>Hora
          <select id={`${id}-hour`} value={hour} required={minute !== ''} onChange={(event) => setHour(event.target.value)}>
            <option value="">--</option>
            {Array.from({ length: 24 }, (_, value) => <option key={value} value={pad(value)}>{pad(value)}</option>)}
          </select>
        </label>
        <span aria-hidden="true">:</span>
        <label htmlFor={`${id}-minute`}>Minutos
          <select id={`${id}-minute`} value={minute} required={hour !== ''} onChange={(event) => setMinute(event.target.value)}>
            <option value="">--</option>
            {Array.from({ length: 60 }, (_, value) => <option key={value} value={pad(value)}>{pad(value)}</option>)}
          </select>
        </label>
        <button type="button" className="business-time-clear" onClick={() => { setHour(''); setMinute(''); }} disabled={hour === '' && minute === ''}>Limpiar</button>
      </div>
      <small>Formato de 24 horas · 00–23 h y 00–59 min.</small>
    </fieldset>
  );
}
