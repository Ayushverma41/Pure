<?php
require __DIR__ . '/bootstrap.php';

$type = $_GET['type'] ?? '';
$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$input = json_input();

if (!in_array($type, ['buyer', 'seller'], true)) {
  send_json(400, ['ok' => false, 'message' => 'Invalid user type']);
}

$csv = $type === 'buyer' ? $BUYER_CSV : $SELLER_CSV;
$users = read_csv_assoc($csv);

if ($action === 'register' && $method === 'POST') {
  $name = trim((string)($input['name'] ?? ($type === 'buyer' ? 'Buyer' : '')));
  $email = normalize_email($input['email'] ?? '');
  $password = (string)($input['password'] ?? '');

  if (!$email || strlen($password) < 6 || ($type === 'seller' && !$name)) {
    send_json(400, ['ok' => false, 'message' => 'Invalid registration details']);
  }

  foreach ($users as $u) {
    if (normalize_email($u['email'] ?? '') === $email) {
      send_json(409, ['ok' => false, 'message' => ucfirst($type) . ' already exists']);
    }
  }

  $now = gmdate('c');
  $users[] = [
    'id' => random_id($type),
    'name' => $name,
    'email' => $email,
    'password_hash' => hash_password_value($password),
    'created_at' => $now,
    'updated_at' => $now
  ];

  write_csv_assoc($csv, $users, ['id', 'name', 'email', 'password_hash', 'created_at', 'updated_at']);
  send_json(201, ['ok' => true, 'message' => ucfirst($type) . ' account created']);
}

if ($action === 'login' && $method === 'POST') {
  $email = normalize_email($input['email'] ?? '');
  $password = (string)($input['password'] ?? '');
  $hash = hash_password_value($password);

  foreach ($users as $u) {
    if (normalize_email($u['email'] ?? '') === $email && ($u['password_hash'] ?? '') === $hash) {
      send_json(200, ['ok' => true, 'user' => ['email' => $u['email'], 'name' => $u['name'], 'role' => $type]]);
    }
  }

  send_json(401, ['ok' => false, 'message' => 'Invalid email or password']);
}

if ($action === 'forgot-password' && $method === 'POST') {
  $email = normalize_email($input['email'] ?? '');
  $newPassword = (string)($input['newPassword'] ?? '');
  if (!$email || strlen($newPassword) < 6) {
    send_json(400, ['ok' => false, 'message' => 'Valid email and min 6-char new password required']);
  }

  $found = false;
  for ($i = 0; $i < count($users); $i++) {
    if (normalize_email($users[$i]['email'] ?? '') === $email) {
      $users[$i]['password_hash'] = hash_password_value($newPassword);
      $users[$i]['updated_at'] = gmdate('c');
      $found = true;
      break;
    }
  }

  if (!$found) {
    send_json(404, ['ok' => false, 'message' => ucfirst($type) . ' not found']);
  }

  write_csv_assoc($csv, $users, ['id', 'name', 'email', 'password_hash', 'created_at', 'updated_at']);
  send_json(200, ['ok' => true, 'message' => 'Password updated']);
}

if ($action === 'delete' && $type === 'buyer' && $method === 'POST') {
  $email = normalize_email($input['email'] ?? '');
  if (!$email) send_json(400, ['ok' => false, 'message' => 'Email required']);
  $next = [];
  $found = false;
  foreach ($users as $u) {
    if (normalize_email($u['email'] ?? '') === $email) {
      $found = true;
      continue;
    }
    $next[] = $u;
  }
  if (!$found) send_json(404, ['ok' => false, 'message' => 'Buyer not found']);
  write_csv_assoc($csv, $next, ['id', 'name', 'email', 'password_hash', 'created_at', 'updated_at']);
  send_json(200, ['ok' => true, 'message' => 'Buyer account deleted']);
}

send_json(404, ['ok' => false, 'message' => 'Invalid auth route']);