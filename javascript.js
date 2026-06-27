const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gridCanvas = document.getElementById('gridCanvas');
const gridCtx = gridCanvas.getContext('2d');

const UKURAN_BLOK = 20;
const LEBAR_PAPAN = 10;
const TINGGI_PAPAN = 20;

let papanPermainan = [];
let bentukSaatIni = null;
let bentukBerikutnya = null;
let skor = 0;
let totalBaris = 0;
let level = 1;
let rekorTertinggi = parseInt(localStorage.getItem('tetrisHighScore')) || 0;
let gameJalan = false;
let gameJeda = false;
let waktuTerakhir = 0;
let spasiDitekan = false;

let intervalGerakSentuh = null;
let delayJatuhSentuh = 100;

const bentukTetris = [
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    [[2, 0, 0], [2, 2, 2], [0, 0, 0]],
    [[0, 0, 3], [3, 3, 3], [0, 0, 0]],
    [[4, 4], [4, 4]],
    [[0, 5, 5], [5, 5, 0], [0, 0, 0]],
    [[0, 6, 0], [6, 6, 6], [0, 0, 0]],
    [[7, 7, 0], [0, 7, 7], [0, 0, 0]]
];

const warnaBentuk = [
    '#000000', '#00FFFF', '#0000FF', '#FFC0CB', '#FFFF00', '#00FF00', '#800080', '#FF0000'
];

function putarSuara(namaSuara) {
    try {
        if (typeof suaraSuara !== 'undefined' && suaraSuara[namaSuara]) {
            suaraSuara[namaSuara].currentTime = 0;
            suaraSuara[namaSuara].play().catch(e => console.log(`Audio gagal diputar: ${e.message}`));
        }
    } catch (e) {
        // Audio error handler
    }
}

function buatBentukBaru() {
    const randomIndex = Math.floor(Math.random() * bentukTetris.length);
    const bentuk = bentukTetris[randomIndex];
    
    return {
        bentuk: bentuk,
        x: Math.floor(LEBAR_PAPAN / 2) - Math.floor(bentuk[0].length / 2),
        y: 0,
        warna: randomIndex + 1
    };
}

function cekGerakanValid(bentuk, dx, dy, rotasi) {
    const bentukBaru = rotasi !== undefined ? putarBentuk(bentuk.bentuk, rotasi) : bentuk.bentuk;
    const xBaru = bentuk.x + dx;
    const yBaru = bentuk.y + dy;

    for (let y = 0; y < bentukBaru.length; y++) {
        for (let x = 0; x < bentukBaru[y].length; x++) {
            if (bentukBaru[y][x]) {
                const papanX = xBaru + x;
                const papanY = yBaru + y;

                if (papanX < 0 || papanX >= LEBAR_PAPAN || papanY >= TINGGI_PAPAN) {
                    return false;
                }

                if (papanY >= 0 && papanPermainan[papanY] && papanPermainan[papanY][papanX] !== 0) {
                    return false;
                }
            }
        }
    }
    return true;
}

function putarBentuk(matriks) { 
    const N = matriks.length;
    let bentukPutar = [];
    for(let i=0; i<N; i++){
        bentukPutar[i] = [];
        for(let j=0; j<N; j++){
            bentukPutar[i][j] = matriks[N - 1 - j][i];
        }
    }
    return bentukPutar;
}

function tempatkanBentuk() {
    for (let y = 0; y < bentukSaatIni.bentuk.length; y++) {
        for (let x = 0; x < bentukSaatIni.bentuk[y].length; x++) {
            if (bentukSaatIni.bentuk[y][x]) {
                const xPapan = bentukSaatIni.x + x;
                const yPapan = bentukSaatIni.y + y;

                if (yPapan < 0) {
                    gameSelesai();
                    return;
                }
                papanPermainan[yPapan][xPapan] = bentukSaatIni.warna;
            }
        }
    }
    
    putarSuara('jatuh');
    hapusBarisLengkap();

    bentukSaatIni = bentukBerikutnya;
    bentukBerikutnya = buatBentukBaru();
    
    bentukSaatIni.x = Math.floor(LEBAR_PAPAN / 2) - Math.floor(bentukSaatIni.bentuk[0].length / 2);
    bentukSaatIni.y = 0;

    if (!cekGerakanValid(bentukSaatIni, 0, 0)) {
        gameSelesai();
    }
}

