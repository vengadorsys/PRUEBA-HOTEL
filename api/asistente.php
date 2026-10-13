<?php
// asistente.php — el navegador envía {message, history[]} y recibe {reply}.
// La clave de Gemini vive solo en el servidor (carpeta privada); nunca llega al navegador.
require __DIR__ . '/_lib.php';
require __DIR__ . '/_conocimiento.php';

function reply(string $text, bool $fallback = false): void {
  json_out(['reply' => $text, 'fallback' => $fallback]);
}

require_same_origin();
$in = require_post_json(30000);

if (!rate_limit('chat', 8, 100, 1500)) {
  reply('Has enviado muchos mensajes seguidos. Espera un minuto, o déjanos tus datos y el equipo te escribe.', true);
}
if (gemini_key() === '') {
  reply('El asistente se está configurando en este momento. Mientras tanto, puedes escribirnos por el formulario de contacto o por WhatsApp.', true);
}

$message = clean_text($in['message'] ?? '', 500);
if ($message === '') json_out(['reply' => '', 'error' => 'input'], 400);

$contents = [];
$history = is_array($in['history'] ?? null) ? array_slice($in['history'], -10) : [];
foreach ($history as $h) {
  if (!is_array($h)) continue;
  $text = clean_text($h['text'] ?? '', 1200);
  if ($text === '') continue;
  $contents[] = ['role' => (($h['role'] ?? '') === 'model') ? 'model' : 'user', 'parts' => [['text' => $text]]];
}
$contents[] = ['role' => 'user', 'parts' => [['text' => $message]]];

$text = gemini_generate(assistant_system_prompt(), $contents, ['temperature' => 0.4, 'maxOutputTokens' => 600]);
if ($text === '') {
  reply('Ahora mismo no puedo responder. Déjanos tus datos o escríbenos por WhatsApp y te ayudamos enseguida.', true);
}
reply($text);
