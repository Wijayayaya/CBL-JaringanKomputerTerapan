# Clinic Microservices Starter

Starter project untuk arsitektur:

- Frontend (input data)
- Service A (Pendaftaran) + database sendiri
- Service B (Rekam Medis) + database sendiri
- gRPC (sinkron)
- RabbitMQ (asinkron)

## Struktur

- `frontend/` : aplikasi FE
- `service-a/` : backend pendaftaran
- `service-b/` : backend rekam medis
- `proto/` : kontrak gRPC (contract-first)
- `infra/` : konfigurasi infrastruktur lokal

## Ketentuan Arsitektur

1. Database isolation wajib:
   - Service A hanya akses DB A
   - Service B hanya akses DB B
2. Dilarang query langsung antar database service.
3. Komunikasi lintas service:
   - gRPC untuk validasi real-time
   - RabbitMQ untuk event-driven
4. Kontrak gRPC wajib berasal dari file `.proto`.

## Menjalankan Infrastruktur

Dari root project:

```bash
docker compose -f infra/docker-compose.yml up -d
```

Service yang tersedia:

- RabbitMQ UI: `http://localhost:15672` (guest/guest)
- Postgres Service A: `localhost:5433`
- Postgres Service B: `localhost:5434`

## Menjalankan Service B

```bash
cd service-b
copy .env.example .env
npm install
npm run dev
```

## Menjalankan Service A

```bash
cd service-a
copy .env.example .env
npm install
npm run dev
```

## Menjalankan Frontend

```bash
cd frontend
npm install
npm run dev
```

## Alur Demo End-to-End

1. Buka FE di browser.
2. Input data pasien lalu submit.
3. Service A simpan data ke DB A.
4. Service A menulis outbox event `patient.registered`.
5. Outbox relay publish event ke RabbitMQ.
6. Service B consume event dan membuat draft rekam medis di DB B.
7. Jika opsi realtime aktif, Service A memanggil gRPC Service B.
