import { useEffect, useState } from "react";

export default function ImagePicker({
  label,
  value,
  onChange,
  existing,
  required = false,
  disabled,
}) {
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function select(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError("Selecciona una imagen JPG, PNG o WebP de hasta 5 MB.");
      event.target.value = "";
      onChange(null);
      setPreview("");
      return;
    }
    setError("");
    setPreview(URL.createObjectURL(file));
    onChange(file);
  }
  return (
    <div className="image-picker">
      <label>
        <span>
          {label}
          {required ? " *" : ""}
        </span>
        <span className="image-picker-box">
          {(value && preview) || existing ? (
            <img
              src={value ? preview : existing}
              alt={`Vista previa: ${label}`}
            />
          ) : (
            <svg
              viewBox="0 0 32 32"
              width="32"
              height="32"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="M16 22V5m-6 6 6-6 6 6M6 21v6h20v-6" />
            </svg>
          )}
          <span>
            {value
              ? value.name
              : existing
                ? "Cambiar imagen"
                : "Seleccionar imagen"}
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={select}
            required={required && !existing && !value}
            disabled={disabled}
          />
        </span>
      </label>
      {error && <small role="alert">{error}</small>}
    </div>
  );
}
