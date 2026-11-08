<?php
// PARTIS - slanje obavestenja o porudzbini kupcu (poziva se iz programa za upravljanje).
// Provera: poslat je Supabase token prijavljenog korisnika; skripta proverava da je on administrator,
// pa iz baze (sa njegovim pravima) cita porudzbinu i kupca. Tajni kljucevi se ne koriste.
header('Content-Type: text/plain; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit('Method not allowed'); }
const POSILJALAC = 'upit@partis.rs';
const KOPIJA = 'partis.trgovina@gmail.com';

$cfg = @file_get_contents(__DIR__ . '/assets/config.js');
if (!$cfg || !preg_match('#"supabaseUrl":"(https://[^"]+)"#', $cfg, $a) || !preg_match('#"supabaseKey":"([^"]+)"#', $cfg, $b)) { http_response_code(500); exit('Nema podesavanja'); }
$URL = rtrim($a[1], '/'); $KEY = $b[1];
$token = trim($_POST['token'] ?? '');
$oid = trim($_POST['order_id'] ?? '');
$poruka = trim(mb_substr(str_replace("\r", '', (string)($_POST['poruka'] ?? '')), 0, 1500));
if ($token === '' || !preg_match('/^[0-9a-f-]{36}$/i', $oid)) { http_response_code(400); exit('Nepotpuni podaci'); }

function sb($path, $token, $KEY, $URL, $raw = false) {
  $ch = curl_init($URL . $path);
  curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 25,
    CURLOPT_HTTPHEADER => ['apikey: ' . $KEY, 'Authorization: Bearer ' . $token]]);
  $r = curl_exec($ch); $c = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
  if ($c !== 200 || $r === false) return null;
  return $raw ? $r : json_decode($r, true);
}
function h($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function rsd($n) { return number_format((float)$n, 2, ',', '.'); }

$u = sb('/auth/v1/user', $token, $KEY, $URL);
if (!$u || empty($u['id'])) { http_response_code(401); exit('Neovlascen'); }
$me = sb('/rest/v1/profili?select=is_admin&id=eq.' . rawurlencode($u['id']), $token, $KEY, $URL);
if (!$me || empty($me[0]['is_admin'])) { http_response_code(403); exit('Neovlascen'); }
$o = sb('/rest/v1/porudzbine?select=*&id=eq.' . rawurlencode($oid), $token, $KEY, $URL);
if (!$o || empty($o[0])) { http_response_code(404); exit('Porudzbina nije nadjena'); }
$o = $o[0];
$k = sb('/rest/v1/profili?select=ime,firma,email&id=eq.' . rawurlencode($o['user_id']), $token, $KEY, $URL);
$k = $k[0] ?? null;
$email = $k ? filter_var($k['email'] ?? '', FILTER_VALIDATE_EMAIL) : false;
if (!$email) { http_response_code(422); exit('Kupac nema ispravan mejl'); }

$stat = ['poslato' => 'Upit primljen', 'obrada' => 'U obradi', 'poslato_kupcu' => 'Poslato', 'isporuceno' => 'Isporučeno'];
$status = $stat[$o['status'] ?? 'poslato'] ?? 'Upit primljen';
$stavke = is_array($o['stavke'] ?? null) ? $o['stavke'] : [];
$uk = is_array($o['ukupno'] ?? null) ? $o['ukupno'] : [];
$datum = date('d.m.Y.', strtotime($o['created_at'] ?? 'now'));

$pdf = null;
if (!empty($o['faktura_path']) && preg_match('#^[0-9a-f-]{36}/[0-9a-f-]{36}\.pdf$#i', $o['faktura_path'])) {
  $pdf = sb('/storage/v1/object/fakture/' . $o['faktura_path'], $token, $KEY, $URL, true);
  if ($pdf !== null && (strlen($pdf) > 10 * 1024 * 1024 || substr($pdf, 0, 4) !== '%PDF')) $pdf = null;
}

$red = ''; $tekst = '';
foreach ($stavke as $i => $s) {
  if (!is_array($s)) continue;
  $nema = !empty($s['nema']);
  $bg = $i % 2 ? '#f7f5ef' : '#ffffff';
  $red .= '<tr style="background:' . $bg . '"><td style="padding:8px 10px;border-bottom:1px solid #e3ded0">' . h($s['n'] ?? '') . (!empty($s['l']) ? '<br><span style="color:#777;font-size:12px">' . h($s['l']) . '</span>' : '')
        . ($nema ? '<br><span style="display:inline-block;margin-top:3px;padding:2px 8px;background:#f7d6d3;color:#9c1c14;font-size:12px;border-radius:9px">Nema na stanju</span>' : '')
        . '</td><td style="padding:8px 10px;border-bottom:1px solid #e3ded0;white-space:nowrap;text-align:right">' . h(($s['q'] ?? '') . ' ' . ($s['u'] ?? '')) . '</td></tr>';
  $tekst .= '- ' . ($s['n'] ?? '') . (!empty($s['l']) ? ' (' . $s['l'] . ')' : '') . ' — ' . ($s['q'] ?? '') . ' ' . ($s['u'] ?? '') . ($nema ? ' — NEMA NA STANJU' : '') . "\n";
}
$ime = trim($k['ime'] ?? '') ?: 'kupče';
$kurir = trim($o['kurir'] ?? ''); $posiljka = trim($o['posiljka'] ?? '');

$blok = '';
if ($kurir !== '' || $posiljka !== '') {
  $blok = '<div style="margin:18px 0;padding:14px 16px;background:#f4f1ea;border-left:4px solid #c2241f"><div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#c2241f;margin-bottom:6px"><b>Pošiljka</b></div>'
        . ($kurir !== '' ? 'Kurirska služba: <b>' . h($kurir) . '</b><br>' : '')
        . ($posiljka !== '' ? 'Broj pošiljke: <b style="font-family:Consolas,monospace;font-size:16px">' . h($posiljka) . '</b><br><span style="color:#666;font-size:12px">Pošiljku pratite ovim brojem na sajtu kurirske službe.</span>' : '') . '</div>';
}
$html = '<!DOCTYPE html><html><body style="margin:0;padding:16px;background:#f4f1ea;font-family:Arial,Helvetica,sans-serif;color:#16140f;font-size:14px">'
  . '<div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #d8d2c4">'
  . '<div style="background:#16140f;color:#fff;padding:14px 18px;font-size:18px;letter-spacing:1px"><b>PARTIS</b> &middot; vaša porudžbina</div>'
  . '<div style="padding:20px">'
  . '<p style="margin:0 0 12px">Poštovani/poštovana ' . h($ime) . ',</p>'
  . '<p style="margin:0 0 12px">javljamo vam novosti u vezi sa porudžbinom od <b>' . h($datum) . '</b>. Trenutni status: <b>' . h($status) . '</b>.</p>'
  . ($poruka !== '' ? '<p style="margin:0 0 12px;padding:10px 12px;background:#fffbe8;border:1px solid #efe3a8">' . nl2br(h($poruka)) . '</p>' : '')
  . $blok
  . '<table style="border-collapse:collapse;width:100%;font-size:14px"><tr style="background:#16140f;color:#fff"><th style="padding:8px 10px;text-align:left">Artikal</th><th style="padding:8px 10px;text-align:right">Količina</th></tr>' . $red . '</table>'
  . (isset($uk['total']) ? '<p style="text-align:right;margin:10px 0 0">Ukupno sa PDV-om: <b>' . rsd($uk['total']) . ' RSD</b></p>' : '')
  . ($pdf !== null ? '<p style="margin:16px 0 0">Faktura je u prilogu ovog mejla (PDF).</p>' : '')
  . '<p style="margin:18px 0 0">Sve porudžbine i fakture možete da pregledate na <a href="https://partis.rs/nalog/porudzbine/" style="color:#c2241f">partis.rs/nalog/porudzbine</a> (prijavom na vaš nalog).</p>'
  . '<p style="margin:18px 0 0;color:#555;font-size:13px">PARTIS Niš &middot; Bulevar Nemanjića 103, lokal 8 &middot; <a href="tel:+38118553800" style="color:#555">+381 18 553 800</a> &middot; <a href="mailto:partis.trgovina@gmail.com" style="color:#555">partis.trgovina@gmail.com</a></p>'
  . '</div></div></body></html>';
$txt = "Poštovani/poštovana $ime,\n\njavljamo novosti u vezi sa porudžbinom od $datum. Status: $status.\n"
  . ($poruka !== '' ? "\n$poruka\n" : '')
  . ($kurir !== '' ? "\nKurirska služba: $kurir" : '') . ($posiljka !== '' ? "\nBroj pošiljke: $posiljka" : '')
  . "\n\n$tekst" . ($pdf !== null ? "\nFaktura je u prilogu.\n" : '') . "\nPARTIS Niš, +381 18 553 800, partis.trgovina@gmail.com\n";

$naslov = '=?UTF-8?B?' . base64_encode('PARTIS — porudžbina od ' . $datum . ' (' . $status . ')') . '?=';
$g1 = '==_p1_' . md5(uniqid('', true)); $g2 = '==_p2_' . md5(uniqid('', true));
$zagl = "From: PARTIS <" . POSILJALAC . ">\r\nReply-To: " . KOPIJA . "\r\nBcc: " . KOPIJA . "\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary=\"$g1\"\r\n";
$telo = "--$g1\r\nContent-Type: multipart/alternative; boundary=\"$g2\"\r\n\r\n"
  . "--$g2\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($txt))
  . "--$g2\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($html))
  . "--$g2--\r\n";
if ($pdf !== null) {
  $telo .= "--$g1\r\nContent-Type: application/pdf; name=\"PARTIS-faktura.pdf\"\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename=\"PARTIS-faktura.pdf\"\r\n\r\n" . chunk_split(base64_encode($pdf));
}
$telo .= "--$g1--\r\n";
if (mail($email, $naslov, $telo, $zagl, '-f' . POSILJALAC)) { echo 'ok ' . $email . ($pdf !== null ? ' +faktura' : ''); }
else { http_response_code(500); echo 'Slanje nije uspelo'; }
