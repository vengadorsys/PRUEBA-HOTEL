<?php
// recomendador.php — redacta con IA el resumen y el «por qué» de cada habitación recomendada.
// La selección y el orden se calculan en el navegador con reglas fijas; aquí solo se explican,
// usando únicamente los datos de data/hotel.json. Si la IA falla, el navegador usa sus textos.
require __DIR__ . '/_lib.php';
require __DIR__ . '/_conocimiento.php';

require_same_origin();
$in = require_post_json(15000);
if (!rate_limit('recomendador', 6, 60, 800)) json_out(['ok' => false, 'reason' => 'limit']);
if (gemini_key() === '') json_out(['ok' => false, 'reason' => 'setup']);

$rooms = [];
foreach ((hotel_data()['habitaciones'] ?? []) as $r) $rooms[$r['id']] = $r;

$c = is_array($in['criterios'] ?? null) ? $in['criterios'] : [];
$viajes = ['romantico', 'familiar', 'negocios', 'aventura', 'descanso'];
$prefsOk = ['vista', 'king', 'balcon', 'desayuno', 'accesible'];
$criterios = [
  'entrada' => preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) ($c['entrada'] ?? '')) ? $c['entrada'] : '',
  'salida' => preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) ($c['salida'] ?? '')) ? $c['salida'] : '',
  'adultos' => max(1, min(4, (int) ($c['adultos'] ?? 2))),
  'ninos' => max(0, min(3, (int) ($c['ninos'] ?? 0))),
  'presupuestoPorNoche' => max(0, min(100000, (int) ($c['presupuesto'] ?? 0))),
  'tipoDeViaje' => in_array($c['viaje'] ?? '', $viajes, true) ? $c['viaje'] : 'descanso',
  'preferencias' => array_values(array_intersect(is_array($c['preferencias'] ?? null) ? $c['preferencias'] : [], $prefsOk)),
];

$opciones = [];
foreach (array_slice(is_array($in['opciones'] ?? null) ? $in['opciones'] : [], 0, 3) as $o) {
  $id = (string) ($o['id'] ?? '');
  if (!isset($rooms[$id])) continue;
  $r = $rooms[$id];
  $opciones[] = [
    'id' => $id,
    'nombre' => $r['nombre'],
    'precioOrientativoNoche' => max(0, (int) ($o['precioNoche'] ?? $r['precio'])),
    'noches' => max(1, min(30, (int) ($o['noches'] ?? 1))),
    'disponibilidadSimulada' => max(0, (int) ($o['disponibilidadSimulada'] ?? 0)),
    'capacidad' => "{$r['maxAdultos']} adultos / {$r['maxNinos']} niños / {$r['maxHuespedes']} máx.",
    'cama' => $r['cama'], 'vista' => $r['vista'], 'balcon' => $r['balcon'],
    'desayunoIncluido' => $r['desayunoIncluido'], 'accesible' => $r['accesible'],
    'amenidades' => $r['amenidades'], 'idealPara' => $r['idealPara'],
  ];
}
if (!$opciones) json_out(['ok' => false, 'reason' => 'input'], 400);

$system = "Eres el asesor de estancias de Siete Azules (hotel ficticio de demostración en Bacalar). "
  . "Redactas en español de México, cálido y elegante. Usa EXCLUSIVAMENTE los datos proporcionados; no inventes servicios, precios, disponibilidad ni políticas. "
  . "Los precios y la disponibilidad son simulados: no los presentes como confirmados. No menciones descuentos.\n\nDATOS DEL HOTEL:\n" . hotel_facts();

$prompt = "Criterios del visitante:\n" . json_encode($criterios, JSON_UNESCAPED_UNICODE)
  . "\n\nOpciones ya seleccionadas y ordenadas (la primera es la mejor):\n" . json_encode($opciones, JSON_UNESCAPED_UNICODE)
  . "\n\nDevuelve EXCLUSIVAMENTE un objeto JSON con esta forma: "
  . '{"resumen": "2 o 3 frases (máx. 60 palabras) que recomienden la primera opción explicando por qué encaja con su viaje y mencionen 1 o 2 servicios relevantes del hotel", '
  . '"porQue": {"<id>": "1 o 2 frases (máx. 40 palabras) de por qué encaja o qué tener en cuenta (presupuesto, capacidad, preferencias no cubiertas)"}}'
  . ". Incluye una clave en porQue por cada id de las opciones.";

$text = gemini_generate($system, [['role' => 'user', 'parts' => [['text' => $prompt]]]], [
  'temperature' => 0.5, 'maxOutputTokens' => 700, 'responseMimeType' => 'application/json',
]);
if ($text === '') json_out(['ok' => false, 'reason' => 'ai']);

$text = preg_replace('/^```(?:json)?\s*|\s*```$/', '', trim($text));
$data = json_decode($text, true);
if (!is_array($data) || !is_string($data['resumen'] ?? null)) json_out(['ok' => false, 'reason' => 'format']);

$porQue = [];
foreach ($opciones as $o) {
  $t = $data['porQue'][$o['id']] ?? null;
  if (is_string($t) && trim($t) !== '') $porQue[$o['id']] = mb_substr(trim($t), 0, 400);
}
json_out(['ok' => true, 'resumen' => mb_substr(trim($data['resumen']), 0, 600), 'porQue' => $porQue]);
