<?php
// _lib.php — utilidades compartidas por los archivos del servidor de Siete Azules.
// Nunca se sirve directamente (bloqueado en api/.htaccess y por la comprobación de abajo).
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === '_lib.php') { http_response_code(404); exit; }

// Hash SHA-256 del código de configuración inicial (el código en claro solo lo tiene el propietario).
const SETUP_TOKEN_SHA256 = 'fa1d1bb61dac6998c9f59edaac59e5d70cfc9709b7e8e5ac4abd4ae79b92d37b';

// Modelos de texto de Gemini (capa gratuita), en orden de preferencia.
const GEMINI_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-flash-lite-latest', 'gemini-3.5-flash-lite'];

function json_out($data, int $code = 200): void {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  header('X-Content-Type-Options: nosniff');
  header('Cache-Control: no-store');
  echo json_encode($data, JSON_UNESCAPED_UNICODE);
  exit;
}

// Carpeta privada FUERA de public_html (o, si no se puede, una carpeta bloqueada por .htaccess).
function private_dir(): string {
  static $dir = null;
  if ($dir !== null) return $dir;
  $candidates = [];
  $env = getenv('SIETE_PRIVATE_DIR');
  if ($env) $candidates[] = $env;
  $docroot = rtrim($_SERVER['DOCUMENT_ROOT'] ?? '', '/');
  if ($docroot !== '') $candidates[] = dirname($docroot) . '/siete_azules_privado';
  $candidates[] = dirname(__DIR__) . '/_privado';
  foreach ($candidates as $c) {
    if (is_dir($c) || @mkdir($c, 0700, true)) {
      if (is_writable($c)) {
        if (strpos($c, dirname(__DIR__)) === 0 && !is_file($c . '/.htaccess')) {
          @file_put_contents($c . '/.htaccess', "Require all denied\nDeny from all\n");
        }
        return $dir = $c;
      }
    }
  }
  return $dir = sys_get_temp_dir();
}

function config(): array {
  $f = private_dir() . '/config.php';
  $cfg = is_file($f) ? (@include $f) : [];
  return is_array($cfg) ? $cfg : [];
}

function save_config(array $cfg): bool {
  $f = private_dir() . '/config.php';
  $php = "<?php\n// Configuración privada de Siete Azules. No compartir.\nreturn " . var_export($cfg, true) . ";\n";
  $ok = @file_put_contents($f, $php, LOCK_EX) !== false;
  @chmod($f, 0600);
  return $ok;
}

// Secreto del servidor para firmar los formularios (se crea solo la primera vez).
function app_secret(): string {
  $cfg = config();
  if (!empty($cfg['secret'])) return $cfg['secret'];
  $cfg['secret'] = bin2hex(random_bytes(32));
  save_config($cfg);
  return $cfg['secret'];
}

function gemini_key(): string {
  $k = getenv('GEMINI_API_KEY');
  if (!$k) { $cfg = config(); $k = $cfg['gemini_key'] ?? ''; }
  return is_string($k) ? trim($k) : '';
}

function client_ip(): string { return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'; }

// Solo aceptamos peticiones desde el propio sitio (evita que otros usen la cuota).
function require_same_origin(): void {
  $host = strtolower(preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? ''));
  $src = $_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? '');
  if ($src === '') json_out(['ok' => false, 'error' => 'origin'], 403);
  $srcHost = strtolower((string) parse_url($src, PHP_URL_HOST));
  if ($srcHost === '' || $srcHost !== $host) json_out(['ok' => false, 'error' => 'origin'], 403);
}

function require_post_json(int $maxBytes = 20000): array {
  if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') json_out(['ok' => false, 'error' => 'method'], 405);
  $raw = file_get_contents('php://input', false, null, 0, $maxBytes + 1);
  if ($raw === false || strlen($raw) > $maxBytes) json_out(['ok' => false, 'error' => 'size'], 413);
  $in = json_decode($raw, true);
  if (!is_array($in)) json_out(['ok' => false, 'error' => 'input'], 400);
  return $in;
}

