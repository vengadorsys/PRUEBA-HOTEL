<?php
header('Content-Type: application/json; charset=utf-8');
function out($ok, $why = '') { echo json_encode(['ok' => $ok, 'reason' => $why]); exit; }
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { http_response_code(405); out(false, 'method'); }
$o = parse_url($_SERVER['HTTP_ORIGIN'] ?? '', PHP_URL_HOST);
if ($o && strtolower($o) !== strtolower($_SERVER['HTTP_HOST'] ?? '')) { http_response_code(403); out(false, 'origin'); }
$in = json_decode(file_get_contents('php://input'), true) ?: [];
$nombre = mb_substr(trim((string)($in['nombre'] ?? '')), 0, 80);
$email  = trim((string)($in['email'] ?? ''));
$tel    = mb_substr(preg_replace('/[^0-9+\s]/', '', (string)($in['telefono'] ?? '')), 0, 24);
if ($nombre === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) out(false, 'datos');
if (empty($in['consent'])) out(false, 'consent');
$dir = __DIR__ . '/datos';
if (!is_dir($dir)) { @mkdir($dir, 0755); @file_put_contents($dir . '/.htaccess', "Require all denied\n"); }
$csv = $dir . '/clientes.csv';
$new = !is_file($csv);
$f = @fopen($csv, 'a');
if (!$f) out(false, 'write');
flock($f, LOCK_EX);
if ($new) fputcsv($f, ['fecha', 'nombre', 'email', 'telefono']);
fputcsv($f, [date('c'), $nombre, $email, $tel]);
flock($f, LOCK_UN); fclose($f);
out(true);
