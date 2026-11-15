import { useEffect, useRef, useState } from "react";
import ImagePicker from "./ImagePicker";

export default function BusinessImagePicker({ purpose, value, onChange, ...props }) {
  const [preview, setPreview] = useState("");
  const [size, setSize] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const version = useRef(0);
  const logo = purpose === "logo";
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  async function select(file) {
    const token = ++version.current;
    setError("");
    onChange(null);
    setSize(null);
    setPreview("");
    if (!file) { setLoading(false); return; }
    setLoading(true);
    try {
      const bitmap = await createImageBitmap(file);
      const dimensions = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      if (token !== version.current) return;
      if (dimensions.width * dimensions.height > 20_000_000) throw new Error("La imagen supera los 20 megapíxeles.");
      if (dimensions.width < (logo ? 200 : 800) || dimensions.height < (logo ? 200 : 450))
        throw new Error(logo ? "El logo debe medir al menos 200 × 200 px." : "La fachada debe medir al menos 800 × 450 px.");
      if (!logo && Math.min(dimensions.width, dimensions.height * 16 / 9) < 800)
        throw new Error("La imagen no permite un recorte de 800 × 450 px.");
      setSize(dimensions);
      setPreview(URL.createObjectURL(file));
      onChange({ file, purpose, x: .5, y: .5, zoom: 1 });
    } catch (e) {
      if (token === version.current) setError(e.message || "No se pudo abrir la imagen.");
    } finally {
      if (token === version.current) setLoading(false);
    }
  }

  let cropStyle = {};
  const maxZoom = size ? Math.max(1, Math.min(3, Math.min(size.width, size.height * 16 / 9) / 800)) : 1;
  if (size && value && !logo) {
    const width = Math.min(size.width, size.height * 16 / 9) / value.zoom;
    const height = width * 9 / 16;
    cropStyle = { width: `${size.width / width * 100}%`, height: `${size.height / height * 100}%`, left: `${-(size.width - width) * value.x / width * 100}%`, top: `${-(size.height - height) * value.y / height * 100}%` };
  }
  function adjust(key, next) { onChange({ ...value, [key]: Number(next) }); }
  return (
    <div className="business-image-picker">
      <ImagePicker {...props} value={value?.file} onChange={select} validationError={loading ? "Espera mientras se valida la imagen." : error} />
      <small>{logo ? "Presentación circular · mínimo 200 × 200 px · recomendado 512 × 512 px. Conserva la transparencia." : "Horizontal 16:9 · mínimo 800 × 450 px · recomendado 1280 × 720 px."}</small>
      {error && <p role="alert">{error}</p>}
      {value && preview && size && (
        <div className="image-adjustment">
          <p>{logo ? "Vista previa circular del logo" : "Elige la parte de la fachada que quieres mostrar"}</p>
          {!logo && size.height > size.width && <small>La foto es vertical: ajusta el recorte horizontal antes de guardar.</small>}
          <div className={`image-crop-preview ${logo ? "is-logo" : ""}`}>
            <img src={preview} alt={`Resultado del ajuste de ${logo ? "logo" : "fachada"}`} style={logo ? { transform: `scale(${1 / value.zoom})` } : cropStyle} />
          </div>
          {!logo && <>
            <label>Posición horizontal<input type="range" min="0" max="1" step="0.01" value={value.x} disabled={props.disabled} onChange={(e) => adjust("x", e.target.value)} /></label>
            <label>Posición vertical<input type="range" min="0" max="1" step="0.01" value={value.y} disabled={props.disabled} onChange={(e) => adjust("y", e.target.value)} /></label>
          </>}
          {(logo || maxZoom > 1) && <label>{logo ? "Margen alrededor del logo" : "Acercamiento"}<input type="range" min="1" max={logo ? 3 : maxZoom} step="0.01" value={value.zoom} disabled={props.disabled} onChange={(e) => adjust("zoom", e.target.value)} /></label>}
          <small>{logo ? "Se guardará en un lienzo transparente de 512 × 512 px, sin cortar el logo." : "Se guardará en formato horizontal, hasta 1280 × 720 px, sin ampliar imágenes pequeñas."}</small>
        </div>
      )}
    </div>
  );
}
