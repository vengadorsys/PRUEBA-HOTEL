<?php
// panel.php — panel privado del hotel para consultar y exportar las solicitudes guardadas.
require __DIR__ . '/api/_lib.php';
header('X-Frame-Options: DENY');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');
session_set_cookie_params(['httponly' => true, 'samesite' => 'Strict', 'secure' => !empty($_SERVER['HTTPS'])]);
session_name('sa_panel');
session_start();

$cfg = config();
$hash = $cfg['admin_hash'] ?? '';
if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));
$csrf = $_SESSION['csrf'];
$err = '';
$h = fn($s) => htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');

if (($_POST['accion'] ?? '') === 'entrar') {
  if (!rate_limit('panel', 5, 30, 300)) $err = 'Demasiados intentos. Espera unos minutos.';
  elseif ($hash && password_verify((string) ($_POST['password'] ?? ''), $hash)) { session_regenerate_id(true); $_SESSION['ok'] = true; header('Location: panel.php'); exit; }
  else $err = 'Contraseña incorrecta.';
}
if (($_POST['accion'] ?? '') === 'salir' && hash_equals($csrf, (string) ($_POST['csrf'] ?? ''))) { session_destroy(); header('Location: panel.php'); exit; }

$logged = !empty($_SESSION['ok']) && $hash;
$rows = [];
if ($logged) {
  $dbFile = private_dir() . '/leads.sqlite';
  if (is_file($dbFile)) {
    $pdo = new PDO('sqlite:' . $dbFile, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    if (($_POST['accion'] ?? '') === 'estado' && hash_equals($csrf, (string) ($_POST['csrf'] ?? ''))) {
      $estado = in_array($_POST['estado'] ?? '', ['nuevo', 'contactado', 'cerrado'], true) ? $_POST['estado'] : 'nuevo';
      $pdo->prepare('UPDATE leads SET estado = ? WHERE id = ?')->execute([$estado, (int) ($_POST['id'] ?? 0)]);
      header('Location: panel.php'); exit;
    }
    if (($_POST['accion'] ?? '') === 'borrar' && hash_equals($csrf, (string) ($_POST['csrf'] ?? ''))) {
      $pdo->prepare('DELETE FROM leads WHERE id = ?')->execute([(int) ($_POST['id'] ?? 0)]);
      header('Location: panel.php'); exit;
    }
    $rows = $pdo->query('SELECT * FROM leads ORDER BY id DESC LIMIT 500')->fetchAll(PDO::FETCH_ASSOC);
    if (isset($_GET['csv'])) {
      header('Content-Type: text/csv; charset=utf-8');
      header('Content-Disposition: attachment; filename="solicitudes-siete-azules.csv"');
      $out = fopen('php://output', 'w');
      fwrite($out, "\xEF\xBB\xBF");
      if ($rows) fputcsv($out, array_keys($rows[0]));
      foreach ($rows as $r) fputcsv($out, array_map(fn($v) => preg_match('/^[=+\-@]/', (string) $v) ? "'" . $v : $v, $r));
      exit;
    }
  }
}
?><!doctype html>
<html lang="es-MX"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>Panel de solicitudes · Siete Azules</title>
<link rel="stylesheet" href="styles.css?v=20261013">
<style>
  .panel{max-width:1200px;margin:0 auto;padding:3rem var(--gutter)}
  .panel h1{font-family:var(--serif);font-size:2.6rem;margin-bottom:.5rem}
  .tbl{width:100%;border-collapse:collapse;font-size:.85rem;background:#fff;border-radius:12px;overflow:hidden}
  .tbl th,.tbl td{padding:.7rem .8rem;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
  .tbl th{background:var(--sand);font-size:.72rem;letter-spacing:.1em;text-transform:uppercase}
  .wrap{overflow-x:auto;margin-top:1.5rem;border-radius:12px;box-shadow:var(--shadow-sm)}
  .row-actions{display:flex;gap:.4rem;align-items:center}
  .row-actions select,.row-actions button{font-size:.78rem;padding:.3rem .5rem;border:1px solid var(--line);border-radius:6px;background:#fff}
  .top{display:flex;flex-wrap:wrap;gap:1rem;justify-content:space-between;align-items:center}
</style></head>
<body>
<main class="panel">
<?php if (!$hash): ?>
  <h1>Panel de solicitudes</h1>
  <p class="notice">El panel aún no tiene contraseña. Configúrala en <a href="setup.php">setup.php</a> con el código de configuración.</p>
<?php elseif (!$logged): ?>
  <h1>Panel de solicitudes</h1>
  <form method="post" class="card-form" style="max-width:420px">
    <input type="hidden" name="accion" value="entrar">
    <div class="field"><label for="pw">Contraseña</label><input id="pw" name="password" type="password" required autocomplete="current-password"></div>
    <?php if ($err): ?><p class="form-status err"><?= $h($err) ?></p><?php endif; ?>
    <button class="btn btn-ink" type="submit">Entrar</button>
  </form>
<?php else: ?>
  <div class="top">
    <div><h1>Solicitudes</h1><p class="muted"><?= count($rows) ?> registros · solo personas que aceptaron el aviso de privacidad.</p></div>
    <div class="row-actions">
      <a class="btn btn-outline btn-sm" href="panel.php?csv=1">Exportar CSV</a>
      <form method="post"><input type="hidden" name="accion" value="salir"><input type="hidden" name="csrf" value="<?= $h($csrf) ?>"><button class="btn btn-ink btn-sm" type="submit">Salir</button></form>
    </div>
  </div>
  <div class="wrap"><table class="tbl">
    <thead><tr><th>Fecha</th><th>Origen</th><th>Contacto</th><th>Estancia</th><th>Mensaje</th><th>Ofertas</th><th>Estado</th></tr></thead>
    <tbody>
    <?php if (!$rows): ?><tr><td colspan="7">Todavía no hay solicitudes.</td></tr><?php endif; ?>
    <?php foreach ($rows as $r): ?>
      <tr>
        <td><?= $h(substr($r['creado'], 0, 16)) ?></td>
        <td><?= $h($r['origen']) ?><br><span class="muted"><?= $h($r['motivo']) ?></span></td>
        <td><strong><?= $h($r['nombre']) ?></strong><br><a href="mailto:<?= $h($r['email']) ?>"><?= $h($r['email']) ?></a><br><?= $h($r['telefono']) ?></td>
        <td><?= $h($r['entrada']) ?> → <?= $h($r['salida']) ?><br><?= $r['adultos'] !== null ? $h($r['adultos']) . ' ad. · ' . $h($r['ninos']) . ' niñ.' : '' ?><br><?= $h($r['habitacion']) ?> <?= $r['presupuesto'] ? '· $' . $h(number_format((int) $r['presupuesto'])) : '' ?><br><span class="muted"><?= $h($r['viaje']) ?> <?= $h($r['preferencias']) ?></span></td>
        <td style="max-width:280px"><?= nl2br($h($r['mensaje'])) ?></td>
        <td><?= $r['marketing'] ? 'Sí' : 'No' ?></td>
        <td>
          <form method="post" class="row-actions">
            <input type="hidden" name="accion" value="estado"><input type="hidden" name="csrf" value="<?= $h($csrf) ?>"><input type="hidden" name="id" value="<?= (int) $r['id'] ?>">
            <select name="estado" aria-label="Estado"><?php foreach (['nuevo', 'contactado', 'cerrado'] as $e): ?><option <?= $r['estado'] === $e ? 'selected' : '' ?>><?= $e ?></option><?php endforeach; ?></select>
            <button type="submit">Guardar</button>
          </form>
          <details style="margin-top:.3rem"><summary class="muted">Borrar</summary>
          <form method="post" class="row-actions">
            <input type="hidden" name="accion" value="borrar"><input type="hidden" name="csrf" value="<?= $h($csrf) ?>"><input type="hidden" name="id" value="<?= (int) $r['id'] ?>">
            <button type="submit">Confirmar borrado definitivo</button>
          </form></details>
        </td>
      </tr>
    <?php endforeach; ?>
    </tbody>
  </table></div>
<?php endif; ?>
</main>
</body></html>
