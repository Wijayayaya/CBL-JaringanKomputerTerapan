# Frontend

Frontend Vite untuk:

- pendaftaran pasien ke Service A
- melihat daftar pasien dari Service A
- melihat daftar dan detail rekam medis dari Service B

## Menjalankan

1. Install dependency:
   - `npm install`
2. Start dev server:
   - `npm run dev`
3. Buka URL yang ditampilkan Vite (default `http://localhost:5174`).

## Catatan

- FE mengakses Service A (`http://localhost:8080`) dan Service B (`http://localhost:8081`).
- Validasi realtime via gRPC sekarang selalu aktif otomatis saat registrasi (tanpa checkbox/toggle di UI).
