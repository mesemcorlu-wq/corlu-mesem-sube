const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();
const path = require('path');

// Statik dosyaları (index.html, css vb.) sunmak için:
app.use(express.static(__dirname));

// Ana dizine (/) girildiğinde index.html'i göndermek için:
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.use(cors());
app.use(express.json());

// MySQL Bağlantı Havuzu
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'corlu_mem',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Şube - Okul Günü Eşleşme Haritası (Saf Şube Kodları)
const subeGunHaritasi = {
    // PAZARTESİ
    '9A': 'Pazartesi', '10B': 'Pazartesi', '10G': 'Pazartesi', '10M': 'Pazartesi',
    '11A': 'Pazartesi', '11K': 'Pazartesi', '12E': 'Pazartesi',

    // SALI
    '9B': 'Salı', '10C': 'Salı', '10H': 'Salı',
    '11B': 'Salı', '11F': 'Salı', '12C': 'Salı', '12F': 'Salı',

    // ÇARŞAMBA
    '9C': 'Çarşamba', '9F': 'Çarşamba', '10D': 'Çarşamba', '10İ': 'Çarşamba', '10I': 'Çarşamba',
    '11C': 'Çarşamba', '11G': 'Çarşamba', '12A': 'Çarşamba',

    // PERŞEMBE
    '9D': 'Perşembe', '10E': 'Perşembe', '10K': 'Perşembe',
    '11D': 'Perşembe', '11H': 'Perşembe', '12B': 'Perşembe',

    // CUMA
    '9E': 'Cuma', '10A': 'Cuma', '10F': 'Cuma', '10L': 'Cuma',
    '11E': 'Cuma', '11İ': 'Cuma', '11I': 'Cuma', '12D': 'Cuma'
};

// "10-B Kadın Kuaförlüğü" gibi metinlerden "10B" kısmını ayıklayıp günü bulan fonksiyon
function okulGununuBul(subeMetni) {
    if (!subeMetni) return 'Belirtilmedi';

    // Metinden tire (-), boşluk ve alan adlarını temizleyip sadece Sınıf/Şube kısmına odaklanır
    // Örn: "10-B Kadın Kuaförlüğü" -> "10B"
    const temizSube = subeMetni.toUpperCase().replace(/[^A-Z0-9İĞÜŞÖÇ]/g, '');

    for (const [kod, gun] of Object.entries(subeGunHaritasi)) {
        // "10BKADINKUAFORLUGU" metni "10B" ile başlıyorsa veya içeriyorsa eşleştirir
        if (temizSube.startsWith(kod) || temizSube.includes(kod)) {
            return gun;
        }
    }

    return 'Günü Belirlenemedi';
}

// Öğrenci Şube Sorgulama Uç Noktası
app.get('/api/ogrenci/:tc', (req, res) => {
    const tcSon5 = req.params.tc;

    if (!tcSon5 || tcSon5.length !== 5 || isNaN(tcSon5)) {
        return res.status(400).json({
            success: false,
            message: 'Lütfen T.C. Kimlik numaranızın son 5 hanesini giriniz.'
        });
    }

    const sql = 'SELECT ad_soyad, sube FROM ogrenciler WHERE tc_son5 = ?';

    db.query(sql, [tcSon5], (err, results) => {
        if (err) {
            console.error('Sorgu hatası:', err);
            return res.status(500).json({
                success: false,
                message: 'Veritabanı sorgu hatası.'
            });
        }

        if (results.length > 0) {
            // Eşleşen tüm öğrencileri dizi olarak dönüştür
            const ogrenciler = results.map(ogrenci => ({
                adSoyad: ogrenci.ad_soyad,
                sube: ogrenci.sube,
                okulGunu: okulGununuBul(ogrenci.sube)
            }));

            return res.json({
                success: true,
                ogrenciler: ogrenciler // Tüm liste gönderiliyor
            });
        } else {
            return res.status(404).json({
                success: false,
                message: 'Sistemde kayıtlı böyle bir öğrenci bulunamadı.'
            });
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend sunucu http://localhost:${PORT} üzerinde çalışıyor.`);
});