-- Creates only Design Lab. Never deletes existing databases.
CREATE DATABASE IF NOT EXISTS design_lab_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE design_lab_db;

CREATE TABLE IF NOT EXISTS users (
	id INTEGER NOT NULL AUTO_INCREMENT,
	nombre VARCHAR(120) NOT NULL,
	correo VARCHAR(254) NOT NULL,
	password_hash VARCHAR(256) NOT NULL,
	PRIMARY KEY (id),
	UNIQUE (correo)
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
	hora_apertura VARCHAR(5) NOT NULL DEFAULT '',
	hora_cierre VARCHAR(5) NOT NULL DEFAULT '',
	logo VARCHAR(2048) NOT NULL DEFAULT '',
	PRIMARY KEY (id),
	UNIQUE (owner_id, legacy_id),
	FOREIGN KEY(owner_id) REFERENCES users (id)
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

CREATE TABLE IF NOT EXISTS videos (
	id INTEGER NOT NULL AUTO_INCREMENT,
	`negocioId` INTEGER NOT NULL,
	titulo VARCHAR(160) NOT NULL,
	url VARCHAR(2048) NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(`negocioId`) REFERENCES businesses (id)
);
