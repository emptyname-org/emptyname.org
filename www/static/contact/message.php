<?php
/*
 * emptyname contact handler - proof-of-work gated (trustless, no third party).
 * Served + PHP-processed by the web server (PHP-FPM); sends via the local MTA.
 *
 * Two modes, one file:
 *   GET  /contact/message.php?challenge
 *        -> issues a fresh signed challenge: {"challenge","sig","difficulty"}
 *           challenge = randomhex:unixtime ; sig = HMAC-SHA256(SECRET, challenge)
 *   POST /contact/message.php
 *        -> requires email + message + a valid proof (challenge, sig, nonce):
 *           SHA256(challenge ":" nonce) must start with DIFFICULTY hex zeros.
 *           A blind/direct POST carries no signed challenge -> rejected.
 *
 * The proof is the spam gate: a mass form-spammer never GETs a challenge and
 * never grinds a nonce, so it can't satisfy the POST. Stateless - no replay
 * cache; freshness window bounds reuse. The server only ever VERIFIES (one
 * hash), never solves. SECRET lives outside the web root (see $SECRET below).
 *
 * (The old hidden-honeypot field is gone - form-aware spam left it empty and
 * sailed through; the proof-of-work is the real gate.)
 *
 * Status codes echoed for /js/contact.js:
 *   10 sent · 11 failed/misconfigured · 12 invalid email · 13 missing field
 *   14 missing/invalid/expired proof-of-work
 * Mail goes To+From a configured address (SPF/DKIM align); visitor = Reply-To.
 */

  $DIFFICULTY = 5;        // required leading hex zeros (~1M hashes, ~1s to solve)
  $WINDOW     = 1800;     // challenge freshness window, seconds (30 min)

  // --- secret (never in the repo / web root): env first, then a file ---
  $SECRET = getenv('POW_SECRET');
  if ($SECRET === false || $SECRET === '') {
    $sf = '/path/to/conf/pow_secret'; // set POW_SECRET env, or point this at your secret file
    if (is_readable($sf)) $SECRET = trim(file_get_contents($sf));
  }

  function pow_sign($challenge, $secret) {
    return hash_hmac('sha256', $challenge, $secret);
  }

  // Read a POST field as a trimmed string. Guards against array params
  // (e.g. email[]=x), which would otherwise make trim() throw a TypeError -> 500.
  function pval($k) {
    $v = $_POST[$k] ?? '';
    return is_string($v) ? trim($v) : '';
  }

  // --- submission log (OUTSIDE the web root - never under static/, which is
  //     publicly served. One JSON object per POST, appended. Best-effort:
  //     any failure is swallowed so logging can never break the form. ---
  $LOGDIR = getenv('CONTACT_LOG_DIR');
  if ($LOGDIR === false || $LOGDIR === '') $LOGDIR = '/path/to/logs'; // set CONTACT_LOG_DIR env, or point this outside the web root
  $LOGFILE = $LOGDIR . '/contact.log';

  // Log + echo a status code + stop. `ch` = was a challenge supplied at all
  // (ch:0 = a blind direct POST, i.e. the spam pattern). `reason` says why.
  function finish($code, $reason = '') {
    global $LOGDIR, $LOGFILE;
    // REMOTE_ADDR is the real peer; XFF is client-supplied (forgeable) so it is
    // logged separately, never as the trusted source IP.
    $rec = array(
      't'      => date('c'),
      'ip'     => $_SERVER['REMOTE_ADDR'] ?? '',
      'xff'    => isset($_SERVER['HTTP_X_FORWARDED_FOR']) ? substr(trim(explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0]), 0, 64) : '',
      'code'   => $code,
      'reason' => $reason,
      'email'  => substr(pval('email'), 0, 200),
      'msg'    => substr(pval('message'), 0, 1000),
      'ch'     => (pval('challenge') !== '') ? 1 : 0,
      'nonce'  => substr(pval('nonce'), 0, 40),
      'ua'     => substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 200),
    );
    if (!is_dir($LOGDIR)) @mkdir($LOGDIR, 0750, true);
    @file_put_contents($LOGFILE, json_encode($rec) . "\n", FILE_APPEND | LOCK_EX);
    echo $code;
    exit;
  }

  // --- mode: issue a challenge ---
  if (isset($_GET['challenge'])) {
    header('Content-Type: application/json');
    header('Cache-Control: no-store');
    if (!$SECRET) { http_response_code(500); echo '{"error":"misconfigured"}'; exit; }
    $challenge = bin2hex(random_bytes(8)) . ':' . time();
    echo json_encode(array(
      'challenge'  => $challenge,
      'sig'        => pow_sign($challenge, $SECRET),
      'difficulty' => $DIFFICULTY,
    ));
    exit;
  }

  // --- mode: submit ---
  // Anything past here is a submission; a bare GET/HEAD (e.g. a crawler) gets
  // 405 and writes no log line — only real POSTs are recorded.
  if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405); header('Allow: POST'); exit;
  }
  $email     = pval('email');
  $message   = pval('message');
  $challenge = pval('challenge');
  $sig       = pval('sig');
  $nonce     = pval('nonce');

  if (!$SECRET) finish("11", "no-secret");          // fail closed if misconfigured

  // proof-of-work gate -----------------------------------------------------
  if ($challenge === '' || $sig === '' || $nonce === '') finish("14", "no-pow");
  // 1) signature proves we issued this challenge, untampered (timing-safe)
  if (!hash_equals(pow_sign($challenge, $SECRET), $sig)) finish("14", "bad-sig");
  // 2) freshness: ts is the part after the colon; reject stale or future-skewed
  $parts = explode(':', $challenge);
  $ts = isset($parts[1]) ? (int)$parts[1] : 0;
  $now = time();
  if ($ts <= 0 || ($now - $ts) > $WINDOW || ($ts - $now) > 60) finish("14", "stale");
  // 3) the work itself: SHA256(challenge ":" nonce) starts with DIFFICULTY zeros
  $h = hash('sha256', $challenge . ':' . $nonce);
  if (substr($h, 0, $DIFFICULTY) !== str_repeat('0', $DIFFICULTY)) finish("14", "bad-nonce");
  // ------------------------------------------------------------------------

  if ($email !== '' && $message !== '') {
    if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
      $email   = str_replace(array("\r", "\n"), '', $email);   // header-injection guard
      $message = substr($message, 0, 20000);
      $to      = getenv('CONTACT_TO') ?: 'you@example.com'; // set CONTACT_TO to your inbox
      $subject = "[emptyname] contact form message";
      $body    = "Message:\n\n" . $message . "\n";
      $headers = "From: contact <" . $to . ">\r\n"
               . "Reply-To: " . $email . "\r\n"
               . "MIME-Version: 1.0\r\n"
               . "Content-Type: text/plain; charset=utf-8\r\n";
      $ok = mail($to, $subject, $body, $headers);
      finish($ok ? "10" : "11", $ok ? "sent" : "mail-fail");
    } else {
      finish("12", "bad-email");
    }
  } else {
    finish("13", "missing-field");
  }
