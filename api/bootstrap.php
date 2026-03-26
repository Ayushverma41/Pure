<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit;
}

$DATA_DIR = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'data';
$BUYER_CSV = $DATA_DIR . DIRECTORY_SEPARATOR . 'buyer_users.csv';
$SELLER_CSV = $DATA_DIR . DIRECTORY_SEPARATOR . 'seller_users.csv';
$PRODUCT_CSV = $DATA_DIR . DIRECTORY_SEPARATOR . 'products.csv';

function ensure_files($paths) {
  if (!is_dir(dirname($paths[0]))) {
    mkdir(dirname($paths[0]), 0777, true);
  }
  foreach ($paths as $path => $header) {
    if (!file_exists($path)) {
      file_put_contents($path, $header . PHP_EOL);
    }
  }
}

ensure_files([
  $BUYER_CSV => 'id,name,email,password_hash,created_at,updated_at',
  $SELLER_CSV => 'id,name,email,password_hash,created_at,updated_at',
  $PRODUCT_CSV => 'id,name,category,price,image,gallery_json,rating,desc,seller_email,created_at,updated_at'
]);

function json_input() {
  $raw = file_get_contents('php://input');
  if (!$raw) return [];
  $data = json_decode($raw, true);
  return is_array($data) ? $data : [];
}

function send_json($status, $payload) {
  http_response_code($status);
  echo json_encode($payload);
  exit;
}

function normalize_email($email) {
  return strtolower(trim((string)$email));
}

function hash_password_value($password) {
  return hash('sha256', (string)$password);
}

function read_csv_assoc($path) {
  $rows = [];
  if (!file_exists($path)) return $rows;
  $fp = fopen($path, 'r');
  if (!$fp) return $rows;
  $header = fgetcsv($fp);
  if (!$header) {
    fclose($fp);
    return $rows;
  }
  while (($line = fgetcsv($fp)) !== false) {
    $row = [];
    for ($i = 0; $i < count($header); $i++) {
      $row[$header[$i]] = $line[$i] ?? '';
    }
    $rows[] = $row;
  }
  fclose($fp);
  return $rows;
}

function write_csv_assoc($path, $rows, $header) {
  $fp = fopen($path, 'w');
  fputcsv($fp, $header);
  foreach ($rows as $row) {
    $line = [];
    foreach ($header as $col) {
      $line[] = $row[$col] ?? '';
    }
    fputcsv($fp, $line);
  }
  fclose($fp);
}

function random_id($prefix) {
  return $prefix . '-' . bin2hex(random_bytes(6));
}