<?php
// PARTIS - slanje obavestenja o porudzbini kupcu (poziva se iz programa za upravljanje).
// Provera: poslat je Supabase token prijavljenog korisnika; skripta proverava da je on administrator,
// pa iz baze (sa njegovim pravima) cita porudzbinu i kupca. Tajni kljucevi se ne koriste.
header('Content-Type: text/plain; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit('Method not allowed'); }
const POSILJALAC = 'info@partis.rs';   // mora da postoji u cPanel-u (Email Accounts)
const KOPIJA = 'partis.trgovina@gmail.com';
// ---- podaci za predračun ----
const PRODAVAC = 'Natalija Milić PR, Trgovinska radnja PARTIS';
const PRODAVAC_ADR = 'Bulevar Nemanjića 103, lokal 8, Niš';
const PRODAVAC_PIB = '110019220';
const PRODAVAC_MB = '64587544';
const RACUN = '';          // UPISATI tekući račun (npr. '160-0000000000000-00'); dok je prazan, predračun se ne šalje
const BANKA = '';          // naziv banke (nije obavezno)
const ROK_DANA = 7;        // rok važenja predračuna u danima
const PDV = 20;

$cfg = @file_get_contents(__DIR__ . '/assets/config.js');
if (!$cfg || !preg_match('#"supabaseUrl":"(https://[^"]+)"#', $cfg, $a) || !preg_match('#"supabaseKey":"([^"]+)"#', $cfg, $b)) { http_response_code(500); exit('Nema podesavanja'); }
$URL = rtrim($a[1], '/'); $KEY = $b[1];
$token = trim($_POST['token'] ?? '');
$oid = trim($_POST['order_id'] ?? '');
$tip = ($_POST['tip'] ?? '') === 'predracun' ? 'predracun' : 'obavestenje';
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
  . '<p style="margin:18px 0 0;color:#555;font-size:13px">PARTIS Niš &middot; Bulevar Nemanjića 103, lokal 8 &middot; <a href="tel:+38118553800" style="color:#555">+381 18 553 800</a> &middot; <a href="mailto:info@partis.rs" style="color:#555">info@partis.rs</a></p>'
  . '</div></div></body></html>';
$txt = "Poštovani/poštovana $ime,\n\njavljamo novosti u vezi sa porudžbinom od $datum. Status: $status.\n"
  . ($poruka !== '' ? "\n$poruka\n" : '')
  . ($kurir !== '' ? "\nKurirska služba: $kurir" : '') . ($posiljka !== '' ? "\nBroj pošiljke: $posiljka" : '')
  . "\n\n$tekst" . ($pdf !== null ? "\nFaktura je u prilogu.\n" : '') . "\nPARTIS Niš, +381 18 553 800, info@partis.rs\n";

$tema = 'PARTIS — porudžbina od ' . $datum . ' (' . $status . ')';
if ($tip === 'predracun') {
  if (RACUN === '') { http_response_code(422); exit('Nije upisan tekući račun u obavesti.php (RACUN).'); }
  $broj = 'PR-' . date('ymd', strtotime($o['created_at'] ?? 'now')) . '-' . strtoupper(substr(str_replace('-', '', $o['id']), 0, 4));
  $vazi = date('d.m.Y.', strtotime('+' . ROK_DANA . ' days'));
  $osn = 0.0; $rows = ''; $tx = ''; $rb = 0; $upit = 0; $nemaL = [];
  foreach ($stavke as $s) {
    if (!is_array($s)) continue;
    if (!empty($s['nema'])) { $nemaL[] = ($s['n'] ?? '') . (!empty($s['l']) ? ' (' . $s['l'] . ')' : ''); continue; }
    $rb++;
    $q = (float)($s['q'] ?? 0); $eff = isset($s['eff']) && $s['eff'] !== null ? (float)$s['eff'] : null;
    $naz = h($s['n'] ?? '') . (!empty($s['l']) ? '<br><span style="color:#777;font-size:11px">' . h($s['l']) . '</span>' : '');
    $bg = $rb % 2 ? '#ffffff' : '#f7f5ef';
    if ($eff === null) { $upit++; $cena = '<i>na upit</i>'; $iz = '—'; $tx .= "$rb. " . ($s['n'] ?? '') . " — $q " . ($s['u'] ?? '') . " — cena na upit\n"; }
    else { $l = round($eff * $q, 2); $osn += $l; $cena = rsd($eff); $iz = rsd($l); $tx .= "$rb. " . ($s['n'] ?? '') . (!empty($s['l']) ? ' (' . $s['l'] . ')' : '') . " — $q " . ($s['u'] ?? '') . " x " . rsd($eff) . " = " . rsd($l) . " RSD\n"; }
    $rows .= '<tr style="background:' . $bg . '"><td style="padding:7px 8px;border-bottom:1px solid #e3ded0">' . $rb . '</td><td style="padding:7px 8px;border-bottom:1px solid #e3ded0">' . $naz . '</td><td style="padding:7px 8px;border-bottom:1px solid #e3ded0;text-align:right;white-space:nowrap">' . h(rtrim(rtrim(number_format($q, 2, ',', ''), '0'), ',') . ' ' . ($s['u'] ?? '')) . '</td><td style="padding:7px 8px;border-bottom:1px solid #e3ded0;text-align:right;white-space:nowrap">' . $cena . '</td><td style="padding:7px 8px;border-bottom:1px solid #e3ded0;text-align:right;white-space:nowrap">' . $iz . '</td></tr>';
  }
  $pdv = round($osn * PDV / 100, 2); $uk2 = $osn + $pdv;
  $kn = '';
  if ($k) { $kn = trim(($k['firma'] ?? '')); }
  $html = '<!DOCTYPE html><html><body style="margin:0;padding:16px;background:#f4f1ea;font-family:Arial,Helvetica,sans-serif;color:#16140f;font-size:14px"><div style="max-width:700px;margin:0 auto;background:#fff;border:1px solid #d8d2c4">'
    . '<div style="background:#16140f;color:#fff;padding:14px 18px"><span style="font-size:18px;letter-spacing:1px"><b>PARTIS</b></span><span style="float:right;font-size:16px">PREDRAČUN ' . h($broj) . '</span></div><div style="padding:20px">'
    . '<table style="width:100%;font-size:13px;margin-bottom:14px"><tr><td style="vertical-align:top;width:50%"><b>Prodavac</b><br>' . h(PRODAVAC) . '<br>' . h(PRODAVAC_ADR) . '<br>PIB: ' . h(PRODAVAC_PIB) . ' · MB: ' . h(PRODAVAC_MB) . '</td><td style="vertical-align:top"><b>Kupac</b><br>' . h($kn !== '' ? $kn : ($k['ime'] ?? '')) . '<br>' . h($k['ime'] ?? '') . '<br>' . h($k['email'] ?? '') . '</td></tr></table>'
    . '<p style="margin:0 0 12px">Datum: <b>' . h(date('d.m.Y.')) . '</b> · Važi do: <b>' . h($vazi) . '</b></p>'
    . ($poruka !== '' ? '<p style="margin:0 0 12px;padding:10px 12px;background:#fffbe8;border:1px solid #efe3a8">' . nl2br(h($poruka)) . '</p>' : '')
    . '<table style="border-collapse:collapse;width:100%;font-size:13px"><tr style="background:#16140f;color:#fff"><th style="padding:7px 8px;text-align:left">#</th><th style="padding:7px 8px;text-align:left">Artikal</th><th style="padding:7px 8px;text-align:right">Količina</th><th style="padding:7px 8px;text-align:right">Cena bez PDV</th><th style="padding:7px 8px;text-align:right">Iznos</th></tr>' . $rows . '</table>'
    . '<table style="margin:12px 0 0 auto;font-size:14px"><tr><td style="padding:3px 10px">Osnovica</td><td style="text-align:right">' . rsd($osn) . ' RSD</td></tr><tr><td style="padding:3px 10px">PDV ' . PDV . '%</td><td style="text-align:right">' . rsd($pdv) . ' RSD</td></tr><tr><td style="padding:5px 10px;border-top:2px solid #16140f"><b>Za uplatu</b></td><td style="text-align:right;border-top:2px solid #16140f"><b>' . rsd($uk2) . ' RSD</b></td></tr></table>'
    . ($upit ? '<p style="color:#9c1c14;font-size:13px">Za ' . $upit . ' stavk' . ($upit === 1 ? 'u' : 'e') . ' cena je na upit i nije uračunata u iznos za uplatu; javićemo vam cenu.</p>' : '')
    . (count($nemaL) ? '<p style="font-size:13px;color:#9c1c14"><b>Nema na stanju (nije obuhvaćeno predračunom):</b><br>' . implode('<br>', array_map('h', $nemaL)) . '</p>' : '')
    . '<div style="margin:16px 0;padding:12px 14px;background:#f4f1ea;border-left:4px solid #c2241f;font-size:13px"><b>Podaci za uplatu</b><br>Primalac: ' . h(PRODAVAC) . '<br>Račun: <b>' . h(RACUN) . '</b>' . (BANKA !== '' ? ' (' . h(BANKA) . ')' : '') . '<br>Svrha uplate: predračun ' . h($broj) . '<br>Poziv na broj: ' . h($broj) . '</div>'
    . ($kurir !== '' || $posiljka !== '' ? $blok : '')
    . ($pdf !== null ? '<p style="margin:12px 0 0">Dokument u PDF-u je u prilogu ovog mejla.</p>' : '')
    . '<p style="margin:14px 0 0;color:#555;font-size:12px">Predračun je informativnog karaktera i ne predstavlja fiskalni račun. Robu šaljemo nakon evidentirane uplate. Porudžbine i dokumenta možete da pregledate na <a href="https://partis.rs/nalog/porudzbine/" style="color:#c2241f">partis.rs/nalog/porudzbine</a>.</p>'
    . '<p style="margin:12px 0 0;color:#555;font-size:13px">PARTIS Niš · <a href="tel:+38118553800" style="color:#555">+381 18 553 800</a> · <a href="mailto:info@partis.rs" style="color:#555">info@partis.rs</a></p></div></div></body></html>';
  $txt = "PREDRAČUN $broj\nProdavac: " . PRODAVAC . ", " . PRODAVAC_ADR . ", PIB " . PRODAVAC_PIB . ", MB " . PRODAVAC_MB . "\nKupac: " . ($kn !== '' ? $kn : ($k['ime'] ?? '')) . "\nVaži do: $vazi\n" . ($poruka !== '' ? "\n$poruka\n" : '') . "\n$tx\nOsnovica: " . rsd($osn) . " RSD\nPDV " . PDV . "%: " . rsd($pdv) . " RSD\nZA UPLATU: " . rsd($uk2) . " RSD\n\nRačun: " . RACUN . "\nSvrha uplate / poziv na broj: $broj\n" . (count($nemaL) ? "\nNema na stanju: " . implode('; ', $nemaL) . "\n" : '') . "\nPARTIS Niš, +381 18 553 800, info@partis.rs\n";
  $tema = 'PARTIS — predračun ' . $broj;
}
$naslov = '=?UTF-8?B?' . base64_encode($tema) . '?=';
$g1 = '==_p1_' . md5(uniqid('', true)); $g2 = '==_p2_' . md5(uniqid('', true));
$zagl = "From: PARTIS <" . POSILJALAC . ">\r\nReply-To: " . POSILJALAC . "\r\nBcc: " . KOPIJA . "\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary=\"$g1\"\r\n";
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
