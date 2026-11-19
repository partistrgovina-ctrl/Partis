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
const RACUNI = [['325-9500700039819-48', 'OTP'], ['205-526323-85', 'NLB Komercijalna'], ['165-7019478135-54', 'Addiko Bank']];
const TEL = '018 553 800'; const MOB = '065 2 553 800'; const MAIL_PRODAVCA = 'partis.trgovina@gmail.com';
const ROK_DANA = 7;        // rok važenja predračuna u danima
const PDV = 20;

$cfg = @file_get_contents(__DIR__ . '/assets/config.js');
if (!$cfg || !preg_match('#"supabaseUrl":"(https://[^"]+)"#', $cfg, $a) || !preg_match('#"supabaseKey":"([^"]+)"#', $cfg, $b)) { http_response_code(500); exit('Nema podesavanja'); }
$URL = rtrim($a[1], '/'); $KEY = $b[1];
$token = trim($_POST['token'] ?? '');
$oid = trim($_POST['order_id'] ?? '');
$tip = in_array($_POST['tip'] ?? '', ['predracun', 'pregled'], true) ? $_POST['tip'] : 'obavestenje';
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
function slovima($n) {
  $n = (int)$n; if ($n === 0) return 'nula';
  $j = ['', 'jedan', 'dva', 'tri', 'četiri', 'pet', 'šest', 'sedam', 'osam', 'devet', 'deset', 'jedanaest', 'dvanaest', 'trinaest', 'četrnaest', 'petnaest', 'šesnaest', 'sedamnaest', 'osamnaest', 'devetnaest'];
  $d = ['', '', 'dvadeset', 'trideset', 'četrdeset', 'pedeset', 'šezdeset', 'sedamdeset', 'osamdeset', 'devedeset'];
  $s = ['', 'sto', 'dvesta', 'trista', 'četristo', 'petsto', 'šeststo', 'sedamsto', 'osamsto', 'devetsto'];
  $f = function ($x, $zen) use ($j, $d, $s) {
    $o = $s[intdiv($x, 100)]; $r = $x % 100;
    if ($r < 20) { $t = $j[$r]; if ($zen) $t = preg_replace(['/^jedan$/', '/^dva$/'], ['jedna', 'dve'], $t); $o .= $t; }
    else { $t = $j[$r % 10]; if ($zen) $t = preg_replace(['/^jedan$/', '/^dva$/'], ['jedna', 'dve'], $t); $o .= $d[intdiv($r, 10)] . $t; }
    return $o;
  };
  $out = '';
  $m = intdiv($n, 1000000); $n %= 1000000;
  if ($m) $out .= ($m === 1 ? 'milion' : $f($m, false) . 'miliona');
  $t = intdiv($n, 1000); $n %= 1000;
  if ($t) { $out .= ($t === 1 ? 'hiljadu' : $f($t, true) . (in_array($t % 10, [2, 3, 4], true) && ($t % 100 < 10 || $t % 100 > 20) ? 'hiljade' : 'hiljada')); }
  if ($n) $out .= $f($n, false);
  return $out;
}
function rsd($n) { return number_format((float)$n, 2, ',', '.'); }

