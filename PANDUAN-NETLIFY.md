# Terbitkan easyleague di Netlify

ZIP ini mengandungi aplikasi BM/EN dengan tema sukan, pengurusan pertandingan, pemain dan kad QR, jadual, keputusan, kedudukan, pentaksiran, sandaran dan laporan. Netlify menghoskan antara muka. Supabase mengendalikan log masuk e-mel, pengesahan peranan dan pangkalan data. Anda memerlukan akaun Netlify dan satu projek Supabase. Tiada pemasangan Node.js diperlukan.

## 1. Sediakan projek dan akaun pentadbir

1. Ekstrak ZIP pada komputer. Buka projek Supabase baharu. Salin **Project URL** (contohnya https://abcdefghijk.supabase.co) dan **Publishable key** (bermula dengan sb_publishable_) daripada dialog Connect atau Settings → API Keys.
2. Dalam **Authentication → Users**, pilih **Add user → Create new user**. Masukkan e-mel dan kata laluan pentadbir. Sahkan e-mel tersebut, atau pilih pengesahan automatik jika anda telah mengesahkan pemilik alamat itu.
3. Buka **setup/01-database.sql** dalam penyunting teks. Gantikan TUKAR-EMEL-PENTADBIR@example.com dengan e-mel pentadbir yang sama. Salin seluruh skrip yang telah disunting ke **SQL Editor** dalam Supabase dan tekan **Run** sekali. Skrip menyediakan skema easyleague dan keahlian pentadbir. Ia ditujukan untuk projek baharu.

## 2. Pasang fungsi pelayan

1. Dalam **Edge Functions**, pilih **Deploy a new function → Via Editor**. Namakan fungsi tepat **easyleague**.
2. Gantikan keseluruhan kandungan **index.ts** dalam editor dengan isi **setup/easyleague-index.ts** daripada ZIP, kemudian terbitkan fungsi.
3. Dalam tetapan fungsi ini, matikan **Verify JWT with legacy secret** (verify_jwt). Fungsi sendiri menyemak token sesi dengan Supabase Auth pada setiap permintaan rekod. Laluan pengesahan QR membenarkan imbasan kad yang telah disahkan. Sesi pengguna diperlukan untuk jadual pentadbiran, laporan dan sandaran.
4. Fungsi menggunakan SUPABASE_URL, SUPABASE_DB_URL serta SUPABASE_ANON_KEY atau SUPABASE_PUBLISHABLE_KEYS daripada persekitaran pelayan Supabase. Jika sambungan pangkalan data perlu diset semula, semak fungsi melalui **Edge Functions → Logs**. Simpan kelayakan pangkalan data di pelayan.

## 3. Muat naik ke Netlify

1. Buka **config.js** dengan penyunting teks. Isi **url** dengan Project URL dan **publishableKey** dengan publishable key. Simpan. Gunakan kunci awam sahaja dalam fail ini.
2. Buka https://app.netlify.com/drop dan log masuk. Seret folder yang mengandungi **index.html** dan **config.js** ke ruang muat naik. Anda juga boleh ZIP semula kandungan folder selepas menyunting config.js dan seret ZIP tersebut. Pastikan index.html berada di aras teratas ZIP.
3. Buka URL Netlify yang diberikan. Log masuk dengan akaun pentadbir yang disediakan. Cipta satu pertandingan dan muat semula halaman untuk menyemak penyimpanan.
4. Selepas kemas kini, seret folder yang telah dikemas kini ke bahagian **Deploys** bagi projek Netlify yang sama. Gunakan alamat laman yang tetap supaya pautan QR terus berfungsi.

## Akses pensyarah dan wakil pasukan

Wujudkan akaun pengguna dengan e-mel disahkan dalam Supabase Authentication. Dalam **Pengguna** di easyleague, pentadbir mendaftarkan e-mel yang sama dan memilih peranan. Bagi wakil pasukan, daftarkan pasukan terlebih dahulu. Pengguna boleh log masuk selepas kedua-dua langkah selesai.

## Jika anda sudah menggunakan easyleague

Pemasangan ini bermula dengan pangkalan data baharu. Untuk membawa rekod pertandingan daripada aplikasi terdahulu, pentadbir boleh memuat turun sandaran di **Tetapan**, kemudian menggunakan **Pulihkan sandaran** pada pemasangan Netlify yang masih kosong. Semak pasukan dan keputusan selepas pemulihan. Sediakan keahlian pengguna secara berasingan. Pertandingan yang dipulihkan menyimpan ID pemilik asal, jadi semak akses pensyarah dengan pentadbir. Cetak semula kad supaya QR menggunakan alamat Netlify yang baharu.

## Jika aplikasi memaparkan ralat

- **Permintaan untuk mengisi config.js** — semak URL dan kunci awam, kemudian terbitkan semula folder.
- **Log masuk gagal** — semak projek, e-mel, kata laluan dan status pengesahan e-mel dalam Supabase.
- **Access has not been granted** — e-mel log masuk mesti sepadan dengan rekod pentadbir atau keahlian yang diwujudkan dalam easyleague.
- **Function not found / Failed to fetch** — semak nama fungsi easyleague, Project URL dan status penerbitan fungsi.
- **Invalid JWT** pada pembukaan profil QR — semak tetapan verify_jwt bagi fungsi easyleague.
- **Operation failed** — semak keputusan SQL dan log fungsi. Jadual berada dalam skema easyleague. Aplikasi mengaksesnya melalui fungsi pelayan.

Rujukan rasmi: https://docs.netlify.com/start/quickstarts/netlify-drop-quickstart/ dan https://supabase.com/docs/guides/functions/deploy