// Límite de uso por IP (minuto y día) y tope global diario. Devuelve false si se excede.
function rate_limit(string $bucket, int $perMin, int $perDay, int $globalDay): bool {
  $dir = private_dir() . '/rl';
  if (!is_dir($dir)) @mkdir($dir, 0700, true);
  $now = time();
  $today = date('Ymd');
  $ipFile = $dir . '/' . $bucket . '_' . hash('sha256', client_ip() . app_secret()) . '.json';
  $fh = @fopen($ipFile, 'c+');
  if (!$fh) return true; // si no podemos contar, no bloqueamos al visitante
  flock($fh, LOCK_EX);
  $stamps = json_decode(stream_get_contents($fh) ?: '[]', true);
  if (!is_array($stamps)) $stamps = [];
  $stamps = array_values(array_filter($stamps, fn($t) => $t > $now - 86400));
  $lastMin = count(array_filter($stamps, fn($t) => $t > $now - 60));
  $gFile = $dir . '/' . $bucket . '_global_' . $today . '.txt';
  $g = is_file($gFile) ? (int) @file_get_contents($gFile) : 0;
  if ($lastMin >= $perMin || count($stamps) >= $perDay || $g >= $globalDay) {
    flock($fh, LOCK_UN); fclose($fh);
    return false;
  }
  $stamps[] = $now;
  ftruncate($fh, 0); rewind($fh);
  fwrite($fh, json_encode(array_slice($stamps, -500)));
  flock($fh, LOCK_UN); fclose($fh);
  @file_put_contents($gFile, (string) ($g + 1), LOCK_EX);
  return true;
}

// Llama a Gemini recorriendo los modelos. Devuelve el texto o '' si falla (el error se registra, no se muestra).
function gemini_generate(string $system, array $contents, array $genConfig = []): string {
  $key = gemini_key();
  if ($key === '') return '';
  $payload = [
    'system_instruction' => ['parts' => [['text' => $system]]],
    'contents' => $contents,
    'generationConfig' => array_merge(['temperature' => 0.4, 'maxOutputTokens' => 700, 'thinkingConfig' => ['thinkingLevel' => 'minimal']], $genConfig),
    'safetySettings' => [
      ['category' => 'HARM_CATEGORY_HARASSMENT', 'threshold' => 'BLOCK_ONLY_HIGH'],
      ['category' => 'HARM_CATEGORY_HATE_SPEECH', 'threshold' => 'BLOCK_ONLY_HIGH'],
      ['category' => 'HARM_CATEGORY_SEXUALLY_EXPLICIT', 'threshold' => 'BLOCK_ONLY_HIGH'],
      ['category' => 'HARM_CATEGORY_DANGEROUS_CONTENT', 'threshold' => 'BLOCK_ONLY_HIGH'],
    ],
  ];
  $body = json_encode($payload, JSON_UNESCAPED_UNICODE);
  $lastErr = '';
  $deadline = microtime(true) + 28; // presupuesto total de tiempo para responder al visitante
  $attempts = [];
  foreach (GEMINI_MODELS as $m) { $attempts[] = $m; $attempts[] = $m; } // cada modelo se reintenta una vez
  $skip = [];
  foreach ($attempts as $model) {
    if (isset($skip[$model])) continue;
    $left = $deadline - microtime(true);
    if ($left < 3) break;
    $ch = curl_init('https://generativelanguage.googleapis.com/v1beta/models/' . rawurlencode($model) . ':generateContent');
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_POST => true,
      CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'x-goog-api-key: ' . $key],
      CURLOPT_POSTFIELDS => $body,
      CURLOPT_CONNECTTIMEOUT => 5,
      CURLOPT_TIMEOUT => (int) min(12, $left),
    ]);
    $resp = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $cerr = curl_error($ch);
    curl_close($ch);
    if ($resp === false || $code >= 400) {
      $lastErr .= " $model http $code $cerr " . substr((string) $resp, 0, 120) . ';';
      // Solo reintentamos el mismo modelo si Google indica saturación pasajera.
      if (!in_array($code, [429, 500, 503], true)) $skip[$model] = true;
      else usleep(600000);
      continue;
    }
    $data = json_decode($resp, true);
    $text = '';
    foreach (($data['candidates'][0]['content']['parts'] ?? []) as $p) {
      if (!empty($p['text']) && empty($p['thought'])) $text .= $p['text'];
    }
    if (trim($text) !== '') return trim($text);
    $lastErr .= " $model vacío (" . ($data['candidates'][0]['finishReason'] ?? '?') . ');';
    $skip[$model] = true;
  }
  @error_log('[siete-azules] Gemini sin respuesta: ' . $lastErr);
  return '';
}

function hotel_data(): array {
  static $h = null;
  if ($h === null) {
    $h = json_decode((string) @file_get_contents(dirname(__DIR__) . '/data/hotel.json'), true);
    if (!is_array($h)) $h = [];
  }
  return $h;
}

function clean_text($v, int $max): string {
  $s = is_scalar($v) ? (string) $v : '';
  $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $s) ?? '';
  return mb_substr(trim($s), 0, $max);
}
