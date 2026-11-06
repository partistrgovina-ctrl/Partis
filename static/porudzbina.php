<?php
// PARTIS - prijem porudzbine/upita iz korpe i slanje na mejl. Radi na Mint.rs (cPanel) hostingu.
header('Content-Type: text/plain; charset=utf-8');
const PRIMALAC = 'partis.trgovina@gmail.com';
const POSILJALAC = 'upit@partis.rs';   // adresa na domenu sajta (mora da postoji ili da hosting dozvoljava slanje)

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit('Method not allowed'); }
if (!empty($_POST['bot-field'])) { exit('ok'); }            // zamka za botove

function ocisti($s, $max = 4000) {
  $s = trim((string)$s);
  $s = str_replace(["\r", "\0"], '', $s);
  return mb_substr($s, 0, $max);
}
function jedna_linija($s, $max = 200) { return preg_replace('/[\r\n]+/', ' ', ocisti($s, $max)); }

$ime = jedna_linija($_POST['ime'] ?? '');
$firma = jedna_linija($_POST['firma'] ?? '');
$pib = preg_replace('/\D/', '', $_POST['pib'] ?? '');
$telefon = jedna_linija($_POST['telefon'] ?? '', 40);
$email = filter_var(trim($_POST['email'] ?? ''), FILTER_VALIDATE_EMAIL);
$adresa = jedna_linija($_POST['adresa'] ?? '', 300);
$napomena = ocisti($_POST['napomena'] ?? '', 2000);
$porudzbina = ocisti($_POST['porudzbina'] ?? '', 8000);

if ($ime === '' || $firma === '' || strlen($pib) !== 9 || $telefon === '' || !$email || $adresa === '' || $porudzbina === '') {
  http_response_code(400); exit('Nepotpuni podaci');
}

// ogranicenje: najvise 5 upita na sat sa iste IP adrese
$fajl = sys_get_temp_dir() . '/partis_rl_' . md5($_SERVER['REMOTE_ADDR'] ?? '');
$vremena = array_filter(array_map('intval', @file($fajl, FILE_IGNORE_NEW_LINES) ?: []), fn($t) => $t > time() - 3600);
if (count($vremena) >= 5) { http_response_code(429); exit('Previse upita'); }
$vremena[] = time(); @file_put_contents($fajl, implode("\n", $vremena));

$telo = "UPIT SA SAJTA (partis.rs)\n\n$porudzbina\n\n"
      . "Ime: $ime\nFirma: $firma\nPIB: $pib\nTelefon: $telefon\nMejl: $email\nAdresa: $adresa\nNapomena: $napomena\n";
$naslov = '=?UTF-8?B?' . base64_encode('Upit sa sajta — ' . $ime) . '?=';
$zaglavlja = "From: PARTIS sajt <" . POSILJALAC . ">\r\nReply-To: $email\r\nContent-Type: text/plain; charset=UTF-8\r\nMIME-Version: 1.0\r\n";

if (mail(PRIMALAC, $naslov, $telo, $zaglavlja, '-f' . POSILJALAC)) { echo 'ok'; }
else { http_response_code(500); echo 'Slanje nije uspelo'; }
