# Examen Final QA – Pruebas y Calidad de Software (ECCI 2026-II)

Fork de [testsmith-io/practice-software-testing](https://github.com/testsmith-io/practice-software-testing) con **Playwright** instalado
y una suite de 10 casos de prueba sobre la aplicación **Toolshop – Sprint 5**.

| Entregable | Ubicación |
|---|---|
| Casos automatizados (Playwright + TypeScript) | [`playwright-tests/`](playwright-tests) |
| Matriz de casos, técnicas, ejecución, defectos, trazabilidad y métricas | [`entregables/Casos_de_Prueba_Toolshop.xlsx`](entregables/Casos_de_Prueba_Toolshop.xlsx) |
| Informe final (las reflexiones individuales quedan para el equipo) | [`entregables/Informe_Final_Examen_QA_Toolshop.docx`](entregables/Informe_Final_Examen_QA_Toolshop.docx) |
| Evidencias (capturas por caso, consola, CSV, reporte HTML) | [`evidencias/`](evidencias) |

## Funcionalidades bajo prueba

| ID | Funcionalidad | Casos |
|---|---|---|
| F1 | Autenticación (login) y bloqueo de cuenta | TC-LOGIN-001 … 004 |
| F2 | Registro de usuario | TC-REG-001 … 003 |
| F3 | Checkout: método de pago y creación de la orden | TC-PAY-001 … 003 |

Técnicas: partición de equivalencia, valores límite, tabla de decisión, transición de estados (caja negra) y cobertura de decisión (caja blanca).

## Requisitos

- Docker Desktop (o Docker Engine + Compose v2)
- Node.js LTS (≥ 18) y npm
- Puertos libres: 4200 (UI), 8091 (API), 3306 (MariaDB)

## 1. Levantar la aplicación

```bash
npm run app:up      # docker compose -f docker-compose.exam.yml up -d --build
npm run app:seed    # crea y siembra la BD + limpia la caché de la API
```

La primera vez tarda unos minutos (descarga ~1,5 GB de imágenes). Comprobar que responden:

- UI: http://localhost:4200
- API: http://localhost:8091/status

> `docker-compose.exam.yml` usa las imágenes publicadas de la API y la UI, pero construye localmente el servidor web (nginx),
> porque la imagen `testsmith/practice-software-testing-web` solo existe para arm64 y no arranca en equipos x86_64 (Windows / Intel / AMD).
> En Windows, `npm run app:seed` debe ejecutarse desde PowerShell o Git Bash con Docker Desktop iniciado.

## 2. Instalar Playwright

```bash
npm install
npx playwright install chromium     # agregar firefox webkit para todos los navegadores
```

## 3. Ejecutar las pruebas

```bash
npm test                 # suite completa en Chromium (headless)
npm run test:headed      # viendo el navegador
npm run test:ui          # modo UI interactivo de Playwright
npx playwright test playwright-tests/01-login.spec.ts --project=chromium   # un solo spec
npm run report           # abre el reporte HTML
npm run evidencias       # copia capturas por ID de caso a evidencias/ y genera el CSV
```

Para repetir la ejecución desde un estado limpio: `npm run app:seed && npm test`.
Variables opcionales: `BASE_URL` (por defecto http://localhost:4200) y `API_URL` (por defecto http://localhost:8091).

## Resultado de la última ejecución (2026-11-10, Chromium)

**26 escenarios: 22 PASS / 4 FAIL.** Los 4 FAIL son defectos reales de la aplicación (no del script) y están documentados:

| Defecto | Caso | Severidad | Resumen |
|---|---|---|---|
| BUG-001 | TC-REG-002 | Media | Rechaza a quien cumple 18 años el mismo día (`before` en vez de `before_or_equal`) |
| BUG-002 | TC-REG-003 | Media | No se aplica el límite de 75 años: Carbon mutable desplaza el límite a ~93 años |
| BUG-003 | TC-PAY-002 | Media | Tarjeta que vence el mes actual: la UI la acepta, la API la rechaza y muestra "Unknown error" |
| BUG-004 | TC-REG-001 | Baja | El mensaje dice "minimal 6 characters" cuando la regla es de 8 |
| BUG-005 | Exploratorio | Alta | Si falla la creación de la factura, la UI no informa nada tras "Payment was successful" |

Detalle completo (pasos, esperado, actual, causa en el código y evidencia) en el Excel y el informe.

## Estructura de la suite

```
playwright-tests/
├── 01-login.spec.ts          # F1
├── 02-registro.spec.ts       # F2
├── 03-checkout-pago.spec.ts  # F3
├── pages/                    # Page Objects: login, registro, checkout
└── support/test-data.ts      # usuarios semilla, emails únicos, fechas relativas, alta de usuarios por API
```

---

# README original del proyecto

[![Run Playwright Tests 🎭](https://github.com/testsmith-io/practice-software-testing/actions/workflows/run-tests.yml/badge.svg)](https://github.com/testsmith-io/practice-software-testing/actions/workflows/run-tests.yml) [![StackShare](http://img.shields.io/badge/tech-stack-0690fa.svg?style=flat)](https://stackshare.io/testsmith-io/practice-software-testing)


# Default accounts

| First name | Last name | Role   | E-mail                                | Password   |
|------------|-----------|--------|---------------------------------------|------------|
| John       | Doe       | admin  | admin@practicesoftwaretesting.com     | welcome01  |
| Jane       | Doe       | user   | customer@practicesoftwaretesting.com  | welcome01  |
| Jack       | Howe      | user   | customer2@practicesoftwaretesting.com | welcome01  |
| Bob        | Smith     | user   | customer3@practicesoftwaretesting.com | pass123    |

# URLs (hosted versions)

| Description           | Application                                                                                     | API                                                                                                            | Swagger                                                                                                                   |
|-----------------------|-------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------|
| Sprint 1              | [https://v1.practicesoftwaretesting.com](https://v1.practicesoftwaretesting.com)                | [https://api-v1.practicesoftwaretesting.com](https://api-v1.practicesoftwaretesting.com/status)                | [https://api-v1.practicesoftwaretesting.com](https://api-v1.practicesoftwaretesting.com/api/documentation)                |
| Sprint 2              | [https://v2.practicesoftwaretesting.com](https://v2.practicesoftwaretesting.com)                | [https://api-v2.practicesoftwaretesting.com](https://api-v2.practicesoftwaretesting.com/status)                | [https://api-v2.practicesoftwaretesting.com](https://api-v2.practicesoftwaretesting.com/api/documentation)                |
| Sprint 3              | [https://v3.practicesoftwaretesting.com](https://v3.practicesoftwaretesting.com)                | [https://api-v3.practicesoftwaretesting.com](https://api-v3.practicesoftwaretesting.com/status)                | [https://api-v3.practicesoftwaretesting.com](https://api-v3.practicesoftwaretesting.com/api/documentation)                |
| Sprint 4              | [https://v4.practicesoftwaretesting.com](https://v4.practicesoftwaretesting.com)                | [https://api-v4.practicesoftwaretesting.com](https://api-v4.practicesoftwaretesting.com/status)                | [https://api-v4.practicesoftwaretesting.com](https://api-v4.practicesoftwaretesting.com/api/documentation)                |
| Sprint 5              | [https://practicesoftwaretesting.com](https://practicesoftwaretesting.com)                      | [https://api.practicesoftwaretesting.com](https://api.practicesoftwaretesting.com/status)                      | [https://api.practicesoftwaretesting.com](https://api.practicesoftwaretesting.com/api/documentation)                      |
| Sprint 5 (with bugs)  | [https://with-bugs.practicesoftwaretesting.com](https://with-bugs.practicesoftwaretesting.com)  | [https://api-with-bugs.practicesoftwaretesting.com](https://api-with-bugs.practicesoftwaretesting.com/status)  | [https://api-with-bugs.practicesoftwaretesting.com](https://api-with-bugs.practicesoftwaretesting.com/api/documentation)  |
| Sprint 5 (holtesting) | [https://holtesting.practicesoftwaretesting.com](https://with-bugs.practicesoftwaretesting.com) | [https://api-holtesting.practicesoftwaretesting.com](https://api-with-bugs.practicesoftwaretesting.com/status) | [https://api-holtesting.practicesoftwaretesting.com](https://api-with-bugs.practicesoftwaretesting.com/api/documentation) |

## Mobile App

The mobile app is fully integrated with version 4 of Practice Software Testing, which means both share the same environment. Any changes you make through the mobile app (like creating or editing data) will appear on the website, and updates on the website will also show up in the app.

[Android Mobile APK](https://testsmith.ams3.cdn.digitaloceanspaces.com/artifacts/practice-software-testing.apk)

[iOS Simulator App](https://testsmith.ams3.cdn.digitaloceanspaces.com/artifacts/practice-software-testing.zip)

# Using the docker containers

I will take up to 5 minutes (depending on your internet connection speed), if you run `docker compose up -d` for the first
time. Any subsequent `docker compose up -d` will take seconds. You may need to add sudo before the docker command `sudo docker compose up -d`

All images together are less than 1,5 GB.

## 🐳 Docker Compose Setup

This project includes multiple Docker Compose configurations to support development, testing, and production usage.

### 🔧 Local Development (with live-reloading, source-mounted volumes)

Use this when actively working on the application:

```bash
docker compose up -d
```

This will:

* Build the containers from local source (`docker-compose.yml`)
* Mount the source code for live changes
* Automatically include `docker-compose.override.yml` (mailcatcher, cron, phpmyadmin)

### 🧪 Development + Excluding Optional Services

To start the bare minimum:

```bash
docker compose -f docker-compose.yml up -d
```
This will:

* Use only what's defined in docker-compose.yml
* Ignore docker-compose.override.yml completely
* Skip optional services like cron, phpmyadmin, mailcatcher


### 🚀 Production Setup (with prebuilt Docker images)

```bash
docker compose -f docker-compose.prod.yml up --pull missing -d
```

## URL's (local version)

| URL                                                                                | Description           |
|------------------------------------------------------------------------------------|-----------------------|
| [http://localhost:8091](http://localhost:8091)                                     | (REST) API            |
| [http://localhost:8091/api/documentation](http://localhost:8091/api/documentation) | Swagger               |
| [http://localhost:1080](http://localhost:1080)                                     | MailCatcher           |
| [http://localhost:4200](http://localhost:4200)                                     | (Angular) Application |
| [http://localhost:8000](http://localhost:8000) (`root`/`root`)                     | PHPMyAdmin            |

## Switch sprint

Update the `SPRINT` in [.env](.env) to use the proper version that belongs to the sprint.

## Roll Back - Run Migrations - Seed Database

`docker exec -it pst-laravel-api-1 php artisan migrate:fresh --seed`

## Migrate database schema

`docker exec -it pst-laravel-api-1 php artisan migrate`

## Seed database

`docker exec -it pst-laravel-api-1 php artisan db:seed`

## Access to the Laravel Logs

`docker exec -it pst-laravel-api-1 tail -f storage/logs/laravel.log`

## Generate Swagger documentation

`docker exec -it pst-laravel-api-1 php artisan l5-swagger:generate`

## Update order status

`docker exec -it pst-laravel-api-1 php artisan order:update`

## Remove PDF documents

`docker exec -it pst-laravel-api-1 php artisan invoice:remove`

## Generate PDF documents

`docker exec -it pst-laravel-api-1 php artisan invoice:generate`

## Execute unit tests (sprint 1 to sprint 4)

`./vendor/bin/phpunit`

## Execute unit tests (sprint 5)

`./vendor/bin/pest`

## Execute unit tests with coverage

`XDEBUG_MODE=coverage ./vendor/bin/phpunit --coverage-html tests/coverage`

## Start pact-mock-service

`pact-mock-service start --host localhost --port 7203 --consumer AnyConsumer --provider ProductAPI --pact-dir ./pacts --log ./storage/logs/pact.log`

## Stop pact-mock-service

`pact-mock-service stop --port 7203`

# Sprints

## Sprint 0

During this initial sprint, we made some architectural decisions. We decided to implement a
super-fast [Laravel](https://laravel.com/) API, as well as an [Angular](https://angular.io/) frontend.

Every developer or tester can spin up the environment on its own machine. This makes testing easier, and it
allows you to manipulate data.

The deliverable of Sprint0 is a Dockerized environment, just like database seeding scripts. Basically, the result is
an empty environment.

# Support This Project

If you find this project useful and want to support its ongoing development, please consider [supporting](https://testwithroy.com/b/support) it!

I appreciate your support!

# License

This repository is publicly viewable for reference purposes only.

Commercial use, public hosting, redistribution, and use for third-party services are not allowed without prior written permission. See [LICENSE](LICENSE) for details.
