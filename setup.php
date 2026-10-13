<?php
// setup.php — configuración privada: clave de Gemini y contraseña del panel de contactos.
// Requiere el código de configuración que solo tiene el propietario. La clave se guarda en la
// carpeta privada del servidor (fuera de public_html) y nunca se vuelve a mostrar.
require __DIR__ . '/api/_lib.php';
header('X-Frame-Options: DENY');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

$msg = ''; $ok = false;
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
  if (!rate_limit('setup', 5, 20, 100)) {
    $msg = 'Demasiados intentos. Espera unos minutos.';
  } elseif (!hash_equals(SETUP_TOKEN_SHA256, hash('sha256', trim((string) ($_POST['codigo'] ?? ''))))) {
    $msg = 'El código de configuración no es correcto.';
  } else {
    $cfg = config();
    $key = trim((string) ($_POST['clave'] ?? ''));
    $pass = (string) ($_POST['password'] ?? '');
    $errors = [];
    if ($key !== '') {
      $ch = curl_init('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1');
      curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15, CURLOPT_HTTPHEADER => ['x-goog-api-key: ' . $key]]);
      curl_exec($ch);
      $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
      curl_close($ch);
      if ($code === 200) $cfg['gemini_key'] = $key; else $errors[] = 'Google no aceptó la clave de la IA (revisa que esté completa).';
    }
    if ($pass !== '') {
      if (mb_strlen($pass) < 10) $errors[] = 'La contraseña del panel debe tener al menos 10 caracteres.';
      else $cfg['admin_hash'] = password_hash($pass, PASSWORD_DEFAULT);
    }
    if (!$errors && ($key !== '' || $pass !== '')) {
      if (empty($cfg['secret'])) $cfg['secret'] = bin2hex(random_bytes(32));
      if (save_config($cfg)) { $ok = true; $msg = 'Configuración guardada correctamente.'; }
      else $msg = 'No se pudo guardar la configuración en el servidor.';
    } else {
      $msg = $errors ? implode(' ', $errors) : 'No has escrito nada que guardar.';
    }
  }
}
$cfg = config();
$hasKey = !empty($cfg['gemini_key']) || getenv('GEMINI_API_KEY');
$hasPass = !empty($cfg['admin_hash']);
?><!doctype html>
<html lang="es-MX"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>Configuración privada · Siete Azules</title>
<link rel="stylesheet" href="styles.css?v=20261013"></head>
<body>
<main class="legal">
  <h1>Configuración privada</h1>
  <p>Desde aquí el propietario conecta la inteligencia artificial y protege el panel de contactos. Nada de lo que escribas se muestra de nuevo.</p>
  <ul>
    <li>Asistente con IA: <strong><?= $hasKey ? 'conectado' : 'pendiente' ?></strong></li>
    <li>Panel de contactos: <strong><?= $hasPass ? 'protegido con contraseña' : 'pendiente' ?></strong></li>
  </ul>
  <?php if ($msg): ?><p class="notice" role="status"><?= htmlspecialchars($msg) ?></p><?php endif; ?>
  <form method="post" class="card-form" autocomplete="off">
    <div class="field"><label for="codigo">Código de configuración</label><input id="codigo" name="codigo" type="password" required></div>
    <div class="field"><label for="clave">Clave de Google Gemini <span class="muted">(déjala vacía para no cambiarla)</span></label><input id="clave" name="clave" type="password" spellcheck="false"></div>
    <div class="field"><label for="password">Contraseña del panel de contactos <span class="muted">(mínimo 10 caracteres)</span></label><input id="password" name="password" type="password" minlength="10" autocomplete="new-password"></div>
    <button class="btn btn-ink" type="submit">Guardar</button>
  </form>
  <p style="margin-top:2rem"><a href="panel.php" class="btn btn-outline">Ir al panel de contactos</a> <a href="./" class="btn btn-outline">Volver a la web</a></p>
</main>
</body></html>
