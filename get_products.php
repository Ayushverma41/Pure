<?php
header('Content-Type: application/json');

require __DIR__ . '/config.php';

try {
  // Adjust fields if you want to restrict columns
  $stmt = $pdo->query("SELECT product_id, provider_id, product_name, product_description, price, stock_quantity, category, created_at, updated_at FROM products ORDER BY created_at DESC");
  $rows = $stmt->fetchAll();
  echo json_encode(['success' => true, 'products' => $rows]);
} catch (PDOException $e) {
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => 'Query failed']);
}