$u = sb('/auth/v1/user', $token, $KEY, $URL);
if (!$u || empty($u['id'])) { http_response_code(401); exit('Neovlascen'); }
$me = sb('/rest/v1/profili?select=is_admin&id=eq.' . rawurlencode($u['id']), $token, $KEY, $URL);
if (!$me || empty($me[0]['is_admin'])) { http_response_code(403); exit('Neovlascen'); }
$o = sb('/rest/v1/porudzbine?select=*&id=eq.' . rawurlencode($oid), $token, $KEY, $URL);
if (!$o || empty($o[0])) { http_response_code(404); exit('Porudzbina nije nadjena'); }
$o = $o[0];
$k = sb('/rest/v1/profili?select=ime,firma,email,pib,adresa,telefon&id=eq.' . rawurlencode($o['user_id']), $token, $KEY, $URL);
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
if ($tip === 'predracun' || $tip === 'pregled') {
  if ($tip === 'predracun' && count(RACUNI) === 0) { http_response_code(422); exit('Nije upisan tekući račun u obavesti.php (RACUN).'); }
  $broj = 'PR-' . date('ymd', strtotime($o['created_at'] ?? 'now')) . '-' . strtoupper(substr(str_replace('-', '', $o['id']), 0, 4));
  $vazi = date('d.m.Y.', strtotime('+' . ROK_DANA . ' days'));
  $osn = 0.0; $pdvUk = 0.0; $rows = ''; $tx = ''; $rb = 0; $upit = 0; $nemaL = []; $listUk = 0.0;
  $pj = is_array($o['predracun'] ?? null) ? $o['predracun'] : [];
  $ukl = isset($pj['ukljuci']) && is_array($pj['ukljuci']) ? array_map('intval', $pj['ukljuci']) : null;
  $drugo = [];
  $td = 'padding:2px 4px;border:1px solid #bbb;font-size:12.5px;line-height:1.25';
  foreach ($stavke as $i => $s) {
    if (!is_array($s)) continue;
    $opis = ($s['n'] ?? '') . (!empty($s['l']) ? ' (' . $s['l'] . ')' : '') . ' — ' . ($s['q'] ?? '') . ' ' . ($s['u'] ?? '');
    if (!empty($s['nema'])) { $nemaL[] = $opis; continue; }
    $inc = $ukl !== null ? in_array($i, $ukl, true) : (isset($s['eff']) && $s['eff'] !== null);
    if (!$inc) { $drugo[] = $opis . (!isset($s['eff']) || $s['eff'] === null ? ' — cena na upit' : ''); continue; }
    $q = (float)($s['q'] ?? 0); $eff = isset($s['eff']) && $s['eff'] !== null ? (float)$s['eff'] : null;
    if ($eff === null) { $upit++; $drugo[] = $opis . ' — cena na upit'; continue; }
    $rb++;
    $cena = isset($s['cena']) && $s['cena'] !== null ? (float)$s['cena'] : $eff; $rab = (float)($s['rb'] ?? 0);
    $sif = trim((string)($s['s'] ?? ''));
    $iznos = round($eff * $q, 2); $p = round($iznos * PDV / 100, 2);
    $osn += $iznos; $pdvUk += $p; $listUk += round($cena * $q, 2);
    $qs = rtrim(rtrim(number_format($q, 2, ',', ''), '0'), ',');
    $naz = h($s['n'] ?? '') . (!empty($s['l']) ? ' <span style="color:#666">(' . h($s['l']) . ')</span>' : '');
    $tx .= "$rb. " . ($sif !== '' ? "[$sif] " : '') . ($s['n'] ?? '') . (!empty($s['l']) ? ' (' . $s['l'] . ')' : '') . " — $qs " . ($s['u'] ?? '') . " x " . rsd($eff) . " = " . rsd($iznos + $p) . " RSD sa PDV-om\n";
    $rows .= '<tr><td style="' . $td . '">' . $rb . '.</td><td style="' . $td . ';white-space:nowrap">' . h($sif) . '</td><td style="' . $td . '">' . $naz . '</td><td style="' . $td . '">' . h($s['u'] ?? '') . '</td><td style="' . $td . ';text-align:right">' . h($qs) . '</td><td style="' . $td . ';text-align:right;white-space:nowrap">' . rsd($cena) . '</td><td style="' . $td . ';text-align:right">' . ($rab > 0 ? h(rtrim(rtrim(number_format($rab, 2, ',', ''), '0'), ',')) : '') . '</td><td style="' . $td . ';text-align:right;white-space:nowrap">' . rsd($eff) . '</td><td style="' . $td . ';text-align:right">' . PDV . '</td><td style="' . $td . ';text-align:right;white-space:nowrap">' . rsd($p) . '</td><td style="' . $td . ';text-align:right;white-space:nowrap">' . rsd($iznos + $p) . '</td></tr>';
  }
  $napom = trim((string)($pj['napomena'] ?? ''));
  $osn = round($osn, 2); $pdv = round($pdvUk, 2); $uk2 = round($osn + $pdv, 2);
  $din = (int)floor($uk2); $par = (int)round(($uk2 - $din) * 100);
  $slovima = slovima($din) . ' dinara i ' . str_pad((string)$par, 2, '0', STR_PAD_LEFT) . '/100';
  $kn = $k ? trim($k['firma'] ?? '') : '';
  $racHtml = ''; $racTxt = '';
  foreach (RACUNI as $r) { $racHtml .= '<tr><td style="padding:2px 14px 2px 0"><b>' . h($r[0]) . '</b></td><td><b>' . h($r[1]) . '</b></td></tr>'; $racTxt .= $r[0] . ' ' . $r[1] . "\n"; }
  $kupac = '<b style="font-size:14px">' . h($kn !== '' ? $kn : ($k['ime'] ?? '')) . '</b>' . (!empty($k['adresa']) ? '<br>' . h($k['adresa']) : '') . (!empty($k['pib']) ? '<br><b>PIB: ' . h($k['pib']) . '</b>' : '') . ($kn !== '' && !empty($k['ime']) ? '<br>Kontakt: ' . h($k['ime']) . (!empty($k['telefon']) ? ', ' . h($k['telefon']) : '') : '');
  $th = 'padding:2px 4px;border:1px solid #bbb;background:#eee;font-size:11.5px;font-style:italic;font-weight:normal';
  $html = '<!DOCTYPE html><html><body style="margin:0;padding:8px;background:#f4f1ea;font-family:Arial,Helvetica,sans-serif;color:#111;font-size:13px"><div class="dok" style="max-width:900px;margin:0 auto;background:#fff;border:1px solid #d8d2c4;padding:14px 18px">'
    . '<table style="width:100%"><tr><td style="vertical-align:top;font-size:12.5px;line-height:1.35"><b style="font-size:13.5px">NATALIJA MILIĆ PR TRGOVINSKA RADNJA</b><br><b style="font-size:18px">PARTIS NIŠ</b><br>Bulevar Nemanjića 103 lokal 8 18000 Niš<br>PIB: ' . h(PRODAVAC_PIB) . '<br>Mat. Br.: ' . h(PRODAVAC_MB) . '<br>Tel/Fax: ' . h(TEL) . '<br>Mob.Tel: ' . h(MOB) . '<br>E-mail: ' . h(MAIL_PRODAVCA) . '</td>'
    . '<td style="vertical-align:top;text-align:right;width:150px"><img src="https://partis.rs/assets/img/partis-logo.png" alt="PARTIS" width="120" style="max-width:100%;height:auto"></td></tr></table>'
    . '<table style="width:100%;margin-top:6px"><tr><td style="vertical-align:top;line-height:1.4"><b style="font-size:14px">PREDRAČUN: ' . h($broj) . '</b><br>Datum: ' . h(date('d.m.Y.')) . '<br>Datum i mesto izdavanja: ' . h(date('d.m.Y.')) . ' Niš<br>Način plaćanja: Virman (uplata na račun)<br>Važi do: <b>' . h($vazi) . '</b></td>'
    . '<td style="vertical-align:top;width:290px"><div style="border:1.5px solid #111;border-radius:8px;padding:7px 10px;line-height:1.35">' . $kupac . '</div></td></tr></table>'
    . ($poruka !== '' ? '<p style="margin:6px 0 0;padding:10px 12px;background:#fffbe8;border:1px solid #efe3a8">' . nl2br(h($poruka)) . '</p>' : '')
    . '<table style="border-collapse:collapse;width:100%;margin-top:6px"><tr><th style="' . $th . '">R.b.</th><th style="' . $th . '">Šifra</th><th style="' . $th . '">Artikal</th><th style="' . $th . '">j.m.</th><th style="' . $th . '">Količina</th><th style="' . $th . '">Cena</th><th style="' . $th . '">Rab%</th><th style="' . $th . '">Cena-Rab</th><th style="' . $th . '">Pdv%</th><th style="' . $th . '">Iznos Pdv</th><th style="' . $th . '">Vrednost+Pdv</th></tr>' . $rows . '</table>'
    . '<table style="margin:6px 0 0 auto;font-size:13px;line-height:1.35"><tr><td style="padding:1px 14px;text-align:right">Vrednost bez poreza i rabata:</td><td style="text-align:right">' . rsd($listUk) . '</td></tr><tr><td style="padding:1px 14px;text-align:right">Osnovica za obračun PDV ' . PDV . '%:</td><td style="text-align:right">' . rsd($osn) . '</td></tr><tr><td style="padding:1px 14px;text-align:right"><i>Porez na dodatu vrednost ' . PDV . '%:</i></td><td style="text-align:right"><i>' . rsd($pdv) . '</i></td></tr><tr><td style="padding:1px 14px;text-align:right"><b>UKUPNA VREDNOST:</b></td><td style="text-align:right"><b>' . rsd($uk2) . '</b></td></tr><tr><td style="padding:3px 14px;text-align:right"><b>ZA UPLATU:</b></td><td style="text-align:right;background:#e6e6e6;padding:3px 8px"><b>' . rsd($uk2) . '</b></td></tr></table>'
    . '<p style="margin:5px 0 0">slovima: <i>' . h($slovima) . '</i></p>'
    . ($upit ? '<p style="color:#9c1c14;margin:4px 0 0">Za ' . $upit . ' stavk' . ($upit === 1 ? 'u' : 'e') . ' cena je na upit i nije uračunata; javićemo vam cenu.</p>' : '')
    . ((count($nemaL) || count($drugo) || $napom !== '') ? '<div style="margin:6px 0 0;padding:5px 8px;border:1px solid #ccc;font-size:12px"><b>Napomena</b>' . ($napom !== '' ? '<br>' . nl2br(h($napom)) : '') . (count($nemaL) ? '<br><span style="color:#9c1c14"><b>Nema na stanju:</b></span><br>' . implode('<br>', array_map('h', $nemaL)) : '') . (count($drugo) ? '<br><b>Nije obuhvaćeno ovim predračunom:</b><br>' . implode('<br>', array_map('h', $drugo)) : '') . '</div>' : '')
    . '<table style="margin-top:6px"><tr><td style="vertical-align:top;padding-right:14px">Uplatu izvršiti na račun broj:</td><td><table>' . $racHtml . '</table></td></tr></table>'
    . '<p style="margin:3px 0 0">Poziv na broj / svrha uplate: <b>' . h($broj) . '</b></p>'
    . ($kurir !== '' || $posiljka !== '' ? $blok : '')
    . ($pdf !== null ? '<p style="margin:5px 0 0">Dokument u PDF-u je u prilogu ovog mejla.</p>' : '')
    . '<p style="margin:6px 0 0;color:#555;font-size:11px">Predračun nije fiskalni račun. Porudžbine i dokumenta možete da pregledate na <a href="https://partis.rs/nalog/porudzbine/" style="color:#c2241f">partis.rs/nalog/porudzbine</a>.</p>'
    . '<p style="margin:3px 0 0;color:#555;font-size:11px">PARTIS Niš · <a href="tel:+38118553800" style="color:#555">+381 18 553 800</a> · <a href="mailto:info@partis.rs" style="color:#555">info@partis.rs</a></p></div></body></html>';
  $txt = "PREDRAČUN $broj\nProdavac: " . PRODAVAC . ", " . PRODAVAC_ADR . ", PIB " . PRODAVAC_PIB . ", MB " . PRODAVAC_MB . "\nKupac: " . ($kn !== '' ? $kn : ($k['ime'] ?? '')) . (!empty($k['pib']) ? ', PIB ' . $k['pib'] : '') . "\nVaži do: $vazi\n" . ($poruka !== '' ? "\n$poruka\n" : '') . "\n$tx\nOsnovica: " . rsd($osn) . " RSD\nPDV " . PDV . "%: " . rsd($pdv) . " RSD\nZA UPLATU: " . rsd($uk2) . " RSD\nslovima: $slovima\n\nUplatu izvršiti na račun:\n$racTxt" . "Svrha uplate / poziv na broj: $broj\n" . ($napom !== '' ? "\nNapomena: $napom\n" : '') . (count($nemaL) ? "\nNema na stanju: " . implode('; ', $nemaL) . "\n" : '') . (count($drugo) ? "\nNije obuhvaćeno predračunom: " . implode('; ', $drugo) . "\n" : '') . "\nPARTIS Niš, +381 18 553 800, info@partis.rs\n";
  $tema = 'PARTIS — predračun ' . $broj;
  // stranica za štampu (A4, jedna strana): ista sa predračunom + dugme "Štampaj"; čuva se pod nepogađajućim imenom
  $stil = '<head><meta charset="utf-8"><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Predračun ' . h($broj) . '</title><style>@page{size:A4;margin:8mm}@media print{html,body{background:#fff!important;padding:0!important}.np{display:none!important}.dok{border:0!important;padding:0!important;max-width:none!important}}.pb{font:700 15px Arial;background:#c2241f;color:#fff;border:0;padding:11px 22px;cursor:pointer}</style></head>';
  $dugme = '<div class="np" style="max-width:900px;margin:0 auto 8px;text-align:center"><button class="pb" onclick="window.print()">Štampaj predračun (A4)</button><div style="font:12px Arial;color:#555;margin-top:5px">U prozoru za štampu možete izabrati i „Sačuvaj kao PDF“.</div></div>';
  $page = str_replace('<html><body', '<html>' . $stil . '<body', $html);
  $page = preg_replace('#(<body[^>]*>)#', '$1' . $dugme, $page, 1);
  if ($tip === 'pregled') { header('Content-Type: text/html; charset=utf-8'); echo $page; exit; }
  $dir = __DIR__ . '/predracuni';
  if (!is_dir($dir)) { @mkdir($dir, 0755, true); @file_put_contents($dir . '/.htaccess', "Options -Indexes\n"); @file_put_contents($dir . '/index.html', ''); }
  foreach (glob($dir . '/' . $oid . '-*.html') ?: [] as $old) { @unlink($old); }
  $fn = $oid . '-' . bin2hex(random_bytes(8)) . '.html';
  if (@file_put_contents($dir . '/' . $fn, $page) !== false) {
    $link = 'https://partis.rs/predracuni/' . $fn;
    $btn = '<div style="max-width:900px;margin:0 auto 10px;text-align:center"><a href="' . $link . '" style="display:inline-block;background:#c2241f;color:#fff;text-decoration:none;font:bold 15px Arial;padding:12px 26px">Otvori i štampaj predračun (A4)</a><div style="font:12px Arial;color:#555;margin-top:5px">Otvara se stranica spremna za štampu; može i „Sačuvaj kao PDF“.</div></div>';
    $html = preg_replace('#(<body[^>]*>)#', '$1' . $btn, $html, 1);
    $txt .= "\nPredračun za štampu (A4): $link\n";
  }
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
