<?php
// lead.php — guarda solicitudes de contacto (con consentimiento) en una base de datos SQLite privada.
// GET ?token=1  → token firmado para el formulario (frena envíos automatizados).
// POST JSON     → valida y guarda. Protección: mismo origen, token con antigüedad mínima,
//                 campo trampa, límite por IP y validación estricta de cada campo.
require __DIR__ . '/_lib.php';

function make_token(): string {
  $ts = time();
  return $ts . '.' . hash_hmac('sha256', 'lead|' . $ts, app_secret());
}
function token_ok(string $t): bool {
  $p = explode('.', $t);
  if (count($p) !== 2 || !ctype_digit($p[0])) return false;
  $age = time() - (int) $p[0];
  if ($age < 3 || $age > 7200) return false;
  return hash_equals(hash_hmac('sha256', 'lead|' . $p[0], app_secret()), $p[1]);
}

function db(): PDO {
  $pdo = new PDO('sqlite:' . private_dir() . '/leads.sqlite', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
  $pdo->exec('CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    creado TEXT NOT NULL,
    origen TEXT, motivo TEXT,
    nombre TEXT, email TEXT NOT NULL, telefono TEXT,
    entrada TEXT, salida TEXT, adultos INTEGER, ninos INTEGER,
    habitacion TEXT, presupuesto INTEGER, viaje TEXT, preferencias TEXT,
    mensaje TEXT,
    consentimiento INTEGER NOT NULL, marketing INTEGER NOT NULL DEFAULT 0,
    ip_hash TEXT, estado TEXT NOT NULL DEFAULT "nuevo"
  )');
  return $pdo;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'GET') {
  if (isset($_GET['token'])) json_out(['token' => make_token()]);
  json_out(['ok' => false], 404);
}

require_same_origin();
$in = require_post_json(12000);
$fail = fn(string $msg, int $code = 422) => json_out(['ok' => false, 'message' => $msg], $code);

// Campo trampa: los humanos no lo ven. Respondemos "ok" sin guardar para no dar pistas.
if (trim((string) ($in['sitio_web'] ?? '')) !== '') json_out(['ok' => true]);
if (!token_ok((string) ($in['token'] ?? ''))) $fail('Tu sesión caducó. Recarga la página e inténtalo de nuevo.', 400);
if (!rate_limit('lead', 4, 20, 500)) $fail('Has enviado varias solicitudes seguidas. Espera unos minutos, por favor.', 429);

$origenes = ['contacto', 'ofertas', 'buscador', 'chat'];
$motivos = ['estancia', 'informacion', 'ofertas'];
$rooms = array_column(hotel_data()['habitaciones'] ?? [], 'id');
$date = fn($v) => preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $v) ? (string) $v : null;

$origen = in_array($in['origen'] ?? '', $origenes, true) ? $in['origen'] : 'contacto';
$nombre = clean_text($in['nombre'] ?? '', 80);
$email = clean_text($in['email'] ?? '', 120);
$telefono = clean_text($in['telefono'] ?? '', 25);

if (empty($in['consentimiento'])) $fail('Necesitamos tu consentimiento para guardar tus datos.');
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $fail('Revisa tu correo electrónico.');
if ($origen !== 'ofertas' && mb_strlen($nombre) < 2) $fail('Escribe tu nombre.');
if ($telefono !== '' && !preg_match('/^[+()\d\s.-]{7,25}$/', $telefono)) $fail('Revisa tu teléfono.');

$entrada = $date($in['entrada'] ?? '');
$salida = $date($in['salida'] ?? '');
if ($entrada && $salida && $salida <= $entrada) $fail('La salida debe ser posterior a la llegada.');

$prefs = array_values(array_intersect(is_array($in['preferencias'] ?? null) ? $in['preferencias'] : [], ['vista', 'king', 'balcon', 'desayuno', 'accesible']));
$viaje = in_array($in['viaje'] ?? '', ['romantico', 'familiar', 'negocios', 'aventura', 'descanso'], true) ? $in['viaje'] : null;

try {
  $st = db()->prepare('INSERT INTO leads (creado, origen, motivo, nombre, email, telefono, entrada, salida, adultos, ninos, habitacion, presupuesto, viaje, preferencias, mensaje, consentimiento, marketing, ip_hash)
    VALUES (:creado, :origen, :motivo, :nombre, :email, :telefono, :entrada, :salida, :adultos, :ninos, :habitacion, :presupuesto, :viaje, :preferencias, :mensaje, 1, :marketing, :ip)');
  $st->execute([
    ':creado' => gmdate('c'),
    ':origen' => $origen,
    ':motivo' => in_array($in['motivo'] ?? '', $motivos, true) ? $in['motivo'] : 'informacion',
    ':nombre' => $nombre,
    ':email' => $email,
    ':telefono' => $telefono,
    ':entrada' => $entrada,
    ':salida' => $salida,
    ':adultos' => isset($in['adultos']) ? max(0, min(10, (int) $in['adultos'])) : null,
    ':ninos' => isset($in['ninos']) ? max(0, min(10, (int) $in['ninos'])) : null,
    ':habitacion' => in_array($in['habitacion'] ?? '', $rooms, true) ? $in['habitacion'] : null,
    ':presupuesto' => isset($in['presupuesto']) ? max(0, min(100000, (int) $in['presupuesto'])) : null,
    ':viaje' => $viaje,
    ':preferencias' => $prefs ? implode(',', $prefs) : null,
    ':mensaje' => clean_text($in['mensaje'] ?? '', 1000),
    ':marketing' => !empty($in['marketing']) ? 1 : 0,
    // Guardamos la IP solo como huella irreversible, para detectar abusos.
    ':ip' => hash('sha256', client_ip() . app_secret()),
  ]);
} catch (Throwable $e) {
  @error_log('[siete-azules] lead: ' . $e->getMessage());
  $fail('No pudimos guardar tu solicitud. Escríbenos por WhatsApp o correo.', 500);
}
json_out(['ok' => true]);
