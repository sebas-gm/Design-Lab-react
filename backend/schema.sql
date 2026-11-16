-- Navishop. Never deletes existing databases.
CREATE DATABASE IF NOT EXISTS design_lab_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE design_lab_db;

CREATE TABLE IF NOT EXISTS users (
	id INTEGER NOT NULL AUTO_INCREMENT,
	nombre VARCHAR(120) NOT NULL,
	correo VARCHAR(254) NOT NULL,
	password_hash VARCHAR(256) NOT NULL,
	tipo_cuenta VARCHAR(16) NOT NULL DEFAULT 'personal',
	avatar VARCHAR(2048) NOT NULL DEFAULT '',
	reducir_movimiento BOOL NOT NULL DEFAULT '0',
	is_admin BOOL NOT NULL DEFAULT '0',
	puede_registrar BOOL NOT NULL DEFAULT '1',
	registro_disponible_desde DATETIME NULL,
	PRIMARY KEY (id),
	UNIQUE (correo)
);

CREATE TABLE IF NOT EXISTS audit_logs (
	id INTEGER NOT NULL AUTO_INCREMENT,
	actor_id INTEGER NOT NULL,
	accion VARCHAR(40) NOT NULL,
	recurso VARCHAR(30) NOT NULL,
	recurso_id INTEGER NOT NULL,
	fecha DATETIME NOT NULL,
	detalle TEXT NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(actor_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS businesses (
	id INTEGER NOT NULL AUTO_INCREMENT,
	owner_id INTEGER NOT NULL,
	nombre VARCHAR(120) NOT NULL,
	categoria VARCHAR(40) NOT NULL,
	direccion VARCHAR(255) NOT NULL,
	descripcion TEXT NOT NULL,
	imagen VARCHAR(2048) NOT NULL,
	latitud NUMERIC(10, 7),
	longitud NUMERIC(10, 7),
	legacy_id VARCHAR(80),
	telefono VARCHAR(30) NOT NULL DEFAULT '',
	correo_contacto VARCHAR(254) NOT NULL DEFAULT '',
	enlace_mapa VARCHAR(2048) NOT NULL DEFAULT '',
	mapa_embed VARCHAR(4096) NOT NULL DEFAULT '',
	hora_apertura VARCHAR(5) NOT NULL DEFAULT '',
	hora_cierre VARCHAR(5) NOT NULL DEFAULT '',
	dias_atencion VARCHAR(60) NOT NULL DEFAULT '',
	publicacion_aprobada BOOL NOT NULL DEFAULT 0,
	logo VARCHAR(2048) NOT NULL DEFAULT '',
	estado VARCHAR(16) NOT NULL DEFAULT 'activo',
	eliminacion_solicitada DATETIME NULL,
	eliminacion_programada DATETIME NULL,
	estado_antes_eliminacion VARCHAR(16) NULL,
	INDEX ix_business_deletion_due (eliminacion_programada),
	PRIMARY KEY (id),
	UNIQUE (owner_id, legacy_id),
	CONSTRAINT uq_business_owner UNIQUE (owner_id),
	FOREIGN KEY(owner_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS moderation_events (
	id INTEGER NOT NULL AUTO_INCREMENT,
	user_id INTEGER NOT NULL,
	negocio_id INTEGER NOT NULL,
	nombre_negocio VARCHAR(120) NOT NULL,
	estado VARCHAR(16) NOT NULL,
	motivo TEXT NOT NULL,
	nota_interna TEXT NOT NULL,
	fecha DATETIME NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(user_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS notifications (
	id INTEGER NOT NULL AUTO_INCREMENT,
	user_id INTEGER NOT NULL,
	titulo VARCHAR(160) NOT NULL,
	mensaje TEXT NOT NULL,
	fecha DATETIME NOT NULL,
	leida BOOL NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(user_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS sessions (
	token_hash VARCHAR(64) NOT NULL,
	user_id INTEGER NOT NULL,
	expires_at DATETIME NOT NULL,
	PRIMARY KEY (token_hash),
	FOREIGN KEY(user_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS products (
	id INTEGER NOT NULL AUTO_INCREMENT,
	`negocioId` INTEGER NOT NULL,
	nombre VARCHAR(120) NOT NULL,
	precio NUMERIC(10, 2) NOT NULL,
	descripcion TEXT NOT NULL,
	imagen VARCHAR(2048) NOT NULL,
	promocion BOOL NOT NULL,
	legacy_id VARCHAR(80),
	PRIMARY KEY (id),
	UNIQUE (`negocioId`, legacy_id),
	FOREIGN KEY(`negocioId`) REFERENCES businesses (id)
);

CREATE TABLE IF NOT EXISTS review_requests (
	id INTEGER NOT NULL AUTO_INCREMENT,
	user_id INTEGER NOT NULL,
	negocio_id INTEGER NOT NULL,
	evento_id INTEGER NOT NULL,
	pending_key VARCHAR(80),
	mensaje TEXT NOT NULL,
	estado VARCHAR(16) NOT NULL,
	respuesta TEXT NOT NULL,
	fecha DATETIME NOT NULL,
	resuelta DATETIME,
	PRIMARY KEY (id),
	FOREIGN KEY(user_id) REFERENCES users (id),
	FOREIGN KEY(evento_id) REFERENCES moderation_events (id),
	UNIQUE (pending_key)
);

CREATE TABLE IF NOT EXISTS videos (
	id INTEGER NOT NULL AUTO_INCREMENT,
	`negocioId` INTEGER NOT NULL,
	titulo VARCHAR(160) NOT NULL,
	url VARCHAR(2048) NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(`negocioId`) REFERENCES businesses (id)
);

CREATE TABLE IF NOT EXISTS reports (
    id INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
    reporter_id INTEGER NOT NULL,
    tipo VARCHAR(16) NOT NULL,
    objetivo_id INTEGER NOT NULL,
    negocio_id INTEGER NOT NULL,
    nombre_objetivo VARCHAR(160) NOT NULL,
    motivo VARCHAR(40) NOT NULL,
    explicacion TEXT NOT NULL,
    estado VARCHAR(16) NOT NULL DEFAULT 'pendiente',
    pending_key VARCHAR(100) NULL UNIQUE,
    resultado VARCHAR(16) NOT NULL DEFAULT '',
    respuesta TEXT NOT NULL,
    fecha DATETIME NOT NULL,
    resuelta DATETIME NULL,
    FOREIGN KEY (reporter_id) REFERENCES users(id),
    INDEX ix_reports_reporter_id (reporter_id),
    INDEX ix_reports_negocio_id (negocio_id)
);

CREATE TABLE IF NOT EXISTS business_applications (
    id INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
    negocio_id INTEGER NOT NULL UNIQUE,
    owner_id INTEGER NOT NULL,
    propuesta TEXT NOT NULL,
    estado VARCHAR(16) NOT NULL DEFAULT 'pendiente',
    motivo TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    envios INTEGER NOT NULL DEFAULT 1,
    ventana_desde DATETIME NOT NULL,
    fecha DATETIME NOT NULL,
    actualizada DATETIME NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES users(id),
    INDEX ix_business_applications_owner_id (owner_id)
);