function hapusBarisLengkap() {
    let barisHapus = 0;
    for (let y = TINGGI_PAPAN - 1; y >= 0; y--) {
        if (papanPermainan[y].every(sel => sel !== 0)) {
            papanPermainan.splice(y, 1);
            papanPermainan.unshift(new Array(LEBAR_PAPAN).fill(0));
            barisHapus++;
            y++;
        }
    }

    if (barisHapus > 0) {
        if (barisHapus === 4) {
            putarSuara('tetris');
        } else {
            putarSuara('hapusBaris');
        }

        const levelLama = level;
        totalBaris += barisHapus;
        skor += hitungSkorBaris(barisHapus);
        level = Math.floor(totalBaris / 10) + 1;

        if (level > levelLama) {
            putarSuara('naikLevel');
        }
    }
}

function hitungSkorBaris(baris) {
    const skorDasar = [0, 100, 300, 500, 800];
    return skorDasar[baris] * level;
}

function gerakanBentuk(dx, dy) {
    if (!gameJalan || gameJeda) return false;

    if (cekGerakanValid(bentukSaatIni, dx, dy)) {
        bentukSaatIni.x += dx;
        bentukSaatIni.y += dy;
        
        if (dx !== 0) {
            putarSuara('gerak');
        }
        
        gambarPapan(); 
        return true;
    }
    return false;
}

function putarBentukSekarang() {
    if (!gameJalan || gameJeda) return false;

    const bentukPutar = putarBentuk(bentukSaatIni.bentuk);
    const offsetUji = [0, -1, 1, -2, 2];
    for (const offset of offsetUji) {
        if (cekGerakanValid({ ...bentukSaatIni, bentuk: bentukPutar }, offset, 0)) {
            bentukSaatIni.bentuk = bentukPutar;
            bentukSaatIni.x += offset; 
            putarSuara('putar');
            gambarPapan(); 
            return true;
        }
    }
    return false;
}

function jatuhkanLangsung() {
    if (!gameJalan || gameJeda) return;

    let dy = 0;
    while (cekGerakanValid(bentukSaatIni, 0, dy + 1)) {
        dy++;
        skor += 2;
    }
    
    bentukSaatIni.y += dy;
    tempatkanBentuk();
}

function gambarBlok(ctx, x, y, warna) {
    ctx.fillStyle = warnaBentuk[warna];
    ctx.fillRect(x * UKURAN_BLOK, y * UKURAN_BLOK, UKURAN_BLOK, UKURAN_BLOK);
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x * UKURAN_BLOK, y * UKURAN_BLOK, UKURAN_BLOK, UKURAN_BLOK);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(x * UKURAN_BLOK + 2, y * UKURAN_BLOK + 2, UKURAN_BLOK - 4, 4);
    ctx.fillRect(x * UKURAN_BLOK + 2, y * UKURAN_BLOK + 2, 4, UKURAN_BLOK - 4);
}

function gambarPapan() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let y = 0; y < TINGGI_PAPAN; y++) {
        for (let x = 0; x < LEBAR_PAPAN; x++) {
            if (papanPermainan[y][x] !== 0) {
                gambarBlok(ctx, x, y, papanPermainan[y][x]);
            }
        }
    }

    if (bentukSaatIni) {
        for (let y = 0; y < bentukSaatIni.bentuk.length; y++) {
            for (let x = 0; x < bentukSaatIni.bentuk[y].length; x++) {
                if (bentukSaatIni.bentuk[y][x]) {
                    gambarBlok(ctx, bentukSaatIni.x + x, bentukSaatIni.y + y, bentukSaatIni.warna);
                }
            }
        }
    }
}

function loopPermainan(waktu) {
    if (!gameJalan || gameJeda) return;

    const deltaWaktu = waktu - waktuTerakhir;
    const intervalJatuh = Math.max(100, 1000 - (level - 1) * 50);

    if (deltaWaktu > intervalJatuh) {
        if (!gerakanBentuk(0, 1)) {
            tempatkanBentuk();
        }
        waktuTerakhir = waktu;
    }

    gambarPapan();
    requestAnimationFrame(loopPermainan);
}

function inisialisasiGame() {
    papanPermainan = [];
    for (let y = 0; y < TINGGI_PAPAN; y++) {
        papanPermainan[y] = new Array(LEBAR_PAPAN).fill(0);
    }
    gambarGrid();
}

