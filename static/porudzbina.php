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

function rsd($n) { return number_format((float)$n, 2, ',', '.'); }
function h($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
$stavke = json_decode($_POST['stavke'] ?? '[]', true);
$uk = json_decode($_POST['ukupno'] ?? '{}', true);
if (!is_array($stavke)) $stavke = [];
if (!is_array($uk)) $uk = [];
$kupac = jedna_linija($_POST['kupac'] ?? '', 200);
$rabati = ocisti($_POST['rabati'] ?? '', 500);

// --- HTML deo mejla ---
$red = '';
foreach ($stavke as $i => $s) {
  if (!is_array($s)) continue;
  $naz = h($s['n'] ?? '') . (!empty($s['l']) ? '<br><span style="color:#666">' . h($s['l']) . '</span>' : '');
  $kol = h(($s['q'] ?? '') . ' ' . ($s['u'] ?? ''));
  if (isset($s['cena']) && $s['cena'] !== null) {
    $eff = (float)($s['eff'] ?? $s['cena']);
    $jed = rsd($eff) . (!empty($s['rb']) ? '<br><span style="color:#666;font-size:12px">cenovnik ' . rsd($s['cena']) . ', rabat ' . h($s['rb']) . '%</span>' : '');
    $ukp = rsd($eff * (float)($s['q'] ?? 0)) . ' RSD';
  } else { $jed = 'na upit'; $ukp = 'na upit'; }
  $bg = $i % 2 ? '#f7f5ef' : '#ffffff';
  $red .= "<tr style=\"background:$bg\"><td style=\"padding:8px 10px;border-bottom:1px solid #ddd\">" . ($i + 1) . ".</td><td style=\"padding:8px 10px;border-bottom:1px solid #ddd\">$naz</td><td style=\"padding:8px 10px;border-bottom:1px solid #ddd;white-space:nowrap\">$kol</td><td style=\"padding:8px 10px;border-bottom:1px solid #ddd;text-align:right;white-space:nowrap\">$jed</td><td style=\"padding:8px 10px;border-bottom:1px solid #ddd;text-align:right;white-space:nowrap\"><b>$ukp</b></td></tr>";
}
$zbir = '';
if (isset($uk['sum'])) {
  $zbir = '<tr><td colspan="4" style="padding:8px 10px;text-align:right">Iznos bez PDV-a' . (!empty($uk['rabat']) ? ' (sa rabatom)' : '') . ':</td><td style="padding:8px 10px;text-align:right;white-space:nowrap">' . rsd($uk['sum']) . ' RSD</td></tr>'
        . '<tr><td colspan="4" style="padding:4px 10px;text-align:right">PDV (20%):</td><td style="padding:4px 10px;text-align:right;white-space:nowrap">' . rsd($uk['pdv'] ?? 0) . ' RSD</td></tr>'
        . '<tr><td colspan="4" style="padding:8px 10px;text-align:right"><b>Ukupno sa PDV-om:</b></td><td style="padding:8px 10px;text-align:right;white-space:nowrap"><b>' . rsd($uk['total'] ?? 0) . ' RSD</b></td></tr>'
        . (!empty($uk['upit']) ? '<tr><td colspan="5" style="padding:4px 10px;text-align:right;color:#666">+ ' . (int)$uk['upit'] . ' stavki sa cenom na upit</td></tr>' : '');
}
$pod = function ($k, $v) { return '<tr><td style="padding:5px 12px 5px 0;color:#666;vertical-align:top">' . $k . '</td><td style="padding:5px 0"><b>' . $v . '</b></td></tr>'; };
$html = '<!DOCTYPE html><html><body style="margin:0;padding:16px;background:#f4f1ea;font-family:Arial,Helvetica,sans-serif;color:#16140f;font-size:14px">'
  . '<div style="max-width:720px;margin:0 auto;background:#fff;border:1px solid #d8d2c4">'
  . '<div style="background:#16140f;color:#fff;padding:14px 18px;font-size:18px;letter-spacing:1px"><b>PARTIS</b> &middot; novi upit sa sajta</div>'
  . '<div style="padding:18px">'
  . '<h3 style="margin:0 0 8px;font-size:15px;text-transform:uppercase;letter-spacing:1px;color:#c2241f">Kupac</h3>'
  . '<table style="border-collapse:collapse;margin-bottom:18px">'
  . $pod('Ime i prezime', h($ime)) . $pod('Firma', h($firma)) . $pod('PIB', h($pib))
  . $pod('Telefon', '<a href="tel:' . h(preg_replace('/[^\d+]/', '', $telefon)) . '" style="color:#16140f">' . h($telefon) . '</a>')
  . $pod('Mejl', '<a href="mailto:' . h($email) . '" style="color:#16140f">' . h($email) . '</a>')
  . $pod('Adresa', h($adresa))
  . ($napomena !== '' ? $pod('Napomena', nl2br(h($napomena))) : '')
  . ($kupac !== '' ? $pod('Nalog', h($kupac)) : '')
  . '</table>'
  . '<h3 style="margin:0 0 8px;font-size:15px;text-transform:uppercase;letter-spacing:1px;color:#c2241f">Porudžbina</h3>'
  . '<table style="border-collapse:collapse;width:100%;font-size:14px"><tr style="background:#16140f;color:#fff"><th style="padding:8px 10px;text-align:left">#</th><th style="padding:8px 10px;text-align:left">Artikal</th><th style="padding:8px 10px;text-align:left">Količina</th><th style="padding:8px 10px;text-align:right">Cena (bez PDV-a)</th><th style="padding:8px 10px;text-align:right">Iznos</th></tr>'
  . ($red !== '' ? $red : '<tr><td colspan="5" style="padding:10px"><pre style="margin:0;font-family:inherit">' . h($porudzbina) . '</pre></td></tr>')
  . $zbir . '</table>'
  . '<p style="margin:18px 0 0;color:#666;font-size:12px">Odgovorite direktno na ovaj mejl da kontaktirate kupca (Reply-To je mejl kupca). Cene su u dinarima.</p>'
  . '</div></div></body></html>';

// --- tekstualni deo (rezerva) ---
$tekst = "UPIT SA SAJTA (partis.rs)\n\nKUPAC\nIme: $ime\nFirma: $firma\nPIB: $pib\nTelefon: $telefon\nMejl: $email\nAdresa: $adresa\n"
       . ($napomena !== '' ? "Napomena: $napomena\n" : '') . ($kupac !== '' ? "Nalog: $kupac\n" : '')
       . ($rabati !== '' ? "Rabati: $rabati\n" : '')
       . "\nPORUDZBINA\n$porudzbina\n";

$naslov_txt = 'Upit sa sajta — ' . $ime . ($firma !== '' ? ' (' . $firma . ')' : '');
if (isset($uk['total'])) $naslov_txt .= ' — ' . rsd($uk['total']) . ' RSD';
$naslov = '=?UTF-8?B?' . base64_encode($naslov_txt) . '?=';
$gr = '==_partis_' . md5(uniqid('', true));
$zaglavlja = "From: PARTIS sajt <" . POSILJALAC . ">\r\nReply-To: $email\r\nMIME-Version: 1.0\r\nContent-Type: multipart/alternative; boundary=\"$gr\"\r\n";
$telo = "--$gr\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($tekst))
      . "--$gr\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($html))
      . "--$gr--\r\n";

if (mail(PRIMALAC, $naslov, $telo, $zaglavlja, '-f' . POSILJALAC)) { echo 'ok'; }
else { http_response_code(500); echo 'Slanje nije uspelo'; }
