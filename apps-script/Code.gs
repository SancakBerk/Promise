/**
 * Aslı & Berk · Söz İsteme — misafir fotoğraflarını Google Drive'a kaydeder.
 *
 * Kurulum: apps-script/README.md
 * Web uygulaması "Beni olarak çalıştır" ile yayınlanır; dosyalar bu hesabın
 * Drive'ındaki klasöre yazılır. Misafirlerin Google hesabı gerekmez.
 */

// Fotoğrafların kaydedileceği Drive klasörü (klasör adresindeki /folders/ sonrası)
var FOLDER_ID = '1tXZKM6s7xdva5t3S8m-GEs7LsdjsMAIy';

var MAX_BYTES = 40 * 1024 * 1024;

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var mimeType = String(body.mimeType || '');
    if (mimeType.indexOf('image/') !== 0) return reply({ ok: false, error: 'only-images' });

    var bytes = Utilities.base64Decode(String(body.data || ''));
    if (!bytes.length) return reply({ ok: false, error: 'empty' });
    if (bytes.length > MAX_BYTES) return reply({ ok: false, error: 'too-big' });

    var guest = clean(body.name).slice(0, 40);
    var stamp = Utilities.formatDate(new Date(), 'Europe/Istanbul', 'yyyy-MM-dd_HH-mm-ss');
    var fileName = [stamp, guest || 'Misafir', clean(body.fileName).slice(0, 60) || 'foto.jpg'].join('_');

    var file = DriveApp.getFolderById(FOLDER_ID)
      .createFile(Utilities.newBlob(bytes, mimeType, fileName));
    if (guest) file.setDescription('Yükleyen: ' + guest);

    return reply({ ok: true, id: file.getId() });
  } catch (err) {
    return reply({ ok: false, error: String(err && err.message || err) });
  }
}

// Tarayıcıda adresi açınca çalıştığını görmek için
function doGet() {
  return reply({ ok: true, service: 'asli-berk-fotograf' });
}

function clean(value) {
  return String(value || '').replace(/[\\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Kurulumda bir kez çalıştırın: Drive iznini verir ve klasöre erişimi doğrular
function testFolder() {
  Logger.log(DriveApp.getFolderById(FOLDER_ID).getName());
}
