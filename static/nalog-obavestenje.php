<?php
// PARTIS - obavestenje prodavnici da je stigao zahtev za nov nalog kupca (poziva se posle uspesne registracije).
header('Content-Type: text/plain; charset=utf-8');
const PRIMALAC = 'partis.trgovina@gmail.com';
const POSILJALAC = 'info@partis.rs';   // postoji u cPanel-u (Email Accounts)
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit('Method not allowed'); }
if (!empty($_POST['bot-field'])) { exit('ok'); }
function jl($s, $max = 200) { return mb_substr(preg_replace('/[\r\n\0]+/', ' ', trim((string)$s)), 0, $max); }
$ime = jl($_POST['ime'] ?? ''); $firma = jl($_POST['firma'] ?? ''); $pib = preg_replace('/\D/', '', $_POST['pib'] ?? '');
$tel = jl($_POST['telefon'] ?? '', 40); $adresa = jl($_POST['adresa'] ?? '', 300);
$email = filter_var(trim($_POST['email'] ?? ''), FILTER_VALIDATE_EMAIL);
if ($ime === '' || !$email) { http_response_code(400); exit('Nepotpuni podaci'); }
// najvise 5 obavestenja na sat sa iste IP adrese
$fajl = sys_get_temp_dir() . '/partis_nalog_rl_' . md5($_SERVER['REMOTE_ADDR'] ?? '');
$vr = array_filter(array_map('intval', @file($fajl, FILE_IGNORE_NEW_LINES) ?: []), fn($t) => $t > time() - 3600);
if (count($vr) >= 5) { http_response_code(429); exit('Previse zahteva'); }
$vr[] = time(); @file_put_contents($fajl, implode("\n", $vr));
$tekst = "NOV ZAHTEV ZA NALOG (partis.rs)\n\nIme: $ime\nFirma: $firma\nPIB: $pib\nTelefon: $tel\nMejl: $email\nAdresa: $adresa\n\nNalog odobravate u programu za upravljanje (Kupci i rabati).\n";
$naslov = '=?UTF-8?B?' . base64_encode('Nov zahtev za nalog — ' . $ime . ($firma !== '' ? ' (' . $firma . ')' : '')) . '?=';
$zag = "From: PARTIS sajt <" . POSILJALAC . ">\r\nReply-To: $email\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n";
if (mail(PRIMALAC, $naslov, chunk_split(base64_encode($tekst)), $zag, '-f' . POSILJALAC)) { echo 'ok'; }
else { http_response_code(500); echo 'Slanje nije uspelo'; }
