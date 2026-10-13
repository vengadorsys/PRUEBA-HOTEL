<?php
// instalar-clave.php — guarda la clave de Gemini en la carpeta privada del servidor y comprueba la web.
// Solo se ejecuta desde la línea de comandos del hosting (p. ej. una tarea programada de Hostinger):
//   php /home/USUARIO/domains/DOMINIO/public_html/tools/instalar-clave.php CLAVE
// Nunca imprime la clave. La carpeta tools/ está bloqueada para la web en .htaccess.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

$key = trim((string) ($argv[1] ?? ''));
if (!preg_match('/^(AIza|AQ\.)[A-Za-z0-9_\-.]{20,}$/', $key)) { fwrite(STDERR, "Clave con formato no válido.\n"); exit(1); }

$publicHtml = dirname(__DIR__);
$dir = dirname($publicHtml) . '/siete_azules_privado';   // misma ruta que usa api/_lib.php
if (!is_dir($dir) && !mkdir($dir, 0700, true)) { fwrite(STDERR, "No se pudo crear la carpeta privada.\n"); exit(1); }

$file = $dir . '/config.php';
$cfg = is_file($file) ? (include $file) : [];
if (!is_array($cfg)) $cfg = [];
$cfg['gemini_key'] = $key;
if (empty($cfg['secret'])) $cfg['secret'] = bin2hex(random_bytes(32));
file_put_contents($file, "<?php\n// Configuración privada de Siete Azules. No compartir.\nreturn " . var_export($cfg, true) . ";\n", LOCK_EX);
chmod($file, 0600);
chmod($dir, 0700);
echo "Clave guardada en la carpeta privada (fuera de public_html).\n";

// Comprobación de la web publicada desde el propio servidor.
$host = basename(dirname($publicHtml));
$base = 'https://' . $host;
function req(string $url, ?string $json = null, string $origin = ''): array {
  $ch = curl_init($url);
  $opt = [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 45];
  if ($json !== null) {
    $opt[CURLOPT_POST] = true;
    $opt[CURLOPT_POSTFIELDS] = $json;
    $opt[CURLOPT_HTTPHEADER] = ['Content-Type: application/json', 'Origin: ' . $origin];
  }
  curl_setopt_array($ch, $opt);
  $body = (string) curl_exec($ch);
  $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  return [$code, $body];
}
foreach (['/', '/styles.css', '/main.js', '/data/hotel.json', '/assets/img/hero.webp', '/lib/leaflet.js', '/privacidad.html', '/api/_lib.php', '/tools/instalar-clave.php', '/no-existe'] as $p) {
  echo "GET $p => " . req($base . $p)[0] . "\n";
}
echo "HTTP sin cifrar => " . req('http://' . $host . '/')[0] . " (301 = redirige a HTTPS)\n";
[$c, $r] = req($base . '/api/asistente.php', json_encode(['message' => 'Somos una pareja, ¿qué suite nos recomiendas?', 'history' => []]), $base);
echo "ASISTENTE => $c " . mb_substr(str_replace("\n", ' ', $r), 0, 300) . "\n";
[$c, $r] = req($base . '/api/recomendador.php', json_encode(['criterios' => ['entrada' => '2026-11-10', 'salida' => '2026-11-13', 'adultos' => 2, 'ninos' => 0, 'presupuesto' => 9000, 'viaje' => 'romantico', 'preferencias' => ['vista']], 'opciones' => [['id' => 'palafito', 'precioNoche' => 8600, 'noches' => 3, 'disponibilidadSimulada' => 2, 'razones' => [], 'avisos' => []]]]), $base);
echo "RECOMENDADOR => $c " . mb_substr(str_replace("\n", ' ', $r), 0, 220) . "\n";
echo "ORIGEN AJENO => " . req($base . '/api/asistente.php', '{"message":"hola"}', 'https://otro-sitio.example')[0] . " (403 = bloqueado)\n";
echo "FIN\n";