function gambarGrid() {
    gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
    gridCtx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    gridCtx.lineWidth = 1;

    for (let x = 0; x <= LEBAR_PAPAN; x++) {
        gridCtx.beginPath();
        gridCtx.moveTo(x * UKURAN_BLOK, 0);
        gridCtx.lineTo(x * UKURAN_BLOK, canvas.height);
        gridCtx.stroke();
    }

    for (let y = 0; y <= TINGGI_PAPAN; y++) {
        gridCtx.beginPath();
        gridCtx.moveTo(0, y * UKURAN_BLOK);
        gridCtx.lineTo(canvas.width, y * UKURAN_BLOK);
        gridCtx.stroke();
    }
}

function mulaiGame() {
    inisialisasiGame();
    skor = 0;
    totalBaris = 0;
    level = 1;
    gameJalan = true;
    gameJeda = false;

    bentukBerikutnya = buatBentukBaru();
    bentukSaatIni = buatBentukBaru();

    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('pauseScreen').style.display = 'none';

    waktuTerakhir = performance.now();
    requestAnimationFrame(loopPermainan);
}

function gameSelesai() {
    gameJalan = false;
    putarSuara('gameOver');

    const rekorBaru = skor > rekorTertinggi;
    if (rekorBaru) {
        rekorTertinggi = skor;
        localStorage.setItem('tetrisHighScore', rekorTertinggi.toString());
        document.getElementById('newHighSore').style.display = 'block';
    } else {
        document.getElementById('newHighSore').style.display = 'none';
    }
    
    document.getElementById('finalScore').textContent = skor;
    document.getElementById('finalLines').textContent = totalBaris;
    document.getElementById('gameOver').style.display = 'flex';
}

function toggleJeda() {
    if (!gameJalan) return;

    gameJeda = !gameJeda;
    document.getElementById('pauseScreen').style.display = gameJeda ? 'flex' : 'none';
    
    if (!gameJeda) {
        waktuTerakhir = performance.now();
        requestAnimationFrame(loopPermainan);
    }
}

// Kontrol Sentuh HP
function handleTouchStart(button, dx, dy, isSlowDrop = false) {
    if (!gameJalan || gameJeda) return;
    clearInterval(intervalGerakSentuh);
    
    if (dx !== 0 || (dy !== 0 && !isSlowDrop)) {
        gerakanBentuk(dx, dy);
    }

    if (dx !== 0 || isSlowDrop) {
        let interval = (dx !== 0) ? 100 : delayJatuhSentuh;

        intervalGerakSentuh = setInterval(() => {
            if (isSlowDrop) {
                if (gerakanBentuk(0, 1)) {
                    skor += 1;
                } else {
                    clearInterval(intervalGerakSentuh);
                    tempatkanBentuk();
                }
            } else {
                gerakanBentuk(dx, dy);
            }
        }, interval);
    }
}

function handleTouchEnd() {
    clearInterval(intervalGerakSentuh);
    intervalGerakSentuh = null;
}

function handleRotationTouch() {
    if (!gameJalan || gameJeda) return;
    putarBentukSekarang();
}

// Kontrol Keyboard PC
document.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        if (!gameJalan) return;
        if (gameJeda) {
             toggleJeda();
             return;
        }
        if (!spasiDitekan) {
            spasiDitekan = true;
            jatuhkanLangsung();
        }
        return;
    }

    if (!gameJalan || gameJeda) return;

    switch (e.key.toLowerCase()) {
        case 'a':
        case 'arrowleft':
            gerakanBentuk(-1, 0);
            break;
        case 'd':
        case 'arrowright':
            gerakanBentuk(1, 0);
            break;
        case 'w':
        case 'arrowup':
            putarBentukSekarang();
            break;
        case 's':
        case 'arrowdown':
            if (gerakanBentuk(0, 1)) {
                skor += 1;
            } else {
                tempatkanBentuk();
            }
            break;
        case 'p':
            jatuhkanLangsung();
            break;
        default:
            return;
    }
    e.preventDefault();
});

document.addEventListener('keyup', (e) => {
    if (e.key === ' ' || e.key === 'Spacebar') {
        spasiDitekan = false;
    }
    if (e.key.toLowerCase() === 'p') {
        toggleJeda();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    inisialisasiGame();
});